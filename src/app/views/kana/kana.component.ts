import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { allKana, KANA_ROWS } from '../../utils/kana.utils';
import { Script } from '../../interfaces/kana.interface';
import { MASTERED_BOX, ProgressService } from '../../services/progress.service';
import { loadRaw } from '../../utils/storage.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { MusubiComponent } from '../../components/musubi/musubi.component';

/** Cuántas cabezas de fila se enseñan en «Tus filas» antes de cortar con … */
const MAX_SAVED_HEADS = 6;

@Component({
    selector: 'app-kana-hub',
    imports: [RouterLink, IconComponent, MusubiComponent],
    templateUrl: './kana.component.html',
    styleUrl: './kana.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Valores derivados (computed) ---
    /** Símbolos dominados de cada silabario (sin los extranjeros, que son opcionales) */
    protected mastery = computed(() => {
        const masteryMap = this.progressSVC.mastery();
        const calculate = (script: Script) => {
            const list = allKana(script).filter((kana) => kana.group !== 'extended');
            const done = list.filter((kana) => (masteryMap[`k:${kana.char}`]?.box ?? -1) >= MASTERED_BOX).length;
            return { done, total: list.length, pct: (done / list.length) * 100 };
        };
        return { hiragana: calculate('hiragana'), katakana: calculate('katakana') };
    });

    /** Filas elegidas la última vez en cada tabla (las guarda la tabla), para volver a practicarlas en un toque */
    protected saved = computed(() => {
        // Se lee mastery solo como disparador: al volver de una práctica el computed se recalcula y relee las filas
        this.progressSVC.mastery();
        const read = (script: Script) => {
            const rows = loadRaw<string[]>(`kanaRows:${script}`, []);
            const picked = KANA_ROWS[script].filter((row) => rows.includes(row.id));
            if (!picked.length) return null;
            const count = picked.reduce((total, row) => total + row.cells.filter(Boolean).length, 0);
            const heads = picked
                .slice(0, MAX_SAVED_HEADS)
                .map((row) => row.cells.find(Boolean)!.char)
                .join(' ');
            return { rows: rows.join(','), count, heads: picked.length > MAX_SAVED_HEADS ? heads + ' …' : heads };
        };
        return { hiragana: read('hiragana'), katakana: read('katakana') };
    });

    // Las dos tarjetas de silabario del hub
    protected scripts: { id: Script; name: string; jp: string; glyph: string; desc: string }[] = [
        { id: 'hiragana', name: 'Hiragana', jp: 'ひらがな', glyph: 'あ', desc: 'Para palabras japonesas y partículas.' },
        { id: 'katakana', name: 'Katakana', jp: 'カタカナ', glyph: 'ア', desc: 'Para palabras extranjeras y nombres.' },
    ];
}
