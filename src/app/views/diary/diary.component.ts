import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiaryService } from '../../services/diary.service';
import { ProgressService } from '../../services/progress.service';
import { DiaryOption } from '../../interfaces/diary.interface';
import { buildDiarySentence, DIARY_PROMPTS, isDiaryComplete, promptOfDay, sortByInterest } from '../../utils/diary.utils';
import { ROLE_INFO } from '../../utils/grammar-guide.utils';
import { romaji } from '../../utils/text.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { KanaInputComponent } from '../../components/kana-input/kana-input.component';
import { SentenceBlocksComponent } from '../../components/sentence-blocks/sentence-blocks.component';

/** Frases guardadas mínimas para ofrecer «Practicar mis frases» */
const MIN_ENTRIES_TO_PRACTICE = 2;
/** Milisegundos que se ve el aviso «¡Guardada!» */
const SAVED_NOTICE_MS = 2500;

@Component({
    selector: 'app-diary',
    imports: [RouterLink, IconComponent, KanaInputComponent, SentenceBlocksComponent],
    templateUrl: './diary.component.html',
    styleUrl: './diary.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiaryComponent {
    // --- Inyección de dependencias ---
    protected diarySVC = inject(DiaryService);
    private progressSVC = inject(ProgressService);

    // --- Estados UI con Signals ---
    /** Tema que se está contestando (empieza en el del día) */
    protected promptIndex = signal(promptOfDay());
    /** Palabra elegida para cada hueco del tema (null = vacío) */
    protected chosen = signal<(DiaryOption | null)[]>([]);
    /** Hueco en el que se está escribiendo una palabra propia */
    protected editingSlot = signal<number | null>(null);
    protected showSaved = signal(false);

    // --- Valores derivados (computed) ---
    protected prompt = computed(() => DIARY_PROMPTS[this.promptIndex()]);
    private interests = computed(() => this.progressSVC.settings().interests ?? []);
    /** Palabras de cada hueco, con las de los intereses del usuario primero */
    protected slotOptions = computed(() => this.prompt().slots.map((slot) => sortByInterest(slot.options, this.interests())));
    protected sentence = computed(() => buildDiarySentence(this.prompt().slots, this.chosen()));
    protected isComplete = computed(() => isDiaryComplete(this.prompt().slots, this.chosen()));
    protected canPractice = computed(() => this.diarySVC.entries().length >= MIN_ENTRIES_TO_PRACTICE);

    // Campo para escribir una palabra propia (solo existe mientras se edita un hueco)
    private customInput = viewChild<KanaInputComponent>('customInput');
    protected roleInfo = ROLE_INFO;
    private savedTimer: ReturnType<typeof setTimeout> | null = null;

    // ------------------------------- Tema ------------------------------------------------------------- //
    /** Pasa al siguiente tema y vacía los huecos */
    protected nextPrompt(): void {
        this.promptIndex.update((index) => (index + 1) % DIARY_PROMPTS.length);
        this.chosen.set([]);
        this.editingSlot.set(null);
    }
    // ------------------------------- Tema ------------------------------------------------------------- //

    // ------------------------------- Huecos ------------------------------------------------------------- //
    /** Elige una palabra para un hueco (tocar la misma otra vez la quita) */
    protected choose(slotIndex: number, option: DiaryOption | null): void {
        this.chosen.update((chosen) => {
            const next = [...chosen];
            next[slotIndex] = next[slotIndex]?.jp === option?.jp ? null : option;
            return next;
        });
        this.editingSlot.set(null);
    }

    /** Indica si una palabra es la elegida en su hueco */
    protected isChosen(slotIndex: number, option: DiaryOption): boolean {
        return this.chosen()[slotIndex]?.jp === option.jp;
    }

    /** Devuelve la palabra propia de un hueco, si la que está elegida no es de la lista */
    protected customOf(slotIndex: number): DiaryOption | null {
        const option = this.chosen()[slotIndex];
        return option?.isCustom ? option : null;
    }

    /** Usa la palabra escrita en el campo para el hueco que se está editando */
    protected useCustom(): void {
        const slotIndex = this.editingSlot();
        const text = this.customInput()?.read().trim();
        if (slotIndex === null || !text) return;
        this.chosen.update((chosen) => {
            const next = [...chosen];
            // El significado no se sabe: en «palabra por palabra» y en la práctica se enseña su romaji
            next[slotIndex] = { jp: text, es: romaji(text), isCustom: true };
            return next;
        });
        this.editingSlot.set(null);
    }
    // ------------------------------- Huecos ------------------------------------------------------------- //

    // ------------------------------- Guardar ------------------------------------------------------------- //
    /** Guarda la frase en el diario y deja los huecos listos para otra */
    protected save(): void {
        if (!this.isComplete()) return;
        this.diarySVC.add(this.prompt().id, this.sentence());
        this.chosen.set([]);
        this.showSaved.set(true);
        if (this.savedTimer) clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => this.showSaved.set(false), SAVED_NOTICE_MS);
    }
    // ------------------------------- Guardar ------------------------------------------------------------- //
}
