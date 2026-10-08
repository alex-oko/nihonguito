import { inject, Injectable } from '@angular/core';
import { ProgressService } from './progress.service';

/** Sonidos que sabe hacer el servicio */
type SfxKind = 'ok' | 'bad' | 'done' | 'tap' | 'combo';

/** Patrón de vibración de cada sonido (ms de vibración y pausa alternados) */
const VIBRATION_PATTERNS: Record<SfxKind, number | number[]> = {
    ok: 15,
    bad: [40, 40, 40],
    done: [20, 40, 20, 40, 60],
    tap: 5,
    combo: [15, 30, 15],
};

/** Escala pentatónica de do (Hz) para las caricias: cada una seguida sube un escalón */
const PAT_SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319];

/**
 * Sonidos y vibraciones de la app, sintetizados con Web Audio (no hay archivos de audio).
 * Respeta los ajustes `sound` y `vibration` del usuario.
 */
@Injectable({
    providedIn: 'root'
})
export class SfxService {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // Se crea al primer sonido: los navegadores no dejan arrancar audio antes de un gesto del usuario
    private audioContext?: AudioContext;

    // ------------------------------- Sonidos ------------------------------------------------------------- //
    /** Hace vibrar y suena el efecto pedido, según los ajustes */
    play(kind: SfxKind): void {
        const settings = this.progressSVC.settings();
        // 1. Vibración (si está activada y el dispositivo la soporta)
        if (settings.vibration && 'vibrate' in navigator) {
            try {
                navigator.vibrate(VIBRATION_PATTERNS[kind]);
            } catch {
                /* algunos navegadores lanzan error si no hubo gesto del usuario: se ignora */
            }
        }

        // 2. Sonido
        if (!settings.sound) return;
        switch (kind) {
            case 'ok':
                // «Ding-ding» suave, como una campanita
                this.note(988, 0, 0.32, 'sine');
                this.note(1319, 0.09, 0.42, 'sine');
                this.note(2638, 0.09, 0.18, 'sine', 0.025);
                return;
            case 'bad':
                // Un «bonk» grave y amable que baja: se nota, pero no castiga
                this.note(330, 0, 0.26, 'triangle', 0.11, 247);
                this.note(196, 0.12, 0.3, 'triangle', 0.09, 165);
                return;
            case 'combo':
                // Arpegio rápido hacia arriba
                [784, 988, 1175, 1568].forEach((frequency, index) => this.note(frequency, index * 0.06, 0.28, 'sine'));
                return;
            case 'done':
                // Arpegio de do mayor y después el acorde entero
                [523, 659, 784].forEach((frequency, index) => this.note(frequency, index * 0.11, 0.35, 'triangle'));
                [523, 659, 784, 1047].forEach((frequency) => this.note(frequency, 0.36, 0.7, 'sine', 0.05));
                return;
            case 'tap':
                this.note(1200, 0, 0.05, 'sine', 0.04);
                return;
        }
    }

    /** Suena una caricia suave a Musubi: cada caricia seguida suena un escalón más agudo */
    pat(step: number): void {
        if (!this.progressSVC.settings().sound) return;
        this.note(PAT_SCALE[Math.min(step, PAT_SCALE.length - 1)], 0, 0.22, 'sine', 0.05);
    }
    // ------------------------------- Sonidos ------------------------------------------------------------- //

    // ------------------------------- Síntesis ------------------------------------------------------------- //
    /** Toca una nota con ataque rápido y caída natural; `glideTo` desliza el tono hasta esa frecuencia */
    private note(frequency: number, startAt: number, duration: number, type: OscillatorType, peak = 0.08, glideTo?: number): void {
        try {
            this.audioContext ??= new AudioContext();
            const context = this.audioContext;
            // En móviles el contexto puede quedar suspendido al volver de segundo plano
            if (context.state === 'suspended') void context.resume();
            const start = context.currentTime + startAt;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, start);
            if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
            // Las rampas exponenciales no pueden empezar ni terminar en 0: por eso 0.0001
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + duration + 0.03);
        } catch {
            /* sin audio disponible: la app sigue en silencio */
        }
    }
    // ------------------------------- Síntesis ------------------------------------------------------------- //
}
