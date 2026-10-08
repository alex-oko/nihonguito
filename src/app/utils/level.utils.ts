import { LevelPreset } from '../interfaces/level-exam.interface';
import { normEs, similarity } from './text.utils';

/**
 * Exámenes de nivel de la clase. Nivel 1 = kana + L1–3; después, 4 lecciones por nivel:
 * parcial (中間テスト) = primera mitad, final (期末テスト) = segunda mitad.
 */
export const LEVEL_PRESETS: LevelPreset[] = [
    { id: 'n1-chukan', level: 1, kind: 'chukan', lessons: [1], kana: true },
    { id: 'n1-kimatsu', level: 1, kind: 'kimatsu', lessons: [2, 3] },
    { id: 'n2-chukan', level: 2, kind: 'chukan', lessons: [4, 5] },
    { id: 'n2-kimatsu', level: 2, kind: 'kimatsu', lessons: [6, 7] },
    { id: 'n3-chukan', level: 3, kind: 'chukan', lessons: [8, 9] },
    { id: 'n3-kimatsu', level: 3, kind: 'kimatsu', lessons: [10, 11] },
    { id: 'n4-chukan', level: 4, kind: 'chukan', lessons: [12, 13] },
    { id: 'n4-kimatsu', level: 4, kind: 'kimatsu', lessons: [14, 15] },
    { id: 'n5-chukan', level: 5, kind: 'chukan', lessons: [16, 17] },
    { id: 'n5-kimatsu', level: 5, kind: 'kimatsu', lessons: [18, 19] },
    { id: 'n6-chukan', level: 6, kind: 'chukan', lessons: [20, 21] },
    { id: 'n6-kimatsu', level: 6, kind: 'kimatsu', lessons: [22, 23] },
    { id: 'n7-kimatsu', level: 7, kind: 'kimatsu', lessons: [24, 25] },
];

/** Nombre japonés del tipo de examen, como sale en la cabecera de la hoja */
export const KIND_JP: Record<LevelPreset['kind'], string> = { chukan: '中間テスト', kimatsu: '期末テスト' };
/** Nombre en español del tipo de examen */
export const KIND_ES: Record<LevelPreset['kind'], string> = { chukan: 'Examen parcial', kimatsu: 'Examen final' };

/** Devuelve el subtítulo de la hoja: "Lección 4, Lección 5" o "ひらがな・カタカナ・Lección 1" */
export function lessonsLabel(lessons: number[], kana = false): string {
    const parts = lessons.map((lesson) => `Lección ${lesson}`);
    return kana ? ['ひらがな', 'カタカナ', ...parts].join('・') : parts.join(', ');
}

// ------------------------------- Números → lectura en hiragana ------------------------------------------------------------- //

/** Lectura de las unidades 0–9 (4 = よん y 7 = なな, las lecturas principales) */
const UNITS = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
/** Centenas con sus cambios de sonido (さんびゃく, ろっぴゃく, はっぴゃく) */
const HUNDREDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
/** Millares con sus cambios de sonido (さんぜん, はっせん) */
const THOUSANDS = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];

/** Lee en hiragana un número de 0 a 9999 (0 da cadena vacía) */
function readBelow10000(value: number): string {
    const thousands = Math.floor(value / 1000);
    const hundreds = Math.floor((value % 1000) / 100);
    const tens = Math.floor((value % 100) / 10);
    const units = value % 10;
    // 10–19 es じゅう…, no いちじゅう…
    const tensReading = tens ? (tens === 1 ? '' : UNITS[tens]) + 'じゅう' : '';
    return THOUSANDS[thousands] + HUNDREDS[hundreds] + tensReading + UNITS[units];
}

/** Devuelve la lectura en hiragana de un número hasta 99 999 999 */
export function numberToKana(value: number): string {
    if (value === 0) return 'ゼロ';
    const man = Math.floor(value / 10000);
    const rest = value % 10000;
    return (man ? readBelow10000(man) + 'まん' : '') + readBelow10000(rest);
}

/** Devuelve las lecturas aceptadas: la principal y, para 4, 7 y 9 por debajo de 20, la alternativa (し, しち, く) */
export function numberAlternatives(value: number): string[] {
    const main = numberToKana(value);
    const units = value % 10;
    const alternative: Record<number, string> = { 4: 'し', 7: 'しち', 9: 'く' };
    if (!alternative[units] || value >= 20) return [main];
    return [main, main.slice(0, -UNITS[units].length) + alternative[units]];
}

/** Devuelve un entero al azar entre min y max (ambos incluidos) */
function randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

/** Devuelve `count` números distintos como los de los exámenes de clase: pequeños, decenas, centenas y millares con trampa, un año y uno grande */
export function examNumbers(count: number): number[] {
    const generators = [
        () => randomInt(1, 9),
        () => randomInt(11, 19),
        () => [40, 70, 90][randomInt(0, 2)] + randomInt(0, 9),
        () => randomInt(21, 99),
        () => [100, 300, 600, 800][randomInt(0, 3)] + (Math.random() < 0.5 ? 0 : randomInt(1, 9)),
        () => randomInt(101, 999),
        () => [1000, 3000, 8000][randomInt(0, 2)] + (Math.random() < 0.5 ? 0 : randomInt(1, 99)),
        () => randomInt(2000, 2030),
        () => randomInt(10001, 99999),
    ];
    // Se recorren los generadores en orden, así cada tipo sale al menos una vez si count ≥ 9
    const numbers = new Set<number>();
    let index = 0;
    while (numbers.size < count) numbers.add(generators[index++ % generators.length]());
    return [...numbers];
}
// ------------------------------- Números → lectura en hiragana ------------------------------------------------------------- //

