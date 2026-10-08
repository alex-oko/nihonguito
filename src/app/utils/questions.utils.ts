/**
 * Generadores de preguntas del motor compartido: kana, katakana de préstamo, vocabulario, frases
 * (ordenar, partícula, significado, pronunciar) y verbos. Todos devuelven `Question[]` listas para
 * `app-question-runner`. También reúne las ayudas para limpiar las formas de una palabra
 * (`cleanForm`, `wordMain`, `wordReading`), que usan muchas vistas y `tools/build-audio.mjs`.
 */
import { isKatakana, toKatakana } from 'wanakana';
import { allKana, KATAKANA_LOOKALIKES, HIRAGANA_LOOKALIKES, LOANWORDS } from './kana.utils';
import { Kana, Script } from '../interfaces/kana.interface';
import { VerbEntry } from '../interfaces/lesson.interface';
import { ChoiceQuestion, OrderQuestion, Question, SpeakQuestion, TypeQuestion } from '../interfaces/question.interface';
import { Sentence, Word } from '../interfaces/lesson.interface';
import { choicesWith, pick, sample, shortEs, shuffle, tokens } from './text.utils';
import { KanaMode, VocabMode, SentenceMode, VerbForm } from '../interfaces/question.interface';

/** Partículas que `splitParticle` y `particleQuestion` buscan al final de un trozo (las largas primero) */
const PARTICLES = ['から', 'まで', 'は', 'を', 'へ', 'が', 'に', 'で', 'と', 'も', 'の'];

/** Palabras que siempre cuentan como conocidas al buscar partículas, aunque no estén en el vocabulario */
const BASE_KNOWN_STEMS = ['わたし', 'あなた', 'これ', 'それ', 'あれ', 'ここ', 'そこ', 'あそこ', 'だれ', 'なん', 'なに', 'どこ', 'きょう', 'あした', 'きのう', 'うち', 'えき'];

/** Etiqueta de cada forma verbal, para los enunciados */
export const VERB_FORM_LABEL: Record<VerbForm, string> = {
    dict: 'forma diccionario',
    te: 'forma て',
    nai: 'forma ない',
    ta: 'forma た',
};

// Contador para los ids de pregunta (q1, q2…): solo tienen que ser únicos en la sesión
let questionCounter = 0;

/** Devuelve el siguiente id de pregunta */
const nextQuestionId = () => `q${++questionCounter}`;

// ------------------------------- Formas de una palabra ------------------------------------------------------------- //
/** Limpia una forma del vocabulario: "すいます［たばこを～］" → "すいます";  "あの ひと（あの かた）" → principal + alternativas */
export function cleanForm(form: string | undefined): { main: string; alts: string[] } {
    if (!form) return { main: '', alts: [] };
    // 1. Quitar lo que va entre corchetes (contexto de uso) y los asteriscos
    let text = form.replace(/[［\[][^\]］]*[\]］]/g, '').replace(/\*/g, '');
    // 2. Lo que va entre paréntesis son formas alternativas
    const alts: string[] = [];
    text = text.replace(/[（(]([^)）]*)[)）]/g, (_, inner: string) => {
        alts.push(inner.trim());
        return '';
    });
    return { main: text.replace(/\s+/g, ' ').trim(), alts };
}

/** Devuelve la forma principal de la palabra: en kanji si la tiene y se pide, si no en kana */
export function wordMain(word: Word, kanji = true): string {
    const kanjiForm = cleanForm(word.kanji).main;
    return kanji && kanjiForm ? kanjiForm : cleanForm(word.kana).main;
}

/** Devuelve la lectura en kana de la palabra, ya limpia */
export function wordReading(word: Word): string {
    return cleanForm(word.kana).main;
}

/** Indica si la palabra se puede escribir o decir tal cual (sin huecos como ～ ni lecturas largas) */
export function isPlainWord(word: Word): boolean {
    const reading = wordReading(word);
    return !!reading && !/[～〜\-－]/.test(reading) && reading.length <= 14;
}

