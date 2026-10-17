// Tipos del modo «Escuchar» (/escuchar): reproducir palabras, frases y diálogos sin tocar el teléfono

/** Qué se escucha */
export type ListenContent = 'words' | 'sentences' | 'dialogues';

/** En qué orden suenan los idiomas: japonés y luego español, al revés, o solo japonés */
export type ListenMode = 'jp-es' | 'es-jp' | 'jp';

/** Pausa para pensar entre un idioma y el otro */
export type ListenPause = 'short' | 'normal' | 'long';

/** Configuración del modo escuchar; se guarda en nihongo:listenConfig */
export interface ListenConfig {
    lessons: number[];
    content: ListenContent[];
    mode: ListenMode;
    isSlow: boolean;
    /** Veces que suena el japonés de cada elemento (1 o 2) */
    repeat: number;
    pause: ListenPause;
    isShuffled: boolean;
    /** Elementos de la sesión; 0 = todos */
    count: number;
    /** Vuelve a empezar al terminar */
    isLooping: boolean;
}

/** Un elemento que se reproduce */
export interface ListenItem {
    /** Texto japonés que se enseña (con kanji si los tiene) */
    show: string;
    /** Texto japonés que se pronuncia (la lectura en kana de las palabras) */
    say: string;
    es: string;
    /** Voz del diálogo: 0 = A (femenina), 1 = B (masculina) */
    voice?: 0 | 1;
    /** Nombre de quien habla o título del diálogo, para la pantalla */
    note?: string;
    lesson: number;
}

/** Paso del elemento que está sonando (decide qué se enseña) */
export type ListenPhase = 'first' | 'think' | 'second' | 'gap';

/** Opción con texto e icono para los selectores del modo escuchar */
export interface ListenOption<T> {
    id: T;
    label: string;
    desc?: string;
    icon?: string;
}
