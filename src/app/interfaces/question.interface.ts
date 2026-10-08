import { Sentence } from './lesson.interface';

// ------------------------------- Preguntas (motor compartido) ------------------------------------------------------------- //

/** Tipo de pregunta: elegir, escribir, ordenar, pronunciar o tarjeta de explicación */
export type QuestionKind = 'choice' | 'type' | 'order' | 'speak' | 'note';

/** Campos comunes a todas las preguntas */
export interface QuestionBase {
    id: string;
    kind: QuestionKind;
    /** Etiqueta pequeña encima del enunciado, p. ej. «¿Qué significa?» */
    label: string;
    /** Texto principal del enunciado */
    prompt: string;
    /** Línea secundaria bajo el enunciado (lectura, pista…) */
    sub?: string;
    /** La línea `sub` es solo la lectura en kana (se oculta si se ve furigana o solo kana) */
    subIsReading?: boolean;
    /** Texto japonés que se pronuncia; con `audioOnly` el enunciado se oculta hasta responder */
    audio?: string;
    audioOnly?: boolean;
    /** Estilo de letra del enunciado */
    promptStyle?: 'jp-big' | 'jp' | 'es';
    /** Id del elemento que se sigue (carácter kana o id de palabra) para el dominio y el repaso espaciado */
    track?: { kind: 'kana' | 'word'; id: string };
    /** Se enseña después de responder */
    explain?: string;
}

/** Elegir la respuesta entre varias opciones */
export interface ChoiceQuestion extends QuestionBase {
    kind: 'choice';
    choices: string[];
    answer: string;
    choiceStyle?: 'jp' | 'jp-big' | 'es';
}

/** Escribir la respuesta */
export interface TypeQuestion extends QuestionBase {
    kind: 'type';
    /** Respuestas aceptadas (se comparan normalizadas) */
    answers: string[];
    /** 'kana' / 'katakana': el romaji escrito se convierte a kana al vuelo. 'romaji': latín tal cual. 'es': texto en español */
    input: 'kana' | 'katakana' | 'romaji' | 'es';
    placeholder?: string;
}

/** Ordenar los trozos de una frase */
export interface OrderQuestion extends QuestionBase {
    kind: 'order';
    tokens: string[];
    answer: string[];
}

/** Decir en voz alta el texto `target` */
export interface SpeakQuestion extends QuestionBase {
    kind: 'speak';
    target: string;
}

/** No es una pregunta: tarjeta corta de explicación entre ejercicios (sesiones guiadas) */
export interface NoteQuestion extends QuestionBase {
    kind: 'note';
    body?: string;
    examples?: Sentence[];
    /** Palabras para memorizar, en lista con audio */
    words?: { jp: string; reading: string; es: string }[];
    /** Técnica de estudio que se enseña al pie de la tarjeta */
    tip?: string;
}

/** Cualquier pregunta del motor */
export type Question = ChoiceQuestion | TypeQuestion | OrderQuestion | SpeakQuestion | NoteQuestion;

/** Una respuesta del usuario */
export interface AnswerRecord {
    question: Question;
    correct: boolean;
    given: string;
}

/** Resultado de una sesión terminada */
export interface SessionResult {
    title: string;
    records: AnswerRecord[];
    xp: number;
    durationMs: number;
    /** Granos de arroz para Musubi ganados en esta sesión */
    grains?: number;
}
// ------------------------------- Preguntas (motor compartido) ------------------------------------------------------------- //

// ------------------------------- Modos de cada generador ------------------------------------------------------------- //

/** Modos de pregunta de kana ('mixed' elige uno al azar en cada pregunta) */
export type KanaMode = 'read' | 'recognize' | 'type' | 'listen' | 'mixed';

/** Modos de pregunta de vocabulario */
export type VocabMode = 'meaning' | 'reverse' | 'listen' | 'write' | 'speak';

/** Modos de pregunta de frases */
export type SentenceMode = 'order' | 'particle' | 'meaning' | 'listen' | 'speak';

/** Formas verbales que se practican (además de la forma ます) */
export type VerbForm = 'dict' | 'te' | 'nai' | 'ta';
// ------------------------------- Modos de cada generador ------------------------------------------------------------- //
