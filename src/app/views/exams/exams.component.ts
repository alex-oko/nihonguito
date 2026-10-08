import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { ProgressService } from '../../services/progress.service';
import { ReadinessService } from '../../services/readiness.service';
import { tone, upcomingExams } from '../../utils/dashboard.utils';
import { ExamReadinessComponent } from '../../components/exam-readiness/exam-readiness.component';
import { IconComponent } from '../../components/icon/icon.component';
import { MusubiSayComponent } from '../../components/musubi-say/musubi-say.component';
import { LevelExamService } from '../../services/level-exam.service';
import { KIND_ES, KIND_JP, LEVEL_PRESETS } from '../../utils/level.utils';
import { LevelPreset } from '../../interfaces/level-exam.interface';
import { Tone } from '../../interfaces/dashboard.interface';

/** Exámenes que se enseñan en el historial del hub */
const HISTORY_SIZE = 5;

@Component({
    selector: 'app-exams-hub',
    imports: [RouterLink, IconComponent, ExamReadinessComponent, MusubiSayComponent],
    templateUrl: './exams.component.html',
    styleUrl: './exams.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamsComponent {
    // --- Inyección de dependencias ---
    protected readinessSVC = inject(ReadinessService);
    private progressSVC = inject(ProgressService);
    private lessonSVC = inject(LessonService);
    private levelExamSVC = inject(LevelExamService);

    // --- Valores derivados (computed) ---
    /** Examen de nivel de la lección en estudio y el siguiente */
    private upcoming = computed(() => upcomingExams(this.progressSVC.lastLesson().id));
    protected nextId = computed(() => this.upcoming()[0].id);
    /** Preparación para el próximo examen; null hasta que se cargan sus lecciones */
    protected next = computed(() => this.readinessSVC.for(this.upcoming()[0]));
    protected best = computed(() => this.levelExamSVC.best());

    /** Niveles hasta el siguiente al del examen actual; la lista completa está en /examen/nivel */
    protected levels = computed(() => {
        const currentLevel = this.upcoming()[0].level;
        return LEVEL_PRESETS.filter((preset) => preset.level <= currentLevel + 1);
    });

    /** Pruebas de lección: hasta la siguiente a la que se estudia, más las que ya tienen nota */
    protected lessonTests = computed(() => {
        const lastLesson = this.progressSVC.lastLesson().id;
        const best = this.progressSVC.lessonBest();
        return this.lessonSVC
            .index()
            .filter((lesson) => lesson.id >= 1 && (lesson.id <= lastLesson + 1 || best[lesson.id] != null))
            .map((lesson) => ({ id: lesson.id, title: lesson.title, best: best[lesson.id] ?? null }));
    });

    /** Últimos exámenes hechos con su porcentaje */
    protected history = computed(() =>
        this.progressSVC
            .exams()
            .slice(0, HISTORY_SIZE)
            .map((exam) => ({ ...exam, pct: exam.total ? Math.round((exam.score / exam.total) * 100) : 0 })),
    );

    /** Frase de Musubi según el veredicto del próximo examen */
    protected musubiLine = computed(() => {
        const readiness = this.next();
        if (!readiness || readiness.score === null) return 'Cuando practiques un poco, te digo qué tan listo vas.';
        if (readiness.verdict === 'ready') return '¡Vas listo! Hazlo cuando quieras, yo te acompaño.';
        if (readiness.verdict === 'close') return 'Ya aprobarías. Si subes lo de la lista, vas con margen.';
        return 'Todavía no. Empieza por lo que más puntos te da de la lista.';
    });

    constructor() {
        // Las lecciones del próximo examen y del siguiente: sin ellas `next` es null y no se pinta la preparación
        void this.lessonSVC.loadIndex();
        const [current, following] = this.upcoming();
        void this.readinessSVC.ensure([...current.lessons, ...(following?.lessons ?? [])]);
    }

    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //
    /** Devuelve el color de un porcentaje */
    protected toneOf(pct: number): Tone {
        return tone(pct);
    }

    /** Devuelve el nombre en español del tipo de examen */
    protected kindEs(preset: LevelPreset): string {
        return KIND_ES[preset.kind];
    }

    /** Devuelve el nombre japonés del tipo de examen */
    protected kindJp(preset: LevelPreset): string {
        return KIND_JP[preset.kind];
    }

    /** Devuelve "Lección 1", "Lecciones 4 y 5" o "Kana + lección 1" */
    protected lessonsOf(preset: LevelPreset): string {
        const label = preset.lessons.length === 1 ? `Lección ${preset.lessons[0]}` : `Lecciones ${preset.lessons.join(' y ')}`;
        return preset.kana ? `Kana + ${label.toLowerCase()}` : label;
    }
    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //
}
