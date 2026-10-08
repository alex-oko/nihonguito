import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnswerRecord, Question, SessionResult } from '../../interfaces/question.interface';
import { skillBreakdown, skillLabel } from '../../utils/skills.utils';
import { IconComponent } from '../icon/icon.component';
import { SpeakButtonComponent } from '../speak-button/speak-button.component';
import { JpComponent } from '../jp/jp.component';
import { MusubiSayComponent } from '../musubi-say/musubi-say.component';
import { PetService } from '../../services/pet.service';

/** Porcentaje por debajo del cual la peor habilidad se ofrece como «Refuerza» */
const WEAK_SKILL_MAX_PERCENT = 80;

@Component({
    selector: 'app-result-screen',
    imports: [RouterLink, IconComponent, SpeakButtonComponent, JpComponent, MusubiSayComponent],
    templateUrl: './result-screen.component.html',
    styleUrl: './result-screen.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultScreenComponent {
    // --- Inyección de dependencias ---
    protected petSVC = inject(PetService);

    // --- Inputs y outputs ---
    readonly result = input.required<SessionResult>();
    readonly exam = input(false);
    /** Contexto de lección: activa el atajo «Refuerza tu habilidad más floja» */
    readonly lessonId = input<number | null>(null);
    readonly again = output<void>();
    readonly exit = output<void>();

    // --- Valores derivados (computed) ---
    /** Porcentaje de aciertos (los registros ya vienen con un solo intento por pregunta) */
    protected percent = computed(() => {
        const records = this.result().records;
        return records.length ? Math.round((records.filter((record) => record.correct).length / records.length) * 100) : 0;
    });
    protected stars = computed(() => (this.percent() >= 90 ? 3 : this.percent() >= 70 ? 2 : this.percent() >= 40 ? 1 : 0));
    protected headline = computed(() => {
        const percent = this.percent();
        if (percent === 100) return '¡Perfecto! 🎉';
        if (percent >= 90) return '¡Excelente!';
        if (percent >= 70) return '¡Muy bien!';
        if (percent >= 40) return 'Vas progresando';
        return 'Sigue practicando';
    });
    /** Nota por habilidad, de la peor a la mejor */
    protected skills = computed(() => skillBreakdown(this.result().records));
    /** Peor habilidad, solo en una lección, con más de una habilidad y por debajo de WEAK_SKILL_MAX_PERCENT */
    protected weakestSkill = computed(() => {
        const worst = this.skills()[0];
        return this.lessonId() != null && worst && worst.pct < WEAK_SKILL_MAX_PERCENT && this.skills().length > 1 ? worst : null;
    });
    /** Comentario de Musubi sobre la sesión */
    protected cheerMessage = computed(() => {
        const percent = this.percent();
        const mistakeCount = this.mistakes().length;
        if (percent === 100) return '¡Sin errores! 完璧 (kanpeki). Me dejaste sin palabras.';
        if (percent >= 90) return `¡Casi perfecto! Solo ${mistakeCount === 1 ? 'se te escapó una' : `se te escaparon ${mistakeCount}`}. Las repasamos abajo.`;
        if (percent >= 70) return 'Muy bien. Mira abajo lo que se te escapó y lo fijamos.';
        if (percent >= 40) return 'Vas avanzando. Lo difícil también se aprende: otra ronda y verás.';
        return 'Hoy costó, y está bien. Repite una ronda corta: la segunda siempre sale mejor.';
    });
    protected mistakes = computed<AnswerRecord[]>(() => this.result().records.filter((record) => !record.correct));
    /** Duración como «45s» o «2:05» */
    protected durationText = computed(() => {
        const seconds = Math.round(this.result().durationMs / 1000);
        return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    });

    // Nombre en español de cada habilidad, para la plantilla
    protected skillLabel = skillLabel;

    // ------------------------------- Errores ------------------------------------------------------------- //
    /** Devuelve el enunciado de una pregunta fallada */
    protected promptOf(question: Question): string {
        return question.prompt;
    }

    /** Devuelve la respuesta correcta de una pregunta, según su tipo */
    protected answerOf(question: Question): string {
        switch (question.kind) {
            case 'choice':
                return question.answer;
            case 'type':
                return question.answers[0];
            case 'order':
                return question.answer.join(' ');
            case 'speak':
                return question.target;
            case 'note':
                return '';
        }
    }
    // ------------------------------- Errores ------------------------------------------------------------- //
}