// ------------------------------- Preguntas extra y palabras interrogativas ------------------------------------------------------------- //

/** Preguntas de respuesta libre de la sección de puntos extra; `from` = primera lección en que se pueden preguntar */
export const BONUS_QUESTIONS: { from: number; q: string; model: string }[] = [
    { from: 1, q: 'おなまえは？', model: 'わたしは マリアです。' },
    { from: 1, q: 'おしごとは なんですか。', model: 'わたしは エンジニアです。' },
    { from: 2, q: 'あなたの かばんは どれですか。', model: 'これです。' },
    { from: 3, q: 'おくには どちらですか。', model: 'コロンビアです。' },
    { from: 4, q: 'まいあさ なんじに おきますか。', model: '6じに おきます。' },
    { from: 5, q: 'きのう どこへ いきましたか。', model: 'スーパーへ いきました。' },
    { from: 6, q: 'あした なにを しますか。', model: 'サッカーを します。' },
    { from: 7, q: 'もう ばんごはんを たべましたか。', model: 'いいえ、まだです。' },
    { from: 8, q: 'にほんごは むずかしいですか。', model: 'はい、とても むずかしいです。' },
    { from: 9, q: 'どんな たべものが すきですか。', model: 'ラーメンが すきです。' },
    { from: 10, q: 'あなたの うちの ちかくに なにが ありますか。', model: 'こうえんが あります。' },
    { from: 11, q: 'かぞくは なんにんですか。', model: '4にんです。' },
    { from: 12, q: 'きのうは さむかったですか。', model: 'いいえ、さむくなかったです。' },
    { from: 13, q: 'いま なにが いちばん ほしいですか。', model: 'あたらしい くるまが ほしいです。' },
    { from: 14, q: 'いま なにを して いますか。', model: 'にほんごを べんきょうして います。' },
    { from: 15, q: 'どこに すんで いますか。', model: 'ボゴタに すんで います。' },
    { from: 17, q: 'あした なにを しなければ なりませんか。', model: 'かいしゃへ いかなければ なりません。' },
    { from: 18, q: 'しゅみは なんですか。', model: 'えいがを みる ことです。' },
    { from: 19, q: 'にほんへ いった ことが ありますか。', model: 'いいえ、まだ ありません。' },
    { from: 21, q: 'にほんごの べんきょうは どう おもいますか。', model: 'おもしろいと おもいます。' },
    { from: 25, q: 'おかねが あったら、なにを したいですか。', model: 'せかいりょこうを したいです。' },
];

/** Palabras interrogativas, de la más larga a la más corta (なんじ debe probarse antes que なん) */
export const QUESTION_WORDS = [
    'なんようび', 'なんがつ', 'なんにち', 'なんじ', 'なんぷん', 'なんさい', 'なんにん', 'なんばん', 'なんかい',
    'どうして', 'どちら', 'どんな', 'いくら', 'いくつ', 'だれ', 'どこ', 'どれ', 'どの', 'どう', 'いつ', 'なに', 'なん',
];
// ------------------------------- Preguntas extra y palabras interrogativas ------------------------------------------------------------- //

// ------------------------------- Respuestas en español ------------------------------------------------------------- //

/** Artículos que se ignoran al comparar ("la casa" = "casa") */
const ARTICLES = /^(el|la|los|las|un|una|unos|unas|lo)\s+/;

/** Separa una glosa en sus traducciones aceptadas, sin paréntesis, corchetes ni artículos */
function spanishForms(gloss: string): string[] {
    return gloss
        .replace(/\[[^\]]*\]|［[^］]*］|\([^)]*\)|（[^）]*）/g, ' ')
        .split(/[,;/]|\s+o\s+|\s+u\s+/)
        .map((form) => normEs(form).replace(ARTICLES, '').trim())
        .filter((form) => form.length >= 2);
}

/** Corrige una traducción al español: 1 = correcta, 0.5 = casi, 0 = mal */
export function gradeSpanish(input: string, gloss: string): number {
    const given = normEs(input).replace(ARTICLES, '');
    if (!given) return 0;
    const forms = spanishForms(gloss);
    // 1. Igual a alguna traducción
    if (forms.some((form) => form === given)) return 1;
    // 2. Con 4+ letras: una contiene a la otra o se parecen al 80 % (erratas, plurales)
    if (given.length >= 4 && forms.some((form) => (form.length >= 4 && (form.includes(given) || given.includes(form))) || similarity(form, given) >= 0.8)) return 1;
    // 3. Con 4+ letras y un parecido del 65 %: medio punto
    if (given.length >= 4 && forms.some((form) => similarity(form, given) >= 0.65)) return 0.5;
    return 0;
}
// ------------------------------- Respuestas en español ------------------------------------------------------------- //
