import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { Question } from '../../../../interfaces/question.interface';
import { VerbForm } from '../../../../interfaces/question.interface';
import { verbQuestions } from '../../../../utils/questions.utils';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Preguntas por ronda de práctica */
const QUESTIONS_PER_ROUND = 12;

@Component({
    selector: 'app-verb-practice',
    imports: [QuestionRunnerComponent],
    templateUrl: './verb-practice.component.html',
    styleUrl: './verb-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerbPracticeComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);

    // --- Inputs y outputs ---
    // Llegan de la query de /verbos/practica (?forms=te,nai&group=1) por withComponentInputBinding
    readonly forms = input<string>('te');
    readonly group = input<string>('0');

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);

    constructor() {
        // Rearma la ronda si cambia la query; untracked para que lo que lee build no vuelva a disparar el effect
        effect(() => {
            this.forms();
            this.group();
            untracked(() => void this.build());
        });
    }

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Arma una ronda de preguntas de conjugación con las formas y el grupo de la query */
    async build(): Promise<void> {
        const { verbs } = await this.lessonSVC.appendix();
        // Sin query, el input llega vacío: se usa grupo 0 (todos) y la forma て
        const groupNumber = Number(this.group() || 0);
        const pool = groupNumber ? verbs.filter((verb) => verb.group === groupNumber) : verbs;
        const forms = (this.forms() || 'te').split(',').filter(Boolean) as VerbForm[];
        this.questions.set(verbQuestions(pool, forms, QUESTIONS_PER_ROUND));
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
