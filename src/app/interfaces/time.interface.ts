/** Temas de la pantalla de números y tiempo (una pestaña cada uno) */
export type TopicId = 'numbers' | 'week' | 'months' | 'dates' | 'clock' | 'duration';

/** Una expresión de un tema: japonés, lectura en kana, significado y una nota opcional */
export interface TimeEntry {
    jp: string;
    reading: string;
    es: string;
    note?: string;
}

/** Un tema con su kanji de pestaña, su explicación corta y sus expresiones */
export interface TimeTopic {
    id: TopicId;
    glyph: string;
    name: string;
    intro: string;
    entries: TimeEntry[];
}
