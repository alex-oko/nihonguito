import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressService } from '../../../../services/progress.service';
import { loadRaw, save } from '../../../../utils/storage.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { LessonPickerComponent } from '../../../../components/lesson-picker/lesson-picker.component';
import { ExamService } from '../../../../services/exam.service';
import { EXAM_SECTIONS } from '../../../../utils/exam.utils';
import { ExamConfig, ExamSection } from '../../../../interfaces/exam.interface';

/** Cantidades de preguntas que se pueden elegir */
const QUESTION_COUNTS = [10, 20, 30, 50];
/** Secciones marcadas la primera vez */
const DEFAULT_SECTIONS: ExamSection[] = ['vocab', 'listen', 'sentences', 'particles'];
/** Exámenes que se enseñan en el historial */
const HISTORY_SIZE = 8;

@Component({
    selector: 'app-exam-builder',
    imports: [IconComponent, LessonPickerComponent, RouterLink],
    templateUrl: './exam-builder.component.html',
    styleUrl: './exam-builder.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamBuilderComponent {
    // --- Inyección de dependencias ---
    private router = inject(Router);
    private examSVC = inject(ExamService);
    private progressSVC = inject(ProgressService);

    // Última configuración usada (nihongo:examConfig): el formulario arranca con ella
    private saved = loadRaw<Partial<ExamConfig>>('examConfig', {});
    protected sections = EXAM_SECTIONS;
    protected counts = QUESTION_COUNTS;

    // --- Estados UI con Signals ---
    protected lessonsSel = signal<number[]>(this.saved.lessons ?? []);
    protected sectionsSel = signal<ExamSection[]>(this.saved.sections ?? DEFAULT_SECTIONS);
    protected count = signal(this.saved.count ?? 20);
    protected strict = signal(this.saved.strict ?? true);
    protected building = signal(false);

    // --- Valores derivados (computed) ---
    protected canStart = computed(() => this.lessonsSel().length > 0 && this.sectionsSel().length > 0);
    protected history = computed(() => this.progressSVC.exams().slice(0, HISTORY_SIZE));

    constructor() {
        // Sin configuración guardada: de la lección 1 a la que se está estudiando
        if (!this.lessonsSel().length) {
            const lastLesson = this.progressSVC.lastLesson().id;
            this.lessonsSel.set(Array.from({ length: Math.max(1, lastLesson) }, (_, i) => i + 1));
        }
    }

    // ------------------------------- Formulario ------------------------------------------------------------- //
    /** Marca o desmarca una sección */
    protected toggle(id: ExamSection): void {
        this.sectionsSel.update((selected) => (selected.includes(id) ? selected.filter((section) => section !== id) : [...selected, id]));
    }

    /** Guarda la configuración, arma el examen y abre /examen/prueba */
    protected async start(): Promise<void> {
        const config: ExamConfig = {
            lessons: this.lessonsSel(),
            sections: this.sectionsSel(),
            count: this.count(),
            strict: this.strict(),
        };
        save('examConfig', config);
        this.building.set(true);
        try {
            await this.examSVC.build(config);
            await this.router.navigate(['/examen/prueba']);
        } finally {
            this.building.set(false);
        }
    }
    // ------------------------------- Formulario ------------------------------------------------------------- //
}
