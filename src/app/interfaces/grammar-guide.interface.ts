// Tipos de la sección «Gramática fácil» (/gramatica): partículas, estructura de la frase y su práctica

/** Papel que cumple un trozo de la frase; decide su color en toda la sección */
export type BlockRole = 'topic' | 'subject' | 'object' | 'place' | 'time' | 'extra' | 'describe' | 'verb';

/** Nombre corto, pregunta que responde y explicación de un papel */
export interface RoleInfo {
    label: string;
    /** Pregunta en español que responde ese trozo («¿Dónde?», «¿Qué?»…) */
    question: string;
    /** Explicación de una línea que se enseña al corregir */
    hint: string;
}

/** Trozo de una frase: una palabra y la partícula que lleva pegada detrás (si lleva) */
export interface SentenceBlock {
    word: string;
    particle?: string;
    role: BlockRole;
    /** Lleva 、 detrás (fin de la primera frase en «…が、…» o «…から、…») */
    comma?: boolean;
}

/** Frase de ejemplo partida en trozos con su papel */
export interface GuideSentence {
    blocks: SentenceBlock[];
    es: string;
    /** Por qué va esa partícula (se enseña al corregir el ejercicio de partículas) */
    why?: string;
    /** Trozo que se tapa en el ejercicio de partículas (por defecto, el primero con la partícula de su ficha) */
    blank?: number;
    /** Partículas incorrectas que se ofrecen junto a la buena; sin ellas la frase no entra en ese ejercicio */
    distractors?: string[];
    /** Interés del alumno del que habla la frase (ver utils/interests.utils.ts) */
    tag?: string;
    /** Ficha de partícula a la que pertenece cuando su partícula sola no basta (el が de «pero» no es el de sujeto) */
    guide?: string;
}

/** Concepto básico (sustantivo, verbo, sujeto…) explicado en palabras sencillas */
export interface GrammarConcept {
    id: string;
    name: string;
    jpName?: string;
    /** La idea en una frase */
    short: string;
    body: string;
    examples: GuideSentence[];
    tip?: string;
}

/** Otro uso de una partícula que ya tiene ficha (に para qué, から porque…) */
export interface ParticleUse {
    title: string;
    body: string;
    examples: GuideSentence[];
}

/** Ficha de una partícula */
export interface ParticleGuide {
    /** Identificador estable de la ficha (la partícula, o «pero» para が・けど) */
    id: string;
    /** Partícula o pareja que se enseña (から・まで) */
    particle: string;
    /** Partículas que cuentan como «de esta ficha» al buscar el hueco y los ejemplos por interés */
    forms: string[];
    romaji: string;
    /** Apodo para recordarla («la del tema») */
    nickname: string;
    /** Pregunta que responde la palabra que la lleva */
    question: string;
    short: string;
    body: string;
    examples: GuideSentence[];
    /** Error típico o confusión frecuente */
    trap?: string;
    /** Otros usos de la misma partícula, cada uno con sus ejemplos */
    extraUses?: ParticleUse[];
}

/** Pareja de partículas que se confunden, con un ejemplo de cada lado */
export interface ParticlePair {
    title: string;
    body: string;
    sides: { label: string; sentence: GuideSentence }[];
}

/** Fila del resumen rápido: qué preguntas y qué partícula toca */
export interface CheatRow {
    role: BlockRole;
    question: string;
    particle: string;
}

/** Grupo de filas del resumen rápido con su título */
export interface CheatGroup {
    title: string;
    rows: CheatRow[];
}

/** Regla de oro del orden de la frase */
export interface GoldenRule {
    title: string;
    body: string;
}

/** Molde de frase básico (A は B です, lugar で verbo…) */
export interface SentenceMold {
    id: string;
    name: string;
    /** Fórmula con huecos, p. ej. «A は B です» */
    formula: string;
    short: string;
    examples: GuideSentence[];
    tip?: string;
}

/** Paso del método para pasar una frase del español al japonés */
export interface BuildStep {
    ask: string;
    found: string;
    /** Trozo que sale de ese paso; sin él es un paso de «se puede quitar» */
    block?: SentenceBlock;
}

/** Ejemplo resuelto del método paso a paso */
export interface WorkedExample {
    es: string;
    steps: BuildStep[];
    result: GuideSentence;
}

/** Pestañas de /gramatica */
export type GrammarTab = 'basics' | 'particles' | 'build' | 'practice';

/** Tipos de ejercicio de /gramatica/practica ('mixed' los combina) */
export type GrammarDrill = 'particles' | 'roles' | 'build' | 'mixed';

/** Opción de práctica que se enseña en la pestaña «Practicar» */
export interface GrammarDrillOption {
    id: GrammarDrill;
    label: string;
    desc: string;
    icon: string;
}
