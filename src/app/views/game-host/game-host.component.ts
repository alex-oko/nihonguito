import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { allKana } from '../../utils/kana.utils';
import { Script } from '../../interfaces/kana.interface';
import { LessonService } from '../../services/lesson.service';
import { lessonSentences, prioritize, studyWords } from '../../utils/lesson-content.utils';
import { ChoiceQuestion, Question } from '../../interfaces/question.interface';
import { ProgressService } from '../../services/progress.service';
import { kanaQuestions, knownStems, sentenceQuestions, vocabQuestions, wordMain, wordReading } from '../../utils/questions.utils';
import { loadRaw, save } from '../../utils/storage.utils';
import { shortEs, shuffle } from '../../utils/text.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { LessonPickerComponent } from '../../components/lesson-picker/lesson-picker.component';
import { MatchGameComponent } from '../../components/match-game/match-game.component';
import { MatchPair } from '../../interfaces/match-game.interface';
import { QuestionRunnerComponent } from '../../components/question-runner/question-runner.component';
import { SpeedGameComponent } from '../../components/speed-game/speed-game.component';

/** Título y descripción de cada juego, por el parámetro `:game` de la ruta */
const GAME_INFO: Record<string, { title: string; desc: string }> = {
    parejas: { title: 'Parejas', desc: 'Une cada palabra japonesa con su significado. 3 rondas de 5.' },
    contrarreloj: { title: 'Contrarreloj', desc: '60 segundos para acertar todas las que puedas.' },
    ordenar: { title: 'Ordena la frase', desc: 'Toca las palabras en el orden correcto para formar la oración.' },
    escucha: { title: 'Oído fino', desc: 'Solo escuchas: elige lo que significa cada palabra o frase.' },
};
/** Clave (sin prefijo) donde se recuerdan las lecciones elegidas para jugar */
const SELECTED_LESSONS_KEY = 'gameLessons';
/** Los juegos muestran siempre la forma con kanji (no siguen el ajuste de escritura) */
const USE_KANJI = true;
/** Parejas: palabras por partida (3 rondas de 5) */
const MATCH_WORD_COUNT = 15;
/** Contrarreloj de vocabulario: palabras elegidas y preguntas generadas con ellas */
const SPEED_WORD_COUNT = 60;
const SPEED_QUESTION_COUNT = 90;
/** Contrarreloj de kana: preguntas generadas (más de las que caben en 60 s) */
const KANA_SPEED_QUESTION_COUNT = 120;
/** Mínimo de kana para que las filas elegidas sirvan; con menos se usa el silabario básico */
const MIN_KANA_COUNT = 4;
/** Ordena la frase: número de frases */
const ORDER_QUESTION_COUNT = 10;
/** Oído fino: palabras y frases de escucha */
const LISTEN_WORD_COUNT = 8;
const LISTEN_SENTENCE_COUNT = 6;

