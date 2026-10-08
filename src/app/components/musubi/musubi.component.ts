import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { PetService } from '../../services/pet.service';
import { MusubiMood } from '../../interfaces/pet.interface';

/** Escala de cada etapa: las primeras encogen desde el centro de abajo para que la ropa no se mueva */
const STAGE_SCALE = [0.78, 0.9, 1, 1];
/** Cuánto dura la cara de «oops» antes de volver a la tranquila (ms) */
const OOPS_DURATION_MS = 1300;
/** Cuánto dura el saltito de alegría tras un toque (ms) */
const TAP_HOP_DURATION_MS = 1000;

/**
 * Musubi, la mascota de la app: el onigiri del icono (public/logo.svg), con estados de ánimo,
 * ropa y etapas de crecimiento. Si no se le dice otra cosa enseña la mascota del usuario (su
 * etapa y la ropa que lleva puesta). Al tocarlo da un salto; `poke` avisa al padre.
 */
@Component({
    selector: 'app-musubi',
    imports: [],
    templateUrl: './musubi.component.html',
    styleUrl: './musubi.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusubiComponent {
    // --- Inyección de dependencias ---
    private petSVC = inject(PetService);

    // --- Inputs y outputs ---
    readonly mood = input<MusubiMood>('idle');
    readonly size = input(64);
    /** Ropa a enseñar; por defecto la que lleva puesta la mascota del usuario */
    readonly wearing = input<string[] | undefined>(undefined);
    /** Etapa de crecimiento 0–3; por defecto la del usuario */
    readonly stage = input<number | undefined>(undefined);
    /** Desactivado donde el padre gestiona los toques (la casa de Musubi) */
    readonly tappable = input(true);
    readonly poke = output<void>();

    // --- Estados UI con Signals ---
    /** Ánimo que se ve: el del input, o un saltito corto tras un toque */
    protected shownMood = signal<MusubiMood>('idle');

    // --- Valores derivados (computed) ---
    /** Etapa que se pinta */
    protected currentStage = computed(() => this.stage() ?? this.petSVC.stageIndex());
    /** Ropa que se pinta */
    protected wornItems = computed(() => this.wearing() ?? this.petSVC.state().wearing);
    /** Transformación del cuerpo: lo sube 14 unidades y, en las primeras etapas, lo encoge */
    protected bodyTransform = computed(() => {
        const scale = STAGE_SCALE[this.currentStage()] ?? 1;
        // 512 792 es el centro de la base del onigiri: se escala alrededor de ese punto
        return scale === 1 ? 'translate(0 -14)' : `translate(0 -14) translate(512 792) scale(${scale}) translate(-512 -792)`;
    });

    // Temporizador que devuelve la cara al ánimo del input
    private moodTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        effect(() => {
            const mood = this.mood();
            // untracked: solo debe reaccionar al input, no a shownMood que se escribe aquí dentro
            untracked(() => {
                clearTimeout(this.moodTimer);
                this.shownMood.set(mood);
                // Las reacciones a una respuesta son cortas; después Musubi vuelve a su cara tranquila
                if (mood === 'oops') this.moodTimer = setTimeout(() => this.shownMood.set('idle'), OOPS_DURATION_MS);
            });
        });
    }

    // ------------------------------- Ropa y toques ------------------------------------------------------------- //
    /** Indica si lleva puesta la prenda `id` */
    protected isWearing(id: string): boolean {
        return this.wornItems().includes(id);
    }

    /** Hace saltar a Musubi al tocarlo y avisa al padre */
    protected onTap(): void {
        if (!this.tappable()) return;
        clearTimeout(this.moodTimer);
        this.shownMood.set('happy');
        this.moodTimer = setTimeout(() => this.shownMood.set(this.mood()), TAP_HOP_DURATION_MS);
        this.poke.emit();
    }
    // ------------------------------- Ropa y toques ------------------------------------------------------------- //
}
