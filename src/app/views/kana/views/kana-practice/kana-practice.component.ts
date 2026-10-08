import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { allKana } from '../../../../utils/kana.utils';
import { Script } from '../../../../interfaces/kana.interface';
import { LessonService } from '../../../../services/lesson.service';
import { Question } from '../../../../interfaces/question.interface';
import { ProgressService } from '../../../../services/progress.service';
import { KanaMode } from '../../../../interfaces/question.interface';
import { kanaQuestions, katakanaFromWords, loanwordQuestions, lookalikeQuestions } from '../../../../utils/questions.utils';
import { shuffle } from '../../../../utils/text.utils';
import { QuestionRunnerComponent } from '../../../../components/question-runner/question-runner.component';

/** Título de cada modo de práctica (el parámetro `:mode` de la ruta) */
const TITLES: Record<string, string> = {
    mixed: 'Quiz mixto',
    read: 'Leer kana',
    recognize: 'Reconocer kana',
    listen: 'Escuchar kana',
    type: 'Escribir romaji',
    lookalikes: 'Símbolos parecidos',
    loanwords: 'Palabras en katakana',
    weak: 'Tus símbolos difíciles',
};
/** Preguntas de los modos «parecidos» y «palabras en katakana» */
const SPECIAL_MODE_QUESTIONS = 14;
/** Símbolos más flojos que entran en el modo «difíciles» */
const WEAK_KANA_COUNT = 12;
/** Preguntas del modo «difíciles» */
const WEAK_MODE_QUESTIONS = 16;
/** Límites de preguntas de los modos normales: dos por símbolo, entre 12 y 24 */
const MIN_QUESTIONS = 12;
const MAX_QUESTIONS = 24;

@Component({
    selector: 'app-kana-practice',
    imports: [QuestionRunnerComponent],
    templateUrl: './kana-practice.component.html',
    styleUrl: './kana-practice.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaPracticeComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    readonly script = input.required<Script>();
    readonly mode = input.required<string>();
    /** Ids de fila separados por comas (query param `rows`) */
    readonly rows = input<string>('');

    // --- Estados UI con Signals ---
    protected questions = signal<Question[]>([]);

    // --- Valores derivados (computed) ---
    protected title = computed(() => `${TITLES[this.mode()] ?? 'Kana'} · ${this.script() === 'katakana' ? 'カタカナ' : 'ひらがな'}`);

    constructor() {
        // Rehace las preguntas cuando cambia la ruta; build va en untracked para que los signals que lee dentro
        // (mastery, por ejemplo) no vuelvan a disparar el effect a mitad de la práctica
        effect(() => {
            this.script();
            this.mode();
            this.rows();
            untracked(() => void this.build());
        });
    }

    // ------------------------------- Preguntas ------------------------------------------------------------- //
    /** Genera las preguntas según el modo: parecidos, préstamos, difíciles o un modo normal sobre las filas elegidas */
    async build(): Promise<void> {
        const script = this.script();
        const mode = this.mode();
        const rowIds = this.rows() ? this.rows().split(',').filter(Boolean) : undefined;
        const list = allKana(script, rowIds);

        if (mode === 'lookalikes') {
            this.questions.set(lookalikeQuestions(script, SPECIAL_MODE_QUESTIONS));
        } else if (mode === 'loanwords') {
            // Suma a los préstamos fijos las palabras en katakana de las lecciones; si fallan, solo los fijos
            const words = await this.lessonSVC.allWords().catch(() => []);
            this.questions.set(loanwordQuestions(SPECIAL_MODE_QUESTIONS, katakanaFromWords(words)));
        } else if (mode === 'weak') {
            // Se baraja antes de ordenar para que los empates de caja no salgan siempre en el orden de la tabla
            const masteryMap = this.progressSVC.mastery();
            const candidates = allKana(script).filter((kana) => kana.group !== 'extended');
            const scored = shuffle(candidates).sort((first, second) => (masteryMap[`k:${first.char}`]?.box ?? -1) - (masteryMap[`k:${second.char}`]?.box ?? -1));
            const weakest = scored.slice(0, WEAK_KANA_COUNT);
            this.questions.set(kanaQuestions(weakest, 'mixed', WEAK_MODE_QUESTIONS, script));
        } else {
            this.questions.set(kanaQuestions(list, mode as KanaMode, Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, list.length * 2)), script));
        }
    }
    // ------------------------------- Preguntas ------------------------------------------------------------- //
}
