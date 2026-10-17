import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore/lite';
import { BackupFile, CloudBackup, CloudMeta, CloudStatus, CloudUser } from '../interfaces/backup.interface';
import { CLOUD_COLLECTION, CLOUD_MAX_BYTES, CLOUD_UPLOAD_MIN_MINUTES, FIREBASE_CONFIG, isCloudConfigured } from '../utils/cloud.utils';
import { persisted } from '../utils/storage.utils';
import { BackupService } from './backup.service';
import { ProgressService } from './progress.service';

/** Espera tras terminar una práctica antes de subir, para que los signals ya hayan escrito en localStorage */
const UPLOAD_DELAY_MS = 1500;

/** Módulos de Firebase cargados en diferido y sus instancias */
interface FirebaseKit {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    authModule: typeof import('firebase/auth');
    storeModule: typeof import('firebase/firestore/lite');
}

/**
 * Copia automática en la nube con Firebase: el usuario inicia sesión con Google una vez y desde entonces la
 * copia se sube sola al terminar cada práctica y al salir de la app; en un dispositivo nuevo, al iniciar sesión
 * se recupera sola. Firebase se carga solo si la nube está configurada y el usuario la activó.
 */
@Injectable({
    providedIn: 'root'
})
export class CloudSyncService {
    // --- Inyección de Dependencias ---
    private backupSVC = inject(BackupService);
    private progressSVC = inject(ProgressService);

    // --- Estados con Signals ---
    readonly meta = persisted<CloudMeta>('cloudMeta', { isLinked: false, lastSync: null });
    readonly user = signal<CloudUser | null>(null);
    readonly status = signal<CloudStatus>('off');
    /** Último error para la pantalla (vacío si no hay) */
    readonly error = signal('');
    /** Hay proyecto de Firebase configurado en cloud.utils.ts */
    readonly isConfigured = isCloudConfigured();

    // Firebase cargado (null hasta la primera vez que hace falta) y control de subidas
    private kit: FirebaseKit | null = null;
    private lastUploadAt = 0;
    private lastUploadedFile = '';

