/**
 * Intereses del usuario (viajes, comida, anime…): la lista que se elige en Perfil y cómo se usan
 * para escoger y repetir más las frases de la lección que hablan de ellos.
 */
import { Lesson, Sentence } from '../interfaces/lesson.interface';
import { Interest } from '../interfaces/interest.interface';

/** Temas que el usuario puede elegir en Perfil; las frases de las lecciones los llevan en `tags` */
export const INTERESTS: Interest[] = [
    { id: 'viajes', label: 'Viajes', icon: 'plane' },
    { id: 'comida', label: 'Comida', icon: 'bowl' },
    { id: 'trabajo', label: 'Trabajo', icon: 'briefcase' },
    { id: 'estudios', label: 'Estudios', icon: 'cap' },
    { id: 'anime', label: 'Anime y manga', icon: 'tv' },
    { id: 'videojuegos', label: 'Videojuegos', icon: 'gamepad' },
    { id: 'deporte', label: 'Deporte', icon: 'run' },
    { id: 'musica', label: 'Música', icon: 'music' },
];

/** Veces que se repite una frase de los intereses del usuario en `weighByInterest` */
const DEFAULT_INTEREST_WEIGHT = 3;

// ------------------------------- Etiquetas ------------------------------------------------------------- //
/** Devuelve la etiqueta de un interés (o su id si no existe) */
export const interestLabel = (id: string): string => INTERESTS.find((interest) => interest.id === id)?.label ?? id;
// ------------------------------- Etiquetas ------------------------------------------------------------- //

// ------------------------------- Frases por interés ------------------------------------------------------------- //
/** Indica si la frase lleva alguna etiqueta de los intereses elegidos */
const matchesInterests = (sentence: Sentence, interests: string[]) => !!sentence.tags?.some((tag) => interests.includes(tag));

/** Devuelve las frases extra de la lección sobre los intereses del usuario (todas si no eligió ninguno) */
export function forYou(lesson: Lesson, interests: string[]): Sentence[] {
    const extras = lesson.extras ?? [];
    return interests.length ? extras.filter((sentence) => matchesInterests(sentence, interests)) : extras;
}

/** Repite las frases de los intereses del usuario para que las elecciones al azar las favorezcan */
export function weighByInterest(sentences: Sentence[], interests: string[], weight = DEFAULT_INTEREST_WEIGHT): Sentence[] {
    if (!interests.length) return sentences;
    return sentences.flatMap((sentence) => (matchesInterests(sentence, interests) ? Array(weight).fill(sentence) : [sentence]));
}
// ------------------------------- Frases por interés ------------------------------------------------------------- //
