import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { ProgressService } from '../../services/progress.service';
import { KanjiDrill, KanjiInfo } from '../../interfaces/kanji.interface';
import { groupByLesson, KANJI_DRILLS, kanjiInScope, kanjiWithLessons } from '../../utils/kanji.utils';
import { KNOWN_BOX } from '../../utils/dashboard.utils';
import { cleanForm } from '../../utils/questions.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { JpComponent } from '../../components/jp/jp.component';
import { SpeakButtonComponent } from '../../components/speak-button/speak-button.component';

/** Kanji por ronda de práctica */
const KANJI_COUNTS = [10, 20];

@Component({
    selector: 'app-kanji',
    imports: [RouterLink, IconComponent, JpComponent, SpeakButtonComponent],
    templateUrl: './kanji.component.html',
    styleUrl: './kanji.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanjiComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private router = inject(Router);

    // --- Estados UI con Signals ---
    /** Kanji con su lección y palabras; vacío mientras cargan las lecciones */
    protected kanji = signal<KanjiInfo[]>([]);
    /** Kanji abierto en la hoja de detalle */
    protected open = signal<KanjiInfo | null>(null);
    /** Practicar solo los de las lecciones hasta la actual, o todos */
    protected scope = signal<'upto' | 'all'>('upto');
    protected drill = signal<KanjiDrill>('meaning');
    protected count = signal(KANJI_COUNTS[0]);

    // --- Valores derivados (computed) ---
    protected groups = computed(() => groupByLesson(this.kanji()));
    protected lastLesson = computed(() => this.progressSVC.lastLesson().id);
    /** Caja de Leitner de cada kanji (0 si nunca se practicó), para colorear las fichas */
    protected boxes = computed(() => {
        const mastery = this.progressSVC.mastery();
        return new Map(this.kanji().map((info) => [info.char, mastery[`j:${info.char}`]?.box ?? 0]));
    });
    protected knownCount = computed(() => [...this.boxes().values()].filter((box) => box >= KNOWN_BOX).length);
    /** Kanji que entran en la práctica según el alcance elegido */
    protected practicePool = computed(() => kanjiInScope(this.kanji(), this.scope(), this.lastLesson()));

    // Opciones fijas de la plantilla
    protected drills = KANJI_DRILLS;
    protected counts = KANJI_COUNTS;

    constructor() {
        void this.lessonSVC.allLessons().then((lessons) => this.kanji.set(kanjiWithLessons(lessons)));
    }

    // ------------------------------- Ficha ------------------------------------------------------------- //
    /** Devuelve la lectura en kana de una palabra (sin alternativas ni marcadores) */
    protected readingOf(kana: string): string {
        return cleanForm(kana).main;
    }
    // ------------------------------- Ficha ------------------------------------------------------------- //

    // ------------------------------- Práctica ------------------------------------------------------------- //
    /** Abre la práctica elegida; «Trazar» va a su propia pantalla con los kanji en la query */
    protected practice(): void {
        const scope = this.scope();
        if (this.drill() === 'trace') {
            void this.router.navigate(['/kanji/trazar'], { queryParams: { scope, count: this.count() } });
            return;
        }
        void this.router.navigate(['/kanji/practica'], { queryParams: { mode: this.drill(), scope, count: this.count() } });
    }

    /** Abre el trazo de un solo kanji desde su ficha */
    protected traceOne(char: string): void {
        void this.router.navigate(['/kanji/trazar'], { queryParams: { chars: char } });
    }
    // ------------------------------- Práctica ------------------------------------------------------------- //
}
