import { VocabMode } from './question.interface';

// Tipos de «Vocabulario fácil» (/vocabulario): elegir lecciones y tipos de palabra y practicar solo esas

/** Forma de practicar: un modo de pregunta de vocabulario, tarjetas, parejas o todo mezclado */
export type VocabDrill = VocabMode | 'cards' | 'match' | 'mixed';

/** Opción de práctica que se enseña en el creador */
export interface VocabDrillOption {
    id: VocabDrill;
    label: string;
    desc: string;
    icon: string;
}

/** Configuración del creador; se guarda en nihongo:vocabConfig para la próxima vez */
export interface VocabConfig {
    lessons: number[];
    /** Ids de WORD_TYPE_FILTERS elegidos */
    types: string[];
    mode: VocabDrill;
    count: number;
}
