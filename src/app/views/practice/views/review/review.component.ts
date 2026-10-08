import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../../../services/lesson.service';
import { Question } from '../../../../interfaces/question.interface';
import { ProgressService } from '../../../../services/progress.service';
import { vocabQuestions } from '../../../../utils/questions.utils';
import { shuffle, todayKey } from '../../../../utils/text.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Con menos palabras pendientes que esto, el repaso se completa con las más débiles */
const MIN_DUE_WORDS = 6;
/** Tamaño del grupo de palabras cuando hay que completarlo con las débiles */
const TOP_UP_POOL_SIZE = 12;
/** Máximo de palabras y de preguntas de un repaso */
const MAX_REVIEW_QUESTIONS = 15;
/** Mínimo de preguntas, aunque haya menos palabras (alguna se repite) */
const MIN_REVIEW_QUESTIONS = 8;

@Component({
    selector: 'app-review',
    imports: [QuestionRunnerComponent, RouterLink, IconComponent],
    templateUrl: './review.component.html',
    styleUrl: './review.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewComponent {
    // --- Inyección de dependencias ---
    protected location = inject(Location);
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);

    // --- Estados UI con Signals ---
    protected state = signal<'loading' | 'ready' | 'empty'>('loading');
    protected questions = signal<Question[]>([]);
    protected title = signal('Repaso inteligente');

    constructor() {
        void this.build();
    }

    // ------------------------------- Armado del repaso ------------------------------------------------------------- //
    /** Arma el repaso con las palabras que tocan hoy (o las más débiles) y lo deja listo */
    async build(): Promise<void> {
        // 1. Palabras con progreso guardado (claves 'w:<id>' de mastery)
        const mastery = this.progressSVC.mastery();
        const today = todayKey();
        const wordKeys = Object.keys(mastery).filter((key) => key.startsWith('w:'));
        if (!wordKeys.length) {
            this.state.set('empty');
            return;
        }

        // 2. Las que tocan hoy o ya pasaron su fecha
        const allWords = await this.lessonSVC.allWords();
        const wordsById = new Map(allWords.map((word) => [word.id, word]));
        const due = wordKeys
            .filter((key) => mastery[key].due <= today)
            .map((key) => wordsById.get(key.slice(2)))
            .filter((word) => !!word);
        let pool = due;

        // 3. Pocas pendientes: completar con las conocidas más débiles
        if (pool.length < MIN_DUE_WORDS) {
            // Más débil = caja de Leitner más baja y, a igual caja, más fallos
            const weak = wordKeys
                .map((key) => ({ word: wordsById.get(key.slice(2)), entry: mastery[key] }))
                .filter((candidate) => !!candidate.word && !due.includes(candidate.word))
                .sort((first, second) => first.entry.box - second.entry.box || second.entry.wrong - first.entry.wrong)
                .slice(0, TOP_UP_POOL_SIZE - pool.length)
                .map((candidate) => candidate.word!);
            pool = [...pool, ...weak];
        }

        // 4. Título y preguntas (significado, al japonés, escucha y escritura)
        this.title.set(due.length ? `Repaso · ${due.length} pendientes` : 'Repaso de refuerzo');
        const chosen = shuffle(pool).slice(0, MAX_REVIEW_QUESTIONS);
        this.questions.set(
            vocabQuestions(
                chosen,
                ['meaning', 'reverse', 'listen', 'write'],
                Math.min(MAX_REVIEW_QUESTIONS, Math.max(chosen.length, MIN_REVIEW_QUESTIONS)),
                allWords,
                true
            ),
        );
        this.state.set('ready');
    }
    // ------------------------------- Armado del repaso ------------------------------------------------------------- //
}
