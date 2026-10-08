import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Word } from '../../interfaces/lesson.interface';
import { ProgressService } from '../../services/progress.service';
import { wordMain, wordReading } from '../../utils/questions.utils';
import { SfxService } from '../../services/sfx.service';
import { SpeechService } from '../../services/speech.service';
import { romaji } from '../../utils/text.utils';
import { IconComponent } from '../icon/icon.component';
import { JpComponent } from '../jp/jp.component';

/** Etiqueta en español de cada tipo de palabra (la insignia de la tarjeta) */
const TYPE_LABEL: Record<string, string> = {
    verb: 'verbo',
    noun: 'sustantivo',
    'i-adj': 'adjetivo い',
    'na-adj': 'adjetivo な',
    adv: 'adverbio',
    pron: 'pronombre',
    expr: 'expresión',
    counter: 'contador',
    name: 'nombre propio',
};
/** Píxeles de arrastre a partir de los que la tarjeta sale (derecha = la sé, izquierda = repasar) */
const SWIPE_THRESHOLD_PX = 90;
/** Píxeles de movimiento a partir de los que el gesto ya no cuenta como toque para voltear */
const DRAG_START_PX = 8;
/** Duración de la animación de salida antes de mostrar la siguiente tarjeta */
const LEAVE_ANIMATION_MS = 220;
/** Espera antes de leer la palabra de la tarjeta nueva */
const AUTOPLAY_DELAY_MS = 200;
/** XP por «¡La sé!» */
const XP_KNOWN = 3;
/** XP por «Repasar» (también suma: mirar la tarjeta ya es estudiar) */
const XP_REVIEW = 1;

