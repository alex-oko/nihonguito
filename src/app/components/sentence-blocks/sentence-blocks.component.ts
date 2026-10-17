import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ProgressService } from '../../services/progress.service';
import { GuideSentence } from '../../interfaces/grammar-guide.interface';
import { ROLE_INFO, sentenceText } from '../../utils/grammar-guide.utils';
import { romaji } from '../../utils/text.utils';
import { SpeakButtonComponent } from '../speak-button/speak-button.component';

/**
 * Frase japonesa partida en trozos de colores según su papel (tema, lugar, cuándo…), con la partícula
 * resaltada, la traducción debajo y el botón de audio.
 */
@Component({
    selector: 'app-sentence-blocks',
    imports: [SpeakButtonComponent],
    templateUrl: './sentence-blocks.component.html',
    styleUrl: './sentence-blocks.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SentenceBlocksComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    readonly sentence = input.required<GuideSentence>();
    /** Enseña bajo cada trozo el nombre de su papel */
    readonly showRoles = input(false);
    /** Oculta la traducción (cuando la frase ya está explicada al lado) */
    readonly hideEs = input(false);

    // --- Valores derivados (computed) ---
    protected text = computed(() => sentenceText(this.sentence()));
    protected romajiText = computed(() => (this.progressSVC.settings().romaji ? romaji(this.text()) : ''));

    // Nombres de los papeles para la plantilla
    protected roleInfo = ROLE_INFO;
}
