import { inject, Injectable, signal } from '@angular/core';
import { allKana } from '../utils/kana.utils';
import { LessonService } from './lesson.service';
import { lessonSentences, prioritize, studyWords } from '../utils/lesson-content.utils';
import { Question } from '../interfaces/question.interface';
import { ProgressService } from './progress.service';
import { cleanForm, kanaQuestions, knownStems, sentenceQuestions, verbQuestions, vocabQuestions } from '../utils/questions.utils';
import { shuffle } from '../utils/text.utils';
import { compactRanges } from '../utils/exam.utils';
import { ExamConfig } from '../interfaces/exam.interface';

/** Con menos verbos que esto en las lecciones elegidas se usa el apéndice entero */
const MIN_LESSON_VERBS = 4;
/** Frases más largas que esto no se piden en voz alta (cuesta leerlas de un tirón) */
const MAX_SPEAK_SENTENCE_LENGTH = 24;
/** Palabras mínimas que se priorizan por sección aunque la sección pida menos preguntas */
const MIN_PRIORITIZED_WORDS = 8;

/** Arma el examen personalizado (/examen) y lo deja en `current` para que lo corra /examen/prueba */
@Injectable({
    providedIn: 'root'
})
export class ExamService {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);

    // --- Estados UI con Signals ---
    /** Examen armado más reciente; null hasta que se llama a build */
    readonly current = signal<{ title: string; questions: Question[]; strict: boolean; config: ExamConfig } | null>(null);

    // ------------------------------- Armado del examen ------------------------------------------------------------- //
    /** Arma las preguntas del examen según la configuración y lo guarda en current */
    async build(config: ExamConfig): Promise<void> {
        // 1. Cargar las lecciones elegidas y todas las anteriores a la más alta (para saber qué palabras conoce)
        await this.lessonSVC.loadIndex();
        const selectedLessons = await this.lessonSVC.getMany(config.lessons);
        const useKanji = true;
        const words = studyWords(selectedLessons.flatMap((lesson) => lesson.vocab));
        const sentences = selectedLessons.flatMap((lesson) => lessonSentences(lesson));
        const maxLesson = Math.max(0, ...config.lessons);
        const lessonsUpTo = await this.lessonSVC.getMany(
            this.lessonSVC.index().filter((lesson) => lesson.id <= maxLesson).map((lesson) => lesson.id),
        );
        const known = knownStems(lessonsUpTo.flatMap((lesson) => lesson.vocab));

        // 2. Verbos: los de las lecciones elegidas; si son menos de 4, todo el apéndice
        const needsVerbs = config.sections.includes('verbs');
        let verbs = needsVerbs ? (await this.lessonSVC.appendix()).verbs : [];
        if (needsVerbs) {
            const lessonVerbs = new Set(
                words.filter((word) => word.type === 'verb').map((word) => cleanForm(word.kana).main.replace(/\s+/g, '')),
            );
            const filtered = verbs.filter((verb) => lessonVerbs.has(verb.masu) || (verb.lesson != null && config.lessons.includes(verb.lesson)));
            verbs = filtered.length >= MIN_LESSON_VERBS ? filtered : verbs;
        }

        // 3. Repartir las preguntas entre las secciones; el resto de la división va a las primeras
        const sections = config.sections;
        const perSection = Math.max(1, Math.floor(config.count / sections.length));
        let extra = config.count - perSection * sections.length;
        const questions: Question[] = [];
        for (const section of sections) {
            const sectionCount = perSection + (extra-- > 0 ? 1 : 0);
            const prioritizedWords = prioritize(words, this.progressSVC, Math.max(sectionCount, MIN_PRIORITIZED_WORDS));
            switch (section) {
                case 'vocab':
                    questions.push(...vocabQuestions(prioritizedWords, ['meaning', 'reverse'], sectionCount, words, useKanji));
                    break;
                case 'listen': {
                    // Mitad palabras, mitad frases
                    const wordCount = Math.ceil(sectionCount / 2);
                    questions.push(...vocabQuestions(prioritizedWords, ['listen'], wordCount, words, useKanji));
                    questions.push(...sentenceQuestions(sentences, ['listen'], sectionCount - wordCount, known));
                    break;
                }
                case 'write':
                    questions.push(...vocabQuestions(prioritizedWords, ['write'], sectionCount, words, useKanji));
                    break;
                case 'sentences':
                    questions.push(...sentenceQuestions(sentences, ['order', 'meaning'], sectionCount, known));
                    break;
                case 'particles':
                    questions.push(...sentenceQuestions(sentences, ['particle'], sectionCount, known));
                    break;
                case 'speak': {
                    const wordCount = Math.ceil(sectionCount / 2);
                    questions.push(...vocabQuestions(prioritizedWords, ['speak'], wordCount, words, useKanji));
                    questions.push(
                        ...sentenceQuestions(
                            sentences.filter((sentence) => sentence.jp.length <= MAX_SPEAK_SENTENCE_LENGTH),
                            ['speak'],
                            sectionCount - wordCount,
                            known,
                        ),
                    );
                    break;
                }
                case 'verbs':
                    if (verbs.length) questions.push(...verbQuestions(verbs, ['te', 'nai', 'ta', 'dict'], sectionCount));
                    break;
                case 'hiragana':
                    questions.push(...kanaQuestions(allKana('hiragana'), 'mixed', sectionCount, 'hiragana'));
                    break;
                case 'katakana':
                    questions.push(...kanaQuestions(allKana('katakana'), 'mixed', sectionCount, 'katakana'));
                    break;
            }
        }

        // 4. Título con las lecciones agrupadas en rangos y preguntas barajadas
        const lessonsLabel =
            config.lessons.length === 1
                ? `Lección ${config.lessons[0]}`
                : `Lecciones ${compactRanges(config.lessons)}`;
        this.current.set({
            title: `Examen · ${lessonsLabel}`,
            questions: shuffle(questions),
            strict: config.strict,
            config,
        });
    }
    // ------------------------------- Armado del examen ------------------------------------------------------------- //
}
