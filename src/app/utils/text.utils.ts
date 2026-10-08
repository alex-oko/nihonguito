/**
 * Utilidades de texto sin estado: barajar y elegir opciones, normalizar respuestas en japonés y
 * en español, romaji, distancia de edición y fechas como YYYY-MM-DD. Las usan casi todas las
 * vistas y los servicios de exámenes y lecturas.
 */
import { toHiragana, toKatakana, toRomaji } from 'wanakana';

/** Espacios y puntuación (japonesa y occidental) que no cuentan al comparar respuestas */
const PUNCT = /[\s　。、．，,.!！?？・「」『』（）()〜~\-…]/g;

/** Kanji del rango CJK común: si un token los tiene, romaji() lo pasa antes a kana */
const KANJI = /[一-龯]/;

/** Milisegundos de un día */
const MS_PER_DAY = 86400000;

// Lector kanji → kana que registra FuriganaService al cargar furigana.json (null hasta entonces)
let kanjiReader: ((text: string) => string) | null = null;

// ------------------------------- Azar y opciones ------------------------------------------------------------- //
/** Devuelve una copia barajada (Fisher-Yates) */
export function shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Devuelve `count` elementos al azar sin repetir posición */
export function sample<T>(items: readonly T[], count: number): T[] {
    return shuffle(items).slice(0, count);
}

/** Devuelve un elemento al azar */
export function pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

/** Elige `count` distractores distintos de `answer` (como texto), sin valores repetidos */
export function distractors(answer: string, pool: readonly string[], count = 3): string[] {
    const uniqueOptions = [...new Set(pool.filter((option) => option && option !== answer))];
    return sample(uniqueOptions, count);
}

/** Devuelve `count` opciones barajadas: la respuesta más count - 1 distractores */
export function choicesWith(answer: string, pool: readonly string[], count = 4): string[] {
    return shuffle([answer, ...distractors(answer, pool, count - 1)]);
}
// ------------------------------- Azar y opciones ------------------------------------------------------------- //

// ------------------------------- Normalización ------------------------------------------------------------- //
/** Normaliza para comparar respuestas en japonés: sin espacios ni puntuación, katakana → hiragana */
export function normJp(text: string): string {
    // Pasa antes por katakana para que ー se expanda igual en los dos lados (みらー = ミラー)
    return toHiragana(toKatakana(text.replace(PUNCT, ''), { passRomaji: true }), { passRomaji: true }).toLowerCase();
}

/** Quita espacios y puntuación pero conserva las marcas de vocal larga (para comparar katakana) */
export function normKana(text: string): string {
    return text.replace(/[\s　。、．，,.!！?？・「」]/g, '');
}

/** Normaliza para comparar respuestas en español: minúsculas, sin tildes ni signos, espacios simples */
export function normEs(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        // Tras NFD las tildes quedan como marcas combinantes (U+0300–U+036F) y se pueden quitar.
        // La ñ también se descompone (n + tilde), así que acaba como n y la ñ del filtro siguiente nunca llega
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñ ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
// ------------------------------- Normalización ------------------------------------------------------------- //

// ------------------------------- Romaji ------------------------------------------------------------- //
/** Registra el lector kanji → kana que usa romaji(); lo llama FuriganaService al cargar */
export function setKanjiReader(reader: (text: string) => string): void {
    kanjiReader = reader;
}

/**
 * Romaji Hepburn. En el texto separado por espacios las partículas van pegadas a la
 * palabra anterior, así que un は/へ/を final en un token de varios kana se lee wa/e/o.
 */
export function romaji(text: string): string {
    return text
        .split(/[\s　]+/)
        .map((token) => (kanjiReader && KANJI.test(token) ? kanjiReader(token) : token))
        .join(' ')
        .trim()
        .split(/[\s　]+/)
        .map((token) => {
            const particleMatch = token.match(/^(.+?)([はへを])([。、？！?!]*)$/);
            // はは (madre) se queda "haha"; これは → "kore wa"; 私は → "私 wa"
            if (particleMatch && (particleMatch[1].length >= 2 || /[^\u3040-\u309f]/.test(particleMatch[1]))) {
                const particle = particleMatch[2] === 'は' ? ' wa' : particleMatch[2] === 'へ' ? ' e' : ' o';
                return toRomaji(particleMatch[1]) + particle + toRomaji(particleMatch[3]);
            }
            return toRomaji(token);
        })
        .join(' ');
}
// ------------------------------- Romaji ------------------------------------------------------------- //

// ------------------------------- Similitud ------------------------------------------------------------- //
/** Devuelve la distancia de Levenshtein (inserciones, borrados y cambios) entre dos textos */
export function levenshtein(first: string, second: string): number {
    const lengthA = first.length;
    const lengthB = second.length;
    if (!lengthA) return lengthB;
    if (!lengthB) return lengthA;
    // Solo se guardan dos filas de la matriz: la anterior y la actual
    let previousRow = Array.from({ length: lengthB + 1 }, (_, i) => i);
    for (let i = 1; i <= lengthA; i++) {
        const currentRow = [i];
        for (let j = 1; j <= lengthB; j++) {
            currentRow[j] = Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1));
        }
        previousRow = currentRow;
    }
    return previousRow[lengthB];
}

/** Devuelve la similitud entre dos textos, de 0 a 1 (1 = iguales) */
export function similarity(first: string, second: string): number {
    if (!first && !second) return 1;
    return 1 - levenshtein(first, second) / Math.max(first.length, second.length);
}
// ------------------------------- Similitud ------------------------------------------------------------- //

// ------------------------------- Frases ------------------------------------------------------------- //
/** Parte una frase con las palabras separadas por espacios en tokens */
export function tokens(jp: string): string[] {
    return jp
        .trim()
        .split(/[\s　]+/)
        .filter(Boolean);
}

/** Devuelve la traducción sin las notas entre paréntesis, para opciones compactas */
export function shortEs(es: string): string {
    const short = es.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    return short || es;
}
// ------------------------------- Frases ------------------------------------------------------------- //

// ------------------------------- Fechas ------------------------------------------------------------- //
/** Devuelve la fecha local como YYYY-MM-DD (la clave de los registros por día) */
export function todayKey(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Devuelve los días entre dos fechas YYYY-MM-DD (positivo si `to` es posterior) */
export function daysBetween(from: string, to: string): number {
    // A medianoche local y con redondeo, para que un cambio de horario (días de 23 o 25 h) no reste un día
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');
    return Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
}
// ------------------------------- Fechas ------------------------------------------------------------- //
