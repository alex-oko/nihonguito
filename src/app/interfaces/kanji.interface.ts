// Tipos de la sección «Kanji» (/kanji): los kanji básicos (N5) con sus lecturas, trucos y palabras de las lecciones

/** Ficha fija de un kanji */
export interface KanjiEntry {
    char: string;
    /** Significado en español (el principal primero) */
    meaning: string;
    /** Lecturas «on» (de origen chino), en katakana */
    on: string[];
    /** Lecturas «kun» (japonesas), en hiragana; la terminación que va en hiragana entre paréntesis: た(べる) */
    kun: string[];
    strokes: number;
    /** Truco para recordarlo */
    tip: string;
}

/** Palabra de las lecciones que usa un kanji */
export interface KanjiWord {
    id: string;
    kanji: string;
    kana: string;
    es: string;
    lesson: number;
}

/** Kanji con la lección donde aparece primero y las palabras de las lecciones que lo usan */
export interface KanjiInfo extends KanjiEntry {
    /** Primera lección cuyo vocabulario lo usa; null si ninguna lo usa todavía */
    lesson: number | null;
    words: KanjiWord[];
}

/** Grupo de kanji de una misma lección en la lista */
export interface KanjiGroup {
    lesson: number | null;
    kanji: KanjiInfo[];
}

/** Tipos de ejercicio de /kanji/practica ('mixed' combina los de preguntas) */
export type KanjiDrill = 'meaning' | 'reverse' | 'words' | 'trace' | 'mixed';

/** Opción de práctica que se enseña en /kanji */
export interface KanjiDrillOption {
    id: KanjiDrill;
    label: string;
    desc: string;
    icon: string;
}
