import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PASS_POINTS, READY_POINTS } from '../../utils/dashboard.utils';
import { Readiness, ReadinessCheck } from '../../interfaces/dashboard.interface';
import { skillIcon } from '../../utils/skills.utils';
import { KIND_ES, KIND_JP } from '../../utils/level.utils';
import { LevelPreset } from '../../interfaces/level-exam.interface';
import { IconComponent } from '../icon/icon.component';

/** Texto de la etiqueta de cada veredicto */
const VERDICT_LABELS = { ready: 'Listo', close: 'Casi', notyet: 'Aún no', nodata: 'Sin datos' } as const;
/** Nota máxima de la regla */
const EXAM_POINTS = 50;
/** Comprobaciones que se enseñan en la lista de qué subir */
const TODO_SIZE = 4;

/** Próximo examen de nivel: dónde estás en una regla de 0 a 50, qué subir y cuántos puntos da */
@Component({
    selector: 'app-exam-readiness',
    imports: [RouterLink, IconComponent],
    templateUrl: './exam-readiness.component.html',
    styleUrl: './exam-readiness.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamReadinessComponent {
    // --- Inputs y outputs ---
    readonly readiness = input.required<Readiness>();
    readonly eyebrow = input('Próximo examen de nivel');
    readonly showStart = input(true);
    readonly start = output<LevelPreset>();

    protected pass = PASS_POINTS;
    protected ready = READY_POINTS;
    protected verdict = VERDICT_LABELS;

    // --- Valores derivados (computed) ---
    /** Posición en la regla, en % (tope 100) */
    protected pct = computed(() => Math.min(100, ((this.readiness().score ?? 0) / EXAM_POINTS) * 100));

    /** Frase bajo la regla: cuántos puntos faltan para aprobar o para ir con margen */
    protected sentence = computed(() => {
        const score = this.readiness().score;
        if (score === null) return 'Practica las lecciones del examen o haz el examen de nivel para estimar tu nota.';
        if (score < PASS_POINTS) {
            const missing = PASS_POINTS - score;
            return `Te ${missing === 1 ? 'falta 1 punto' : `faltan ${missing} puntos`} para aprobar.`;
        }
        if (score < READY_POINTS) return `Ya aprobarías. Te faltan ${READY_POINTS - score} para ir con margen.`;
        return 'Vas listo. Haz el examen para confirmarlo.';
    });

    /** Qué subir primero: lo que más puntos da primero y lo ya en verde al final */
    protected todo = computed(() =>
        [...this.readiness().checks]
            .sort((a, b) => (a.tone === 'ok' ? 1 : 0) - (b.tone === 'ok' ? 1 : 0) || b.gain - a.gain)
            .slice(0, TODO_SIZE),
    );

    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //
    /** Devuelve el icono de una comprobación */
    protected icon(check: ReadinessCheck): string {
        if (check.kind === 'kana') return 'kana';
        if (check.kind === 'vocab') return 'cards';
        if (check.kind === 'test') return 'trophy';
        return check.skill ? skillIcon(check.skill) : 'dumbbell';
    }

    /** Devuelve la ruta donde se practica lo que pide la comprobación */
    protected link(check: ReadinessCheck): (string | number)[] {
        if (check.kind === 'kana' || !check.lesson) return ['/kana'];
        if (check.kind === 'vocab') return ['/lecciones', check.lesson, 'practica', 'learn'];
        if (check.kind === 'test') return ['/lecciones', check.lesson, 'practica', 'test'];
        return ['/lecciones', check.lesson, 'practica', check.skill ?? 'guided'];
    }

    /** Devuelve el nombre en español del tipo de examen */
    protected kindEs(preset: LevelPreset): string {
        return KIND_ES[preset.kind];
    }

    /** Devuelve el nombre japonés del tipo de examen */
    protected kindJp(preset: LevelPreset): string {
        return KIND_JP[preset.kind];
    }

    /** Devuelve "lección 1", "lecciones 4 y 5" o "kana + lección 1" */
    protected lessons(preset: LevelPreset): string {
        const label = preset.lessons.length === 1 ? `lección ${preset.lessons[0]}` : `lecciones ${preset.lessons.join(' y ')}`;
        return preset.kana ? `kana + ${label}` : label;
    }
    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //
}
