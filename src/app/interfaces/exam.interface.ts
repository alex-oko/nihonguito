/** Secciones que se pueden combinar en el examen personalizado (/examen) */
export type ExamSection =
    | 'vocab'
    | 'listen'
    | 'write'
    | 'sentences'
    | 'particles'
    | 'speak'
    | 'verbs'
    | 'hiragana'
    | 'katakana';

/** Lo que el usuario elige en el creador de exámenes (se guarda en nihongo:examConfig) */
export interface ExamConfig {
    lessons: number[];
    sections: ExamSection[];
    count: number;
    /** Modo examen real: sin correcciones hasta el final ni segundas oportunidades */
    strict: boolean;
}

/** Tarjeta de una sección en el creador: nombre, descripción e icono */
export interface ExamSectionInfo {
    id: ExamSection;
    label: string;
    desc: string;
    icon: string;
}
