import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionResult } from '../../../../interfaces/question.interface';
import { ProgressService } from '../../../../services/progress.service';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';
import { ExamService } from '../../../../services/exam.service';

@Component({
    selector: 'app-exam-run',
    imports: [QuestionRunnerComponent],
    templateUrl: './exam-run.component.html',
    styleUrl: './exam-run.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamRunComponent {
    // --- Inyección de dependencias ---
    protected examSVC = inject(ExamService);
    private router = inject(Router);
    private progressSVC = inject(ProgressService);

    constructor() {
        // Sin examen armado (p. ej. recargando la página) no hay nada que correr: vuelve al creador
        if (!this.examSVC.current()) void this.router.navigate(['/examen'], { replaceUrl: true });
    }

    // ------------------------------- Resultado ------------------------------------------------------------- //
    /** Guarda el examen terminado en el historial (aciertos sobre preguntas) */
    protected saved(result: SessionResult): void {
        const now = new Date();
        this.progressSVC.saveExam({
            date: now.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            title: result.title,
            score: result.records.filter((record) => record.correct).length,
            total: result.records.length,
        });
    }

    /** Vuelve a armar el examen con la misma configuración (otras preguntas) */
    protected async again(): Promise<void> {
        const config = this.examSVC.current()?.config;
        if (config) await this.examSVC.build(config);
    }
    // ------------------------------- Resultado ------------------------------------------------------------- //
}
