/**
 * Modo «Escuchar» (/escuchar): opciones del formulario, armado de la lista de audios a partir de las
 * lecciones elegidas y limpieza del español para leerlo en voz alta.
 */
import { Lesson, Sentence } from '../interfaces/lesson.interface';
import { ListenConfig, ListenContent, ListenItem, ListenMode, ListenOption, ListenPause } from '../interfaces/listen.interface';
import { forYou } from './interests.utils';
import { wordMain, wordReading } from './questions.utils';
import { shuffle } from './text.utils';

/** Configuración de la primera vez */
export const DEFAULT_LISTEN_CONFIG: Omit<ListenConfig, 'lessons'> = {
    content: ['words', 'sentences'],
    mode: 'jp-es',
    isSlow: false,
    repeat: 1,
    pause: 'normal',
    isShuffled: true,
    count: 30,
    isLooping: false,
};

/** Qué se puede escuchar */
export const LISTEN_CONTENTS: ListenOption<ListenContent>[] = [
    { id: 'words', label: 'Palabras', icon: 'cards' },
    { id: 'sentences', label: 'Frases', icon: 'chat' },
    { id: 'dialogues', label: 'Diálogos', icon: 'mic' },
];

/** Orden de los idiomas */
export const LISTEN_MODES: ListenOption<ListenMode>[] = [
    { id: 'jp-es', label: 'Japonés → español', desc: 'Oyes el japonés, piensas qué significa y luego oyes la traducción', icon: 'headphones' },
    { id: 'es-jp', label: 'Español → japonés', desc: 'Oyes el español, intentas decirlo en japonés y luego lo oyes', icon: 'swap' },
    { id: 'jp', label: 'Solo japonés', desc: 'Inmersión: solo el japonés, sin traducción', icon: 'volume' },
];

/** Pausas para pensar */
export const LISTEN_PAUSES: ListenOption<ListenPause>[] = [
    { id: 'short', label: 'Corta' },
    { id: 'normal', label: 'Normal' },
    { id: 'long', label: 'Larga' },
];

/** Milisegundos de cada pausa para pensar */
export const PAUSE_MS: Record<ListenPause, number> = { short: 1500, normal: 3000, long: 5000 };

/** Silencio entre un elemento y el siguiente */
export const GAP_MS = 1200;

/** Cantidades de elementos que se pueden elegir (0 = todos) */
export const LISTEN_COUNTS = [20, 30, 50, 0];

/** Velocidad de la voz en modo lento (la misma que el botón «Lento») */
export const SLOW_RATE = 0.6;

/** Segundos aproximados que dura cada frase hablada, para estimar la duración de la sesión */
const SECONDS_PER_UTTERANCE = 2;

// ------------------------------- Lista de audios ------------------------------------------------------------- //
/**
 * Arma la lista de audios de las lecciones elegidas. Palabras y frases se pueden barajar; los diálogos
 * siempre suenan enteros y en orden, cada uno como un bloque.
 */
export function buildListenItems(lessons: Lesson[], config: ListenConfig, interests: string[]): ListenItem[] {
    // 1. Palabras y frases sueltas
    const loose: ListenItem[] = [];
    if (config.content.includes('words')) {
        for (const lesson of lessons) {
            for (const word of lesson.vocab) {
                if (word.type === 'name') continue;
                loose.push({ show: wordMain(word, true), say: wordReading(word), es: word.es, lesson: lesson.id });
            }
        }
    }
    if (config.content.includes('sentences')) {
        for (const lesson of lessons) {
            for (const sentence of studySentences(lesson, interests)) {
                loose.push({ show: sentence.jp, say: sentence.jp, es: sentence.es, lesson: lesson.id });
            }
        }
    }

    // 2. Diálogos: un bloque por conversación
    const blocks: ListenItem[][] = loose.map((item) => [item]);
    if (config.content.includes('dialogues')) {
        for (const lesson of lessons) {
            for (const conversation of lesson.conversations) {
                blocks.push(
                    conversation.lines.map((line) => ({
                        show: line.jp,
                        say: line.jp,
                        es: line.es,
                        voice: line.who === 'A' ? 0 : 1,
                        note: `${conversation.title}${line.name ? ' · ' + line.name : ''}`,
                        lesson: lesson.id,
                    })),
                );
            }
        }
    }

    // 3. Barajar (o no) y recortar a la cantidad elegida sin partir un diálogo
    const ordered = config.isShuffled ? shuffle(blocks) : blocks;
    if (!config.count) return ordered.flat();
    const items: ListenItem[] = [];
    for (const block of ordered) {
        if (items.length >= config.count) break;
        items.push(...block);
    }
    return items;
}

/** Devuelve las frases de estudio de una lección (sin los diálogos) más las de los intereses del usuario, sin repetir */
function studySentences(lesson: Lesson, interests: string[]): Sentence[] {
    const all: Sentence[] = [
        ...lesson.patterns,
        ...lesson.examples.flatMap((example) => [
            { jp: example.qjp, es: example.qes },
            { jp: example.ajp, es: example.aes },
        ]),
        ...lesson.grammar.flatMap((grammarPoint) => grammarPoint.examples ?? []),
        ...lesson.phrases,
        ...forYou(lesson, interests),
    ];
    const seen = new Set<string>();
    return all.filter((sentence) => sentence?.jp && sentence?.es && !seen.has(sentence.jp) && (seen.add(sentence.jp), true));
}
// ------------------------------- Lista de audios ------------------------------------------------------------- //

// ------------------------------- Texto y duración ------------------------------------------------------------- //
/**
 * Limpia una traducción para leerla en voz alta: quita lo que va entre paréntesis o corchetes y los
 * marcadores ～, y lee «/» como «o». «estudiar (～を します)» → «estudiar»
 */
export function spokenEs(es: string): string {
    const clean = es
        .replace(/\s*[(（\[].*?[)）\]]\s*/g, ' ')
        .replace(/[～~]/g, '')
        .replace(/\s*\/\s*/g, ', o ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || es;
}

/** Devuelve los minutos aproximados que dura una sesión */
export function estimateMinutes(itemCount: number, config: ListenConfig): number {
    const utterances = config.repeat + (config.mode === 'jp' ? 0 : 1);
    const pauseMs = config.mode === 'jp' ? 0 : PAUSE_MS[config.pause];
    const secondsPerItem = utterances * SECONDS_PER_UTTERANCE * (config.isSlow ? 1.4 : 1) + (pauseMs + GAP_MS) / 1000;
    return Math.max(1, Math.round((itemCount * secondsPerItem) / 60));
}
// ------------------------------- Texto y duración ------------------------------------------------------------- //