/** Devuelve lo que se enseña de la palabra: la forma principal y, si es distinta, la lectura debajo */
function wordDisplay(word: Word, kanji: boolean): { main: string; sub?: string } {
    const main = wordMain(word, kanji);
    const reading = wordReading(word);
    return { main, sub: main !== reading ? reading : undefined };
}
// ------------------------------- Formas de una palabra ------------------------------------------------------------- //

// ------------------------------- Kana ------------------------------------------------------------- //
/** Devuelve los kana que se parecen al dado (シ/ツ, ぬ/め…), sin él */
function lookalikesOf(kana: Kana): string[] {
    const groups = kana.script === 'katakana' ? KATAKANA_LOOKALIKES : HIRAGANA_LOOKALIKES;
    return [...new Set(groups.filter((group) => group.chars.includes(kana.char)).flatMap((group) => group.chars))].filter(
        (char) => char !== kana.char,
    );
}

/** Genera `count` preguntas de kana (leer, reconocer, escribir romaji o escuchar) sobre la lista dada */
export function kanaQuestions(list: Kana[], mode: KanaMode, count: number, script: Script): Question[] {
    // 1. Sin lista se practica el silabario entero; se baraja en rondas hasta llegar a `count`
    const pool = allKana(script);
    const source = list.length ? list : pool;
    const items: Kana[] = [];
    while (items.length < count) items.push(...shuffle(source));
    return items.slice(0, count).map((kana) => {
        // 2. 'mixed' elige un modo al azar en cada pregunta
        const questionMode: Exclude<KanaMode, 'mixed'> =
            mode === 'mixed' ? pick(['read', 'recognize', 'type', 'listen'] as const) : mode;
        const track = { kind: 'kana' as const, id: kana.char };
        const romajiPool = pool.map((poolKana) => poolKana.romaji[0]);
        // 3. Los parecidos van dos veces en el pool para que salgan más como distractores
        const similar = lookalikesOf(kana);
        const charPool = [...similar, ...similar, ...source.map((sourceKana) => sourceKana.char), ...pool.map((poolKana) => poolKana.char)];
        switch (questionMode) {
            case 'read':
                return {
                    id: nextQuestionId(),
                    kind: 'choice',
                    label: '¿Cómo se lee?',
                    prompt: kana.char,
                    promptStyle: 'jp-big',
                    audio: kana.char,
                    choices: choicesWith(kana.romaji[0], romajiPool),
                    answer: kana.romaji[0],
                    choiceStyle: 'es',
                    track,
                } satisfies ChoiceQuestion;
            case 'recognize':
                return {
                    id: nextQuestionId(),
                    kind: 'choice',
                    label: `Encuentra «${kana.romaji[0]}»`,
                    prompt: kana.romaji[0],
                    promptStyle: 'es',
                    choices: choicesFromPriority(kana.char, similar, charPool),
                    answer: kana.char,
                    choiceStyle: 'jp-big',
                    audio: kana.char,
                    track,
                } satisfies ChoiceQuestion;
            case 'type':
                return {
                    id: nextQuestionId(),
                    kind: 'type',
                    label: 'Escribe la lectura en romaji',
                    prompt: kana.char,
                    promptStyle: 'jp-big',
                    answers: kana.romaji,
                    input: 'romaji',
                    placeholder: 'ej. ka',
                    audio: kana.char,
                    track,
                } satisfies TypeQuestion;
            case 'listen':
                return {
                    id: nextQuestionId(),
                    kind: 'choice',
                    label: 'Escucha y elige',
                    prompt: kana.char,
                    promptStyle: 'jp-big',
                    audio: kana.char,
                    audioOnly: true,
                    choices: choicesFromPriority(kana.char, similar, charPool),
                    answer: kana.char,
                    choiceStyle: 'jp-big',
                    track,
                } satisfies ChoiceQuestion;
        }
    });
}

/** Arma las opciones poniendo primero los distractores parecidos: más difícil, se aprende mejor */
function choicesFromPriority(answer: string, priority: string[], pool: string[], choiceCount = 4): string[] {
    const picked = new Set<string>([answer]);
    // Como mucho 2 parecidos (hasta 3 con la respuesta), así queda sitio para uno del pool
    for (const char of shuffle(priority)) {
        if (picked.size >= Math.min(choiceCount, 3)) break;
        picked.add(char);
    }
    for (const char of shuffle(pool)) {
        if (picked.size >= choiceCount) break;
        picked.add(char);
    }
    return shuffle([...picked]);
}

