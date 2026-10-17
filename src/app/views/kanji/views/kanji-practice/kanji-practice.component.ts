import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { ProgressService } from '../../../../services/progress.service';
import { PlanService } from '../../../../services/plan.service';
import { Question } from '../../../../interfaces/question.interface';
import { KanjiDrill } from '../../../../interfaces/kanji.interface';
import { KANJI_DRILLS, kanjiInScope, kanjiWithLessons, prioritizeKanji } from '../../../../utils/kanji.utils';
import { kanjiQuestions } from '../../../../utils/questions.utils';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Preguntas por ronda si la query no dice otra cosa */
const DEFAULT_COUNT = 10;

@Component({
    selector: 'app-kanji-practice',
    imports: [QuestionRunnerComponent],
    templateUrl: './kanji-practice.component.html',
    styleUrl: './kanji-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanjiPracticeComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    protected planSVC = inject(PlanService);

    // --- Inputs y outputs ---
    // Llegan de la query de /kanji/practica (?mode=meaning&scope=upto&count=10)
    readonly mode = input<string>('');
    readonly scope = input<string>('upto');
    readonly count = input<string>('');

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);

    // --- Valores derivados (computed) ---
    /** Tipo de ejercicio válido (sin «Trazar», que tiene su pantalla); por defecto «¿Qué significa?» */
    private drill = computed<KanjiDrill>(() => KANJI_DRILLS.find((option) => option.id === this.mode() && option.id !== 'trace')?.id ?? 'meaning');
    protected title = computed(() => `Kanji · ${KANJI_DRILLS.find((option) => option.id === this.drill())?.label}`);

    constructor() {
        // Rearma la ronda si cambia la query; untracked para que lo que lee build no vuelva a disparar el effect
        effect(() => {
            this.drill();
            this.scope();
            this.count();
            untracked(() => void this.build());
        });
    }

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Arma la ronda: kanji del alcance elegido, primero los nuevos, flojos y pendientes de repaso */
    async build(): Promise<void> {
        const all = kanjiWithLessons(await this.lessonSVC.allLessons());
        const pool = kanjiInScope(all, this.scope(), this.progressSVC.lastLesson().id);
        const count = Number(this.count()) || DEFAULT_COUNT;
        const picked = prioritizeKanji(pool, this.progressSVC.mastery(), count);
        this.questions.set(kanjiQuestions(picked, this.drill(), count, all));
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
