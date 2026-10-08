import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toHiragana, toKatakana } from 'wanakana';
import { GROUP_LABELS, HIRAGANA_LOOKALIKES, HIRAGANA_TIPS, KANA_ROWS, KATAKANA_LOOKALIKES, KATAKANA_TIPS, LOANWORDS } from '../../../../utils/kana.utils';
import { Kana, KanaGroup, Lookalike, Script } from '../../../../interfaces/kana.interface';
import { ProgressService } from '../../../../services/progress.service';
import { SpeechService } from '../../../../services/speech.service';
import { loadRaw, save } from '../../../../utils/storage.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { SpeakButtonComponent } from '../../../../components/speak-button/speak-button.component';
import { MusubiSayComponent } from '../../../../components/musubi-say/musubi-say.component';

/** Filas elegidas la primera vez que se abre una tabla (あ y か) */
const DEFAULT_ROWS = ['a', 'k'];
/** Un símbolo visto con caja menor que esta cuenta como «débil» */
const WEAK_BOX_LIMIT = 2;
/** Cabezas de fila que se enseñan en la barra de práctica antes de cortar con … */
const MAX_DOCK_HEADS = 8;
/** Símbolos difíciles que nombra Musubi como máximo */
const MAX_HINT_KANA = 2;
/** Parejas parecidas y palabras de ejemplo que se enseñan en la ficha de un símbolo */
const MAX_DETAIL_LOOKALIKES = 2;
const MAX_DETAIL_EXAMPLES = 3;

