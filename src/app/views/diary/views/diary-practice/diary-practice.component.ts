import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DiaryService } from '../../../../services/diary.service';
import { Question } from '../../../../interfaces/question.interface';
import { diaryQuestions } from '../../../../utils/questions.utils';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Ejercicios por ronda */
const QUESTIONS_PER_ROUND = 10;

@Component({
    selector: 'app-diary-practice',
    imports: [QuestionRunnerComponent],
    templateUrl: './diary-practice.component.html',
    styleUrl: './diary-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiaryPracticeComponent {
    // --- Inyección de dependencias ---
    private diarySVC = inject(DiaryService);

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);

    constructor() {
        this.build();
    }

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Arma una ronda con las frases guardadas en el diario */
    build(): void {
        this.questions.set(diaryQuestions(this.diarySVC.entries().map((entry) => entry.sentence), QUESTIONS_PER_ROUND));
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