/** Genera `count` preguntas de «¿Cuál es…?» entre kana que se parecen */
export function lookalikeQuestions(script: Script, count: number): Question[] {
    const groups = script === 'katakana' ? KATAKANA_LOOKALIKES : HIRAGANA_LOOKALIKES;
    const pool = allKana(script);
    const questions: Question[] = [];
    while (questions.length < count) {
        const group = pick(groups);
        const char = pick(group.chars);
        const kana = pool.find((poolKana) => poolKana.char === char)!;
        // Un grupo de menos de 4 no llena las opciones: se completa con kana de los otros grupos
        const extra = group.chars.length < 4 ? groups.flatMap((otherGroup) => otherGroup.chars) : [];
        questions.push({
            id: nextQuestionId(),
            kind: 'choice',
            label: `¿Cuál es «${kana.romaji[0]}»?`,
            prompt: kana.romaji[0],
            promptStyle: 'es',
            choices: choicesFromPriority(char, group.chars.filter((groupChar) => groupChar !== char), extra),
            answer: char,
            choiceStyle: 'jp-big',
            audio: char,
            explain: group.tip,
            track: { kind: 'kana', id: char },
        } satisfies ChoiceQuestion);
    }
    return questions;
}
// ------------------------------- Kana ------------------------------------------------------------- //

// ------------------------------- Katakana de préstamo ------------------------------------------------------------- //
/** Genera `count` preguntas de palabras en katakana: 2 de cada 3 de leer, 1 de escribir */
export function loanwordQuestions(count: number, extra: [string, string][] = []): Question[] {
    const all = dedupeLoanwords([...LOANWORDS, ...extra]);
    const esPool = all.map(([, es]) => es);
    return sample(all, count).map(([katakana, es], index) =>
        index % 3 === 2
            ? ({
                id: nextQuestionId(),
                kind: 'type',
                label: `Escribe «${es}» en katakana`,
                prompt: es,
                promptStyle: 'es',
                sub: 'Escribe en romaji: se convierte solo. Usa «-» para ー',
                answers: [katakana],
                input: 'katakana',
                audio: katakana,
                explain: `${katakana}`,
            } satisfies TypeQuestion)
            : ({
                id: nextQuestionId(),
                kind: 'choice',
                label: 'Lee la palabra: ¿qué significa?',
                prompt: katakana,
                promptStyle: 'jp-big',
                audio: katakana,
                choices: choicesWith(es, esPool),
                answer: es,
                choiceStyle: 'es',
            } satisfies ChoiceQuestion),
    );
}

/** Quita las palabras repetidas (por su katakana), quedándose con la primera */
function dedupeLoanwords(list: [string, string][]): [string, string][] {
    const seen = new Set<string>();
    return list.filter(([katakana]) => (seen.has(katakana) ? false : (seen.add(katakana), true)));
}

/** Saca del vocabulario de las lecciones las palabras en katakana (préstamos, países…) como pares [katakana, español] */
export function katakanaFromWords(words: Word[]): [string, string][] {
    return words
        .map((word) => [wordReading(word), shortEs(word.es)] as [string, string])
        .filter(([reading]) => reading.length >= 2 && isKatakana(reading.replace(/[・\s]/g, '')));
}
// ------------------------------- Katakana de préstamo ------------------------------------------------------------- //

