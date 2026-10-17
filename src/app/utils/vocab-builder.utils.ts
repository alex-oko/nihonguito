/**
 * Opciones de «Vocabulario fácil» (/vocabulario) y de la pestaña «Palabras» de cada lección: filtros por
 * tipo de palabra, formas de practicar y cantidades.
 */
import { Word, WordType, WordTypeFilter } from '../interfaces/lesson.interface';
import { VocabDrillOption } from '../interfaces/vocab-builder.interface';

/** Filtros por tipo de palabra (el de «Todas» solo lo usa la ficha de lección) */
export const WORD_TYPE_FILTERS: WordTypeFilter[] = [
    { id: 'all', label: 'Todas', types: [] },
    { id: 'noun', label: 'Sustantivos', types: ['noun', 'pron'] },
    { id: 'verb', label: 'Verbos', types: ['verb'] },
    { id: 'adj', label: 'Adjetivos', types: ['i-adj', 'na-adj'] },
    { id: 'expr', label: 'Expresiones', types: ['expr', 'adv', 'other', 'counter'] },
    { id: 'name', label: 'Nombres', types: ['name'] },
];

/** Tipos marcados la primera vez en el creador (los nombres propios casi no sirven para practicar) */
export const DEFAULT_VOCAB_TYPES = ['noun', 'verb', 'adj', 'expr'];

/** Cantidades de palabras que se pueden elegir */
export const VOCAB_COUNTS = [10, 20, 30];

/** Formas de practicar del creador */
export const VOCAB_DRILLS: VocabDrillOption[] = [
    { id: 'cards', label: 'Tarjetas', desc: 'Ve la palabra, piensa y voltea', icon: 'cards' },
    { id: 'meaning', label: '¿Qué significa?', desc: 'Del japonés al español', icon: 'eye' },
    { id: 'reverse', label: 'Al japonés', desc: 'Del español al japonés', icon: 'swap' },
    { id: 'listen', label: 'Escucha', desc: 'Oye la palabra y elige', icon: 'headphones' },
    { id: 'write', label: 'Escribir', desc: 'Escríbela en kana', icon: 'pencil' },
    { id: 'match', label: 'Parejas', desc: 'Une cada palabra con su significado', icon: 'puzzle' },
    { id: 'mixed', label: 'Todo mezclado', desc: 'Significado, al japonés, escucha y escribir', icon: 'shuffle' },
];

/** Devuelve las palabras cuyo tipo entra en alguno de los filtros elegidos (por id) */
export function filterByTypes(words: Word[], typeIds: string[]): Word[] {
    const types = new Set(WORD_TYPE_FILTERS.filter((filter) => typeIds.includes(filter.id)).flatMap((filter) => filter.types));
    // Una palabra sin tipo cuenta como expresión, igual que 'other'
    return words.filter((word) => types.has((word.type ?? 'other') as WordType));
}
