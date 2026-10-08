import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { LessonService } from '../../services/lesson.service';
import { ProgressService } from '../../services/progress.service';

@Component({
    selector: 'app-lesson-picker',
    imports: [],
    templateUrl: './lesson-picker.component.html',
    styleUrl: './lesson-picker.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonPickerComponent {
    // --- Inyección de dependencias ---
    protected lessonSVC = inject(LessonService);
    protected progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    /** Ids de las lecciones elegidas, siempre ordenados; el padre lo enlaza con [(selected)] */
    readonly selected = model<number[]>([]);

    constructor() {
        void this.lessonSVC.loadIndex();
    }

    // ------------------------------- Selección ------------------------------------------------------------- //
    /** Marca o desmarca una lección manteniendo la lista ordenada */
    protected toggle(id: number): void {
        this.selected.update((selectedIds) =>
            selectedIds.includes(id)
                ? selectedIds.filter((selectedId) => selectedId !== id)
                : [...selectedIds, id].sort((a, b) => a - b),
        );
    }

    /** Selecciona todas las lecciones del índice (también la 0) */
    protected all(): void {
        this.selected.set(this.lessonSVC.index().map((meta) => meta.id));
    }

    /** Selecciona de la lección 1 hasta la última que abrió el usuario */
    protected upTo(): void {
        const lastLessonId = this.progressSVC.lastLesson().id;
        this.selected.set(this.lessonSVC.index().filter((meta) => meta.id >= 1 && meta.id <= lastLessonId).map((meta) => meta.id));
    }
    // ------------------------------- Selección ------------------------------------------------------------- //
}
