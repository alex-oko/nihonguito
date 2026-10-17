import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { ProgressService } from '../../services/progress.service';
import { Word } from '../../interfaces/lesson.interface';
import { VocabConfig, VocabDrill } from '../../interfaces/vocab-builder.interface';
import { DEFAULT_VOCAB_TYPES, filterByTypes, VOCAB_COUNTS, VOCAB_DRILLS, WORD_TYPE_FILTERS } from '../../utils/vocab-builder.utils';
import { wordMain, wordReading } from '../../utils/questions.utils';
import { loadRaw, save } from '../../utils/storage.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { JpComponent } from '../../components/jp/jp.component';
import { LessonPickerComponent } from '../../components/lesson-picker/lesson-picker.component';
import { SpeakButtonComponent } from '../../components/speak-button/speak-button.component';

/** Palabras que se enseñan en «Ver las palabras» antes de pedir «Ver más» */
const LIST_PAGE = 40;

@Component({
    selector: 'app-vocab',
    imports: [RouterLink, IconComponent, JpComponent, LessonPickerComponent, SpeakButtonComponent],
    templateUrl: './vocab.component.html',
    styleUrl: './vocab.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private router = inject(Router);

    // Última configuración usada (nihongo:vocabConfig): el formulario arranca con ella
    private saved = loadRaw<Partial<VocabConfig>>('vocabConfig', {});

    // --- Estados UI con Signals ---
    protected lessonsSel = signal<number[]>(this.saved.lessons ?? []);
    protected typesSel = signal<string[]>(this.saved.types ?? DEFAULT_VOCAB_TYPES);
    protected mode = signal<VocabDrill>(this.saved.mode ?? 'meaning');
    protected count = signal(this.saved.count ?? 20);
    /** Vocabulario de las lecciones elegidas (sin filtrar por tipo); vacío mientras carga */
    protected lessonWords = signal<Word[]>([]);
    protected isLoading = signal(false);
    protected showList = signal(false);
    protected listLimit = signal(LIST_PAGE);

    // --- Valores derivados (computed) ---
    /** Palabras que entran en la práctica: de las lecciones elegidas y de los tipos elegidos */
    protected chosen = computed(() => filterByTypes(this.lessonWords(), this.typesSel()));
    protected canStart = computed(() => !this.isLoading() && this.chosen().length > 0);
    protected visibleWords = computed(() => this.chosen().slice(0, this.listLimit()));
    /** Cuántas palabras de las lecciones elegidas tiene cada tipo (el número de cada chip) */
    protected typeCounts = computed(() => new Map(this.typeFilters.map((filter) => [filter.id, filterByTypes(this.lessonWords(), [filter.id]).length])));

    // Opciones fijas de la plantilla
    protected typeFilters = WORD_TYPE_FILTERS.filter((filter) => filter.id !== 'all');
    protected drills = VOCAB_DRILLS;
    protected counts = VOCAB_COUNTS;

    // Evita que una carga lenta pise a una más nueva al cambiar la selección rápido
    private currentLoadId = 0;

    constructor() {
        // Sin configuración guardada: de la lección 1 a la que se está estudiando
        if (!this.lessonsSel().length) {
            const lastLesson = this.progressSVC.lastLesson().id;
            this.lessonsSel.set(Array.from({ length: Math.max(1, lastLesson) }, (_, i) => i + 1));
        }
        // Recarga el vocabulario cada vez que cambian las lecciones elegidas
        effect(() => void this.loadWords(this.lessonsSel()));
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga el vocabulario de las lecciones elegidas */
    private async loadWords(lessonIds: number[]): Promise<void> {
        const loadId = ++this.currentLoadId;
        this.isLoading.set(true);
        const lessons = lessonIds.length ? await this.lessonSVC.getMany(lessonIds) : [];
        if (loadId !== this.currentLoadId) return;
        this.lessonWords.set(lessons.flatMap((lesson) => lesson.vocab));
        this.listLimit.set(LIST_PAGE);
        this.isLoading.set(false);
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Formulario ------------------------------------------------------------- //
    /** Marca o desmarca un tipo de palabra */
    protected toggleType(id: string): void {
        this.typesSel.update((selected) => (selected.includes(id) ? selected.filter((type) => type !== id) : [...selected, id]));
    }

    /** Enseña otra página de la lista de palabras */
    protected showMore(): void {
        this.listLimit.update((limit) => limit + LIST_PAGE);
    }

    /** Guarda la configuración y abre la práctica con ella en la query */
    protected start(): void {
        const config: VocabConfig = { lessons: this.lessonsSel(), types: this.typesSel(), mode: this.mode(), count: this.count() };
        save('vocabConfig', config);
        void this.router.navigate(['/vocabulario/practica'], {
            queryParams: { lessons: config.lessons.join(','), types: config.types.join(','), mode: config.mode, count: config.count },
        });
    }
    // ------------------------------- Formulario ------------------------------------------------------------- //

    // ------------------------------- Lista de palabras ------------------------------------------------------------- //
    /** Devuelve la forma principal de una palabra (con kanji si los tiene) */
    protected mainForm(word: Word): string {
        return wordMain(word, true);
    }

    /** Devuelve la lectura en kana de una palabra */
    protected readingOf(word: Word): string {
        return wordReading(word);
    }
    // ------------------------------- Lista de palabras ------------------------------------------------------------- //
}