// ------------------------------- Vocabulario ------------------------------------------------------------- //
/** Genera una pregunta de vocabulario del modo pedido; `pool` da los distractores */
export function vocabQuestion(word: Word, mode: VocabMode, pool: Word[], kanji: boolean): Question {
    const display = wordDisplay(word, kanji);
    const es = shortEs(word.es);
    const esPool = pool.map((poolWord) => shortEs(poolWord.es));
    const track = { kind: 'word' as const, id: word.id };
    const reading = wordReading(word);
    switch (mode) {
        case 'meaning':
            return {
                id: nextQuestionId(),
                kind: 'choice',
                label: '¿Qué significa?',
                prompt: display.main,
                sub: display.sub,
                subIsReading: true,
                promptStyle: 'jp',
                audio: reading,
                choices: choicesWith(es, esPool),
                answer: es,
                choiceStyle: 'es',
                track,
            };
        case 'reverse': {
            const jpPool = pool.map((poolWord) => wordMain(poolWord, kanji));
            return {
                id: nextQuestionId(),
                kind: 'choice',
                label: '¿Cómo se dice en japonés?',
                prompt: es,
                promptStyle: 'es',
                choices: choicesWith(display.main, jpPool),
                answer: display.main,
                choiceStyle: 'jp',
                audio: reading,
                track,
            };
        }
        case 'listen':
            return {
                id: nextQuestionId(),
                kind: 'choice',
                label: 'Escucha: ¿qué significa?',
                prompt: display.main,
                sub: display.sub,
                subIsReading: true,
                promptStyle: 'jp',
                audio: reading,
                audioOnly: true,
                choices: choicesWith(es, esPool),
                answer: es,
                choiceStyle: 'es',
                track,
            };
        case 'write': {
            // Se escribe en el silabario de la lectura: katakana para préstamos, hiragana para el resto
            const isKatakanaWord = isKatakana(reading.replace(/[・\s]/g, ''));
            return {
                id: nextQuestionId(),
                kind: 'type',
                label: isKatakanaWord ? 'Escríbelo en katakana' : 'Escríbelo en hiragana',
                prompt: es,
                promptStyle: 'es',
                sub: isKatakanaWord ? 'Escribe en romaji, se convierte a katakana' : 'Escribe en romaji, se convierte a hiragana',
                answers: [reading, ...cleanForm(word.kana).alts],
                input: isKatakanaWord ? 'katakana' : 'kana',
                audio: reading,
                track,
            };
        }
        case 'speak':
            return {
                id: nextQuestionId(),
                kind: 'speak',
                label: 'Pronuncia en voz alta',
                prompt: display.main,
                sub: es,
                promptStyle: 'jp',
                target: reading,
                audio: reading,
                track,
            } satisfies SpeakQuestion;
    }
}

/** Genera `count` preguntas de vocabulario con modos al azar entre los pedidos */
export function vocabQuestions(words: Word[], modes: VocabMode[], count: number, pool: Word[], kanji: boolean): Question[] {
    // 1. Solo palabras con lectura; si todos los modos son de escribir o decir, solo las «limpias»
    let usable = words.filter((word) => wordReading(word));
    if (modes.every((mode) => mode === 'write' || mode === 'speak')) {
        const plain = usable.filter(isPlainWord);
        if (plain.length) usable = plain;
    }
    if (!usable.length) return [];
    // 2. Barajar en rondas hasta llegar a `count` (con pocas palabras alguna se repite)
    const items: Word[] = [];
    while (items.length < count) items.push(...shuffle(usable));
    return items.slice(0, count).map((word) => {
        // 3. Escribir y decir solo con palabras limpias; si no queda modo, 'meaning'
        const allowed = modes.filter((mode) => (mode === 'write' || mode === 'speak' ? isPlainWord(word) : true));
        // Con un pool de 4 palabras o menos no hay distractores suficientes: se usan las propias palabras
        return vocabQuestion(word, pick(allowed.length ? allowed : ['meaning']), pool.length > 4 ? pool : usable, kanji);
    });
}
// ------------------------------- Vocabulario ------------------------------------------------------------- //

// ------------------------------- Frases ------------------------------------------------------------- //
/** Genera una pregunta de ordenar la frase (null si tiene menos de 3 o más de 9 trozos) */
export function orderQuestion(sentence: Sentence): OrderQuestion | null {
    const sentenceTokens = tokens(sentence.jp);
    if (sentenceTokens.length < 3 || sentenceTokens.length > 9) return null;
    return {
        id: nextQuestionId(),
        kind: 'order',
        label: 'Ordena la frase',
        prompt: sentence.es,
        promptStyle: 'es',
        tokens: shuffleDifferent(sentenceTokens),
        answer: sentenceTokens,
        audio: sentence.jp,
    };
}

