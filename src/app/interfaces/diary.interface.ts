import { BlockRole, GuideSentence } from './grammar-guide.interface';

// Tipos de «Mi diario» (/diario): armar cada día una frase propia con un molde y guardarla

/** Palabra que se puede elegir en un hueco */
export interface DiaryOption {
    jp: string;
    es: string;
    /** Interés del alumno del que habla (estas salen primero si coincide) */
    tag?: string;
    /** La escribió el usuario (su `es` es el romaji de la palabra) */
    isCustom?: boolean;
}

/** Hueco del molde: qué papel cumple, qué partícula lleva y qué palabras se ofrecen */
export interface DiarySlot {
    role: BlockRole;
    /** Pregunta que responde el hueco («¿Dónde?») */
    label: string;
    /** Partícula que se pega detrás de la palabra elegida */
    particle?: string;
    /** Palabra que va delante del significado en «palabra por palabra» («en», «con»…) */
    esPrefix?: string;
    options: DiaryOption[];
    /** Se puede dejar vacío */
    isOptional?: boolean;
}

/** Tema del día: una pregunta sobre la vida del alumno y el molde para contestarla */
export interface DiaryPrompt {
    id: string;
    question: string;
    /** Molde con huecos, p. ej. «[cuándo] [dónde]で [qué]を [verbo]» */
    formula: string;
    tip: string;
    slots: DiarySlot[];
}

/** Frase guardada en el diario */
export interface DiaryEntry {
    id: string;
    /** Día en que se escribió (YYYY-MM-DD) */
    date: string;
    promptId: string;
    sentence: GuideSentence;
}
