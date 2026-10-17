import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { ProgressService } from '../../services/progress.service';
import { SpeechService } from '../../services/speech.service';
import { Lesson } from '../../interfaces/lesson.interface';
import { ListenConfig, ListenContent } from '../../interfaces/listen.interface';
import {
    buildListenItems,
    DEFAULT_LISTEN_CONFIG,
    estimateMinutes,
    LISTEN_CONTENTS,
    LISTEN_COUNTS,
    LISTEN_MODES,
    LISTEN_PAUSES,
} from '../../utils/listen.utils';
import { loadRaw, save } from '../../utils/storage.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { LessonPickerComponent } from '../../components/lesson-picker/lesson-picker.component';

@Component({
    selector: 'app-listen',
    imports: [RouterLink, IconComponent, LessonPickerComponent],
    templateUrl: './listen.component.html',
    styleUrl: './listen.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListenComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    protected speechSVC = inject(SpeechService);
    private router = inject(Router);

    // Última configuración usada (nihongo:listenConfig): el formulario arranca con ella
    private saved = loadRaw<Partial<ListenConfig>>('listenConfig', {});

    // --- Estados UI con Signals ---
    protected config = signal<ListenConfig>({ ...DEFAULT_LISTEN_CONFIG, lessons: [], ...this.saved });
    /** Lecciones elegidas ya cargadas, para contar los audios */
    protected lessons = signal<Lesson[]>([]);
    protected isLoading = signal(false);

    // --- Valores derivados (computed) ---
    private interests = computed(() => this.progressSVC.settings().interests ?? []);
    /** Audios disponibles con lo elegido (sin recortar por cantidad) */
    protected available = computed(() => buildListenItems(this.lessons(), { ...this.config(), count: 0, isShuffled: false }, this.interests()).length);
    protected total = computed(() => (this.config().count ? Math.min(this.config().count, this.available()) : this.available()));
    protected minutes = computed(() => estimateMinutes(this.total(), this.config()));
    protected canStart = computed(() => !this.isLoading() && this.total() > 0);

    // Opciones fijas de la plantilla
    protected contents = LISTEN_CONTENTS;
    protected modes = LISTEN_MODES;
    protected pauses = LISTEN_PAUSES;
    protected counts = LISTEN_COUNTS;

    // Evita que una carga lenta pise a una más nueva al cambiar la selección rápido
    private currentLoadId = 0;

    constructor() {
        // Sin configuración guardada: de la lección 1 a la que se está estudiando
        if (!this.config().lessons.length) {
            const lastLesson = this.progressSVC.lastLesson().id;
            this.update({ lessons: Array.from({ length: Math.max(1, lastLesson) }, (_, i) => i + 1) });
        }
        // Recarga las lecciones cada vez que cambia la selección
        effect(() => void this.loadLessons(this.config().lessons));
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga las lecciones elegidas */
    private async loadLessons(lessonIds: number[]): Promise<void> {
        const loadId = ++this.currentLoadId;
        this.isLoading.set(true);
        const lessons = lessonIds.length ? await this.lessonSVC.getMany(lessonIds) : [];
        if (loadId !== this.currentLoadId) return;
        this.lessons.set(lessons);
        this.isLoading.set(false);
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Formulario ------------------------------------------------------------- //
    /** Cambia parte de la configuración */
    protected update(change: Partial<ListenConfig>): void {
        this.config.update((config) => ({ ...config, ...change }));
    }

    /** Cambia las lecciones elegidas (lo llama el selector de lecciones) */
    protected setLessons(lessons: number[]): void {
        this.update({ lessons });
    }

    /** Marca o desmarca un tipo de contenido */
    protected toggleContent(content: ListenContent): void {
        const current = this.config().content;
        this.update({ content: current.includes(content) ? current.filter((item) => item !== content) : [...current, content] });
    }

    /** Guarda la configuración y abre el reproductor */
    protected start(): void {
        save('listenConfig', this.config());
        void this.router.navigate(['/escuchar/reproducir']);
    }
    // ------------------------------- Formulario ------------------------------------------------------------- //
}
