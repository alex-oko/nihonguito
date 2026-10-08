import type { Tone } from './dashboard.interface';
import type { LevelPreset } from './level-exam.interface';

// Formato de una lección tal como llega de public/data/lessons/NN.json (lo genera tools/build-data.mjs desde content/lessons)

/** Categoría gramatical de una palabra; decide en qué filtro de «Palabras» aparece */
export type WordType =
    | 'verb'
    | 'noun'
    | 'i-adj'
    | 'na-adj'
    | 'adv'
    | 'pron'
    | 'expr'
    | 'counter'
    | 'name'
    | 'other';

/** Palabra del vocabulario de una lección */
export interface Word {
    /** Identificador estable (`L01-001`); el progreso se guarda como `w:<id>` */
    id: string;
    kana: string;
    kanji?: string;
    es: string;
    type?: WordType;
    lesson: number;
}

/** Frase en japonés con su traducción */
export interface Sentence {
    jp: string;
    es: string;
    /** Intereses del alumno de los que habla la frase (ver utils/interests.utils.ts) */
    tags?: string[];
}

/** Par pregunta–respuesta de la sección «Preguntas y respuestas» */
export interface QA {
    qjp: string;
    qes: string;
    ajp: string;
    aes: string;
    tags?: string[];
}

/** Punto de gramática con su explicación y ejemplos */
export interface GrammarPoint {
    title: string;
    explain: string;
    examples?: Sentence[];
}

/** Línea de un diálogo; `who` decide la voz (A = femenina, B = masculina) */
export interface ConversationLine {
    who: 'A' | 'B';
    name?: string;
    jp: string;
    es: string;
}

/** Diálogo de una lección (`id` con forma `LNN-c1`) */
export interface Conversation {
    id: string;
    title: string;
    situation?: string;
    lines: ConversationLine[];
    tags?: string[];
    lesson: number;
}

/** Lista de palabras extra agrupadas por tema */
export interface ExtraVocab {
    topic: string;
    items: { kana: string; kanji?: string; es: string }[];
}

/** Lección completa */
export interface Lesson {
    id: number;
    title: string;
    titleJp?: string;
    summary?: string;
    vocab: Word[];
    patterns: Sentence[];
    examples: QA[];
    grammar: GrammarPoint[];
    phrases: Sentence[];
    conversations: Conversation[];
    extraVocab: ExtraVocab[];
    culture: string[];
    /** Frases cotidianas extra, 2 por interés del alumno (con su tag) */
    extras?: Sentence[];
}

/** Resumen de una lección en data/lessons/index.json (sirve para listar sin cargar cada lección) */
export interface LessonMeta {
    id: number;
    title: string;
    titleJp?: string;
    vocabCount: number;
    grammarCount: number;
    conversationCount: number;
}

/** Verbo del apéndice con sus formas conjugadas */
export interface VerbEntry {
    masu: string;
    kanji?: string;
    es: string;
    dict: string;
    te: string;
    nai: string;
    ta: string;
    group: 1 | 2 | 3;
    lesson?: number;
}

/** Contenido de data/appendix.json: gramática general, tablas de palabras y verbos */
export interface Appendix {
    grammar: GrammarPoint[];
    tables: { topic: string; items: { kana: string; kanji?: string; es: string }[] }[];
    verbs: VerbEntry[];
}

// ------------------------------- Tipos de las vistas de lecciones ------------------------------------------------------------- //

/** Fila de una lección en la lista de /lecciones */
export interface LessonRow {
    meta: LessonMeta;
    /** Palabras de la lección en la caja de Leitner `KNOWN_BOX` o más */
    known: number;
    /** Mejor nota de la prueba final, o null si nunca la hizo */
    best: number | null;
    /** Texto de la etiqueta de la derecha (Dominada, En curso…) */
    pill: string;
    tone: Tone | 'next';
    state: 'now' | 'done' | 'todo';
}

/** Examen de nivel intercalado en la lista, justo después de la última lección que cubre */
export interface LessonExamRow {
    preset: LevelPreset;
    after: number;
}

/** Elemento de un grupo de nivel en la lista: una lección o un examen */
export type LessonListItem = { kind: 'lesson'; row: LessonRow } | { kind: 'exam'; exam: LessonExamRow };

/** Pestañas de la ficha de una lección */
export type LessonTab = 'practice' | 'vocab' | 'grammar' | 'phrases' | 'extra';

/** Filtro de la pestaña «Palabras» por tipo de palabra */
export interface WordTypeFilter {
    id: string;
    label: string;
    /** Tipos que entran en el filtro; vacío en «Todas» */
    types: WordType[];
}

/** Fase del reproductor de conversaciones */
export type ConversationMode = 'intro' | 'listen' | 'role' | 'done';

/** Resultado de una línea que el usuario dijo o escribió en el juego de rol */
export interface ConversationLineResult {
    /** Parecido con la línea modelo, de 0 a 1 */
    score: number;
    heard: string;
    method: 'voz' | 'texto' | 'saltada';
}
// ------------------------------- Tipos de las vistas de lecciones ------------------------------------------------------------- //