@Component({
    selector: 'app-flashcards',
    imports: [IconComponent, JpComponent],
    templateUrl: './flashcards.component.html',
    styleUrl: './flashcards.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardsComponent {
    // --- Inyección de dependencias ---
    private speechSVC = inject(SpeechService);
    private sfxSVC = inject(SfxService);
    private progressSVC = inject(ProgressService);
    protected location = inject(Location);
    private router = inject(Router);

    // --- Inputs y outputs ---
    readonly words = input.required<Word[]>();
    readonly title = input('Tarjetas');
    readonly lessonId = input<number | null>(null);
    readonly again = output<void>();

    // --- Estados UI con Signals ---
    protected queue = signal<Word[]>([]);
    protected index = signal(0);
    protected isFlipped = signal(false);
    /** Desplazamiento horizontal del arrastre en píxeles */
    protected dragX = signal(0);
    protected leavingDirection = signal<'left' | 'right' | null>(null);
    protected knownCount = signal(0);
    protected reviewCount = signal(0);

    // --- Valores derivados (computed) ---
    protected script = computed(() => this.progressSVC.settings().script);
    protected current = computed(() => this.queue()[this.index()]);

    // Referencias para la plantilla
    protected Math = Math;
    protected typeLabel = TYPE_LABEL;

    // Estado del gesto de arrastre
    private pointerStartX: number | null = null;
    private hasMoved = false;

    // Ids de las palabras que ya volvieron a la cola (solo vuelven una vez y solo cuenta su primera respuesta)
    private retriedIds = new Set<string>();
    private autoplayTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // Cada lista nueva de palabras reinicia la ronda
        effect(() => {
            const words = this.words();
            untracked(() => {
                this.queue.set([...words]);
                this.index.set(0);
                this.knownCount.set(0);
                this.reviewCount.set(0);
                this.retriedIds.clear();
                this.show();
            });
        });
    }

    // ------------------------------- Tarjeta ------------------------------------------------------------- //
    /** Deja la tarjeta actual boca arriba y programa su audio */
    private show(): void {
        this.isFlipped.set(false);
        this.dragX.set(0);
        this.leavingDirection.set(null);
        clearTimeout(this.autoplayTimer);
        this.speechSVC.stopSpeaking();
        // La tarjeta se lee al disparar el timer, así un deslizamiento rápido nunca reproduce una palabra anterior
        this.autoplayTimer = setTimeout(() => {
            const word = this.current();
            if (word) void this.speechSVC.speak(wordReading(word));
        }, AUTOPLAY_DELAY_MS);
    }

    /** Devuelve el texto principal de la palabra (con kanji si los tiene) */
    protected mainText(word: Word): string {
        return wordMain(word, true);
    }

    /** Devuelve la lectura en kana de la palabra */
    protected readingOf(word: Word): string {
        return wordReading(word);
    }

    /** Devuelve el romaji de un texto en kana */
    protected romajiOf(text: string): string {
        return romaji(text);
    }

    /** Lee la palabra sin voltear la tarjeta (el botón está dentro de ella) */
    protected say(event: Event): void {
        event.stopPropagation();
        const word = this.current();
        if (word) void this.speechSVC.speak(wordReading(word));
    }

    /** Voltea la tarjeta, salvo que el toque fuera el final de un arrastre */
    protected flip(): void {
        if (this.hasMoved) return;
        this.isFlipped.update((isFlipped) => !isFlipped);
        this.sfxSVC.play('tap');
    }
    // ------------------------------- Tarjeta ------------------------------------------------------------- //

    // ------------------------------- Arrastre ------------------------------------------------------------- //
    /** Empieza el gesto guardando la X inicial */
    protected onPointerDown(event: PointerEvent): void {
        this.pointerStartX = event.clientX;
        this.hasMoved = false;
    }

    /** Mueve la tarjeta con el dedo */
    protected onPointerMove(event: PointerEvent): void {
        if (this.pointerStartX === null) return;
        const deltaX = event.clientX - this.pointerStartX;
        if (Math.abs(deltaX) > DRAG_START_PX) this.hasMoved = true;
        this.dragX.set(deltaX);
    }

    /** Suelta la tarjeta: responde si pasó el umbral o la devuelve al centro */
    protected onPointerUp(): void {
        const deltaX = this.dragX();
        this.pointerStartX = null;
        if (deltaX > SWIPE_THRESHOLD_PX) this.answer(true);
        else if (deltaX < -SWIPE_THRESHOLD_PX) this.answer(false);
        else this.dragX.set(0);
        // El click llega después del pointerup: hasMoved se limpia en el siguiente turno para que flip lo vea
        setTimeout(() => (this.hasMoved = false));
    }
    // ------------------------------- Arrastre ------------------------------------------------------------- //

    // ------------------------------- Respuestas ------------------------------------------------------------- //
    /** Registra «la sé» o «repasar», saca la tarjeta y pasa a la siguiente */
    protected answer(isKnown: boolean): void {
        const word = this.current();
        if (!word || this.leavingDirection()) return;

        // 1. Solo la primera respuesta de cada palabra cuenta para el dominio y los contadores
        if (!this.retriedIds.has(word.id)) {
            this.progressSVC.recordAnswer(`w:${word.id}`, isKnown);
            if (isKnown) this.knownCount.update((count) => count + 1);
            else this.reviewCount.update((count) => count + 1);
        }
        this.progressSVC.addXp(isKnown ? XP_KNOWN : XP_REVIEW);
        this.sfxSVC.play(isKnown ? 'ok' : 'tap');

        // 2. Una palabra para repasar vuelve al final de la cola, una sola vez
        if (!isKnown && !this.retriedIds.has(word.id)) {
            this.retriedIds.add(word.id);
            this.queue.update((queue) => [...queue, word]);
        }

        // 3. Animación de salida y siguiente tarjeta (o fin de la ronda)
        this.leavingDirection.set(isKnown ? 'right' : 'left');
        setTimeout(() => {
            this.index.update((index) => index + 1);
            if (!this.current()) {
                this.sfxSVC.play('done');
                this.progressSVC.finishSession();
            }
            this.show();
        }, LEAVE_ANIMATION_MS);
    }

    /** Lleva a la práctica de significado de la lección, o vuelve atrás si no hay lección */
    protected toQuiz(): void {
        const lessonId = this.lessonId();
        if (lessonId != null) void this.router.navigate(['/lecciones', lessonId, 'practica', 'meaning'], { replaceUrl: true });
        else this.location.back();
    }
    // ------------------------------- Respuestas ------------------------------------------------------------- //
}
