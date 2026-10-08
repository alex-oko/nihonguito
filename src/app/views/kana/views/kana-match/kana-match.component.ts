import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { allKana } from '../../../../utils/kana.utils';
import { Script } from '../../../../interfaces/kana.interface';
import { sample } from '../../../../utils/text.utils';
import { MatchGameComponent } from '../../../../components/match-game/match-game.component';
import { MatchPair } from '../../../../interfaces/match-game.interface';

/** Parejas que entran en una partida como máximo */
const MAX_PAIRS = 15;
/** Con menos símbolos que estos el memorama no tiene gracia y se usan las filas あ, か y さ */
const MIN_KANA = 5;

@Component({
    selector: 'app-kana-match',
    imports: [MatchGameComponent],
    templateUrl: './kana-match.component.html',
    styleUrl: './kana-match.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaMatchComponent {
    // --- Inputs y outputs ---
    readonly script = input.required<Script>();
    /** Ids de fila separados por comas (query param `rows`) */
    readonly rows = input<string>('');

    // --- Estados UI con Signals ---
    /** Se incrementa en «Otra vez» para que `pairs` saque otra muestra */
    protected seed = signal(0);

    // --- Valores derivados (computed) ---
    protected title = computed(() => (this.script() === 'katakana' ? 'Parejas カタカナ' : 'Parejas ひらがな'));

    /** Parejas kana ↔ romaji de las filas elegidas, barajadas */
    protected pairs = computed<MatchPair[]>(() => {
        this.seed();
        const rowIds = this.rows() ? this.rows().split(',').filter(Boolean) : undefined;
        let list = allKana(this.script(), rowIds);
        if (list.length < MIN_KANA) list = allKana(this.script(), ['a', 'k', 's']);
        return sample(list, Math.min(MAX_PAIRS, list.length)).map((kana) => ({
            id: kana.char,
            left: kana.char,
            right: kana.romaji[0],
            speak: kana.char,
            leftStyle: 'jp-big',
            rightStyle: 'es',
            track: `k:${kana.char}`,
        }));
    });
}
