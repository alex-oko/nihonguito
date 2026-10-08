/**
 * Sesión guiada de una lección: 5 palabras con su tarjeta de técnica de estudio, 2 puntos de gramática
 * explicados con sus ejercicios y frases completas al final. Reúne también la rotación de la gramática
 * (cada sesión sigue donde terminó la anterior) y los ejercicios de gramática sueltos.
 */
import { forYou, interestLabel, weighByInterest } from './interests.utils';
import { lessonSentences } from './lesson-content.utils';
import { ChoiceQuestion, NoteQuestion, Question } from '../interfaces/question.interface';
import { GrammarPoint, Lesson, Sentence, Word } from '../interfaces/lesson.interface';
import { orderQuestion, sentenceMeaningQuestion, sentenceQuestions, speakSentenceQuestion, vocabQuestions, wordMain, wordReading } from './questions.utils';
import { loadRaw, save } from './storage.utils';
import { pick, shortEs, shuffle } from './text.utils';

/** Técnicas de estudio, una por sesión, que se enseñan en la tarjeta de vocabulario */
export const STUDY_TIPS = [
    'Recuerdo activo: antes de ver la respuesta, intenta decirla tú. Forzar a la memoria es lo que la fija.',
    'De 5 en 5: la memoria de trabajo maneja pocos elementos a la vez. Por eso cada sesión trae solo 5 palabras.',
    'Imagen absurda: une el sonido con una escena loca. やま (montaña) → «¡Ya, mamá, sube la montaña!».',
    'Dilo en voz alta: oírte a ti mismo usa otra vía de memoria. Toca cada palabra y repítela.',
    'Repaso espaciado: lo que fallas vuelve pronto y lo que sabes, más tarde. Volver mañana rinde más que estudiar el doble hoy.',
    'Hazlo tuyo: piensa una frase de tu vida con la palabra. Lo personal se recuerda mucho mejor.',
    'Contexto: una palabra suelta se olvida; dentro de una frase se queda. Por eso al final lo usarás todo junto.',
];

/** Cuántos puntos de gramática enseña cada sesión guiada */
export const GRAMMAR_PER_SESSION = 2;

/** Partículas que sirven de distractores en los huecos y que `findKey` trata con reglas de palabra */
const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'から', 'まで', 'や', 'より'];

/** Kana sueltos que valen como clave de gramática (los demás de una letra, como la て de «forma て», no) */
const SINGLE_KANA_KEYS = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'や', 'ね', 'よ'];

/** Clave de localStorage (con el prefijo nihongo:) del cursor de gramática por lección */
const CURSOR_KEY = 'guided';

/** Ejercicios por punto de gramática */
const EXERCISES_PER_GRAMMAR = 2;

/** Preguntas de frases del último paso */
const FINAL_SENTENCE_QUESTIONS = 5;

/** Largo máximo (caracteres) de la frase que se pide leer en voz alta al final */
const MAX_SPOKEN_SENTENCE_LENGTH = 24;

/** Con menos frases modelo que esto se usan todas las frases de la lección */
const MIN_MODEL_SENTENCES = 6;

// Contador para los ids de pregunta (g1, g2…), separado del de questions.utils
let guidedCounter = 0;

/** Devuelve el siguiente id de pregunta de la sesión guiada */
const nextGuidedId = () => `g${++guidedCounter}`;

/** Escapa un texto para usarlo dentro de una RegExp */
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ------------------------------- Rotación de la gramática ------------------------------------------------------------- //
/** Devuelve por qué punto de gramática va la lección (0 si nunca se hizo una sesión) */
export function grammarCursor(lessonId: number): number {
    return loadRaw<Record<string, number>>(CURSOR_KEY, {})[lessonId] ?? 0;
}

/** Devuelve los índices de los puntos de gramática que enseñará la próxima sesión (da la vuelta al llegar al final) */
export function nextGrammar(lesson: Lesson): number[] {
    const grammarCount = lesson.grammar.length;
    if (!grammarCount) return [];
    const start = grammarCursor(lesson.id) % grammarCount;
    const count = Math.min(GRAMMAR_PER_SESSION, grammarCount);
    return Array.from({ length: count }, (_, i) => (start + i) % grammarCount);
}

/** Avanza el cursor de gramática de la lección al terminar una sesión guiada */
export function advanceGrammar(lesson: Lesson): void {
    const cursors = loadRaw<Record<string, number>>(CURSOR_KEY, {});
    // `|| 1` evita dividir entre 0 en una lección sin gramática
    const grammarCount = lesson.grammar.length || 1;
    cursors[lesson.id] = ((cursors[lesson.id] ?? 0) + GRAMMAR_PER_SESSION) % grammarCount;
    save(CURSOR_KEY, cursors);
}
// ------------------------------- Rotación de la gramática ------------------------------------------------------------- //

// ------------------------------- Gramática → ejercicios ------------------------------------------------------------- //
/**
 * Saca del título de un punto de gramática los fragmentos japoneses que sirven de hueco:
 * "じゃ ありません — 'no es'" → ['じゃありません'];  "N1のN2" → ['の'];  "Vてください" → ['てください']
 */
