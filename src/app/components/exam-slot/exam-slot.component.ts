import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    input,
    OnDestroy,
    output,
    untracked,
    viewChild,
} from '@angular/core';
import { bind, unbind } from 'wanakana';
import { JpComponent } from '../jp/jp.component';
import { Slot, SlotResult } from '../../interfaces/level-exam.interface';

/**
 * Una casilla de la hoja de examen: un campo pequeño en línea mientras se responde y,
 * una vez corregida, la corrección de profesora (✓ rojo o la respuesta correcta).
 */
@Component({
    selector: 'app-exam-slot',
    imports: [JpComponent],
    templateUrl: './exam-slot.component.html',
    styleUrl: './exam-slot.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamSlotComponent implements OnDestroy {
    // --- Inputs y outputs ---
    readonly slot = input.required<Slot>();
    readonly value = input('');
    /** Escritura de los campos "mixed" (selector あ / ア) */
    readonly script = input<'hira' | 'kata'>('hira');
    readonly result = input<SlotResult | null>(null);
    readonly label = input('Respuesta');
    readonly valueChange = output<string>();

    // Campo de texto (no existe cuando la casilla ya está corregida)
    private inputRef = viewChild<ElementRef<HTMLInputElement>>('inputField');
    // Campo al que está enlazado wanakana ahora mismo, para poder soltarlo
    private boundTo: HTMLInputElement | null = null;

    constructor() {
        // El valor guardado se pone una sola vez al pintar; después manda el campo, que avisa con valueChange
        afterNextRender(() => {
            const inputElement = this.inputRef()?.nativeElement;
            if (inputElement) inputElement.value = this.value();
        });
        // Reenlaza wanakana cuando aparece el campo o cambia la escritura; untracked para no depender de boundTo
        effect(() => {
            const inputElement = this.inputRef()?.nativeElement;
            const kind = this.slot().input;
            const script = this.script();
            untracked(() => this.rebind(inputElement ?? null, kind === 'mixed' ? script : kind));
        });
    }

    ngOnDestroy(): void {
        this.rebind(null, '');
    }

    // ------------------------------- Teclado japonés (wanakana) ------------------------------------------------------------- //
    /** Suelta el campo anterior y enlaza wanakana al nuevo en modo hiragana o katakana (otros modos no se enlazan) */
    private rebind(inputElement: HTMLInputElement | null, mode: string): void {
        if (this.boundTo) {
            try {
                unbind(this.boundTo);
            } catch {
                /* El campo ya no existe */
            }
            this.boundTo = null;
        }
        if (!inputElement || (mode !== 'hira' && mode !== 'kata')) return;
        bind(inputElement, { IMEMode: mode === 'kata' ? 'toKatakana' : 'toHiragana' });
        this.boundTo = inputElement;
    }
    // ------------------------------- Teclado japonés (wanakana) ------------------------------------------------------------- //

    // ------------------------------- Eventos del campo ------------------------------------------------------------- //
    /** Emite el valor del campo */
    protected sync(): void {
        // wanakana reescribe el valor después del evento input
        setTimeout(() => {
            const inputElement = this.inputRef()?.nativeElement;
            if (inputElement) this.valueChange.emit(inputElement.value);
        });
    }

    /** Convierte la "n" final en ん / ン al salir del campo */
    protected flush(): void {
        const inputElement = this.inputRef()?.nativeElement;
        if (!inputElement || !this.boundTo) return;
        const isKatakana = this.slot().input === 'kata' || (this.slot().input === 'mixed' && this.script() === 'kata');
        const flushed = inputElement.value.replace(/n$/i, isKatakana ? 'ン' : 'ん');
        if (flushed !== inputElement.value) {
            inputElement.value = flushed;
            this.valueChange.emit(flushed);
        }
    }

    /** Con Enter salta a la siguiente casilla de la hoja */
    protected next(event: Event): void {
        event.preventDefault();
        this.flush();
        const allInputs = [...document.querySelectorAll<HTMLInputElement>('app-exam-slot input')];
        const index = allInputs.indexOf(event.target as HTMLInputElement);
        allInputs[index + 1]?.focus();
    }
    // ------------------------------- Eventos del campo ------------------------------------------------------------- //
}
