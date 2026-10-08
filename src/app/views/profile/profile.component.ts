import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MASTERED_BOX, ProgressService, SCRIPT_OPTIONS } from '../../services/progress.service';
import { Settings } from '../../interfaces/progress.interface';
import { SpeechService } from '../../services/speech.service';
import { UpdateService } from '../../services/update.service';
import { INTERESTS } from '../../utils/interests.utils';
import { todayKey } from '../../utils/text.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { MusubiComponent } from '../../components/musubi/musubi.component';

// El evento beforeinstallprompt no está en los tipos del DOM de TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InstallEvent = any;

/** Inicial de cada día de la semana (getDay: 0 = domingo) */
const DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
/** Kana básicos de cada silabario: el contador de dominados nunca pasa de aquí */
const BASIC_KANA_COUNT = 46;
/** Peso aproximado de cada audio grabado, en KB */
const AUDIO_CLIP_KB = 6;
/** Descargas de audio en paralelo */
const AUDIO_DOWNLOAD_WORKERS = 6;

@Component({
    selector: 'app-profile',
    imports: [IconComponent, MusubiComponent],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
    // --- Inyección de dependencias ---
    protected progressSVC = inject(ProgressService);
    protected speechSVC = inject(SpeechService);
    protected updateSVC = inject(UpdateService);

    // --- Estados UI con Signals ---
    // Ajustes del usuario (atajo al signal de ProgressService)
    protected settings = this.progressSVC.settings;
    // Evento guardado para lanzar el «Instalar app» del navegador; null si no se puede instalar
    protected installPrompt = signal<InstallEvent | null>(null);
    // Progreso de «Descargar todos los audios»; null mientras no se ha pulsado
    protected audioDownload = signal<{ done: number; total: number } | null>(null);

    // --- Valores derivados (computed) ---
    /** Inicial del nombre, o 私 si no hay nombre */
    protected initial = computed(() => (this.settings().name.trim()[0] ?? '私').toUpperCase());

    /** % de respuestas correctas de siempre */
    protected accuracy = computed(() => {
        const stats = this.progressSVC.stats();
        return stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    });

    /** Palabras en la caja 2 o más */
    protected wordsLearned = computed(
        () => Object.entries(this.progressSVC.mastery()).filter(([key, entry]) => key.startsWith('w:') && entry.box >= 2).length,
    );

    /** Hiragana y katakana sueltos que llegaron a MASTERED_BOX */
    protected kanaMastered = computed(() => {
        const mastery = this.progressSVC.mastery();
        let hiragana = 0;
        let katakana = 0;
        for (const [key, entry] of Object.entries(mastery)) {
            if (!key.startsWith('k:') || entry.box < MASTERED_BOX) continue;
            const kana = key.slice(2);
            // Solo un carácter: las combinaciones (きゃ, シュ…) no cuentan para el 46
            if (kana.length !== 1) continue;
            const code = kana.charCodeAt(0);
            // Rangos Unicode de hiragana (ぁ–ゖ) y katakana (ァ–ヺ)
            if (code >= 0x3041 && code <= 0x3096) hiragana++;
            else if (code >= 0x30a1 && code <= 0x30fa) katakana++;
        }
        return { hiragana: Math.min(hiragana, BASIC_KANA_COUNT), katakana: Math.min(katakana, BASIC_KANA_COUNT) };
    });

    /** Barras de los últimos 7 días, en % de la meta diaria o del mejor día si lo supera */
    protected week = computed(() => {
        const activity = this.progressSVC.activity();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = todayKey(date);
            days.push({ key, xp: activity[key] ?? 0, label: DAY_INITIALS[date.getDay()], today: i === 0 });
        }
        const maxXp = Math.max(this.settings().dailyGoal, ...days.map((day) => day.xp));
        return days.map((day) => ({ ...day, pct: (day.xp / maxXp) * 100 }));
    });

    /** Tamaño aproximado de todos los audios en MB (mínimo 1) */
    protected audioMb = computed(() => Math.max(1, Math.round((this.speechSVC.recordingKeys().length * AUDIO_CLIP_KB) / 1024)));

    // Plantillas visuales: id guardado en settings.theme, textos y 4 colores para la vista previa
    protected themes = [
        { id: 'base', label: 'Base', sub: 'Paleta original', mark: '基', colors: ['#F9F5EB', '#EA5455', '#F07B3F', '#002B5B'] },
        { id: 'sol', label: 'Sol', sub: 'Amarillo y azul', mark: '陽', colors: ['#FFF7D1', '#F4C542', '#F28C28', '#173B67'] },
        { id: 'violeta', label: 'Violeta', sub: 'Morado y verde', mark: '紫', colors: ['#100B1A', '#7040A0', '#A6D632', '#352047'] },
        { id: 'carmesi', label: 'Carmesí', sub: 'Rojo y naranja', mark: '紅', colors: ['#190D0D', '#D62929', '#F08035', '#5B151A'] },
    ] as const;
    // Opciones de meta diaria en XP
    protected goals = [20, 50, 100, 200];
    protected interests = INTERESTS;
    protected scriptOptions = SCRIPT_OPTIONS;

    constructor() {
        // index.html guarda en window.__installPrompt el evento si llegó antes de abrir esta vista
        const globalWindow = window as InstallEvent;
        if (globalWindow.__installPrompt) this.installPrompt.set(globalWindow.__installPrompt);
        window.addEventListener('beforeinstallprompt', (event) => {
            // Evita el aviso automático del navegador: se instala desde el botón
            event.preventDefault();
            this.installPrompt.set(event);
        });
    }

    // ------------------------------- Ajustes ------------------------------------------------------------- //
    /** Cambia un ajuste del usuario */
    protected updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
        this.progressSVC.settings.update((settings) => ({ ...settings, [key]: value }));
    }

    /** Marca o desmarca un interés */
    protected toggleInterest(id: string): void {
        this.progressSVC.settings.update((settings) => {
            const hasInterest = settings.interests.includes(id);
            return { ...settings, interests: hasInterest ? settings.interests.filter((interestId) => interestId !== id) : [...settings.interests, id] };
        });
    }

    /** Lee una frase de prueba con la velocidad de voz elegida */
    protected testVoice(): void {
        void this.speechSVC.speak('こんにちは。いっしょに にほんごを べんきょうしましょう。');
    }

    /** Pide confirmación y borra todo el progreso */
    protected reset(): void {
        if (confirm('¿Seguro? Se borrarán tu XP, racha y todo lo aprendido. No se puede deshacer.')) {
            this.progressSVC.resetAll();
        }
    }
    // ------------------------------- Ajustes ------------------------------------------------------------- //

    // ------------------------------- Sin conexión e instalación ------------------------------------------------------------- //
    /** Descarga cada audio una vez para que el service worker lo guarde y funcione sin conexión */
    protected async downloadAudio(): Promise<void> {
        const keys = [...this.speechSVC.recordingKeys()];
        const total = keys.length;
        let done = 0;
        this.audioDownload.set({ done, total });
        // Cada worker saca claves de la misma cola hasta vaciarla
        const worker = async () => {
            while (keys.length) {
                const key = keys.shift()!;
                try {
                    await fetch(`audio/${key}.mp3`);
                } catch {
                    // Se ignora: se reintenta en la próxima descarga
                }
                this.audioDownload.set({ done: ++done, total });
            }
        };
        await Promise.all(Array.from({ length: AUDIO_DOWNLOAD_WORKERS }, worker));
    }

    /** Abre el diálogo de instalación del navegador */
    protected async install(): Promise<void> {
        const event = this.installPrompt();
        if (!event) return;
        event.prompt();
        await event.userChoice;
        // El evento solo sirve una vez
        this.installPrompt.set(null);
    }
    // ------------------------------- Sin conexión e instalación ------------------------------------------------------------- //
}