/** Baraja los trozos asegurando que no queden en el orden correcto (tras 6 intentos, los invierte) */
function shuffleDifferent(sentenceTokens: string[]): string[] {
    for (let i = 0; i < 6; i++) {
        const shuffled = shuffle(sentenceTokens);
        if (shuffled.join() !== sentenceTokens.join()) return shuffled;
    }
    return [...sentenceTokens].reverse();
}

/** Separa la partícula final de un trozo si la raíz parece una palabra conocida: "わたしは" → { stem: 'わたし', particle: 'は' } */
export function splitParticle(token: string, known: Set<string>): { stem: string; particle: string } | null {
    if (known.has(token)) return null;
    for (const particle of PARTICLES) {
        if (token.length > particle.length && token.endsWith(particle)) {
            const stem = token.slice(0, -particle.length);
            // Raíz válida: palabra conocida, termina en kanji, katakana o ん, o es un nombre con さん
            const isValidStem = known.has(stem) || /[一-龯゠-ヿん]$/.test(stem) || stem.endsWith('さん');
            return isValidStem ? { stem, particle } : null;
        }
    }
    return null;
}

/**
 * Genera una pregunta de completar la partícula: tapa una partícula al final de un trozo cuando la raíz
 * es una palabra conocida (así no tapa palabras como いつも o ちょっと).
 */
export function particleQuestion(sentence: Sentence, known: Set<string>): ChoiceQuestion | null {
    // 1. Buscar los trozos que terminan en partícula con una raíz válida (misma regla que splitParticle)
    const sentenceTokens = tokens(sentence.jp);
    const candidates: { index: number; particle: string }[] = [];
    sentenceTokens.forEach((token, index) => {
        if (known.has(token)) return;
        for (const particle of PARTICLES) {
            if (token.length > particle.length && token.endsWith(particle)) {
                const stem = token.slice(0, -particle.length);
                if (known.has(stem) || /[一-龯゠-ヿん]$/.test(stem) || stem.endsWith('さん')) {
                    candidates.push({ index, particle });
                }
                break;
            }
        }
    });
    if (!candidates.length) return null;
    // 2. Tapar una al azar y ofrecerla junto a otras 3 partículas
    const { index, particle } = pick(candidates);
    const shown = sentenceTokens
        .map((token, tokenIndex) => (tokenIndex === index ? token.slice(0, -particle.length) + '＿＿' : token))
        .join(' ');
    const pool = PARTICLES.filter((otherParticle) => otherParticle !== particle);
    return {
        id: nextQuestionId(),
        kind: 'choice',
        label: 'Completa con la partícula',
        prompt: shown,
        sub: sentence.es,
        promptStyle: 'jp',
        choices: shuffle([particle, ...sample(pool, 3)]),
        answer: particle,
        choiceStyle: 'jp',
        audio: sentence.jp,
        explain: sentence.jp,
    };
}

/** Genera una pregunta de «¿Qué significa?» de una frase; con `listen` la frase solo se oye */
export function sentenceMeaningQuestion(sentence: Sentence, pool: Sentence[], listen = false): ChoiceQuestion {
    return {
        id: nextQuestionId(),
        kind: 'choice',
        label: listen ? 'Escucha: ¿qué dice?' : '¿Qué significa?',
        prompt: sentence.jp,
        promptStyle: 'jp',
        audio: sentence.jp,
        audioOnly: listen,
        choices: choicesWith(sentence.es, pool.map((poolSentence) => poolSentence.es)),
        answer: sentence.es,
        choiceStyle: 'es',
    };
}

/** Genera una pregunta de leer la frase en voz alta */
export function speakSentenceQuestion(sentence: Sentence): SpeakQuestion {
    return {
        id: nextQuestionId(),
        kind: 'speak',
        label: 'Lee en voz alta',
        prompt: sentence.jp,
        sub: sentence.es,
        promptStyle: 'jp',
        target: sentence.jp,
        audio: sentence.jp,
    };
}