    constructor() {
        if (!this.isConfigured) return;
        // 1. Este dispositivo ya estaba conectado: se reconecta solo (la sesión de Firebase dura meses)
        if (this.meta().isLinked) void this.reconnect();

        // 2. Subida automática al terminar cada práctica (stats.sessions sube con finishSession)
        let previousSessions: number | null = null;
        effect(() => {
            const sessions = this.progressSVC.stats().sessions;
            untracked(() => {
                if (previousSessions !== null && sessions > previousSessions) setTimeout(() => void this.uploadIfDue(), UPLOAD_DELAY_MS);
                previousSessions = sessions;
            });
        });

        // 3. Subida al salir de la app o pasarla a segundo plano
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') void this.uploadIfDue();
        });
    }

    // ------------------------------- Conexión ------------------------------------------------------------- //
    /** Carga Firebase la primera vez (en diferido: no pesa en el arranque de quien no usa la nube) */
    private async loadKit(): Promise<FirebaseKit> {
        if (this.kit) return this.kit;
        const [appModule, authModule, storeModule] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
        const app = appModule.initializeApp(FIREBASE_CONFIG);
        this.kit = { app, auth: authModule.getAuth(app), db: storeModule.getFirestore(app), authModule, storeModule };
        return this.kit;
    }

    /** Recupera la sesión guardada (y termina un inicio de sesión por redirección, si se volvía de Google) */
    private async reconnect(): Promise<void> {
        this.status.set('connecting');
        try {
            const kit = await this.loadKit();
            const redirect = await kit.authModule.getRedirectResult(kit.auth);
            const user = redirect?.user ?? (await this.currentUser(kit));
            if (!user) {
                this.status.set('off');
                return;
            }
            this.setUser(user);
            // Al volver de iniciar sesión por redirección toca la primera sincronización; si no, solo comprueba si
            // este dispositivo está vacío (datos borrados) para recuperar la copia solo
            if (redirect?.user) await this.firstSync();
            else if (!this.backupSVC.hasProgress()) await this.restoreFromCloud(false);
            else this.status.set('ok');
        } catch (error) {
            this.fail(error);
        }
    }

    /** Espera a que Firebase lea la sesión guardada y devuelve el usuario (o null) */
    private currentUser(kit: FirebaseKit): Promise<User | null> {
        return new Promise((resolve) => {
            const unsubscribe = kit.authModule.onAuthStateChanged(kit.auth, (user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    /** Inicia sesión con Google (debe llamarse desde un toque) y hace la primera sincronización */
    async signIn(): Promise<void> {
        this.error.set('');
        this.status.set('connecting');
        try {
            const kit = await this.loadKit();
            const provider = new kit.authModule.GoogleAuthProvider();
            this.meta.update((meta) => ({ ...meta, isLinked: true }));
            try {
                const result = await kit.authModule.signInWithPopup(kit.auth, provider);
                this.setUser(result.user);
            } catch (popupError) {
                // Ventana bloqueada o no soportada (algunas apps instaladas en iPhone): se usa la redirección,
                // que recarga la app; reconnect termina el trabajo al volver
                const code = (popupError as { code?: string }).code ?? '';
                if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
                    await kit.authModule.signInWithRedirect(kit.auth, provider);
                    return;
                }
                throw popupError;
            }
            await this.firstSync();
        } catch (error) {
            const code = (error as { code?: string }).code ?? '';
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                this.meta.update((meta) => ({ ...meta, isLinked: false }));
                this.status.set('off');
                return;
            }
            this.fail(error);
        }
    }

    /** Cierra la sesión en este dispositivo (la copia de la nube se queda) */
    async signOut(): Promise<void> {
        if (this.kit) await this.kit.authModule.signOut(this.kit.auth);
        this.user.set(null);
        this.status.set('off');
        this.meta.update((meta) => ({ ...meta, isLinked: false }));
    }

    /**
     * Primera sincronización tras iniciar sesión: sin copia en la nube, sube la local; sin progreso local,
     * recupera la de la nube; con las dos, pregunta cuál se queda
     */
    private async firstSync(): Promise<void> {
        const cloud = await this.readCloud();
        const localXp = this.progressSVC.stats().xp;
        if (!cloud) {
            await this.uploadNow();
            return;
        }
        if (!this.backupSVC.hasProgress()) {
            await this.applyCloud(cloud);
            return;
        }
        const date = new Date(cloud.updatedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const useCloud = confirm(
            `En la nube tienes una copia del ${date} con ${cloud.xp} XP, y en este dispositivo ${localXp} XP.\n\n` +
                'Aceptar: usar la copia de la nube.\nCancelar: quedarte con la de este dispositivo y subirla.',
        );
        if (useCloud) await this.applyCloud(cloud);
        else await this.uploadNow();
    }

    /** Guarda el usuario conectado */
    private setUser(user: User): void {
        this.user.set({ uid: user.uid, name: user.displayName ?? '', email: user.email ?? '' });
    }
    // ------------------------------- Conexión ------------------------------------------------------------- //

    // ------------------------------- Subir y recuperar ------------------------------------------------------------- //
    /** Sube la copia si hay sesión, hay progreso, pasaron 2 minutos desde la última y algo cambió */
    private async uploadIfDue(): Promise<void> {
        if (!this.user() || !this.backupSVC.hasProgress()) return;
        if (Date.now() - this.lastUploadAt < CLOUD_UPLOAD_MIN_MINUTES * 60_000) return;
        await this.uploadNow();
    }

    /** Sube ya la copia del progreso actual (si no cambió desde la última subida, no hace nada) */
    async uploadNow(): Promise<boolean> {
        const user = this.user();
        if (!user) return false;
        const file = JSON.stringify(this.backupSVC.buildFile());
        // Lo que cambia siempre es createdAt: se compara solo el contenido
        const content = file.replace(/"createdAt":"[^"]*",?/, '');
        if (content === this.lastUploadedFile) return true;
        if (file.length > CLOUD_MAX_BYTES) {
            this.status.set('error');
            this.error.set('Tu copia es demasiado grande para la nube. Guarda una copia en archivo desde aquí.');
            return false;
        }
        this.status.set('syncing');
        try {
            const kit = await this.loadKit();
            const { doc, setDoc } = kit.storeModule;
            const backup: CloudBackup = { file, updatedAt: new Date().toISOString(), xp: this.progressSVC.stats().xp };
            await setDoc(doc(kit.db, CLOUD_COLLECTION, user.uid), backup);
            this.lastUploadAt = Date.now();
            this.lastUploadedFile = content;
            this.markSynced();
            return true;
        } catch (error) {
            this.fail(error);
            return false;
        }
    }

    /** Recupera la copia de la nube y sustituye el progreso (pide confirmación si ya hay progreso y `ask`) */
    async restoreFromCloud(ask = true): Promise<boolean> {
        try {
            const cloud = await this.readCloud();
            if (!cloud) {
                this.status.set('ok');
                if (ask) this.error.set('Todavía no hay ninguna copia tuya en la nube.');
                return false;
            }
            if (ask && this.backupSVC.hasProgress() && !confirm(`Tu progreso se sustituirá por la copia de la nube (${cloud.xp} XP). Antes se guarda una copia automática de lo actual. ¿Seguir?`)) {
                return false;
            }
            await this.applyCloud(cloud);
            return true;
        } catch (error) {
            this.fail(error);
            return false;
        }
    }

    /** Lee la copia del usuario en Firestore (null si no tiene) */
    private async readCloud(): Promise<CloudBackup | null> {
        const user = this.user();
        if (!user) return null;
        this.status.set('syncing');
        const kit = await this.loadKit();
        const { doc, getDoc } = kit.storeModule;
        const snapshot = await getDoc(doc(kit.db, CLOUD_COLLECTION, user.uid));
        return snapshot.exists() ? (snapshot.data() as CloudBackup) : null;
    }

    /** Aplica una copia de la nube (BackupService guarda antes lo actual y recarga la app) */
    private async applyCloud(cloud: CloudBackup): Promise<void> {
        this.markSynced();
        await this.backupSVC.applyBackup(JSON.parse(cloud.file) as BackupFile);
    }

    /** Anota que la nube está al día */
    private markSynced(): void {
        this.status.set('ok');
        this.error.set('');
        this.meta.update((meta) => ({ ...meta, lastSync: new Date().toISOString() }));
    }

    /** Pasa un error de Firebase a un mensaje entendible */
    private fail(error: unknown): void {
        const code = (error as { code?: string }).code ?? '';
        this.status.set('error');
        if (code.includes('permission-denied')) this.error.set('La nube rechazó la copia: revisa las reglas de Firestore.');
        else if (code.includes('unauthorized-domain')) this.error.set('Esta dirección no está autorizada en Firebase (Authentication → Dominios autorizados).');
        else if (code.includes('network') || code.includes('unavailable')) this.error.set('Sin conexión: se subirá la próxima vez.');
        else this.error.set('No se pudo conectar con la nube. Inténtalo más tarde.');
    }
    // ------------------------------- Subir y recuperar ------------------------------------------------------------- //
}
