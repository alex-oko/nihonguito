import {
    ApplicationConfig,
    inject,
    isDevMode,
    provideAppInitializer,
    provideBrowserGlobalErrorListeners,
    provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { FuriganaService } from './services/furigana.service';

/** Providers globales de la app: sin zone.js, router con lazy loading y service worker solo en producción */
export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        // Lecturas de los kanji (modo solo kana / furigana): archivo pequeño, cacheado para usar sin conexión.
        // Se carga antes de pintar la primera vista para que el texto no salte de kanji a kana
        provideAppInitializer(() => inject(FuriganaService).load()),
        // withComponentInputBinding: los parámetros de ruta (:id, :mode…) llegan como input() de la vista
        provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            // Se registra cuando la app queda estable o, como mucho, a los 30 s
            registrationStrategy: 'registerWhenStable:30000',
        }),
    ],
};