/** Genera hasta `count` preguntas de frases con modos al azar entre los pedidos */
export function sentenceQuestions(
    sentences: Sentence[],
    modes: SentenceMode[],
    count: number,
    known: Set<string>,
): Question[] {
    const questions: Question[] = [];
    const pool = sentences.filter((sentence) => sentence.jp && sentence.es);
    if (!pool.length) return questions;
    const used = new Set<string>();
    const uniqueCount = new Set(pool.map((sentence) => sentence.jp)).size;
    // Tope de intentos: un modo puede no servir para ninguna frase (p. ej. ordenar con frases cortas)
    let attempts = 0;
    while (questions.length < count && attempts++ < count * 8) {
        // El pool puede repetir frases a propósito (pesadas por los intereses del usuario)
        const sentence = pick(pool);
        // No repetir una frase mientras queden otras sin usar
        if (used.has(sentence.jp) && used.size < uniqueCount) continue;
        const mode = pick(modes);
        let question: Question | null = null;
        // Significado y escucha necesitan 4 frases para tener distractores
        if (mode === 'order') question = orderQuestion(sentence);
        else if (mode === 'particle') question = particleQuestion(sentence, known);
        else if (mode === 'meaning') question = pool.length >= 4 ? sentenceMeaningQuestion(sentence, pool) : null;
        else if (mode === 'listen') question = pool.length >= 4 ? sentenceMeaningQuestion(sentence, pool, true) : null;
        else if (mode === 'speak') question = speakSentenceQuestion(sentence);
        if (question) {
            questions.push(question);
            used.add(sentence.jp);
        }
    }
    return questions;
}

/** Reúne las formas de las palabras (sin espacios) que valen como «raíz conocida» al detectar partículas */
export function knownStems(words: Word[]): Set<string> {
    const stems = new Set<string>();
    for (const word of words) {
        for (const form of [cleanForm(word.kana), cleanForm(word.kanji)]) {
            if (form.main) stems.add(form.main.replace(/\s+/g, ''));
            form.alts.forEach((alt) => stems.add(alt.replace(/\s+/g, '')));
        }
    }
    BASE_KNOWN_STEMS.forEach((stem) => stems.add(stem));
    return stems;
}
// ------------------------------- Frases ------------------------------------------------------------- //

// ------------------------------- Verbos ------------------------------------------------------------- //
/** Genera `count` preguntas de conjugación: 1 de cada 3 de elegir, el resto de escribir */
export function verbQuestions(verbs: VerbEntry[], forms: VerbForm[], count: number): Question[] {
    return sample(verbs, count).map((verb, index) => {
        const form = pick(forms);
        const answer = verb[form];
        if (index % 3 === 1) {
            // Los distractores preferidos son las otras formas del mismo verbo
            const pool = forms.flatMap((poolForm) => verbs.map((poolVerb) => poolVerb[poolForm]));
            const similar = (['te', 'ta', 'nai', 'dict'] as VerbForm[])
                .map((otherForm) => verb[otherForm])
                .filter((conjugated) => conjugated !== answer);
            return {
                id: nextQuestionId(),
                kind: 'choice',
                label: `${VERB_FORM_LABEL[form]} de…`,
                prompt: verb.masu,
                sub: `${verb.es} · grupo ${'I'.repeat(verb.group)}`,
                promptStyle: 'jp',
                choices: choicesFromPriority(answer, similar, pool),
                answer,
                choiceStyle: 'jp',
                audio: answer,
            } satisfies ChoiceQuestion;
        }
        return {
            id: nextQuestionId(),
            kind: 'type',
            label: `Escribe la ${VERB_FORM_LABEL[form]}`,
            prompt: verb.masu,
            sub: `${verb.es} · grupo ${'I'.repeat(verb.group)}`,
            promptStyle: 'jp',
            answers: [answer],
            input: 'kana',
            audio: answer,
            explain: `${verb.masu} → ${answer}`,
        } satisfies TypeQuestion;
    });
}
// ------------------------------- Verbos ------------------------------------------------------------- //

// ------------------------------- Otros ------------------------------------------------------------- //
/** Pasa un texto a katakana (envoltorio de `toKatakana` de wanakana) */
export function toKata(text: string): string {
    return toKatakana(text);
}
// ------------------------------- Otros ------------------------------------------------------------- //
