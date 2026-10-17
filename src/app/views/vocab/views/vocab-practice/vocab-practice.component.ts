import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../../../services/lesson.service';
import { ProgressService } from '../../../../services/progress.service';
import { Word } from '../../../../interfaces/lesson.interface';
import { MatchPair } from '../../../../interfaces/match-game.interface';
import { Question, VocabMode } from '../../../../interfaces/question.interface';
import { VocabDrill } from '../../../../interfaces/vocab-builder.interface';
import { DEFAULT_VOCAB_TYPES, filterByTypes, VOCAB_COUNTS, VOCAB_DRILLS } from '../../../../utils/vocab-builder.utils';
import { isPlainWord, vocabQuestions, wordMain, wordReading } from '../../../../utils/questions.utils';
import { prioritize } from '../../../../utils/lesson-content.utils';
import { shortEs } from '../../../../utils/text.utils';
import { FlashcardsComponent } from '../../../../components/flashcards/flashcards.component';
import { MatchGameComponent } from '../../../../components/match-game/match-game.component';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Modos de pregunta que usa «Todo mezclado» */
const MIXED_MODES: VocabMode[] = ['meaning', 'reverse', 'listen', 'write'];
/** Palabras mínimas para que escribir use solo palabras sin marcadores como ～ */
const MIN_PLAIN_WORDS = 4;
/** Palabras elegidas mínimas para sacar de ellas las opciones falsas (una pregunta lleva 3) */
const MIN_DISTRACTOR_WORDS = 8;

@Component({
    selector: 'app-vocab-practice',
    imports: [RouterLink, FlashcardsComponent, MatchGameComponent, QuestionRunnerComponent],
    templateUrl: './vocab-practice.component.html',
    styleUrl: './vocab-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabPracticeComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    // Llegan de la query de /vocabulario/practica (?lessons=1,2&types=noun,verb&mode=meaning&count=20)
    readonly lessons = input<string>('');
    readonly types = input<string>('');
    readonly mode = input<string>('');
    readonly count = input<string>('');

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);
    protected cards = signal<Word[]>([]);
    protected pairs = signal<MatchPair[]>([]);
    protected isReady = signal(false);
    protected isEmpty = signal(false);

    // --- Valores derivados (computed) ---
    /** Forma de practicar válida; sin query o con una desconocida, «¿Qué significa?» */
    protected drill = computed<VocabDrill>(() => VOCAB_DRILLS.find((option) => option.id === this.mode())?.id ?? 'meaning');
    protected title = computed(() => `Vocabulario · ${VOCAB_DRILLS.find((option) => option.id === this.drill())?.label}`);

    constructor() {
        // Rearma la ronda si cambia la query; untracked para que lo que lee build no vuelva a disparar el effect
        effect(() => {
            this.lessons();
            this.types();
            this.drill();
            this.count();
            untracked(() => void this.build());
        });
    }

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Carga las lecciones elegidas, filtra por tipo y arma las preguntas, tarjetas o parejas */
    async build(): Promise<void> {
        // 1. Leer la query (con valores por defecto si falta algo)
        const lessonIds = this.lessons().split(',').map(Number).filter((id) => Number.isInteger(id) && id >= 0);
        const typeIds = this.types() ? this.types().split(',') : DEFAULT_VOCAB_TYPES;
        const count = Number(this.count()) || VOCAB_COUNTS[1];

        // 2. Reunir las palabras: solo las de los tipos elegidos se preguntan
        const lessons = lessonIds.length ? await this.lessonSVC.getMany(lessonIds) : [];
        const allWords = lessons.flatMap((lesson) => lesson.vocab);
        let pool = filterByTypes(allWords, typeIds);
        const drill = this.drill();
        // Escribir necesita palabras sin marcadores como ～ (si quedan suficientes)
        if (drill === 'write') {
            const plain = pool.filter(isPlainWord);
            if (plain.length >= MIN_PLAIN_WORDS) pool = plain;
        }
        this.isEmpty.set(!pool.length);
        if (!pool.length) {
            this.isReady.set(true);
            return;
        }

        // 3. Armar según la forma de practicar, con prioridad para las nuevas, flojas y pendientes de repaso
        const picked = prioritize(pool, this.progressSVC, count);
        if (drill === 'cards') {
            this.cards.set(picked);
        } else if (drill === 'match') {
            this.pairs.set(
                picked.map((word) => ({
                    id: word.id,
                    left: wordMain(word, true),
                    right: shortEs(word.es),
                    speak: wordReading(word),
                    track: `w:${word.id}`,
                })),
            );
        } else {
            const modes = drill === 'mixed' ? MIXED_MODES : [drill];
            // Las opciones falsas salen de las palabras elegidas (sin «Suiza» entre verbos); con muy pocas, de toda la lección
            const distractorPool = pool.length >= MIN_DISTRACTOR_WORDS ? filterByTypes(allWords, typeIds) : allWords;
            this.questions.set(vocabQuestions(picked, modes, count, distractorPool, true));
        }
        this.isReady.set(true);
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
