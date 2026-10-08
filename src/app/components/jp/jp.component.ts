import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FuriganaService } from '../../services/furigana.service';
import { Seg } from '../../interfaces/furigana.interface';
import { ProgressService } from '../../services/progress.service';

/**
 * Pinta texto japonés según la preferencia del usuario:
 * solo kana, kanji con furigana (hiragana encima) o solo kanji.
 */
@Component({
    selector: 'app-jp',
    templateUrl: './jp.component.html',
    styleUrl: './jp.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JpComponent {
    // --- Inyección de dependencias ---
    private furiganaSVC = inject(FuriganaService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    readonly text = input<string>('');
    /** Fuerza un modo (p. ej. 'kanji' para enseñar el original) */
    readonly as = input<'kana' | 'furigana' | 'kanji' | null>(null);

    // --- Valores derivados (computed) ---
    /** Modo de pintado: 'plain' si el diccionario no ha cargado o el texto no tiene kanji */
    protected mode = computed(() => {
        const text = this.text() ?? '';
        if (!this.furiganaSVC.ready() || !this.furiganaSVC.hasKanji(text)) return 'plain';
        return this.as() ?? this.progressSVC.settings().script;
    });
    /** Trozos del texto: cadena suelta o par [kanji, lectura] */
    protected segments = computed<Seg[]>(() => this.furiganaSVC.segs(this.text() ?? ''));
    /** Texto entero pasado a kana */
    protected kana = computed(() => this.furiganaSVC.kana(this.text() ?? ''));

    // ------------------------------- Plantilla ------------------------------------------------------------- //
    /** Indica si el trozo es un par [kanji, lectura] que va en un <ruby> */
    protected isPair(segment: Seg): segment is [string, string] {
        return Array.isArray(segment);
    }
    // ------------------------------- Plantilla ------------------------------------------------------------- //
}
