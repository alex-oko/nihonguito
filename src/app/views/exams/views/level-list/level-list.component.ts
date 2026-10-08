import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressService } from '../../../../services/progress.service';
import { IconComponent } from '../../../../components/icon/icon.component';
import { LessonPickerComponent } from '../../../../components/lesson-picker/lesson-picker.component';
import { KIND_ES, KIND_JP, lessonsLabel, LEVEL_PRESETS } from '../../../../utils/level.utils';
import { LevelPreset } from '../../../../interfaces/level-exam.interface';
import { LevelExamService } from '../../../../services/level-exam.service';

@Component({
    selector: 'app-level-list',
    imports: [RouterLink, IconComponent, LessonPickerComponent],
    templateUrl: './level-list.component.html',
    styleUrl: './level-list.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LevelListComponent {
    // --- Inyección de dependencias ---
    protected levelExamSVC = inject(LevelExamService);
    private progressSVC = inject(ProgressService);
    private router = inject(Router);

    protected kindJp = KIND_JP;
    protected kindEs = KIND_ES;

    // --- Estados UI con Signals ---
    protected busy = signal(false);
    /** Examen que espera confirmación porque hay otra hoja sin entregar */
    protected confirmFor = signal<LevelPreset | null>(null);
    /** Lecciones del examen personalizado (la 0 = kana); arranca con las del último personalizado */
    protected customLessons = signal<number[]>(this.levelExamSVC.lastCustom()?.lessons ?? []);

    // Exámenes agrupados por nivel para pintar una sección por nivel
    protected levels = [...new Set(LEVEL_PRESETS.map((preset) => preset.level))].map((level) => ({
        level,
        presets: LEVEL_PRESETS.filter((preset) => preset.level === level),
    }));

    // --- Valores derivados (computed) ---
    /** Examen que cubre la lección que se estudia ahora */
    protected recommended = computed(() => {
        const lastLesson = this.progressSVC.lastLesson().id;
        return LEVEL_PRESETS.find((preset) => preset.lessons.includes(lastLesson))?.id ?? LEVEL_PRESETS[0].id;
    });

    // ------------------------------- Textos de las tarjetas ------------------------------------------------------------- //
    /** Devuelve "Kana y Lección 1" o "Lecciones 4 y 5" a partir del subtítulo de la hoja */
    protected label(preset: LevelPreset): string {
        return lessonsLabel(preset.lessons, preset.kana)
            .replace('ひらがな・カタカナ・', 'Kana y ')
            .replace(/Lección (\d+), Lección (\d+)/, 'Lecciones $1 y $2');
    }

    /** Devuelve las secciones que tendrá la hoja (las mismas reglas que LevelExamService.create) */
    protected sections(preset: LevelPreset): string {
        const maxLesson = Math.max(...preset.lessons);
        if (preset.kana) return 'Tablas de kana · vocabulario · partículas · respuestas · números';
        if (maxLesson <= 3) return 'Vocabulario · partículas · diálogos · ordenar frases · números · tu nombre';
        if (maxLesson >= 14) return 'Vocabulario · partículas · interrogativos · verbos · ordenar frases · extra';
        return 'Vocabulario · partículas · interrogativos · ordenar frases · puntos extra';
    }
    // ------------------------------- Textos de las tarjetas ------------------------------------------------------------- //

    // ------------------------------- Abrir un examen ------------------------------------------------------------- //
    /** Abre un examen: retoma la hoja si es la misma, pide confirmación si hay otra sin entregar o crea una nueva */
    protected open(preset: LevelPreset): void {
        const draft = this.levelExamSVC.draft();
        if (draft && !draft.submittedAt && draft.exam.presetId !== preset.id) {
            this.confirmFor.set(preset);
            return;
        }
        if (draft && !draft.submittedAt && draft.exam.presetId === preset.id) {
            void this.router.navigate(['/examen/nivel/hoja']);
            return;
        }
        void this.start(preset);
    }

    /** Arma el examen personalizado con las lecciones elegidas y lo abre */
    protected openCustom(): void {
        // 1. La lección 0 del selector significa «incluir kana»; sin lecciones se usa la 1
        const selected = [...this.customLessons()].sort((a, b) => a - b);
        const includesKana = selected.includes(0);
        const lessons = selected.filter((lesson) => lesson > 0);
        const examLessons = lessons.length ? lessons : [1];
        // 2. Nivel según la lección más alta: 1–3 → 1, después uno cada 4 lecciones
        const maxLesson = Math.max(...examLessons);
        const level = maxLesson <= 3 ? 1 : Math.ceil((maxLesson - 3) / 4) + 1;
        const preset: LevelPreset = {
            id: 'custom',
            level,
            kind: 'kimatsu',
            lessons: examLessons,
            kana: includesKana,
            title: `日本語教室 Nivel ${level} テスト`,
        };
        // 3. Con una hoja sin entregar (aunque sea otro personalizado) se pide confirmación
        const draft = this.levelExamSVC.draft();
        if (draft && !draft.submittedAt) {
            this.confirmFor.set(preset);
            return;
        }
        void this.start(preset);
    }

    /** Genera la hoja (sustituye la anterior) y navega a ella */
    protected async start(preset: LevelPreset): Promise<void> {
        this.confirmFor.set(null);
        this.busy.set(true);
        try {
            await this.levelExamSVC.create(preset);
            await this.router.navigate(['/examen/nivel/hoja']);
        } finally {
            this.busy.set(false);
        }
    }
    // ------------------------------- Abrir un examen ------------------------------------------------------------- //
}
