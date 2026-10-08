import { ChangeDetectionStrategy, Component, computed, effect, input, OnDestroy, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Intervalo de refresco del reloj: 25 fps bastan y siguen funcionando cuando el navegador limita los frames */
const REFRESH_MS = 40;

/** Reloj de juego: barra que se vacía con el tiempo restante (cuenta atrás) o un cronómetro */
@Component({
    selector: 'app-game-timer',
    imports: [IconComponent],
    templateUrl: './game-timer.component.html',
    styleUrl: './game-timer.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTimerComponent implements OnDestroy {
    // --- Inputs y outputs ---
    readonly mode = input<'countdown' | 'stopwatch'>('countdown');
    /** Duración total (cuenta atrás), para el ancho de la barra */
    readonly totalMs = input(60000);
    /** Cuenta atrás: momento en que se acaba el tiempo. Cronómetro: momento en que empezó */
    readonly anchor = input<number | null>(null);
    readonly running = input(false);
    /** Valor que se muestra mientras no corre (el tiempo completo antes de empezar, o el tiempo final) */
    readonly frozenMs = input(0);
    /** Cuenta atrás: milisegundos por debajo de los que el reloj entra en alarma */
    readonly lowAtMs = input(10000);
    readonly compact = input(false);

    // --- Estados UI con Signals ---
    private now = signal(Date.now());

    // --- Valores derivados (computed) ---
    protected isCountdown = computed(() => this.mode() === 'countdown');

    /** Milisegundos a mostrar: restantes (cuenta atrás) o transcurridos (cronómetro), nunca negativos */
    protected displayMs = computed(() => {
        const anchor = this.anchor();
        if (!this.running() || anchor == null) return Math.max(0, this.frozenMs());
        return Math.max(0, this.isCountdown() ? anchor - this.now() : this.now() - anchor);
    });
    /** Alarma: en cuenta atrás, por debajo de lowAtMs mientras corre o al llegar a cero */
    protected isLow = computed(() => this.isCountdown() && this.displayMs() <= this.lowAtMs() && (this.running() || this.displayMs() === 0));
    protected percent = computed(() => Math.max(0, Math.min(100, (this.displayMs() / this.totalMs()) * 100)));

    /** Texto «m:ss»; la cuenta atrás redondea hacia arriba para no mostrar 0:00 con tiempo aún */
    protected timeText = computed(() => {
        const totalSeconds = this.isCountdown() ? Math.ceil(this.displayMs() / 1000) : Math.floor(this.displayMs() / 1000);
        return `${Math.floor(totalSeconds / 60)}:${padTwoDigits(totalSeconds % 60)}`;
    });
    protected ariaLabel = computed(() => {
        const seconds = Math.ceil(this.displayMs() / 1000);
        return this.isCountdown() ? `Quedan ${seconds} segundos` : `Tiempo: ${seconds} segundos`;
    });

    private refreshTimer?: ReturnType<typeof setInterval>;

    constructor() {
        // Arranca o para el intervalo que mueve `now` según `running`
        effect(() => {
            clearInterval(this.refreshTimer);
            if (!this.running()) return;
            this.now.set(Date.now());
            this.refreshTimer = setInterval(() => this.now.set(Date.now()), REFRESH_MS);
        });
    }

    ngOnDestroy(): void {
        clearInterval(this.refreshTimer);
    }
}

/** Devuelve el número con dos cifras («5» → «05») */
function padTwoDigits(value: number): string {
    return String(value).padStart(2, '0');
}