@Component({
    selector: 'app-game-host',
    imports: [IconComponent, LessonPickerComponent, MatchGameComponent, SpeedGameComponent, QuestionRunnerComponent],
    templateUrl: './game-host.component.html',
    styleUrl: './game-host.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameHostComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    protected location = inject(Location);

    // --- Inputs y outputs ---
    /** Parámetro de ruta `:game`: parejas, contrarreloj, ordenar o escucha */
    readonly game = input.required<string>();
    /** Query param `kana`: con él, el contrarreloj es de kana y arranca sin elegir lecciones */
    readonly kana = input<Script | ''>('');
    /** Query param `rows`: ids de filas de kana separados por comas */
    readonly rows = input<string>('');

    // --- Estados UI con Signals ---
    protected selectedLessons = signal<number[]>(loadRaw<number[]>(SELECTED_LESSONS_KEY, []));
    protected isStarted = signal(false);
    protected isLoading = signal(false);
    protected pairs = signal<MatchPair[]>([]);
    protected choiceQuestions = signal<ChoiceQuestion[]>([]);
    protected questions = signal<Question[]>([]);

    // --- Valores derivados (computed) ---
    protected info = computed(() => GAME_INFO[this.game()] ?? GAME_INFO['parejas']);
    protected speedTitle = computed(() =>
        this.kana() ? `Contrarreloj ${this.kana() === 'katakana' ? 'カタカナ' : 'ひらがな'}` : 'Contrarreloj de vocabulario',
    );
    /** Clave del récord: uno por silabario y otro para vocabulario */
    protected speedKey = computed(() => (this.kana() ? `speed-${this.kana()}` : 'speed-vocab'));

    constructor() {
        // Primera vez: se preseleccionan todas las lecciones hasta la última abierta
        if (!this.selectedLessons().length) {
            const lastLessonId = this.progressSVC.lastLesson().id;
            this.selectedLessons.set(Array.from({ length: Math.max(1, lastLessonId) }, (_, i) => i + 1));
        }
        // Con ?kana= el contrarreloj de kana arranca directo, sin selector de lecciones
        effect(() => {
            const script = this.kana();
            this.game();
            untracked(() => {
                if (script) {
                    this.rebuildSpeed();
                    this.isStarted.set(true);
                }
            });
        });
    }

    // ------------------------------- Preparar partida ------------------------------------------------------------- //
    /** Regenera las preguntas del contrarreloj: de kana en el momento, o de vocabulario vía start */
    protected rebuildSpeed(): void {
        const script = this.kana();
        if (script) {
            const rowIds = this.rows() ? this.rows().split(',').filter(Boolean) : undefined;
            let kanaList = allKana(script, rowIds);
            if (kanaList.length < MIN_KANA_COUNT) kanaList = allKana(script).filter((kana) => kana.group === 'basic');
            this.choiceQuestions.set(
                kanaQuestions(kanaList, 'read', KANA_SPEED_QUESTION_COUNT, script).filter((question): question is ChoiceQuestion => question.kind === 'choice'),
            );
        } else {
            void this.start();
        }
    }

    /** Carga las lecciones elegidas y arma el contenido del juego de la ruta */
    async start(): Promise<void> {
        // 1. Recordar la selección y cargar las lecciones
        const lessonIds = this.selectedLessons();
        if (!lessonIds.length) return;
        save(SELECTED_LESSONS_KEY, lessonIds);
        this.isLoading.set(true);
        const lessons = await this.lessonSVC.getMany(lessonIds);
        const words = studyWords(lessons.flatMap((lesson) => lesson.vocab));
        const sentences = lessons.flatMap((lesson) => lessonSentences(lesson));

        // 2. Generar el contenido según el juego (prioritize favorece palabras nuevas, flojas o pendientes de repaso)
        switch (this.game()) {
            case 'parejas':
                this.pairs.set(
                    prioritize(words, this.progressSVC, MATCH_WORD_COUNT).map((word) => ({
                        id: word.id,
                        left: wordMain(word, USE_KANJI),
                        right: shortEs(word.es),
                        speak: wordReading(word),
                        track: `w:${word.id}`,
                    })),
                );
                break;
            case 'contrarreloj':
                this.choiceQuestions.set(
                    shuffle(vocabQuestions(prioritize(words, this.progressSVC, SPEED_WORD_COUNT), ['meaning', 'reverse'], SPEED_QUESTION_COUNT, words, USE_KANJI)).filter(
                        (question): question is ChoiceQuestion => question.kind === 'choice',
                    ),
                );
                break;
            case 'ordenar': {
                // Las palabras conocidas salen de todas las lecciones hasta la más alta elegida, no solo de las elegidas
                // (sentenceQuestions solo las usa en el modo 'particle'; con 'order' hoy no influyen)
                const knownLessons = await this.lessonSVC.getMany(
                    this.lessonSVC.index().filter((lesson) => lesson.id <= Math.max(...lessonIds)).map((lesson) => lesson.id),
                );
                this.questions.set(sentenceQuestions(sentences, ['order'], ORDER_QUESTION_COUNT, knownStems(knownLessons.flatMap((lesson) => lesson.vocab))));
                break;
            }
            case 'escucha': {
                const wordQuestions = vocabQuestions(prioritize(words, this.progressSVC, LISTEN_WORD_COUNT), ['listen'], LISTEN_WORD_COUNT, words, USE_KANJI);
                const sentenceListenQuestions = sentenceQuestions(sentences, ['listen'], LISTEN_SENTENCE_COUNT, new Set());
                this.questions.set(shuffle([...wordQuestions, ...sentenceListenQuestions]));
                break;
            }
        }

        // 3. Mostrar el juego
        this.isLoading.set(false);
        this.isStarted.set(true);
    }
    // ------------------------------- Preparar partida ------------------------------------------------------------- //
}
