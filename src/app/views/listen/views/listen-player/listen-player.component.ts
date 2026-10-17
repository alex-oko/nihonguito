import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LessonService } from '../../../../services/lesson.service';
import { ProgressService } from '../../../../services/progress.service';
import { SpeechService } from '../../../../services/speech.service';
import { PlanService } from '../../../../services/plan.service';
import { planListenConfig } from '../../../../utils/plan.utils';
import { ListenConfig, ListenItem, ListenPhase } from '../../../../interfaces/listen.interface';
import { buildListenItems, DEFAULT_LISTEN_CONFIG, GAP_MS, PAUSE_MS, SLOW_RATE, spokenEs } from '../../../../utils/listen.utils';
import { loadRaw } from '../../../../utils/storage.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { JpComponent } from '../../../../components/jp/jp.component';

/** Silencio entre las dos veces que suena el japonés cuando se repite */
const REPEAT_GAP_MS = 700;
/** Velocidad del español en modo lento */
const SLOW_SPANISH_RATE = 0.85;

@Component({
    selector: 'app-listen-player',
    imports: [IconComponent, JpComponent],
    templateUrl: './listen-player.component.html',
    styleUrl: './listen-player.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListenPlayerComponent implements OnInit, OnDestroy {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private speechSVC = inject(SpeechService);
    private planSVC = inject(PlanService);
    private router = inject(Router);

    // --- Inputs y outputs ---
    /** ?preset=plan: escucha corta del «Plan de hoy» (no usa ni cambia la configuración guardada) */
    readonly preset = input<string>('');

    // --- Estados UI con Signals ---
    protected items = signal<ListenItem[]>([]);
    protected index = signal(0);
    protected isPlaying = signal(false);
    protected phase = signal<ListenPhase>('first');
    protected isDone = signal(false);
    protected isLoading = signal(true);

    // --- Valores derivados (computed) ---
    protected current = computed(() => this.items()[this.index()] ?? null);
    protected progressPercent = computed(() => (this.items().length ? ((this.index() + 1) / this.items().length) * 100 : 0));
    /** En «español → japonés» el japonés se esconde hasta que suena, para no soplar la respuesta (en pausa se ve todo) */
    protected showJp = computed(() => !this.isPlaying() || this.config.mode !== 'es-jp' || this.phase() === 'second' || this.phase() === 'gap');
    /** En «japonés → español» la traducción aparece cuando suena (en pausa se ve todo) */
    protected showEs = computed(() => !this.isPlaying() || this.config.mode !== 'jp-es' || this.phase() === 'second' || this.phase() === 'gap');

    /** El elemento no tiene grabación y el dispositivo no tiene voz japonesa: no va a sonar el japonés */
    protected isSilent = computed(() => {
        const item = this.current();
        return !!item && !this.speechSVC.hasJapaneseVoice() && !this.speechSVC.hasRecording(item.say);
    });

    // Configuración guardada por /escuchar y lecciones cargadas (para rearmar la lista al repetir)
    protected config: ListenConfig = { ...DEFAULT_LISTEN_CONFIG, lessons: [], ...loadRaw<Partial<ListenConfig>>('listenConfig', {}) };
    private lessons: Awaited<ReturnType<LessonService['getMany']>> = [];
    // Cada reproducción tiene un id: al pausar o saltar se incrementa y la secuencia vieja se detiene sola
    private runId = 0;
    // Pantalla encendida mientras suena
    private wakeLock: WakeLockSentinel | null = null;
    private onVisibility = () => {
        if (document.visibilityState === 'visible' && this.isPlaying()) void this.keepScreenOn();
    };

    constructor() {
        document.addEventListener('visibilitychange', this.onVisibility);
        this.setupMediaSession();
    }

    ngOnInit(): void {
        // En ngOnInit y no en el constructor: el input preset (de la query) aún no está puesto al construir
        if (this.preset() === 'plan') this.config = planListenConfig(this.progressSVC.lastLesson().id);
        void this.load();
    }

    ngOnDestroy(): void {
        this.runId++;
        this.speechSVC.stopSpeaking();
        void this.releaseScreen();
        document.removeEventListener('visibilitychange', this.onVisibility);
        this.clearMediaSession();
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga las lecciones elegidas, arma la lista y empieza a sonar */
    private async load(): Promise<void> {
        this.lessons = this.config.lessons.length ? await this.lessonSVC.getMany(this.config.lessons) : [];
        this.items.set(buildListenItems(this.lessons, this.config, this.progressSVC.settings().interests ?? []));
        this.isLoading.set(false);
        // Se llega aquí tocando «Empezar», así que el navegador ya permite reproducir sin otro toque
        if (this.items().length) void this.play(0);
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Reproducción ------------------------------------------------------------- //
    /** Reproduce desde un elemento hasta el final (o en bucle) */
    protected async play(fromIndex = this.index()): Promise<void> {
        const runId = ++this.runId;
        this.isDone.set(false);
        this.isPlaying.set(true);
        void this.keepScreenOn();
        for (let itemIndex = fromIndex; itemIndex < this.items().length; itemIndex++) {
            this.index.set(itemIndex);
            this.updateMediaMetadata();
            if (!(await this.playItem(this.items()[itemIndex], runId))) return;
        }
        if (runId !== this.runId) return;
        // Al terminar: en bucle se rearma la lista (otro orden si está mezclada); si no, fin
        if (this.config.isLooping) {
            // Una vuelta completa ya cuenta para el plan de hoy
            this.planSVC.markDone('listen');
            this.items.set(buildListenItems(this.lessons, this.config, this.progressSVC.settings().interests ?? []));
            void this.play(0);
            return;
        }
        this.isPlaying.set(false);
        this.isDone.set(true);
        this.planSVC.markDone('listen');
        void this.releaseScreen();
    }

    /** Hace sonar un elemento según el modo; devuelve false si se pausó o saltó mientras sonaba */
    private async playItem(item: ListenItem, runId: number): Promise<boolean> {
        const isCurrent = () => runId === this.runId;
        const sayJapanese = async () => {
            const rate = this.config.isSlow ? SLOW_RATE : this.progressSVC.settings().rate;
            for (let time = 0; time < this.config.repeat; time++) {
                if (time > 0 && !(await this.wait(REPEAT_GAP_MS, runId))) return false;
                await this.speechSVC.speak(item.say, { rate, voice: item.voice });
                if (!isCurrent()) return false;
            }
            return true;
        };
        const saySpanish = async () => {
            await this.speechSVC.speakSpanish(spokenEs(item.es), this.config.isSlow ? SLOW_SPANISH_RATE : 1);
            return isCurrent();
        };

        // 1. Primer idioma
        this.phase.set('first');
        const first = this.config.mode === 'es-jp' ? saySpanish : sayJapanese;
        if (!(await first())) return false;

        // 2. Pausa para pensar y segundo idioma (no en «solo japonés»)
        if (this.config.mode !== 'jp') {
            this.phase.set('think');
            if (!(await this.wait(PAUSE_MS[this.config.pause], runId))) return false;
            this.phase.set('second');
            const second = this.config.mode === 'es-jp' ? sayJapanese : saySpanish;
            if (!(await second())) return false;
        }

        // 3. Silencio antes del siguiente
        this.phase.set('gap');
        return this.wait(GAP_MS, runId);
    }

    /** Espera `ms`; devuelve false si mientras tanto se pausó o saltó */
    private wait(ms: number, runId: number): Promise<boolean> {
        return new Promise((resolve) => setTimeout(() => resolve(runId === this.runId), ms));
    }

    /** Pausa o reanuda (al reanudar, el elemento actual vuelve a empezar) */
    protected toggle(): void {
        if (this.isPlaying()) this.pause();
        else void this.play(this.isDone() ? 0 : this.index());
    }

    /** Detiene el audio y la secuencia */
    protected pause(): void {
        this.runId++;
        this.speechSVC.stopSpeaking();
        this.isPlaying.set(false);
        void this.releaseScreen();
    }

    /** Salta a otro elemento; si estaba sonando, sigue sonando desde ahí */
    protected jump(step: number): void {
        const target = Math.min(this.items().length - 1, Math.max(0, this.index() + step));
        const wasPlaying = this.isPlaying();
        this.pause();
        this.index.set(target);
        this.phase.set('first');
        this.updateMediaMetadata();
        if (wasPlaying) void this.play(target);
    }

    /** Sale al formulario de /escuchar (o a Inicio si se vino desde el plan de hoy) */
    protected exit(): void {
        this.pause();
        void this.router.navigate([this.preset() === 'plan' ? '/' : '/escuchar']);
    }
    // ------------------------------- Reproducción ------------------------------------------------------------- //

    // ------------------------------- Pantalla y controles del sistema ------------------------------------------------------------- //
    /** Pide que la pantalla no se apague mientras suena (si el navegador lo permite) */
    private async keepScreenOn(): Promise<void> {
        try {
            if (!this.wakeLock && 'wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock?.addEventListener('release', () => (this.wakeLock = null));
        } catch {
            /* sin permiso o sin soporte: la pantalla se apaga como siempre */
        }
    }

    /** Deja que la pantalla se apague otra vez */
    private async releaseScreen(): Promise<void> {
        try {
            await this.wakeLock?.release();
        } catch {
            /* ya estaba liberado */
        }
        this.wakeLock = null;
    }

    /** Conecta los botones de los audífonos y de la pantalla de bloqueo (play, pausa, siguiente, anterior) */
    private setupMediaSession(): void {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.setActionHandler('play', () => void this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.jump(1));
        navigator.mediaSession.setActionHandler('previoustrack', () => this.jump(-1));
    }

    /** Pone en la pantalla de bloqueo la palabra o frase que suena */
    private updateMediaMetadata(): void {
        const item = this.current();
        if (!item || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
        navigator.mediaSession.metadata = new MediaMetadata({ title: item.show, artist: item.es, album: 'Nihonguito · Escuchar' });
    }

    /** Suelta los botones del sistema al salir */
    private clearMediaSession(): void {
        if (!('mediaSession' in navigator)) return;
        for (const action of ['play', 'pause', 'nexttrack', 'previoustrack'] as MediaSessionAction[]) {
            navigator.mediaSession.setActionHandler(action, null);
        }
        navigator.mediaSession.metadata = null;
    }
    // ------------------------------- Pantalla y controles del sistema ------------------------------------------------------------- //
}
