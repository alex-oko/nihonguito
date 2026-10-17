import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ProgressService } from '../../../../services/progress.service';
import { Question } from '../../../../interfaces/question.interface';
import { GrammarDrill } from '../../../../interfaces/grammar-guide.interface';
import { GRAMMAR_DRILLS } from '../../../../utils/grammar-guide.utils';
import { grammarQuestions } from '../../../../utils/questions.utils';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Preguntas por ronda de práctica */
const QUESTIONS_PER_ROUND = 12;

@Component({
    selector: 'app-grammar-practice',
    imports: [QuestionRunnerComponent],
    templateUrl: './grammar-practice.component.html',
    styleUrl: './grammar-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrammarPracticeComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    // Llega de la query de /gramatica/practica (?mode=particles) por withComponentInputBinding
    readonly mode = input<string>('mixed');

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);

    // --- Valores derivados (computed) ---
    /** Tipo de ejercicio válido; sin query o con uno desconocido, todo mezclado */
    private drill = computed<GrammarDrill>(() => GRAMMAR_DRILLS.find((option) => option.id === this.mode())?.id ?? 'mixed');
    protected title = computed(() => GRAMMAR_DRILLS.find((option) => option.id === this.drill())?.label ?? 'Gramática');

    constructor() {
        // Rearma la ronda si cambia la query; untracked para no depender de los ajustes que lee build
        effect(() => {
            this.drill();
            untracked(() => this.build());
        });
    }

    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
    /** Arma una ronda del tipo elegido con las frases de los intereses del usuario por delante */
    build(): void {
        this.questions.set(grammarQuestions(this.drill(), this.progressSVC.settings().interests ?? [], QUESTIONS_PER_ROUND));
    }
    // ------------------------------- Armado de la práctica ------------------------------------------------------------- //
}
