import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Trazos SVG de cada icono (viewBox 24×24, línea de 2 px). La clave es el `name` que recibe `app-icon`.
 * Un nombre que no está aquí pinta un SVG vacío, sin error.
 */
const PATHS: Record<string, string> = {
    volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
    mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18M6 6l12 12',
    back: 'M15 18l-6-6 6-6',
    chevron: 'M9 18l6-6-6-6',
    flame:
        'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z',
    refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
    play: 'M7 4l13 8-13 8z',
    stop: 'M6 6h12v12H6z',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    pencil: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
    sparkles: 'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2zM19 3v4M21 5h-4',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    target:
        'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
    headphones: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z',
    keyboard: 'M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    bolt: 'M13 2 3 14h9l-1 8 10-12h-9z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    skip: 'M5 4l10 8-10 8zM19 5v14',
    lang: 'M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6',
    home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
    kana: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM3 12h18M12 3v18M6.5 7.5h2M15 6.5v3M6.5 16.5c1-1 1.5-1 2.5 0M15.5 15l1.5 2.5',
    book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M9 7h6',
    dumbbell: 'M5 7h3v10H5zM16 7h3v10h-3zM2 10h3v4H2zM19 10h3v4h-3zM8 12h8',
    clipboard: 'M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 4V3h6v1M9 13l2 2 4-4',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    cards: 'M9 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM4 7v11a2 2 0 0 0 2 2h1',
    puzzle: 'M10 4h4v3a2 2 0 1 0 4 0V4h2v6h-3a2 2 0 1 0 0 4h3v6h-6v-3a2 2 0 1 0-4 0v3H4v-6h3a2 2 0 1 0 0-4H4V4z',
    sort: 'M4 6h9M4 12h6M4 18h3M17 5v14l3-3M17 19l-3-3',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9',
    copy: 'M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2',
    brush: 'M14 4l6 6-8 8-6-6zM6 12c-2 1-3 3-3 6 3 0 5-1 6-3',
    read: 'M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    verb: 'M4 7h9M4 12h6M4 17h9M16 9l4 3-4 3',
    plus: 'M12 5v14M5 12h14',
    palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-1.1-1-1.5-1-2.6 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3zM7.5 11h.01M10.5 7h.01M15 7h.01',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
    heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
    plane: 'M2 13l20-8-6 16-4-6zM12 15l-2 5',
    bowl: 'M3 11h18a9 9 0 0 1-18 0zM9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4',
    briefcase: 'M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 7V5h6v2M3 13h18',
    cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
    tv: 'M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 3l4 3 4-3',
    gamepad: 'M7 8h10a5 5 0 0 1 0 10c-2 0-3-2-5-2s-3 2-5 2A5 5 0 0 1 7 8zM8 11v4M6 13h4M15.5 12h.01M17.5 14h.01',
    run: 'M13 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM7 21l3-6 3 2v5M5 12l3-4 4 1 3 4 3 1M10 15l2-6',
    music: 'M9 18V5l11-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    rice: 'M12 3c2 0 3.4 1.6 5 4.4l3 5.4C21.4 15.4 20.4 19 17.4 19H6.6C3.6 19 2.6 15.4 4 12.8l3-5.4C8.6 4.6 10 3 12 3zM8.5 13.5h7V19h-7z',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7-2.5 0-4-1-5.5-3L3 14a1.5 1.5 0 0 1 2.3-1.8L8 15',
    band: 'M3 10c6-3 12-3 18 0v4c-6-3-12-3-18 0zM12 10h.01',
    scarf: 'M4 8c5 3 11 3 16 0v4c-5 3-11 3-16 0zM14 13l1 8h3l-1-8',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
};

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.html',
    styleUrl: './icon.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
    // --- Inputs y outputs ---
    readonly name = input.required<string>();
    readonly size = input(20);
    readonly stroke = input(2);
    readonly fill = input(false);

    // --- Valores derivados (computed) ---
    /** Trazo del icono pedido (cadena vacía si el nombre no existe) */
    protected readonly pathData = computed(() => PATHS[this.name()] ?? '');
}
