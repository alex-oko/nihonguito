/**
 * "Examen de nivel": hojas con el mismo formato que los exámenes de clase
 * (日本語教室 Nivel N 中間テスト / 期末テスト, siempre sobre 50 puntos).
 */

/** Un examen de nivel disponible (fijo de LEVEL_PRESETS o personalizado) */
export interface LevelPreset {
    id: string;
    level: number;
    kind: 'chukan' | 'kimatsu';
    lessons: number[];
    /** El parcial del Nivel 1 también evalúa las tablas de kana */
    kana?: boolean;
    /** Exámenes personalizados: título en lugar de 「Nivel N 中間/期末テスト」 */
    title?: string;
}

// ------------------------------- Modelo de la hoja ------------------------------------------------------------- //

/** hira/kata: escritura fija · mixed: sigue el selector あ/ア · es: texto en español · order: tocar fichas · pick: elegir del banco */
export type SlotInput = 'hira' | 'kata' | 'mixed' | 'es' | 'order' | 'pick';

/** Cómo se corrige una casilla (ver LevelExamService.checkSlot) */
export type SlotCheck = 'exact' | 'particle' | 'es' | 'fuzzy' | 'free-kata' | 'free-jp' | 'order';

/** Una casilla en blanco de la hoja */
export interface Slot {
    id: string;
    input: SlotInput;
    check: SlotCheck;
    /** Respuesta esperada principal (también es la corrección que se enseña) */
    expected: string;
    alts?: string[];
    /** order: fichas barajadas */
    tokens?: string[];
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** Texto en línea con huecos: un trozo de texto o el índice de una casilla del ítem */
export type Seg = string | { slot: number };

/** Una pregunta numerada de la hoja; puede tener varias casillas */
export interface ExamItem {
    id: string;
    points: number;
    slots: Slot[];
    /** Etiqueta de la izquierda (palabra, número, verbo…) */
    prompt?: string;
    promptJp?: boolean;
    /** Frase con huecos */
    segs?: Seg[];
    /** Diálogo de dos líneas con huecos */
    lines?: { who: string; segs: Seg[] }[];
    hint?: string;
    /** Id de la palabra, para el repaso espaciado */
    word?: string;
    /** Respuesta modelo de las preguntas libres */
    model?: string;
}

/** Tipo de sección: decide cómo la pinta la hoja */
export type SectionType =
    | 'kana-h'
    | 'kana-k'
    | 'vocab'
    | 'particles'
    | 'answer'
    | 'dialog'
    | 'interrogative'
    | 'order'
    | 'numbers'
    | 'verbs'
    | 'name'
    | 'bonus';

/** Celda de la tabla de kana */
export interface GridCell {
    char: string | null;
    /** Id del ítem cuando la celda es un hueco */
    item?: string;
}

/** Una sección numerada de la hoja */
export interface LevelExamSection {
    type: SectionType;
    heading: string;
    /** Puntuación como en papel: "(1×10)" */
    scheme: string;
    help?: string;
    items: ExamItem[];
    /** Tablas de kana: un array por fila de KANA_ROWS (あ行, か行…) con sus 5 celdas; en papel cada una es una columna */
    grid?: GridCell[][];
    /** Tablas de kana: formas para elegir (no se escribe romaji) */
    bank?: string[];
    /** Puntos extra: no cuentan en el total de 50 */
    bonus?: boolean;
}

/** Hoja completa generada */
export interface LevelExam {
    id: string;
    presetId: string;
    title: string;
    subtitle: string;
    sections: LevelExamSection[];
    /** Suma de puntos sin la sección extra */
    total: number;
    createdAt: number;
}

/** Nota de una casilla: 1, 0.5 o 0, con una nota opcional en rojo */
export interface SlotResult {
    score: number;
    note?: string;
}

/** Hoja en curso o entregada (se guarda en nihongo:levelDraft) */
export interface Draft {
    exam: LevelExam;
    /** Respuesta por id de casilla (las de ordenar guardan también `<id>:idx`) */
    answers: Record<string, string>;
    /** Ítems que el usuario marcó como «Mi respuesta vale» */
    overrides: Record<string, boolean>;
    startedAt: number;
    submittedAt?: number;
}
// ------------------------------- Modelo de la hoja ------------------------------------------------------------- //
