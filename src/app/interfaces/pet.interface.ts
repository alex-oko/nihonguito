/**
 * Musubi como mascota: tres necesidades que bajan con el tiempo real y que solo se cuidan con
 * lo que se gana practicando (granos de arroz). Es amable a propósito: nunca enferma ni muere,
 * las necesidades nunca bajan de FLOOR y un día sin entrar solo le da hambre o hace que te extrañe.
 */

/** Estado guardado de la mascota (clave `nihongo:pet`) */
export interface PetState {
    /** Panza, de FLOOR a 100 */
    food: number;
    /** Alegría, de FLOOR a 100 */
    joy: number;
    /** Energía, de FLOOR a 100 */
    energy: number;
    /** Granos de arroz disponibles para comida y tienda */
    grains: number;
    asleep: boolean;
    /** Última vez que se pusieron al día las necesidades (ms) */
    tick: number;
    /** Ropa puesta, como mucho una por zona */
    wearing: string[];
    /** Objetos comprados con granos */
    owned: string[];
    /** Ids de desbloqueos ya mostrados, para marcar los nuevos */
    seen: string[];
    /** Última etapa de crecimiento que el usuario ya vio celebrada */
    stageSeen: number;
    /** Día de las caricias de hoy (solo las primeras suben la alegría) */
    petDay: string;
    /** Caricias dadas en `petDay` */
    petN: number;
}

/** Relleno de onigiri que Musubi puede comer en la despensa */
export interface Topping {
    id: string;
    ja: string;
    es: string;
    color: string;
    /** Precio en granos */
    cost: number;
    /** Lecciones dominadas (test de lección ≥ 80%) que hacen falta para desbloquearlo */
    need: number;
    /** Puntos de panza que suma */
    food: number;
    /** Lo que dice al comerlo: [japonés, español] */
    say: [string, string];
}

/** Etapa de crecimiento de Musubi, según el XP total */
export interface Stage {
    name: string;
    ja: string;
    /** XP total a partir del que se llega a esta etapa */
    xp: number;
    /** Qué cambia en Musubi en esta etapa */
    look: string;
}

/** Métrica de progreso con la que se gana un objeto */
export type Metric = 'streak' | 'mastered' | 'words' | 'xp' | 'exam';

/** Algo para Musubi o su habitación: se gana con un logro o se compra con granos */
export interface PetItem {
    id: string;
    kind: 'ropa' | 'casa';
    /** Zona del cuerpo (solo ropa): una prenda por zona */
    slot?: 'head' | 'face' | 'neck';
    name: string;
    /** Logro que lo desbloquea… */
    goal?: { metric: Metric; n: number };
    /** …o su precio en granos */
    cost?: number;
    /** Recorte del dibujo de la habitación para la miniatura (casa) */
    vb?: string;
}

/** Ánimo de la mascota que calcula PetService */
export type PetMood = 'idle' | 'happy' | 'wow' | 'oops' | 'eat' | 'sad' | 'hungry' | 'sleep' | 'sleepy' | 'love' | 'laugh';

/** Caras que sabe poner app-musubi (hoy los mismos valores que PetMood) */
export type MusubiMood = 'idle' | 'happy' | 'wow' | 'oops' | 'eat' | 'sad' | 'hungry' | 'sleep' | 'sleepy' | 'love' | 'laugh';

/** Una ronda del juego de 5 palabras de la casa de Musubi */
export interface PetGameRound {
    /** Lectura en kana que dice Musubi */
    japanese: string;
    romaji: string;
    /** Significado correcto (corto, en español) */
    answer: string;
    /** La respuesta y tres distractores, barajados */
    options: string[];
}

/** Estado de una partida del juego de 5 palabras */
export interface PetGameState {
    rounds: PetGameRound[];
    /** Ronda actual */
    index: number;
    /** Aciertos hasta ahora */
    correct: number;
    /** Resultado de cada ronda ya respondida */
    results: boolean[];
    done: boolean;
    /** Granos ganados al terminar */
    grains: number;
}

/** Corazón o estrella que sale al acariciar a Musubi */
export interface PetPop {
    id: number;
    /** Posición dentro de la habitación (px) */
    x: number;
    y: number;
    /** Desvío horizontal mientras sube (px) */
    driftX: number;
    isStar: boolean;
}

/** Celebración de una etapa nueva: de qué etapa a cuál, y si ya terminó la animación de carga */
export interface PetEvolution {
    from: number;
    to: number;
    done: boolean;
}
