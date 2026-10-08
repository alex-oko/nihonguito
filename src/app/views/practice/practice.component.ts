import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../services/progress.service';
import { todayKey } from '../../utils/text.utils';
import { Skill } from '../../interfaces/skill.interface';
import { SKILLS } from '../../utils/skills.utils';
import { tone } from '../../utils/dashboard.utils';
import { IconComponent } from '../../components/icon/icon.component';

/** Acierto (%) por debajo del cual una habilidad cuenta como punto débil */
const WEAK_SKILL_PCT = 80;
/** Respuestas mínimas de una habilidad para juzgarla (con menos, un fallo pesaría demasiado) */
const MIN_ANSWERS_FOR_WEAK = 4;
/** Máximo de puntos débiles que se enseñan */
const MAX_WEAK_SPOTS = 4;

interface WeakSpot {
    skill: Skill;
    label: string;
    icon: string;
    pct: number;
    lessons: number[];
    /** Lección donde esta habilidad está peor: el enlace de práctica lleva ahí */
    worst: number;
}

@Component({
    selector: 'app-practice-hub',
    imports: [RouterLink, IconComponent],
    templateUrl: './practice.component.html',
    styleUrl: './practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PracticeComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Valores derivados (computed) ---
    /** Palabras cuyo repaso espaciado toca hoy o ya pasó */
    protected due = computed(() => {
        const today = todayKey();
        return Object.entries(this.progressSVC.mastery())
            .filter(([key, entry]) => key.startsWith('w:') && entry.due <= today)
            .length;
    });

    /** Habilidades por debajo del 80% sumando todas las lecciones, la peor primero */
    protected weak = computed<WeakSpot[]>(() => {
        const statsByLesson = this.progressSVC.lessonSkills();
        return SKILLS.flatMap((skill) => {
            let correct = 0;
            let total = 0;
            const lessons: number[] = [];
            let worst = 0;
            let worstPct = 101;
            // 1. Sumar los aciertos de la habilidad en cada lección y recordar la peor
            for (const [lessonId, stats] of Object.entries(statsByLesson)) {
                const stat = stats[skill.id];
                if (!stat?.total) continue;
                correct += stat.correct;
                total += stat.total;
                lessons.push(Number(lessonId));
                const lessonPct = (stat.correct / stat.total) * 100;
                if (lessonPct < worstPct) {
                    worstPct = lessonPct;
                    worst = Number(lessonId);
                }
            }
            // 2. Solo es punto débil con suficientes respuestas y acierto bajo
            const pct = total ? Math.round((correct / total) * 100) : 100;
            return total >= MIN_ANSWERS_FOR_WEAK && pct < WEAK_SKILL_PCT
                ? [{ skill: skill.id, label: skill.label, icon: skill.icon, pct, lessons, worst }]
                : [];
        })
            .sort((first, second) => first.pct - second.pct)
            .slice(0, MAX_WEAK_SPOTS);
    });

    // Tarjetas de la sección «Juegos» (el id es el segmento de /juego/:id)
    protected games = [
        { id: 'parejas', icon: 'puzzle', color: 'ok', name: 'Parejas', desc: 'Une palabras con su significado' },
        { id: 'contrarreloj', icon: 'bolt', color: 'bad', name: 'Contrarreloj', desc: '60 segundos, ¿cuántas aciertas?' },
        { id: 'ordenar', icon: 'sort', color: 'gold', name: 'Ordena la frase', desc: 'Construye oraciones' },
        { id: 'escucha', icon: 'headphones', color: 'indigo', name: 'Oído fino', desc: 'Entiende solo escuchando' },
    ];

    // ------------------------------- Plantilla ------------------------------------------------------------- //
    /** Devuelve el tono de color (ok / mid / bad) de un porcentaje */
    protected toneOf(pct: number) {
        return tone(pct);
    }

    /** Arma la lista de lecciones de un punto débil: «· L3» o «· L1, L2 y L4» */
    protected lessonsLabel(ids: number[]): string {
        const sorted = [...ids].sort((first, second) => first - second);
        return sorted.length === 1
            ? `· L${sorted[0]}`
            : `· L${sorted.slice(0, -1).join(', L')} y L${sorted[sorted.length - 1]}`;
    }
    // ------------------------------- Plantilla ------------------------------------------------------------- //
}
