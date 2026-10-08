import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KATAKANA_LOOKALIKES, KATAKANA_RULES, nameToKatakana } from '../../../../utils/kana.utils';
import { SpeechService } from '../../../../services/speech.service';
import { IconComponent } from '../../../../components/icon/icon.component';
import { SpeakButtonComponent } from '../../../../components/speak-button/speak-button.component';

@Component({
    selector: 'app-katakana-lab',
    imports: [RouterLink, IconComponent, SpeakButtonComponent],
    templateUrl: './katakana-lab.component.html',
    styleUrl: './katakana-lab.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatakanaLabComponent {
    // --- Inyección de dependencias ---
    private speechSVC = inject(SpeechService);

    // --- Estados UI con Signals ---
    protected name = signal('');

    // --- Valores derivados (computed) ---
    protected kata = computed(() => (this.name().trim() ? nameToKatakana(this.name().trim()) : ''));

    // Datos fijos que pinta la plantilla
    protected lookalikes = KATAKANA_LOOKALIKES;
    protected rules = KATAKANA_RULES;

    // Plan de práctica: cada paso enlaza a una pantalla ya existente (tabla, quiz, trazo, contrarreloj)
    protected steps: { title: string; desc: string; link: string; query?: Record<string, string> }[] = [
        { title: 'Aprende por filas', desc: 'Tabla con trucos para cada símbolo. Empieza por ア y カ.', link: '/kana/katakana' },
        { title: 'Entrena los parecidos', desc: 'シ/ツ, ソ/ン, ク/ケ/タ… hasta distinguirlos al instante.', link: '/kana/katakana/practica/lookalikes' },
        { title: 'Lee palabras reales', desc: 'コーヒー, テレビ, メキシコ… adivina qué significan.', link: '/kana/katakana/practica/loanwords' },
        { title: 'Traza de memoria', desc: 'Escribir con el dedo fija la forma.', link: '/kana/katakana/trazar', query: { rows: 'a,k,s,t,n' } },
        { title: 'Repasa tus difíciles', desc: 'La app elige los símbolos que más fallas.', link: '/kana/katakana/practica/weak' },
        { title: 'Contrarreloj', desc: '60 segundos: ¿cuántos lees?', link: '/juego/contrarreloj', query: { kana: 'katakana' } },
    ];

    // ------------------------------- Audio ------------------------------------------------------------- //
    /** Pronuncia un símbolo de las parejas que se confunden */
    protected say(char: string): void {
        void this.speechSVC.speak(char);
    }
    // ------------------------------- Audio ------------------------------------------------------------- //
}