@Component({
    selector: 'app-kana-chart',
    imports: [RouterLink, IconComponent, SpeakButtonComponent, MusubiSayComponent],
    templateUrl: './kana-chart.component.html',
    styleUrl: './kana-chart.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaChartComponent {
    // --- Inyección de dependencias ---
    private router = inject(Router);
    private progressSVC = inject(ProgressService);
    private speechSVC = inject(SpeechService);

    // --- Inputs y outputs ---
    readonly script = input.required<Script>();

    // --- Estados UI con Signals ---
    protected group = signal<KanaGroup>('basic');
    /** Ids de las filas elegidas para practicar (se guardan en `kanaRows:<script>`) */
    protected selected = signal<string[]>([]);
    /** Símbolo abierto en la ficha de detalle */
    protected detail = signal<Kana | null>(null);

    // --- Valores derivados (computed) ---
    /** Pestañas de grupo: «Extranjeros» solo existe en katakana */
    protected groups = computed<KanaGroup[]>(() =>
        this.script() === 'katakana' ? ['basic', 'dakuten', 'yoon', 'extended'] : ['basic', 'dakuten', 'yoon'],
    );
    protected rows = computed(() => KANA_ROWS[this.script()].filter((row) => row.group === this.group()));
    protected title = computed(() => (this.script() === 'katakana' ? 'Katakana' : 'Hiragana'));
    /** Columnas de la cuadrícula: los combinados tienen 3 celdas por fila, el resto 5 */
    protected cols = computed(() => (this.group() === 'yoon' ? 3 : 5));
    protected selectedCount = computed(() =>
        KANA_ROWS[this.script()]
            .filter((row) => this.selected().includes(row.id))
            .reduce((total, row) => total + row.cells.filter(Boolean).length, 0),
    );
    /** Filas elegidas como query param `rows` para las pantallas de práctica */
    protected rowsParam = computed(() => this.selected().join(','));
    protected groupAllSelected = computed(() => this.rows().every((row) => this.selected().includes(row.id)));

    /** Filas elegidas por grupo, para el contador de cada pestaña */
    protected groupCount = computed(() => {
        const selectedIds = this.selected();
        const countByGroup: Partial<Record<KanaGroup, number>> = {};
        for (const row of KANA_ROWS[this.script()]) {
            if (selectedIds.includes(row.id)) countByGroup[row.group] = (countByGroup[row.group] ?? 0) + 1;
        }
        return countByGroup;
    });

    /** Primer símbolo de cada fila elegida, para el resumen de la barra de práctica */
    protected selectedHeads = computed(() => {
        const picked = KANA_ROWS[this.script()].filter((row) => this.selected().includes(row.id));
        const heads = picked.slice(0, MAX_DOCK_HEADS).map((row) => row.cells.find(Boolean)!.char);
        return heads.join(' ') + (picked.length > MAX_DOCK_HEADS ? ' …' : '');
    });

    /** Filas con algún símbolo que ya viste pero aún no aprendiste */
    protected weakRows = computed(() => {
        const masteryMap = this.progressSVC.mastery();
        return KANA_ROWS[this.script()]
            .filter((row) => row.cells.some((cell) => cell && masteryMap[`k:${cell.char}`] && masteryMap[`k:${cell.char}`].box < WEAK_BOX_LIMIT))
            .map((row) => row.id);
    });

    /** Musubi señala los dos símbolos que más se resisten (mayor proporción de fallos) */
    protected hint = computed(() => {
        const masteryMap = this.progressSVC.mastery();
        const errorRate = (char: string) => masteryMap[`k:${char}`].wrong / masteryMap[`k:${char}`].seen;
        const weak = KANA_ROWS[this.script()]
            .flatMap((row) => row.cells.filter((cell): cell is Kana => !!cell))
            .filter((cell) => masteryMap[`k:${cell.char}`]?.wrong)
            .sort((first, second) => errorRate(second.char) - errorRate(first.char))
            .slice(0, MAX_HINT_KANA)
            .map((cell) => cell.char);
        if (weak.length === 2) return `${weak[0]} y ${weak[1]} todavía se te esconden. "Mis débiles" las junta en un toque.`;
        if (weak.length === 1) return `${weak[0]} todavía se te esconde. "Mis débiles" la trae en un toque.`;
        return null;
    });

    // Textos de las pestañas y modos de la barra de práctica
    protected groupLabels = GROUP_LABELS;
    protected modes = [
        { id: 'read', icon: 'read', label: 'Leer' },
        { id: 'recognize', icon: 'search', label: 'Reconocer' },
        { id: 'listen', icon: 'headphones', label: 'Escuchar' },
        { id: 'type', icon: 'pencil', label: 'Escribir' },
    ];

    constructor() {
        // Al cambiar de silabario (misma instancia, otra ruta) se cargan sus filas guardadas y se vuelve a «Básicos».
        // untracked: leer y escribir selected aquí no debe convertirlo en dependencia del effect
        effect(() => {
            const script = this.script();
            untracked(() => {
                const savedRows = loadRaw<string[]>(`kanaRows:${script}`, DEFAULT_ROWS);
                this.selected.set(savedRows);
                this.group.set('basic');
            });
        });
    }

    // ------------------------------- Selección de filas ------------------------------------------------------------- //
    /** Marca o desmarca una fila y guarda la selección */
    protected toggleRow(id: string): void {
        this.selected.update((selectedIds) => (selectedIds.includes(id) ? selectedIds.filter((rowId) => rowId !== id) : [...selectedIds, id]));
        save(`kanaRows:${this.script()}`, this.selected());
    }

    /** Elige o quita todas las filas de la pestaña actual, sin tocar las de otras pestañas */
    protected selectGroup(selectAll: boolean): void {
        const groupIds = this.rows().map((row) => row.id);
        this.selected.update((selectedIds) => (selectAll ? [...new Set([...selectedIds, ...groupIds])] : selectedIds.filter((rowId) => !groupIds.includes(rowId))));
        save(`kanaRows:${this.script()}`, this.selected());
    }

    /** Elige las filas con símbolos débiles */
    protected pickWeak(): void {
        this.setRows(this.weakRows());
    }

    /** Elige las filas básicas desde la primera hasta la última que ya practicaste (mínimo dos) */
    protected pickUpTo(): void {
        const masteryMap = this.progressSVC.mastery();
        const basicRows = KANA_ROWS[this.script()].filter((row) => row.group === 'basic');
        let lastPracticed = 0;
        basicRows.forEach((row, index) => {
            if (row.cells.some((cell) => cell && masteryMap[`k:${cell.char}`])) lastPracticed = index;
        });
        this.group.set('basic');
        this.setRows(basicRows.slice(0, Math.max(2, lastPracticed + 1)).map((row) => row.id));
    }

    /** Quita todas las filas elegidas */
    protected clear(): void {
        this.setRows([]);
    }

    /** Sustituye la selección y la guarda */
    private setRows(ids: string[]): void {
        this.selected.set(ids);
        save(`kanaRows:${this.script()}`, ids);
    }
    // ------------------------------- Selección de filas ------------------------------------------------------------- //

    // ------------------------------- Ficha de un símbolo ------------------------------------------------------------- //
    /** Devuelve la caja de Leitner de un símbolo, para el punto de color de su celda */
    protected box(char: string): number {
        return this.progressSVC.box(`k:${char}`);
    }

    /** Abre la ficha de un símbolo y lo pronuncia */
    protected open(kana: Kana): void {
        this.detail.set(kana);
        void this.speechSVC.speak(kana.char);
    }

    /** Devuelve el truco de memoria del símbolo; los combinados usan el de su primer carácter */
    protected tip(kana: Kana): string | undefined {
        const base = [...kana.char][0];
        return kana.script === 'katakana' ? KATAKANA_TIPS[base] : HIRAGANA_TIPS[base];
    }

    /** Devuelve el mismo sonido en el otro silabario */
    protected twin(kana: Kana): string {
        return kana.script === 'katakana' ? toHiragana(kana.char) : toKatakana(kana.char);
    }

    /** Devuelve hasta dos grupos de símbolos parecidos que incluyen a este */
    protected lookalikes(kana: Kana): Lookalike[] {
        const groups = kana.script === 'katakana' ? KATAKANA_LOOKALIKES : HIRAGANA_LOOKALIKES;
        return groups.filter((group) => group.chars.includes(kana.char)).slice(0, MAX_DETAIL_LOOKALIKES);
    }

    /** Devuelve palabras en katakana que llevan el símbolo (en hiragana no hay ejemplos) */
    protected examples(kana: Kana): [string, string][] {
        if (kana.script !== 'katakana') return [];
        return LOANWORDS.filter(([word]) => word.includes(kana.char)).slice(0, MAX_DETAIL_EXAMPLES);
    }
    // ------------------------------- Ficha de un símbolo ------------------------------------------------------------- //

    // ------------------------------- Navegación ------------------------------------------------------------- //
    /** Abre la práctica del modo elegido con las filas seleccionadas */
    protected go(mode: string): void {
        void this.router.navigate(['/kana', this.script(), 'practica', mode], { queryParams: { rows: this.rowsParam() } });
    }
    // ------------------------------- Navegación ------------------------------------------------------------- //
}
