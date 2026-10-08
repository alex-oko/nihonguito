/** Silabario: hiragana (palabras japonesas) o katakana (palabras extranjeras) */
export type Script = 'hiragana' | 'katakana';

/** Pestaña de la tabla a la que pertenece una fila: básicos, con tenten, combinados o extranjeros (solo katakana) */
export type KanaGroup = 'basic' | 'dakuten' | 'yoon' | 'extended';

/** Un símbolo kana con sus lecturas en romaji */
export interface Kana {
    char: string;
    /** Romaji principal primero y luego las alternativas que también se aceptan */
    romaji: string[];
    row: string;
    group: KanaGroup;
    script: Script;
}

/** Una fila de la tabla de kana (あいうえお, かきくけこ…) */
export interface KanaRow {
    id: string;
    label: string;
    group: KanaGroup;
    /** null = celda vacía en la cuadrícula de la tabla */
    cells: (Kana | null)[];
}

/** Definición compacta de una fila con los dos silabarios: id, etiqueta, hiragana, katakana y romaji */
export type KanaRowDef = [id: string, label: string, hira: string, kata: string, romaji: string];

/** Definición compacta de una fila que solo existe en katakana (combinaciones para palabras extranjeras) */
export type ExtendedRowDef = [id: string, label: string, kata: string, romaji: string];

/* ---------------- Grupos de parecidos ---------------- */

/** Símbolos que se confunden entre sí y el truco para distinguirlos */
export interface Lookalike {
    chars: string[];
    tip: string;
}

/** Regla del katakana con su explicación y ejemplos [palabra, lectura · significado] */
export interface KatakanaRule {
    title: string;
    body: string;
    examples: [string, string][];
}