export function grammarKeys(grammar: GrammarPoint): string[] {
    // 1. Solo la parte antes de la raya (lo de después es la traducción)
    const head = grammar.title.split(/\s+[—–]\s+|\s+-\s+/)[0];
    // 2. Partir por separadores, quitar paréntesis, ～ y espacios, y cortar por letras latinas (N1, V…)
    const keys = head
        .split(/[\/／・、,|]/)
        .flatMap((part) =>
            part
                .replace(/[（(].*?[)）]/g, '')
                .replace(/[～〜\s　…]/g, '')
                .split(/[A-Za-zÀ-ÿ0-9\-－+\[\]:：]+/),
        )
        // 3. Quedarse con trozos cortos solo de kana o kanji
        .filter((key) => key && key.length <= 8 && /^[぀-ヿ一-龯]+$/.test(key))
        // un kana suelto solo sirve si es una partícula (no la て de «forma て»)
        .filter((key) => key.length > 1 || SINGLE_KANA_KEYS.includes(key));
    return [...new Set(keys)];
}

/** Busca la clave de gramática dentro de una frase, tolerando los espacios que separan las palabras */
function findKey(jp: string, key: string): { start: number; end: number } | null {
    const pattern = new RegExp(key.split('').map(escapeRegExp).join('[\\s　]*'), 'g');
    for (let match = pattern.exec(jp); match; match = pattern.exec(jp)) {
        const start = match.index;
        const end = start + match[0].length;
        if (PARTICLES.includes(key)) {
            // Una partícula necesita una palabra delante y un corte detrás (evita は en はい, の en この)
            const before = jp[start - 1];
            const after = jp[end];
            if (!before || /[\s　。、？！]/.test(before)) continue;
            if (key.length === 1 && after && !/[\s　。、？！…]/.test(after)) continue;
            if (/^[こそあど]$/.test(before) && (start < 2 || /[\s　]/.test(jp[start - 2]))) continue;
        }
        return { start, end };
    }
    return null;
}

/** Devuelve las frases de la lección que usan un punto de gramática (primero sus propios ejemplos) */
export function grammarSentences(grammar: GrammarPoint, all: Sentence[]): Sentence[] {
    const keys = grammarKeys(grammar);
    const own = (grammar.examples ?? []).filter((sentence) => sentence.jp && sentence.es);
    const more = all.filter((sentence) => !own.some((ownSentence) => ownSentence.jp === sentence.jp) && keys.some((key) => findKey(sentence.jp, key)));
    return [...own, ...shuffle(more)];
}

/** Genera una pregunta de elegir el elemento de gramática que falta: "ミラーさん＿＿ 会社員です" */
function blankQuestion(sentence: Sentence, grammar: GrammarPoint, otherKeys: string[]): ChoiceQuestion | null {
    for (const key of shuffle(grammarKeys(grammar))) {
        const hit = findKey(sentence.jp, key);
        if (!hit) continue;
        const shown = sentence.jp.slice(0, hit.start) + '＿＿' + sentence.jp.slice(hit.end);
        // Distractores: claves de los otros puntos y partículas, sin las que contienen la respuesta o están contenidas en ella
        const pool = [...shuffle(otherKeys), ...shuffle(PARTICLES)].filter(
            (candidate) => candidate !== key && !key.includes(candidate) && !candidate.includes(key),
        );
        const choices = shuffle([key, ...[...new Set(pool)].slice(0, 3)]);
        if (choices.length < 3) continue;
        return {
            id: nextGuidedId(),
            kind: 'choice',
            label: 'Completa la frase',
            prompt: shown,
            sub: sentence.es,
            promptStyle: 'jp',
            choices,
            answer: key,
            choiceStyle: 'jp',
            audio: sentence.jp,
            explain: grammar.title,
        };
    }
    return null;
}

/** Genera los ejercicios de un punto de gramática, alternando completar el hueco y ordenar o entender la frase */
export function grammarQuestions(grammar: GrammarPoint, lesson: Lesson, count = EXERCISES_PER_GRAMMAR): Question[] {
    const all = lessonSentences(lesson);
    const sentences = grammarSentences(grammar, all);
    const otherKeys = lesson.grammar.filter((otherGrammar) => otherGrammar !== grammar).flatMap(grammarKeys);
    const questions: Question[] = [];
    const used = new Set<string>();
    // 1. Alternar hueco (pares) y ordenar (impares) con las frases que usan el punto
    for (const sentence of sentences) {
        if (questions.length >= count) break;
        const question = questions.length % 2 === 0 ? blankQuestion(sentence, grammar, otherKeys) : orderQuestion(sentence);
        if (question) {
            questions.push({ ...question, explain: question.explain ?? grammar.title });
            used.add(sentence.jp);
        }
    }
    // 2. Si no hay material para huecos: entender los ejemplos (necesita 4 frases para los distractores)
    for (const sentence of sentences) {
        if (questions.length >= count) break;
        if (used.has(sentence.jp) || all.length < 4) continue;
        questions.push({ ...sentenceMeaningQuestion(sentence, all), explain: grammar.title });
        used.add(sentence.jp);
    }
    return questions;
}

