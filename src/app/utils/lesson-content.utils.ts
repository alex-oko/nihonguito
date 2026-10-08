import { Lesson, Sentence, Word } from '../interfaces/lesson.interface';
import { ProgressService } from '../services/progress.service';
import { isPlainWord } from './questions.utils';
import { shuffle } from './text.utils';

/** Mínimo de palabras para que un ejercicio tenga opciones suficientes */
const MIN_STUDY_WORDS = 4;

/** Devuelve todas las frases en japonés con traducción de una lección, sin repetidas */
export function lessonSentences(lesson: Lesson): Sentence[] {
    const allSentences: Sentence[] = [
        ...lesson.patterns,
        ...lesson.examples.flatMap((example) => [
            { jp: example.qjp, es: example.qes },
            { jp: example.ajp, es: example.aes },
        ]),
        ...lesson.grammar.flatMap((grammarPoint) => grammarPoint.examples ?? []),
        ...lesson.conversations.flatMap((conversation) => conversation.lines.map((line) => ({ jp: line.jp, es: line.es }))),
        ...lesson.phrases,
    ];
    // La misma frase puede estar en el diálogo y en las frases útiles: se queda la primera
    const seen = new Set<string>();
    return allSentences.filter((sentence) => sentence?.jp && sentence?.es && !seen.has(sentence.jp) && (seen.add(sentence.jp), true));
}

/** Devuelve las palabras que vale la pena practicar (los nombres propios solo si no hay otra cosa) */
export function studyWords(words: Word[], mode?: string): Word[] {
    let candidates = words.filter((word) => word.type !== 'name');
    // Escribir y pronunciar necesitan palabras sin marcadores como ～
    if (mode === 'write' || mode === 'speak') {
        const plain = candidates.filter(isPlainWord);
        if (plain.length >= MIN_STUDY_WORDS) candidates = plain;
    }
    return candidates.length >= MIN_STUDY_WORDS ? candidates : words;
}

/** Elige `count` palabras dando prioridad a las nuevas, las flojas y las que toca repasar */
export function prioritize(words: Word[], progress: ProgressService, count: number): Word[] {
    const mastery = progress.mastery();
    const today = new Date().toISOString().slice(0, 10);
    const scoreOf = (word: Word) => {
        const entry = mastery[`w:${word.id}`];
        // Palabra nueva: prioridad media; el azar evita que salgan siempre las mismas
        if (!entry) return 1 + Math.random();
        return (entry.due <= today ? 2 : 0) + (5 - entry.box) * 0.5 + Math.random();
    };
    return shuffle(words)
        .map((word) => ({ word, score: scoreOf(word) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((scored) => scored.word);
}
