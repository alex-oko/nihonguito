import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { APP_BUILT, APP_VERSION } from '../utils/version.utils';
import { UpdateState } from '../interfaces/update.interface';

/** Versión actual de la app y comprobación manual de «hay versión nueva» a través del service worker */
@Injectable({
    providedIn: 'root'
})
export class UpdateService {
    // --- Inyección de dependencias ---
    private swUpdate = inject(SwUpdate);

    // --- Estados UI con Signals ---
    readonly state = signal<UpdateState>(this.swUpdate.isEnabled ? 'idle' : 'unavailable');

    // Versión y fecha de compilación que escribe tools/write-version.mjs
    readonly version = APP_VERSION;
    readonly built = APP_BUILT;

    constructor() {
        if (!this.swUpdate.isEnabled) return;
        // El service worker también encuentra versiones nuevas por su cuenta; se avisan en cuanto terminan de descargarse
        this.swUpdate.versionUpdates.subscribe((event) => {
            if (event.type === 'VERSION_READY') this.state.set('ready');
        });
    }

    // ------------------------------- Actualización ------------------------------------------------------------- //
    /** Busca una versión nueva; si ya hay una descargada, la instala */
    async check(): Promise<void> {
        if (!this.swUpdate.isEnabled) {
            // ng serve o navegador sin service worker: recargar es la única «actualización» posible
            location.reload();
            return;
        }
        if (this.state() === 'ready') return this.install();
        this.state.set('checking');
        try {
            const found = await this.swUpdate.checkForUpdate();
            this.state.set(found ? 'ready' : 'latest');
        } catch {
            this.state.set('error');
        }
    }

    /** Activa la versión descargada y recarga la página para usarla */
    async install(): Promise<void> {
        this.state.set('installing');
        try {
            await this.swUpdate.activateUpdate();
        } finally {
            // Se recarga aunque activateUpdate falle: así la app nunca se queda en «Actualizando…»
            location.reload();
        }
    }
    // ------------------------------- Actualización ------------------------------------------------------------- //
}
