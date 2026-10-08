import {
    afterNextRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    input,
    model,
    OnDestroy,
    output,
    viewChild,
} from '@angular/core';
import { bind, unbind } from 'wanakana';

/** Espera antes de devolver el foco tras limpiar, para que la detección de cambios ya haya rehabilitado el campo */
const REFOCUS_DELAY_MS = 30;

/**
 * Campo de texto que convierte romaji a hiragana o katakana mientras se escribe
 * (así no hace falta teclado japonés). También acepta kana escrito directamente.
 */
@Component({
    selector: 'app-kana-input',
    imports: [],
    templateUrl: './kana-input.component.html',
    styleUrl: './kana-input.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaInputComponent implements OnDestroy {
    // --- Inputs y outputs ---
    /** kana/katakana convierten al escribir; romaji y es dejan el texto tal cual */
    readonly mode = input<'kana' | 'katakana' | 'romaji' | 'es'>('kana');
    readonly placeholder = input('');
    readonly disabled = input(false);
    readonly value = model('');
    readonly enter = output<void>();

    // Campo nativo y si wanakana está enganchado a él (solo en los modos kana y katakana)
    private inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');
    private isBound = false;

    constructor() {
        // wanakana necesita el elemento ya en el DOM, por eso se engancha tras el render.
        // Se repite al cambiar el modo: el componente se reutiliza entre preguntas seguidas
        // (una de hiragana y otra de katakana) y wanakana guarda el modo del primer bind.
        afterRenderEffect(() => {
            this.bindMode(this.mode());
        });
        afterNextRender(() => {
            const field = this.inputRef().nativeElement;
            field.value = this.value();
            field.focus({ preventScroll: true });
        });
    }

    ngOnDestroy(): void {
        this.unbindField();
    }

    // ------------------------------- Teclado japonés (wanakana) ------------------------------------------------------------- //
    /** Suelta el enlace anterior y engancha wanakana en hiragana o katakana (romaji y es no se enganchan) */
    private bindMode(mode: 'kana' | 'katakana' | 'romaji' | 'es'): void {
        this.unbindField();
        if (mode === 'kana' || mode === 'katakana') {
            bind(this.inputRef().nativeElement, { IMEMode: mode === 'katakana' ? 'toKatakana' : 'toHiragana' });
            this.isBound = true;
        }
    }

    /** Suelta wanakana del campo si estaba enganchado */
    private unbindField(): void {
        if (!this.isBound) return;
        this.isBound = false;
        try {
            unbind(this.inputRef().nativeElement);
        } catch {
            /* el elemento ya no existe */
        }
    }
    // ------------------------------- Teclado japonés (wanakana) ------------------------------------------------------------- //

    // ------------------------------- Valor del campo ------------------------------------------------------------- //
    /** Copia el texto del campo al model `value` */
    sync(): void {
        // wanakana reescribe el valor después del evento input; se lee en el siguiente tick
        setTimeout(() => this.value.set(this.inputRef().nativeElement.value));
    }

    /** Devuelve el valor final, convirtiendo una «n» suelta al final en ん (o ン) */
    read(): string {
        const field = this.inputRef().nativeElement;
        let text = field.value;
        // wanakana deja la «n» final sin convertir porque espera a ver si viene «na», «ni»…
        if (this.isBound) {
            text = text.replace(/n$/i, this.mode() === 'katakana' ? 'ン' : 'ん');
            field.value = text;
        }
        this.value.set(text);
        return text;
    }

    /** Vacía el campo y le devuelve el foco */
    clear(): void {
        const field = this.inputRef().nativeElement;
        field.value = '';
        this.value.set('');
        // Espera a que la detección de cambios vuelva a habilitar el campo; un campo deshabilitado no acepta el foco
        setTimeout(() => field.focus({ preventScroll: true }), REFOCUS_DELAY_MS);
    }
    // ------------------------------- Valor del campo ------------------------------------------------------------- //
}
