import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { allKana } from '../utils/kana.utils';
import { KNOWN_BOX, readiness } from '../utils/dashboard.utils';
import { Readiness } from '../interfaces/dashboard.interface';
import { LessonService } from './lesson.service';
import { Lesson } from '../interfaces/lesson.interface';
import { ProgressService } from './progress.service';
import { LevelExamService } from './level-exam.service';
import { LevelPreset } from '../interfaces/level-exam.interface';

/** Preparación para el examen de nivel que comparten Inicio y Exámenes, y el arranque de un examen de nivel */
@Injectable({
    providedIn: 'root'
})
export class ReadinessService {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private levelExamSVC = inject(LevelExamService);
    private router = inject(Router);

    // --- Estados UI con Signals ---
    /** Lecciones ya cargadas para estimar (se piden con ensure) */
    private loaded = signal<Map<number, Lesson>>(new Map());
    /** true mientras se genera la hoja de un examen de nivel */
    readonly busy = signal(false);

    // --- Valores derivados (computed) ---
    /** Parte de los kana básicos (hiragana + katakana) ya dominados, de 0 a 1 */
    readonly kanaShare = computed(() => {
        const mastery = this.progressSVC.mastery();
        const chars = [...allKana('hiragana'), ...allKana('katakana')].filter((kana) => kana.group === 'basic');
        return chars.filter((kana) => (mastery[`k:${kana.char}`]?.box ?? -1) >= KNOWN_BOX).length / chars.length;
    });

    // ------------------------------- Estimación ------------------------------------------------------------- //
    /** Carga las lecciones que falten de la lista (ignora la 0 y las ya cargadas) */
    async ensure(ids: number[]): Promise<void> {
        const loadedLessons = this.loaded();
        const missing = [...new Set(ids)].filter((id) => id >= 1 && !loadedLessons.has(id));
        if (!missing.length) return;
        const fetched = await this.lessonSVC.getMany(missing);
        this.loaded.update((current) => {
            const next = new Map(current);
            fetched.forEach((lesson) => next.set(lesson.id, lesson));
            return next;
        });
    }

    /** Devuelve la preparación para un examen; null hasta que sus lecciones estén cargadas (llamar antes a ensure) */
    for(preset: LevelPreset): Readiness | null {
        const lessonsById = this.loaded();
        if (!preset.lessons.every((id) => lessonsById.has(id))) return null;
        return readiness(preset, {
            lessons: [...lessonsById.values()],
            mastery: this.progressSVC.mastery(),
            lessonSkills: this.progressSVC.lessonSkills(),
            lessonBest: this.progressSVC.lessonBest(),
            levelBest: this.levelExamSVC.best(),
            kana: this.kanaShare(),
        });
    }
    // ------------------------------- Estimación ------------------------------------------------------------- //

    // ------------------------------- Arranque del examen ------------------------------------------------------------- //
    /** Genera la hoja del examen y navega a ella; con una hoja sin entregar navega en su lugar */
    async start(preset: LevelPreset): Promise<void> {
        const draft = this.levelExamSVC.draft();
        // Hay un examen sin entregar: si es el mismo se retoma; si no, va a la lista de niveles, que ofrece continuarlo y pide confirmación antes de sustituirlo
        if (draft && !draft.submittedAt) {
            void this.router.navigate(draft.exam.presetId === preset.id ? ['/examen/nivel/hoja'] : ['/examen/nivel']);
            return;
        }
        this.busy.set(true);
        try {
            await this.levelExamSVC.create(preset);
            await this.router.navigate(['/examen/nivel/hoja']);
        } finally {
            this.busy.set(false);
        }
    }
    // ------------------------------- Arranque del examen ------------------------------------------------------------- //
}
