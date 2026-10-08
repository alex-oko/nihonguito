import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, output, signal, untracked } from '@angular/core';
import { ProgressService } from '../../services/progress.service';
import { SfxService } from '../../services/sfx.service';
import { SpeechService } from '../../services/speech.service';
import { shuffle } from '../../utils/text.utils';
import { IconComponent } from '../icon/icon.component';
import { JpComponent } from '../jp/jp.component';
import { GameTimerComponent } from '../game-timer/game-timer.component';
import { MatchCard, MatchPair } from '../../interfaces/match-game.interface';

/** Parejas por ronda (cinco filas caben en pantalla sin desplazar) */
const PAIRS_PER_ROUND = 5;
/** Pausa tras unir la última pareja antes de pasar de ronda, para que se vea la última unión */
const NEXT_ROUND_DELAY_MS = 450;
/** Duración del parpadeo rojo de una ficha mal unida */
const ERROR_FLASH_MS = 350;
/** XP por pareja al terminar */
const XP_PER_PAIR = 3;
/** XP que resta cada error */
const XP_PER_MISTAKE = 2;
/** XP mínimo de una partida terminada, aunque los errores lo dejen por debajo */
const XP_MIN = 5;

@Component({
    selector: 'app-match-game',
    imports: [IconComponent, JpComponent, GameTimerComponent],
    templateUrl: './match-game.component.html',
    styleUrl: './match-game.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchGameComponent implements OnDestroy {
    // --- Inyección de dependencias ---
    private sfxSVC = inject(SfxService);
    private speechSVC = inject(SpeechService);
    private progressSVC = inject(ProgressService);
    private location = inject(Location);

    // --- Inputs y outputs ---
    readonly pairs = input.required<MatchPair[]>();
    readonly title = input('Parejas');
    readonly again = output<void>();

    // --- Estados UI con Signals ---
    protected round = signal(0);
    protected leftCards = signal<MatchCard[]>([]);
    protected rightCards = signal<MatchCard[]>([]);
    /** Ids de las parejas ya unidas en la ronda actual */
    protected matchedIds = signal(new Set<string>());
    protected selectedLeft = signal<MatchCard | null>(null);
    protected selectedRight = signal<MatchCard | null>(null);
    /** `pairId + side` de la ficha que parpadea en rojo; vacío si ninguna */
    protected errorFlashKey = signal('');
    protected mistakes = signal(0);
    protected isFinished = signal(false);
    protected startedAt = signal<number | null>(null);
    /** Tiempo final, se fija al terminar */
    protected elapsedMs = signal(0);
    protected xpGained = signal(0);
    private matchedCount = signal(0);

    // --- Valores derivados (computed) ---
    protected roundCount = computed(() => Math.ceil(this.pairs().length / PAIRS_PER_ROUND));
    protected total = computed(() => this.pairs().length);
    protected progressPercent = computed(() => (this.total() ? (this.matchedCount() / this.total()) * 100 : 0));
    /** Tiempo final como «m:ss» */
    protected clockText = computed(() => {
        const seconds = Math.floor(this.elapsedMs() / 1000);
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    });

    // Parejas que tuvieron algún error: al unirlas cuentan como fallo para el dominio
    private missedPairIds = new Set<string>();

    constructor() {
        // Unas parejas nuevas empiezan otra partida; untracked para no suscribir el effect a lo que toca start
        effect(() => {
            this.pairs();
            untracked(() => this.start());
        });
    }

    ngOnDestroy(): void {
        this.speechSVC.stopSpeaking();
    }

    // ------------------------------- Partida ------------------------------------------------------------- //
    /** Pone a cero la partida y monta la primera ronda */
    private start(): void {
        this.round.set(0);
        this.mistakes.set(0);
        this.isFinished.set(false);
        this.elapsedMs.set(0);
        this.matchedCount.set(0);
        this.missedPairIds.clear();
        this.startedAt.set(Date.now());
        this.setupRound();
    }

    /** Reparte las parejas de la ronda actual en dos columnas barajadas por separado */
    private setupRound(): void {
        const roundPairs = this.pairs().slice(this.round() * PAIRS_PER_ROUND, (this.round() + 1) * PAIRS_PER_ROUND);
        this.leftCards.set(shuffle(roundPairs.map((pair) => ({ pairId: pair.id, text: pair.left, side: 'L' as const, style: pair.leftStyle ?? 'jp' }))));
        this.rightCards.set(shuffle(roundPairs.map((pair) => ({ pairId: pair.id, text: pair.right, side: 'R' as const, style: pair.rightStyle ?? 'es' }))));
        this.matchedIds.set(new Set());
        this.selectedLeft.set(null);
        this.selectedRight.set(null);
    }

    /** Pasa a la siguiente ronda o, si era la última, cierra la partida y da el XP */
    private nextRound(): void {
        if (this.round() + 1 >= this.roundCount()) {
            this.elapsedMs.set(Date.now() - (this.startedAt() ?? Date.now()));
            this.isFinished.set(true);
            const xp = Math.max(XP_MIN, this.total() * XP_PER_PAIR - this.mistakes() * XP_PER_MISTAKE);
            this.xpGained.set(xp);
            this.progressSVC.addXp(xp);
            this.progressSVC.finishSession();
            this.sfxSVC.play('done');
            return;
        }
        this.round.update((round) => round + 1);
        this.setupRound();
    }

    /** Vuelve a la pantalla anterior */
    protected back(): void {
        this.location.back();
    }
    // ------------------------------- Partida ------------------------------------------------------------- //

    // ------------------------------- Fichas ------------------------------------------------------------- //
    /** Indica si la ficha es la seleccionada de su columna */
    protected isSelected(card: MatchCard): boolean {
        return (card.side === 'L' ? this.selectedLeft() : this.selectedRight()) === card;
    }

    /** Selecciona (o deselecciona) una ficha y, con una de cada lado, comprueba si forman pareja */
    protected tapCard(card: MatchCard): void {
        // 1. Seleccionar en su columna; tocar la misma ficha otra vez la suelta
        if (card.side === 'L') this.selectedLeft.set(this.selectedLeft() === card ? null : card);
        else this.selectedRight.set(this.selectedRight() === card ? null : card);
        const pair = this.pairs().find((candidate) => candidate.id === card.pairId);
        if (card.side === 'L' && pair?.speak) void this.speechSVC.speak(pair.speak);

        // 2. Falta un lado: solo suena el toque
        const left = this.selectedLeft();
        const right = this.selectedRight();
        if (!left || !right) {
            this.sfxSVC.play('tap');
            return;
        }

        // 3. Pareja correcta: se marca y se registra el dominio (fallo si la pareja tuvo algún error)
        if (left.pairId === right.pairId) {
            this.matchedIds.update((matchedIds) => new Set(matchedIds).add(left.pairId));
            this.matchedCount.update((count) => count + 1);
            this.sfxSVC.play('ok');
            if (pair?.track) this.progressSVC.recordAnswer(pair.track, !this.missedPairIds.has(pair.id));
            this.selectedLeft.set(null);
            this.selectedRight.set(null);
            if (this.matchedIds().size === this.leftCards().length) setTimeout(() => this.nextRound(), NEXT_ROUND_DELAY_MS);
        } else {
            // 4. Pareja incorrecta: error, parpadeo de la ficha derecha y se suelta solo ese lado
            this.mistakes.update((mistakes) => mistakes + 1);
            this.missedPairIds.add(left.pairId);
            this.sfxSVC.play('bad');
            this.errorFlashKey.set(right.pairId + right.side);
            setTimeout(() => this.errorFlashKey.set(''), ERROR_FLASH_MS);
            this.selectedRight.set(null);
        }
    }
    // ------------------------------- Fichas ------------------------------------------------------------- //
}
