import { Location, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressService } from '../../../../services/progress.service';
import { SfxService } from '../../../../services/sfx.service';
import { GameTimerComponent } from '../../../../components/game-timer/game-timer.component';
import { IconComponent } from '../../../../components/icon/icon.component';
import { JpComponent } from '../../../../components/jp/jp.component';
import { nameToKatakana } from '../../../../utils/kana.utils';
import { ExamSlotComponent } from '../../../../components/exam-slot/exam-slot.component';
import { LEVEL_PRESETS } from '../../../../utils/level.utils';
import { ExamItem, LevelExamSection, Seg, Slot, SlotResult } from '../../../../interfaces/level-exam.interface';
import { LevelExamService } from '../../../../services/level-exam.service';

/** Espera antes de mover el scroll al abrir el banco: deja que Angular pinte la casilla activa (.pick.on) */
const PICK_SCROLL_DELAY_MS = 30;
/** Espera antes de corregir: deja que la casilla con foco termine de guardar su valor (blur y el setTimeout de su input) */
const SUBMIT_DELAY_MS = 60;

@Component({
    selector: 'app-level-sheet',
    imports: [ExamSlotComponent, JpComponent, IconComponent, GameTimerComponent, NgTemplateOutlet],
    templateUrl: './level-sheet.component.html',
    styleUrl: './level-sheet.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LevelSheetComponent {
    // --- Inyección de dependencias ---
    protected levelExamSVC = inject(LevelExamService);
    private progressSVC = inject(ProgressService);
    private sfxSVC = inject(SfxService);
    private router = inject(Router);
    protected location = inject(Location);

    // --- Estados UI con Signals ---
    /** Escritura de las casillas "mixed" (selector あ / ア de la barra inferior) */
    protected script = signal<'hira' | 'kata'>('hira');
    /** Segundo toque de «Entregar» cuando quedan casillas en blanco */
    protected confirming = signal(false);
    protected rebuilding = signal(false);
    /** Casilla de la tabla de kana abierta en el banco de formas */
    protected picking = signal<{ slot: string; slotRef: Slot; hint: string; bank: string[]; section: LevelExamSection } | null>(null);

    // --- Valores derivados (computed) ---
    protected draft = this.levelExamSVC.draft;
    protected results = this.levelExamSVC.results;
    protected exam = computed(() => this.draft()?.exam ?? null);
    protected graded = computed(() => !!this.draft()?.submittedAt);
    protected name = computed(() => this.progressSVC.settings().name.trim());
    /** Hay alguna casilla "mixed": solo entonces se enseña el selector あ / ア */
    protected hasMixed = computed(() => !!this.exam()?.sections.some((section) => section.items.some((item) => item.slots.some((slot) => slot.input === 'mixed'))));
    protected blanks = computed(() => (this.draft() ? this.levelExamSVC.blankCount(this.draft()!) : 0));
    /** Mes y día de inicio, para la cabecera 日にち */
    protected date = computed(() => {
        const startedAt = new Date(this.draft()?.startedAt ?? Date.now());
        return { month: startedAt.getMonth() + 1, day: startedAt.getDate() };
    });
    /** Tiempo usado; congelado al entregar */
    protected elapsed = computed(() => {
        const draft = this.draft();
        return draft ? (draft.submittedAt ?? Date.now()) - draft.startedAt : 0;
    });
    /** Nota con los puntos extra, redondeada a un decimal */
    protected finalScore = computed(() => {
        const result = this.results();
        return result ? Math.round((result.score + result.bonus) * 10) / 10 : 0;
    });
    /** Estrellas de la profesora: ☆☆ desde 90 %, ☆ desde 80 % */
    protected stars = computed(() => {
        const result = this.results();
        if (!result) return 0;
        const ratio = (result.score + result.bonus) / result.total;
        return ratio >= 0.9 ? 2 : ratio >= 0.8 ? 1 : 0;
    });
    /** Nombre del usuario en katakana, como sugerencia al corregir la sección de nombre */
    protected nameSuggestion = computed(() => (this.name() ? nameToKatakana(this.name()) : ''));

    constructor() {
        // Sin hoja (p. ej. entrando directo por URL) se vuelve a la lista de niveles
        if (!this.draft()) void this.router.navigate(['/examen/nivel'], { replaceUrl: true });
    }

    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //
    /** Indica si un trozo de texto es un hueco */
    protected isSlot(seg: Seg): seg is { slot: number } {
        return typeof seg !== 'string';
    }

    /** Devuelve la respuesta guardada de una casilla */
    protected value(slot: Slot): string {
        return this.draft()?.answers[slot.id] ?? '';
    }

    /** Guarda la respuesta de una casilla */
    protected set(slot: Slot, value: string): void {
        this.levelExamSVC.setAnswer(slot.id, value);
    }

    /** Devuelve la corrección de una casilla; null sin entregar */
    protected result(slot: Slot): SlotResult | null {
        return this.results()?.perSlot[slot.id] ?? null;
    }

    /** Devuelve los puntos obtenidos en un ítem */
    protected earned(item: ExamItem): number {
        return this.results()?.perItem[item.id] ?? 0;
    }

    /** Indica si el ítem está marcado como «Mi respuesta vale» */
    protected overridden(item: ExamItem): boolean {
        return !!this.draft()?.overrides[item.id];
    }

    /** Indica si se ofrece «Mi respuesta vale»: hoja corregida, ítem contestado, de español o difuso, y sin la nota completa */
    protected canOverride(item: ExamItem): boolean {
        const answered = item.slots.every((slot) => !!this.value(slot).trim());
        return (
            this.graded() &&
            answered &&
            item.slots.some((slot) => slot.check === 'es' || slot.check === 'fuzzy') &&
            (this.earned(item) < item.points || this.overridden(item))
        );
    }

    /** Formatea puntos: entero sin decimales, si no con uno */
    protected formatPoints(points: number): string {
        return Number.isInteger(points) ? String(points) : points.toFixed(1);
    }

    /** Devuelve los puntos obtenidos en la sección de ese índice */
    protected sectionPoints(index: number): number {
        return this.results()?.perSection[index] ?? 0;
    }

    /** Devuelve los puntos máximos de una sección */
    protected sectionMax(section: LevelExamSection): number {
        return section.items.reduce((sum, item) => sum + item.points, 0);
    }

    /** Busca un ítem de la sección por id */
    protected itemById(section: LevelExamSection, id?: string): ExamItem | undefined {
        return id ? section.items.find((item) => item.id === id) : undefined;
    }

    /** Devuelve las columnas de la tabla de kana de derecha a izquierda (la de あ a la derecha, como en papel) */
    protected columns(section: LevelExamSection) {
        return [...(section.grid ?? [])].reverse();
    }

    /** Devuelve la mitad del vocabulario: 0 = japonés → español, 1 = español → japonés */
    protected vocabHalf(section: LevelExamSection, part: 0 | 1): ExamItem[] {
        return section.items.filter((item) => (part === 0 ? item.promptJp : !item.promptJp));
    }

    /** Devuelve el número de la pregunta dentro de su sección (empieza en 1) */
    protected itemNumber(section: LevelExamSection, item: ExamItem): number {
        return section.items.indexOf(item) + 1;
    }
    // ------------------------------- Ayudas de plantilla ------------------------------------------------------------- //

    // ------------------------------- Tablas de kana: banco de formas ------------------------------------------------------------- //
    /** Abre el banco de formas para una casilla de la tabla */
    protected openPick(section: LevelExamSection, item: ExamItem): void {
        this.picking.set({ slot: item.slots[0].id, slotRef: item.slots[0], hint: item.hint ?? '', bank: section.bank ?? [], section });
        // Mantener la casilla activa a la vista por encima del banco
        setTimeout(() => {
            const activeCell = document.querySelector<HTMLElement>('.pick.on');
            const bank = document.querySelector<HTMLElement>('.bank');
            if (!activeCell || !bank) return;
            const cellRect = activeCell.getBoundingClientRect();
            const limit = bank.getBoundingClientRect().top - 16;
            if (cellRect.bottom > limit || cellRect.top < 70) {
                window.scrollBy({ top: cellRect.top - Math.max(90, limit - cellRect.height - 140), behavior: 'smooth' });
            }
        }, PICK_SCROLL_DELAY_MS);
    }

    /** Cierra el banco de formas */
    protected closePick(): void {
        this.picking.set(null);
    }

    /** Rellena la casilla y salta a la siguiente vacía de la misma tabla */
    protected choose(char: string): void {
        const picking = this.picking();
        if (!picking) return;
        this.set(picking.slotRef, char);
        this.sfxSVC.play('tap');
        // Vaciar la casilla deja el banco abierto en ella
        if (!char) return;
        // Orden de lectura de la tabla (columna あ primero), empezando después de la casilla actual y dando la vuelta
        const order = this.columns(picking.section)
            .slice()
            .reverse()
            .flat()
            .map((cell) => this.itemById(picking.section, cell.item))
            .filter((item): item is ExamItem => !!item);
        const currentIndex = order.findIndex((item) => item.slots[0].id === picking.slot);
        const nextEmpty = [...order.slice(currentIndex + 1), ...order.slice(0, currentIndex)].find((item) => !this.value(item.slots[0]));
        if (nextEmpty) this.openPick(picking.section, nextEmpty);
        else this.closePick();
    }
    // ------------------------------- Tablas de kana: banco de formas ------------------------------------------------------------- //

    // ------------------------------- Ordenar frases ------------------------------------------------------------- //
    /** Devuelve los índices de las fichas ya colocadas (guardados en la respuesta `<id>:idx`) */
    protected picks(slot: Slot): number[] {
        const raw = this.draft()?.answers[slot.id + ':idx'] ?? '';
        return raw ? raw.split(',').map(Number) : [];
    }

    /** Coloca una ficha al final de la frase */
    protected tapToken(slot: Slot, tokenIndex: number): void {
        if (this.graded() || this.picks(slot).includes(tokenIndex)) return;
        this.savePicks(slot, [...this.picks(slot), tokenIndex]);
        this.sfxSVC.play('tap');
    }

    /** Quita la ficha de esa posición de la frase */
    protected untap(slot: Slot, position: number): void {
        if (this.graded()) return;
        this.savePicks(slot, this.picks(slot).filter((_, index) => index !== position));
    }

    /** Guarda los índices y, como respuesta corregible, el texto de las fichas en ese orden */
    private savePicks(slot: Slot, picks: number[]): void {
        this.levelExamSVC.setAnswer(slot.id + ':idx', picks.join(','));
        this.levelExamSVC.setAnswer(slot.id, picks.map((index) => slot.tokens![index]).join(' '));
    }
    // ------------------------------- Ordenar frases ------------------------------------------------------------- //

    // ------------------------------- Acciones ------------------------------------------------------------- //
    /** Entrega la hoja; con casillas en blanco pide un segundo toque */
    protected submit(): void {
        if (this.blanks() > 0 && !this.confirming()) {
            this.confirming.set(true);
            return;
        }
        this.confirming.set(false);
        this.closePick();
        // El blur hace que la casilla con foco guarde su valor (ん final) antes de corregir
        (document.activeElement as HTMLElement | null)?.blur?.();
        setTimeout(() => {
            this.levelExamSVC.submit();
            this.sfxSVC.play('done');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, SUBMIT_DELAY_MS);
    }

    /** Genera otra hoja del mismo examen (otras preguntas) */
    protected async again(): Promise<void> {
        const draft = this.draft();
        const preset = LEVEL_PRESETS.find((candidate) => candidate.id === draft?.exam.presetId) ?? this.levelExamSVC.lastCustom();
        if (!preset) return;
        this.rebuilding.set(true);
        await this.levelExamSVC.create(preset);
        this.rebuilding.set(false);
        window.scrollTo({ top: 0 });
    }

    /** Vuelve a la lista de exámenes de nivel */
    protected exit(): void {
        void this.router.navigate(['/examen/nivel']);
    }
    // ------------------------------- Acciones ------------------------------------------------------------- //
}
