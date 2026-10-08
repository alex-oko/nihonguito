import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { LessonExamRow, LessonListItem, LessonMeta, LessonRow } from '../../interfaces/lesson.interface';
import { ProgressService } from '../../services/progress.service';
import { ReadinessService } from '../../services/readiness.service';
import { KNOWN_BOX, PASS_POINTS, upcomingExams, weakestSkill } from '../../utils/dashboard.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { JpComponent } from '../../components/jp/jp.component';
import { KIND_ES, LEVEL_PRESETS } from '../../utils/level.utils';
import { LevelPreset } from '../../interfaces/level-exam.interface';
import { LevelExamService } from '../../services/level-exam.service';

/** Nota de la prueba final desde la que una lección cuenta como dominada */
const MASTERED_TEST_PCT = 80;
/** Acierto por debajo del cual la habilidad más floja se enseña como aviso en la fila */
const WEAK_SKILL_PCT = 60;

@Component({
    selector: 'app-lesson-list',
    imports: [RouterLink, IconComponent, JpComponent],
    templateUrl: './lessons.component.html',
    styleUrl: './lessons.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonsComponent {
    // --- Inyección de dependencias ---
    protected lessonSVC = inject(LessonService);
    protected progressSVC = inject(ProgressService);
    private readinessSVC = inject(ReadinessService);
    private levelExamSVC = inject(LevelExamService);

    // --- Valores derivados (computed) ---
    /** Lecciones numeradas (sin la 0, que es la de kana) */
    protected total = computed(() => this.lessonSVC.index().filter((meta) => meta.id >= 1).length);
    /** Próximo examen de nivel según la última lección abierta */
    protected nextExam = computed(() => upcomingExams(this.progressSVC.lastLesson().id)[0]);

    /** Palabras conocidas por lección, leídas de las claves de progreso (w:L01-…) para no cargar ninguna lección */
    private knownByLesson = computed(() => {
        const knownCount: Record<number, number> = {};
        for (const [key, entry] of Object.entries(this.progressSVC.mastery())) {
            const match = /^w:L(\d+)/.exec(key);
            if (match && entry.box >= KNOWN_BOX) knownCount[Number(match[1])] = (knownCount[Number(match[1])] ?? 0) + 1;
        }
        return knownCount;
    });

    /** Lecciones agrupadas por nivel, con cada examen de nivel intercalado */
    protected groups = computed(() => {
        const lessonIndex = this.lessonSVC.index();
        if (!lessonIndex.length) return [];
        const lastLessonId = this.progressSVC.lastLesson().id;
        const bestScores = this.progressSVC.lessonBest();
        const skillStats = this.progressSVC.lessonSkills();

        // 1. Agrupar los ids por nivel; la lección 0 (kana) va al nivel 1 y lo que no tenga nivel se omite
        const levelOf = (id: number) => LEVEL_PRESETS.find((preset) => preset.lessons.includes(id))?.level ?? (id < 1 ? 1 : 0);
        const levels = new Map<number, { level: number; ids: number[] }>();
        for (const meta of lessonIndex) {
            const level = levelOf(meta.id);
            if (!level) continue;
            if (!levels.has(level)) levels.set(level, { level, ids: [] });
            levels.get(level)!.ids.push(meta.id);
        }

        // 2. Armar las filas de cada nivel
        return [...levels.values()].map((group) => {
            const items: LessonListItem[] = [];
            for (const id of group.ids) {
                const meta = lessonIndex.find((lessonMeta) => lessonMeta.id === id)!;
                items.push({ kind: 'lesson', row: this.buildRow(meta, lastLessonId, bestScores[id] ?? null, skillStats[id]) });
                // Un examen de nivel va justo después de la última lección que cubre
                for (const preset of LEVEL_PRESETS.filter((levelPreset) => Math.max(...levelPreset.lessons) === id)) {
                    items.push({ kind: 'exam', exam: { preset, after: id } });
                }
            }

            // 3. Subtítulo del nivel: «kana + lecciones 1 a 3»
            const numbered = group.ids.filter((id) => id >= 1);
            const hasKana = LEVEL_PRESETS.some((preset) => preset.level === group.level && preset.kana);
            const sub = `${hasKana ? 'kana + ' : ''}lecciones ${numbered[0]} a ${numbered[numbered.length - 1]}`;
            return { level: group.level, sub, items };
        });
    });

    constructor() {
        void this.lessonSVC.loadIndex();
        // El aviso del próximo examen necesita sus lecciones cargadas en ReadinessService
        void this.readinessSVC.ensure(this.nextExam().lessons);
    }

    // ------------------------------- Filas de lección ------------------------------------------------------------- //
    /** Arma la fila de una lección con su etiqueta, en orden de prioridad: dominada, habilidad floja, en curso, empezada, siguiente */
    private buildRow(meta: LessonMeta, lastLessonId: number, best: number | null, stats: Parameters<typeof weakestSkill>[0]): LessonRow {
        const known = this.knownByLesson()[meta.id] ?? 0;
        const weak = weakestSkill(stats);
        const state: LessonRow['state'] = (best ?? 0) >= MASTERED_TEST_PCT ? 'done' : meta.id === lastLessonId ? 'now' : 'todo';
        if (state === 'done') return { meta, known, best, pill: 'Dominada', tone: 'ok', state };
        if (weak && weak.pct! < WEAK_SKILL_PCT) return { meta, known, best, pill: `${weak.label} ${weak.pct}%`, tone: 'bad', state };
        if (meta.id === lastLessonId) return { meta, known, best, pill: 'En curso', tone: 'mid', state };
        if (known > 0 || stats) return { meta, known, best, pill: 'Empezada', tone: 'none', state };
        if (meta.id === lastLessonId + 1) return { meta, known, best, pill: 'Siguiente', tone: 'next', state };
        return { meta, known, best, pill: 'Sin empezar', tone: 'none', state };
    }
    // ------------------------------- Filas de lección ------------------------------------------------------------- //

    // ------------------------------- Filas de examen ------------------------------------------------------------- //
    /** Devuelve «Examen parcial» o «Examen final» */
    protected kindEs(preset: LevelPreset): string {
        return KIND_ES[preset.kind];
    }

    /** Devuelve la línea bajo un examen: mejor nota, cuándo toca o cuántos puntos faltan para aprobar */
    protected examLine(examRow: LessonExamRow): string {
        const best = this.levelExamSVC.best()[examRow.preset.id];
        if (best != null) return `Tu mejor nota: ${best}%`;
        if (examRow.preset.id !== this.nextExam().id) return `Después de la lección ${examRow.after}`;
        const readiness = this.readinessSVC.for(examRow.preset);
        if (!readiness || readiness.score === null) return 'Tu próximo examen · toca para ver qué tan listo vas';
        const missing = PASS_POINTS - readiness.score;
        return missing > 0
            ? `Tu próximo examen · te ${missing === 1 ? 'falta 1 punto' : `faltan ${missing} puntos`} para aprobar`
            : 'Tu próximo examen · ya aprobarías';
    }
    // ------------------------------- Filas de examen ------------------------------------------------------------- //
}