/** Genera el repaso de gramática sin explicaciones: dos ejercicios por cada punto de la lección */
export function grammarPractice(lesson: Lesson): Question[] {
    return lesson.grammar.flatMap((grammar) => grammarQuestions(grammar, lesson, EXERCISES_PER_GRAMMAR));
}
// ------------------------------- Gramática → ejercicios ------------------------------------------------------------- //

// ------------------------------- Sesión guiada ------------------------------------------------------------- //
/**
 * Devuelve las frases escritas para modelar la lección (patrones, preguntas y respuestas, ejemplos de gramática
 * y extras de los intereses del usuario), no las líneas de diálogo. Las de sus intereses salen más a menudo.
 */
export function modelSentences(lesson: Lesson, interests: string[] = []): Sentence[] {
    const core = [
        ...lesson.patterns,
        ...lesson.examples.flatMap((example) => [
            { jp: example.qjp, es: example.qes },
            { jp: example.ajp, es: example.aes },
        ]),
        ...lesson.grammar.flatMap((grammar) => grammar.examples ?? []),
        ...forYou(lesson, interests),
    ].filter((sentence) => sentence?.jp && sentence?.es);
    return weighByInterest(core.length >= MIN_MODEL_SENTENCES ? core : lessonSentences(lesson), interests);
}

/**
 * Arma la sesión guiada de una lección:
 * Paso 1: 5 palabras (tarjeta con técnica → reconocer → producir)
 * Paso 2: puntos de gramática explicados, cada uno seguido de sus ejercicios
 * Paso 3: frases completas que combinan vocabulario y gramática
 */
export function guidedSession(
    lesson: Lesson,
    words: Word[],
    pool: Word[],
    known: Set<string>,
    tipIndex: number,
    interests: string[] = [],
): Question[] {
    const questions: Question[] = [];
    const grammar = nextGrammar(lesson).map((index) => ({ grammarPoint: lesson.grammar[index], index }));
    const steps = 1 + (grammar.length ? 1 : 0) + 1;
    let step = 0;
    const stepLabel = (name: string) => `Paso ${++step} de ${steps} · ${name}`;

    // 1. Vocabulario: tarjeta con las palabras y la técnica del día
    if (words.length) {
        questions.push({
            id: nextGuidedId(),
            kind: 'note',
            label: stepLabel('Vocabulario'),
            prompt: 'Tus 5 palabras de hoy',
            body: 'Tócalas para escucharlas y repítelas en voz alta. Luego te preguntaré por ellas.',
            words: words.map((word) => ({ jp: wordMain(word, true), reading: wordReading(word), es: shortEs(word.es) })),
            tip: STUDY_TIPS[tipIndex % STUDY_TIPS.length],
        } satisfies NoteQuestion);
        // Primero reconocer (más fácil) y después producir (más difícil): cada palabra se ve dos veces
        questions.push(...vocabQuestions(words, ['meaning'], words.length, pool, true));
        questions.push(...vocabQuestions(shuffle(words), ['reverse', 'listen', 'write'], Math.min(3, words.length), pool, true));
    }

    // 2. Gramática: una tarjeta por punto y sus ejercicios
    if (grammar.length) {
        const name = stepLabel('Gramática');
        for (const { grammarPoint, index } of grammar) {
            questions.push({
                id: nextGuidedId(),
                kind: 'note',
                label: `${name} ${index + 1}/${lesson.grammar.length}`,
                prompt: grammarPoint.title,
                body: grammarPoint.explain,
                examples: (grammarPoint.examples ?? []).slice(0, 2),
            } satisfies NoteQuestion);
            questions.push(...grammarQuestions(grammarPoint, lesson, EXERCISES_PER_GRAMMAR));
        }
    }

    // 3. Frases completas: tarjeta, preguntas de frases y una frase corta para decir en voz alta
    const sentences = modelSentences(lesson, interests);
    if (sentences.length) {
        const topics = interests.map(interestLabel).join(', ').toLowerCase();
        questions.push({
            id: nextGuidedId(),
            kind: 'note',
            label: stepLabel('Frases completas'),
            prompt: 'Ahora, todo junto',
            body:
                'Frases enteras que mezclan las palabras y la gramática de la lección' +
                (topics ? `, con más frases sobre lo que te gusta (${topics}).` : '.') +
                ' Si dudas, escucha la frase antes de responder.',
        } satisfies NoteQuestion);
        questions.push(...sentenceQuestions(sentences, ['order', 'listen', 'particle', 'meaning'], FINAL_SENTENCE_QUESTIONS, known));
        const toSay = sentences.filter((sentence) => sentence.jp.length <= MAX_SPOKEN_SENTENCE_LENGTH);
        if (toSay.length) questions.push(speakSentenceQuestion(pick(toSay)));
    }
    return questions;
}
// ------------------------------- Sesión guiada ------------------------------------------------------------- //
