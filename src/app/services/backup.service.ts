import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { BackupFile, BackupMeta, RestoreResult, Snapshot } from '../interfaces/backup.interface';
import { persisted, readAll, writeAll } from '../utils/storage.utils';
import { daysBetween, todayKey } from '../utils/text.utils';
import { ProgressService } from './progress.service';

/** Marca de las copias de la app (un .json sin ella no se restaura) */
const BACKUP_APP = 'nihonguito';
/** Versión del formato de copia */
const BACKUP_VERSION = 1;
/** Copias automáticas que se guardan en el dispositivo (las más viejas se borran) */
const MAX_SNAPSHOTS = 7;
/** Minutos mínimos entre dos copias automáticas */
const SNAPSHOT_MIN_MINUTES = 30;
/** Espera tras terminar una práctica antes de copiar, para que los signals ya hayan escrito en localStorage */
const SNAPSHOT_DELAY_MS = 800;
/** Días sin guardar copia en archivo a partir de los que Inicio lo recuerda */
const EXPORT_REMINDER_DAYS = 7;
/** Días que se calla el recordatorio al tocar «Más tarde» */
const SNOOZE_DAYS = 2;
/** XP mínimo para recordar la copia (con menos no hay nada que valga la pena guardar) */
const MIN_XP_TO_REMIND = 30;
/** Base de datos y almacén de IndexedDB de las copias automáticas */
const DB_NAME = 'nihonguito-backups';
const STORE = 'snapshots';

/**
 * Copias de seguridad del progreso. Hace copias automáticas en el dispositivo (IndexedDB) al terminar cada
 * práctica y al salir de la app, guarda o comparte la copia completa en un archivo, y la restaura (también
 * se ofrece al instalar en un dispositivo nuevo, cuando la app empieza sin progreso).
 */
@Injectable({
    providedIn: 'root'
})
export class BackupService {
    // --- Inyección de Dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Estados con Signals ---
    readonly meta = persisted<BackupMeta>('backupMeta', { lastExport: null, snoozedUntil: null, isRestoreOfferDismissed: false });
    /** Copias automáticas del dispositivo (sin los datos), la más nueva primero */
    readonly snapshots = signal<Omit<Snapshot, 'data'>[]>([]);
    /** El navegador prometió no borrar los datos de la app aunque le falte espacio */
    readonly isPersisted = signal(false);

    // --- Valores derivados (computed) ---
    /** Hay algo que perder: XP, sesiones o palabras practicadas */
    readonly hasProgress = computed(() => {
        const stats = this.progressSVC.stats();
        return stats.xp > 0 || stats.sessions > 0 || Object.keys(this.progressSVC.mastery()).length > 0;
    });
    /** Días desde la última copia en archivo (null si nunca) */
    readonly daysSinceExport = computed(() => (this.meta().lastExport ? daysBetween(this.meta().lastExport!, todayKey()) : null));
    /** Inicio recuerda guardar la copia: hay progreso, nunca se guardó o hace 7 días, y no se pospuso */
    readonly needsExport = computed(() => {
        const { snoozedUntil } = this.meta();
        const days = this.daysSinceExport();
        if (this.progressSVC.stats().xp < MIN_XP_TO_REMIND) return false;
        if (snoozedUntil && todayKey() < snoozedUntil) return false;
        return days === null || days >= EXPORT_REMINDER_DAYS;
    });
    /** Dispositivo nuevo (o datos borrados): se ofrece restaurar una copia */
    readonly shouldOfferRestore = computed(() => !this.hasProgress() && !this.meta().isRestoreOfferDismissed);

