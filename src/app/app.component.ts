import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ProgressService } from './services/progress.service';
import { ReadingService } from './services/reading.service';
import { IconComponent } from './components/icon/icon.component';

/** Color de fondo de cada tema: se copia a <meta name="theme-color"> para pintar la barra del sistema */
const THEME_COLORS: Record<string, string> = {
    base: '#f9f5eb',
    sol: '#fff7d1',
    violeta: '#100b1a',
    carmesi: '#190d0d',
};
/** Espera antes de precargar el diccionario de lecturas, para no competir con la carga de la primera vista */
const READING_PRELOAD_DELAY_MS = 1200;

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);
    private readingSVC = inject(ReadingService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    // --- Estados UI con Signals ---
    // true en las rutas con data.immersive (prácticas, juegos, exámenes): se oculta la barra de pestañas
    protected immersive = signal(false);

    // Pestañas de la barra inferior (el orden es el de pantalla)
    protected tabs = [
        { path: '/', icon: 'home', label: 'Inicio' },
        { path: '/kana', icon: 'kana', label: 'Kana' },
        { path: '/lecciones', icon: 'book', label: 'Lecciones' },
        { path: '/practicar', icon: 'dumbbell', label: 'Practicar' },
        { path: '/examenes', icon: 'clipboard', label: 'Exámenes' },
        { path: '/perfil', icon: 'user', label: 'Perfil' },
    ];

    constructor() {
        // 1. En cada navegación: modo inmersivo según la ruta más profunda y scroll arriba
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.onNavigationEnd());

        // 2. Precarga en segundo plano el diccionario de vocabulario (kanji → kana)
        setTimeout(() => void this.readingSVC.ensure(), READING_PRELOAD_DELAY_MS);

        // 3. Aplica tema y escritura al <html> cada vez que cambian los ajustes
        effect(() => {
            const { theme, script } = this.progressSVC.settings();
            this.applyAppearance(theme, script);
        });
    }

    // ------------------------------- Navegación ------------------------------------------------------------- //
    /** Lee data.immersive de la ruta hija más profunda y sube el scroll al inicio */
    private onNavigationEnd(): void {
        // El data de las rutas hijas no se hereda en route.snapshot: hay que bajar hasta la última
        let snapshot = this.route.snapshot;
        while (snapshot.firstChild) snapshot = snapshot.firstChild;
        this.immersive.set(!!snapshot.data['immersive']);
        window.scrollTo({ top: 0 });
    }
    // ------------------------------- Navegación ------------------------------------------------------------- //

    // ------------------------------- Apariencia ------------------------------------------------------------- //
    /** Pone data-script y data-theme en <html> y actualiza el theme-color del navegador */
    private applyAppearance(theme: string, script: string): void {
        const root = document.documentElement;
        root.setAttribute('data-script', script);
        // Un tema desconocido (p. ej. de una versión vieja guardada en localStorage) cae en el base
        const activeTheme = THEME_COLORS[theme] ? theme : 'base';
        root.setAttribute('data-theme', activeTheme);
        // index.html puede traer varias <meta name="theme-color"> (claro/oscuro): se cambian todas
        document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
            meta.content = THEME_COLORS[activeTheme];
        });
    }
    // ------------------------------- Apariencia ------------------------------------------------------------- //
}
