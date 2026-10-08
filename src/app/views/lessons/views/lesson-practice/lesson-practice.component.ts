import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { advanceGrammar, grammarPractice, guidedSession, modelSentences } from '../../../../utils/guided-session.utils';
import { forYou, weighByInterest } from '../../../../utils/interests.utils';
import { lessonSentences, prioritize, studyWords } from '../../../../utils/lesson-content.utils';
import { Lesson, Word } from '../../../../interfaces/lesson.interface';
import { Question } from '../../../../interfaces/question.interface';
import { ProgressService } from '../../../../services/progress.service';
import { knownStems, sentenceQuestions, vocabQuestions, wordMain, wordReading } from '../../../../utils/questions.utils';
import { VocabMode } from '../../../../interfaces/question.interface';
import { shortEs, shuffle } from '../../../../utils/text.utils';
import { FlashcardsComponent } from '../../../../components/flashcards/flashcards.component';
import { MatchGameComponent } from '../../../../components/match-game/match-game.component';
import { MatchPair } from '../../../../interfaces/match-game.interface';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Nombre de cada modo en el título de la práctica («Lección 3 · Escucha») */
const MODE_TITLES: Record<string, string> = {
    meaning: 'Significado',
    reverse: 'Al japonés',
    listen: 'Escucha',
    write: 'Escribir',
    speak: 'Pronunciar',
    order: 'Ordenar frases',
    particles: 'Partículas',
    test: 'Prueba final',
    learn: 'Tarjetas',
    guided: 'Sesión guiada',
    sentences: 'Frases completas',
    grammar: 'Gramática',
    match: 'Parejas',
};
/** Milisegundos de un día; el número de día elige el consejo de la sesión guiada */
const MS_PER_DAY = 86400000;

@Component({
    selector: 'app-lesson-practice',
    imports: [QuestionRunnerComponent, MatchGameComponent, FlashcardsComponent],
    templateUrl: './lesson-practice.component.html',
    styleUrl: './lesson-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonPracticeComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    // Llegan de la ruta lecciones/:id/practica/:mode (withComponentInputBinding)
    readonly id = input.required<string>();
    readonly mode = input.required<string>();

    // --- Estados UI con Signals ---
    protected lesson = signal<Lesson | null>(null);
    protected questions = signal<Question[]>([]);
    protected pairs = signal<MatchPair[]>([]);
    protected cards = signal<Word[]>([]);

    // --- Valores derivados (computed) ---
    protected lessonId = computed(() => Number(this.id()));
    protected title = computed(() => `Lección ${this.lessonId()} · ${MODE_TITLES[this.mode()] ?? 'Práctica'}`);
    private interests = computed(() => this.progressSVC.settings().interests ?? []);

    // Formas de las palabras ya vistas (esta lección y las anteriores): deciden qué partículas se pueden preguntar
    private knownWordStems = new Set<string>();

    constructor() {
        // Recarga al cambiar la lección o el modo; untracked para que lo que lee loadLesson no vuelva a disparar el effect
        effect(() => {
            const id = this.lessonId();
            this.mode();
            untracked(() => void this.loadLesson(id));
        });
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga la lección y las palabras conocidas hasta ella, y arma la práctica */
    private async loadLesson(id: number): Promise<void> {
        const lesson = await this.lessonSVC.get(id);
        // Palabras conocidas = esta lección y todas las anteriores (para detectar partículas)
        const lessonIndex = await this.lessonSVC.loadIndex();
        const previousLessons = await this.lessonSVC.getMany(lessonIndex.filter((meta) => meta.id <= id).map((meta) => meta.id));
        this.knownWordStems = knownStems(previousLessons.flatMap((previous) => previous.vocab));
        this.lesson.set(lesson);
        this.build();
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Al terminar una sesión guiada avanza a los siguientes puntos de gramática */
    protected done(): void {
        const lesson = this.lesson();
        if (lesson && this.mode() === 'guided') advanceGrammar(lesson);
    }

    /** Arma las preguntas, tarjetas o parejas del modo actual (también al pulsar «Otra vez») */
    build(): void {
        const lesson = this.lesson();
        if (!lesson) return;
        const mode = this.mode();
        const useKanji = true;
        const words = studyWords(lesson.vocab);
        // Las frases sobre los intereses del alumno se repiten para que salgan más a menudo
        const sentences = weighByInterest([...lessonSentences(lesson), ...forYou(lesson, this.interests())], this.interests());

        switch (mode) {
            case 'guided': {
                const dayNumber = Math.floor(Date.now() / MS_PER_DAY);
                this.questions.set(guidedSession(lesson, prioritize(words, this.progressSVC, 5), words, this.knownWordStems, dayNumber, this.interests()));
                return;
            }
            case 'sentences':
                this.questions.set(
                    sentenceQuestions(modelSentences(lesson, this.interests()), ['order', 'particle', 'meaning', 'listen', 'speak'], 10, this.knownWordStems),
                );
                return;
            case 'grammar':
                this.questions.set(grammarPractice(lesson));
                return;
            case 'learn':
                this.cards.set(prioritize(words, this.progressSVC, 10));
                return;
            case 'match':
                this.pairs.set(
                    prioritize(words, this.progressSVC, 15).map((word) => ({
                        id: word.id,
                        left: wordMain(word, useKanji),
                        right: shortEs(word.es),
                        speak: wordReading(word),
                        track: `w:${word.id}`,
                    })),
                );
                return;
            case 'order':
                this.questions.set(sentenceQuestions(sentences, ['order'], 10, this.knownWordStems));
                return;
            case 'particles':
                this.questions.set(sentenceQuestions(sentences, ['particle'], 10, this.knownWordStems));
                return;
            case 'test': {
                // Prueba final: 10 de vocabulario + 6 de frases + 2 de pronunciar, mezcladas
                const vocabPart = vocabQuestions(prioritize(words, this.progressSVC, 10), ['meaning', 'reverse', 'listen', 'write'], 10, words, useKanji);
                const sentencePart = sentenceQuestions(sentences, ['order', 'particle', 'meaning', 'listen'], 6, this.knownWordStems);
                const speakPart = vocabQuestions(prioritize(words, this.progressSVC, 2), ['speak'], 2, words, useKanji);
                this.questions.set(shuffle([...vocabPart, ...sentencePart, ...speakPart]));
                return;
            }
            default: {
                // Modos de vocabulario (meaning, reverse, listen, write, speak): 12 preguntas
                const pool = studyWords(lesson.vocab, mode);
                this.questions.set(vocabQuestions(prioritize(pool, this.progressSVC, 12), [mode as VocabMode], 12, words, useKanji));
            }
        }
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