    constructor() {
        void this.requestPersistence();
        void this.refreshSnapshots();

        // 1. Copia automática al terminar cada práctica (stats.sessions sube con finishSession); la primera lectura no cuenta
        let previousSessions: number | null = null;
        effect(() => {
            const sessions = this.progressSVC.stats().sessions;
            untracked(() => {
                if (previousSessions !== null && sessions > previousSessions) setTimeout(() => void this.snapshotIfDue(), SNAPSHOT_DELAY_MS);
                previousSessions = sessions;
            });
        });

        // 2. Copia automática al salir de la app o pasarla a segundo plano
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') void this.snapshotIfDue();
        });
    }

    // ------------------------------- Copias automáticas ------------------------------------------------------------- //
    /** Pide al navegador que no borre los datos de la app (en una app instalada suele concederse solo) */
    private async requestPersistence(): Promise<void> {
        try {
            const storage = navigator.storage;
            if (!storage?.persist) return;
            this.isPersisted.set((await storage.persisted()) || (await storage.persist()));
        } catch {
            /* sin soporte */
        }
    }

    /** Hace una copia automática si hay progreso y la última tiene más de 30 minutos */
    private async snapshotIfDue(): Promise<void> {
        if (!this.hasProgress()) return;
        const last = this.snapshots()[0];
        if (last && Date.now() - new Date(last.createdAt).getTime() < SNAPSHOT_MIN_MINUTES * 60_000) return;
        await this.snapshotNow();
    }

    /** Guarda ya una copia automática y borra las que sobran */
    async snapshotNow(): Promise<void> {
        const snapshot: Snapshot = { ...this.buildFile(), id: Date.now().toString(36), xp: this.progressSVC.stats().xp };
        try {
            const db = await openDb();
            await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(snapshot));
            const all = await this.listSnapshots(db);
            const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
            for (const old of all.slice(MAX_SNAPSHOTS)) store.delete(old.id);
            db.close();
        } catch {
            /* IndexedDB no disponible: solo queda la copia en archivo */
        }
        await this.refreshSnapshots();
    }

    /** Vuelve a leer la lista de copias automáticas */
    private async refreshSnapshots(): Promise<void> {
        try {
            const db = await openDb();
            const all = await this.listSnapshots(db);
            db.close();
            this.snapshots.set(all.slice(0, MAX_SNAPSHOTS).map(({ data: _data, ...summary }) => summary));
        } catch {
            this.snapshots.set([]);
        }
    }

    /** Devuelve todas las copias automáticas, la más nueva primero */
    private async listSnapshots(db: IDBDatabase): Promise<Snapshot[]> {
        const all = await requestToPromise<Snapshot[]>(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
        return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    /** Restaura una copia automática (antes guarda la situación actual, por si fue un error) */
    async restoreSnapshot(id: string): Promise<void> {
        const db = await openDb();
        const snapshot = await requestToPromise<Snapshot | undefined>(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
        db.close();
        if (!snapshot) return;
        await this.applyBackup(snapshot);
    }
    // ------------------------------- Copias automáticas ------------------------------------------------------------- //

    // ------------------------------- Copia en archivo ------------------------------------------------------------- //
    /**
     * Guarda la copia en un archivo: en el celular abre «Compartir» (Drive, WhatsApp, correo…); si no se puede,
     * la descarga. Tiene que llamarse desde un toque del usuario. Devuelve false si el usuario canceló.
     */
    async exportFile(): Promise<boolean> {
        const name = `nihonguito-copia-${todayKey()}.json`;
        const file = new File([JSON.stringify(this.buildFile())], name, { type: 'application/json' });
        try {
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Copia de Nihonguito', text: 'Mi progreso en Nihonguito' });
            } else {
                downloadFile(file);
            }
        } catch (error) {
            // Cancelar el menú de compartir no es un error; cualquier otro fallo cae a la descarga
            if ((error as DOMException)?.name === 'AbortError') return false;
            downloadFile(file);
        }
        this.meta.update((meta) => ({ ...meta, lastExport: todayKey(), snoozedUntil: null }));
        return true;
    }

    /** Lee un archivo de copia y, si es válido, sustituye el progreso por el suyo y recarga la app */
    async restoreFromFile(file: File): Promise<RestoreResult> {
        let backup: BackupFile;
        try {
            backup = JSON.parse(await file.text()) as BackupFile;
        } catch {
            return { ok: false, error: 'El archivo no se pudo leer. ¿Es una copia de Nihonguito (.json)?' };
        }
        if (backup?.app !== BACKUP_APP || !backup.data || typeof backup.data !== 'object') {
            return { ok: false, error: 'Ese archivo no es una copia de Nihonguito.' };
        }
        await this.applyBackup(backup);
        return { ok: true };
    }

    /** Sustituye el progreso por el de una copia: antes guarda una copia automática de lo actual, después recarga */
    async applyBackup(backup: BackupFile): Promise<void> {
        if (this.hasProgress()) await this.snapshotNow();
        writeAll(backup.data);
        // Los signals persistidos siguen en memoria con lo de antes y sus effects volverían a escribirlo
        location.reload();
    }

    /** Arma el contenido de una copia con todo lo guardado ahora (también lo sube CloudSyncService) */
    buildFile(): BackupFile {
        return { app: BACKUP_APP, version: BACKUP_VERSION, createdAt: new Date().toISOString(), data: readAll() };
    }
    // ------------------------------- Copia en archivo ------------------------------------------------------------- //

    // ------------------------------- Avisos ------------------------------------------------------------- //
    /** «Más tarde»: no recuerda la copia en 2 días */
    snoozeReminder(): void {
        const until = new Date(Date.now() + SNOOZE_DAYS * 86_400_000);
        this.meta.update((meta) => ({ ...meta, snoozedUntil: todayKey(until) }));
    }

    /** «Empezar de cero»: no vuelve a ofrecer restaurar */
    dismissRestoreOffer(): void {
        this.meta.update((meta) => ({ ...meta, isRestoreOfferDismissed: true }));
    }
    // ------------------------------- Avisos ------------------------------------------------------------- //
}

// ------------------------------- IndexedDB y descarga ------------------------------------------------------------- //
/** Abre (o crea) la base de datos de copias automáticas */
function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Convierte una petición de IndexedDB en promesa */
function requestToPromise<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
}

/** Descarga un archivo con un enlace temporal */
function downloadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// ------------------------------- IndexedDB y descarga ------------------------------------------------------------- //
