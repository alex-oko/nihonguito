import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy, output, signal, untracked } from '@angular/core';
import { ChoiceQuestion } from '../../interfaces/question.interface';
import { ProgressService } from '../../services/progress.service';
import { SfxService } from '../../services/sfx.service';
import { loadRaw, save } from '../../utils/storage.utils';
import { IconComponent } from '../icon/icon.component';
import { JpComponent } from '../jp/jp.component';
import { GameTimerComponent } from '../game-timer/game-timer.component';

/** Duración de la partida en segundos */
const DURATION_SECONDS = 60;
/** Tiempo que resta cada error */
const MISS_PENALTY_MS = 3000;
/** Cada cuánto se recalcula el tiempo restante */
const TICK_MS = 100;
/** Tiempo restante desde el que la partida se considera en zona de alarma */
const LOW_TIME_MS = 10000;
/** Pausa tras un acierto antes de la siguiente pregunta */
const NEXT_AFTER_OK_MS = 180;
/** Pausa tras un fallo: más larga para que se vea el parpadeo rojo */
const NEXT_AFTER_MISS_MS = 450;
/** XP por acierto al terminar */
const XP_PER_CORRECT = 2;

@Component({
    selector: 'app-speed-game',
    imports: [IconComponent, JpComponent, GameTimerComponent],
    templateUrl: './speed-game.component.html',
    styleUrl: './speed-game.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeedGameComponent implements OnDestroy {
    // --- Inyección de dependencias ---
    private sfxSVC = inject(SfxService);
    private progressSVC = inject(ProgressService);
    protected location = inject(Location);

    // --- Inputs y outputs ---
    readonly questions = input.required<ChoiceQuestion[]>();
    readonly title = input('Contrarreloj');
    /** Sufijo de la clave del récord en localStorage (`nihongo:best:<storageKey>`) */
    readonly storageKey = input('speed');
    readonly again = output<void>();

    // --- Estados UI con Signals ---
    protected gameState = signal<'ready' | 'play' | 'over'>('ready');
    /** Momento en que se acaba el tiempo (cada error lo adelanta 3 s) */
    protected endsAt = signal<number | null>(null);
    protected remainingMs = signal(DURATION_SECONDS * 1000);
    protected score = signal(0);
    protected misses = signal(0);
    protected streak = signal(0);
    protected index = signal(0);
    protected flashResult = signal<'ok' | 'bad' | null>(null);
    protected bestScore = signal(0);
    protected isNewRecord = signal(false);

    // --- Valores derivados (computed) ---
    protected isLow = computed(() => this.gameState() === 'play' && this.remainingMs() <= LOW_TIME_MS);
    /** Pregunta actual; la lista se recorre en bucle si se acaba antes que el tiempo */
    protected current = computed(() => {
        const questions = this.questions();
        return questions.length ? questions[this.index() % questions.length] : null;
    });

    // Duración para la plantilla
    protected durationSeconds = DURATION_SECONDS;

    private tickTimer?: ReturnType<typeof setInterval>;
    // Bloquea respuestas mientras dura el parpadeo de la anterior (evita dobles toques)
    private isLocked = false;

    constructor() {
        // El récord depende de la clave (kana o vocabulario); se relee si cambia
        effect(() => {
            const key = this.storageKey();
            untracked(() => this.bestScore.set(loadRaw<number>(`best:${key}`, 0)));
        });
    }

    ngOnDestroy(): void {
        clearInterval(this.tickTimer);
    }

    // ------------------------------- Partida ------------------------------------------------------------- //
    /** Empieza (o reinicia) la partida con el reloj completo */
    start(): void {
        clearInterval(this.tickTimer);
        this.gameState.set('play');
        this.endsAt.set(Date.now() + DURATION_SECONDS * 1000);
        this.remainingMs.set(DURATION_SECONDS * 1000);
        this.score.set(0);
        this.misses.set(0);
        this.streak.set(0);
        this.index.set(0);
        this.isNewRecord.set(false);
        this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    }

    /** Recalcula el tiempo restante y termina la partida al llegar a cero */
    private tick(): void {
        const endsAt = this.endsAt();
        if (endsAt == null) return;
        this.remainingMs.set(Math.max(0, endsAt - Date.now()));
        if (this.remainingMs() <= 0) this.end();
    }

    /** Cierra la partida: da el XP y guarda el récord si se superó */
    private end(): void {
        if (this.gameState() !== 'play') return;
        clearInterval(this.tickTimer);
        this.remainingMs.set(0);
        this.gameState.set('over');
        this.progressSVC.addXp(this.score() * XP_PER_CORRECT);
        this.progressSVC.finishSession();
        if (this.score() > this.bestScore()) {
            this.bestScore.set(this.score());
            this.isNewRecord.set(this.score() > 0);
            save(`best:${this.storageKey()}`, this.score());
        }
        this.sfxSVC.play('done');
    }
    // ------------------------------- Partida ------------------------------------------------------------- //

    // ------------------------------- Respuestas ------------------------------------------------------------- //
    /** Comprueba la opción elegida; un fallo resta MISS_PENALTY_MS al reloj */
    protected answer(choice: string): void {
        const question = this.current();
        if (!question || this.isLocked) return;
        const isCorrect = choice === question.answer;
        this.isLocked = true;

        // 1. Dominio de la palabra o kana
        if (question.track) this.progressSVC.recordAnswer(`${question.track.kind === 'kana' ? 'k' : 'w'}:${question.track.id}`, isCorrect);

        // 2. Marcador, racha y penalización
        if (isCorrect) {
            this.score.update((score) => score + 1);
            this.streak.update((streak) => streak + 1);
            this.sfxSVC.play('ok');
        } else {
            this.misses.update((misses) => misses + 1);
            this.streak.set(0);
            this.endsAt.update((endsAt) => (endsAt ?? Date.now()) - MISS_PENALTY_MS);
            // tick inmediato: si la penalización agota el tiempo, la partida acaba ya y no al siguiente intervalo
            this.tick();
            this.sfxSVC.play('bad');
        }

        // 3. Parpadeo y siguiente pregunta
        this.flashResult.set(isCorrect ? 'ok' : 'bad');
        setTimeout(
            () => {
                this.flashResult.set(null);
                this.index.update((index) => index + 1);
                this.isLocked = false;
                if (this.remainingMs() <= 0) this.end();
            },
            isCorrect ? NEXT_AFTER_OK_MS : NEXT_AFTER_MISS_MS,
        );
    }
    // ------------------------------- Respuestas ------------------------------------------------------------- //
}
