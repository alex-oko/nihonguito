import { Location } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    OnDestroy,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { Conversation, ConversationLineResult, ConversationMode } from '../../../../interfaces/lesson.interface';
import { ProgressService } from '../../../../services/progress.service';
import { ReadingService } from '../../../../services/reading.service';
import { SfxService } from '../../../../services/sfx.service';
import { SpeechService } from '../../../../services/speech.service';
import { romaji } from '../../../../utils/text.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { KanaInputComponent } from '../../../../components/kana-input/kana-input.component';
import { JpComponent } from '../../../../components/jp/jp.component';

/** Parecido (0–1) desde el que una respuesta cuenta como buena */
const GOOD_SCORE = 0.75;
/** Parecido desde el que una respuesta cuenta como «casi» */
const MID_SCORE = 0.5;
/** Parecido desde el que se felicita con «¡Perfecto!» */
const PERFECT_SCORE = 0.9;
/** Intentos flojos que se dejan repetir antes de dar la línea por calificada */
const MAX_WEAK_RETRIES = 2;
/** Pausa entre líneas al escuchar la conversación completa */
const LISTEN_PAUSE_MS = 350;
/** Pausa entre líneas de la app en el juego de rol */
const ROLE_PAUSE_MS = 250;
/** Espera antes de hacer scroll, para que la línea nueva ya esté pintada */
const SCROLL_DELAY_MS = 50;
/** XP al terminar la conversación */
const FINISH_XP = 10;

@Component({
    selector: 'app-conversation-player',
    imports: [IconComponent, KanaInputComponent, JpComponent],
    templateUrl: './conversation-player.component.html',
    styleUrl: './conversation-player.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationPlayerComponent implements OnDestroy {
    // --- Inyección de dependencias ---
    protected location = inject(Location);
    private lessonSVC = inject(LessonService);
    protected speechSVC = inject(SpeechService);
    private readingSVC = inject(ReadingService);
    private sfxSVC = inject(SfxService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    // Llegan de la ruta lecciones/:id/conversacion/:cid (withComponentInputBinding)
    readonly id = input.required<string>();
    readonly cid = input.required<string>();

    // --- Estados UI con Signals ---
    protected conversation = signal<Conversation | null>(null);
    protected mode = signal<ConversationMode>('intro');
    /** Personaje que interpreta el usuario */
    protected role = signal<'A' | 'B'>('B');
    /** Línea actual del juego de rol */
    protected step = signal(0);
    /** Línea que suena ahora, para resaltarla */
    protected playing = signal<number | null>(null);
    /** Resultado de cada línea del usuario, por índice de línea */
    protected results = signal<Record<number, ConversationLineResult>>({});
    protected showJp = signal(true);
    protected showRomaji = signal(false);
    protected showEs = signal(true);
    /** Oculta el japonés de las líneas del usuario hasta que las responde */
    protected hideMine = signal(true);
    protected answerMode = signal<'mic' | 'type'>('mic');
    protected showHint = signal(false);
    /** Resultado del último intento; con él se enseñan «Reintentar» y «Seguir» */
    protected feedback = signal<ConversationLineResult | null>(null);
    protected micMessage = signal('');
    protected typedText = signal('');

    // --- Valores derivados (computed) ---
    protected lines = computed(() => this.conversation()?.lines ?? []);
    /** Nombre de cada personaje (la primera línea con `name`, o la letra) */
    protected names = computed(() => {
        const lines = this.lines();
        return {
            A: lines.find((line) => line.who === 'A')?.name ?? 'A',
            B: lines.find((line) => line.who === 'B')?.name ?? 'B',
        };
    });
    /** En el juego de rol solo se ven las líneas hasta la actual; en el resto, todas */
    protected visibleLines = computed(() =>
        this.mode() === 'role' || this.mode() === 'done' ? this.lines().slice(0, this.step() + 1) : this.lines(),
    );
    /** La línea que le toca decir al usuario, o null si no es su turno */
    protected userTurn = computed(() => {
        if (this.mode() !== 'role') return null;
        const line = this.lines()[this.step()];
        return line && line.who === this.role() && !this.results()[this.step()] ? line : null;
    });
    /** Precisión media de las líneas del usuario, en % */
    protected averageScore = computed(() => {
        const lineResults = Object.values(this.results());
        return lineResults.length ? Math.round((lineResults.reduce((sum, result) => sum + result.score, 0) / lineResults.length) * 100) : 0;
    });

    // Referencias de la plantilla
    private kanaInput = viewChild<KanaInputComponent>('kanaInput');
    private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

    // Para usar Math.round en la plantilla
    protected Math = Math;
    // Intentos flojos de la línea actual
    private weakAttempts = 0;
    // false al salir: corta los bucles de audio que siguen esperando
    private isAlive = true;
    // Cada reproducción nueva sube el número; un bucle con un número viejo se detiene
    private runId = 0;

    constructor() {
        // Recarga al cambiar de lección o conversación; untracked para que lo que lee loadConversation no vuelva a disparar el effect
        effect(() => {
            const id = Number(this.id());
            const cid = this.cid();
            untracked(() => void this.loadConversation(id, cid));
        });
        // Precarga el diccionario de lecturas para calificar sin esperar en la primera respuesta
        void this.readingSVC.ensure();
    }

    ngOnDestroy(): void {
        this.isAlive = false;
        this.speechSVC.stopSpeaking();
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga la conversación de la lección (o la primera si el id no existe) y vuelve a la intro */
    private async loadConversation(id: number, cid: string): Promise<void> {
        const lesson = await this.lessonSVC.get(id);
        this.conversation.set(lesson.conversations.find((conversation) => conversation.id === cid) ?? lesson.conversations[0] ?? null);
        this.mode.set('intro');
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Textos ------------------------------------------------------------- //
    /** Devuelve el romaji de una línea */
    protected toRomaji(text: string): string {
        return romaji(text);
    }

    /** Devuelve el nombre del personaje A o B */
    protected speakerName(who: 'A' | 'B'): string {
        return this.names()[who];
    }

    /** Devuelve el texto de la nota: ¡Perfecto!, ¡Muy bien!, Casi o A practicar */
    protected scoreLabel(score: number): string {
        return score >= PERFECT_SCORE ? '¡Perfecto!' : score >= GOOD_SCORE ? '¡Muy bien!' : score >= MID_SCORE ? 'Casi' : 'A practicar';
    }
    // ------------------------------- Textos ------------------------------------------------------------- //

    // ------------------------------- Audio ------------------------------------------------------------- //
    /** Lee una línea con la voz de su personaje (A femenina, B masculina) */
    private speakLine(index: number): Promise<void> {
        const line = this.lines()[index];
        if (!line) return Promise.resolve();
        this.playing.set(index);
        return this.speechSVC.speak(line.jp, { voice: line.who === 'A' ? 0 : 1 }).then(() => {
            if (this.playing() === index) this.playing.set(null);
        });
    }

    /** Lee la línea tocada (en el juego de rol, solo las anteriores al turno del usuario) */
    protected tapLine(index: number): void {
        if (this.mode() === 'role' && this.userTurn()) {
            // Durante su turno se pueden volver a escuchar las líneas anteriores, no la suya
            if (index >= this.step()) return;
        }
        this.runId++;
        void this.speakLine(index);
    }

    /** Reproduce la conversación completa, línea a línea */
    protected async playAll(): Promise<void> {
        this.mode.set('listen');
        const run = ++this.runId;
        for (let i = 0; i < this.lines().length; i++) {
            if (!this.isAlive || run !== this.runId) return;
            this.scrollTo(i);
            await this.speakLine(i);
            await wait(LISTEN_PAUSE_MS);
        }
    }

    /** Detiene la reproducción */
    protected stop(): void {
        this.runId++;
        this.speechSVC.stopSpeaking();
        this.playing.set(null);
    }

    /** Lee la línea modelo del turno actual (botón de la pista) */
    protected listenModel(): void {
        void this.speakLine(this.step());
    }

    /** Hace scroll hasta una línea del chat */
    private scrollTo(index: number): void {
        setTimeout(() => {
            const element = this.scroller()?.nativeElement.querySelector(`[data-i="${index}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, SCROLL_DELAY_MS);
    }
    // ------------------------------- Audio ------------------------------------------------------------- //

    // ------------------------------- Juego de rol ------------------------------------------------------------- //
    /** Empieza el juego de rol con el personaje elegido */
    protected startRole(role: 'A' | 'B'): void {
        this.stop();
        this.role.set(role);
        this.results.set({});
        this.step.set(0);
        this.mode.set('role');
        void this.advance();
    }

    /** Lee las líneas de la app hasta llegar al turno del usuario o al final */
    private async advance(): Promise<void> {
        // 1. Limpiar el estado del turno anterior
        const run = ++this.runId;
        this.weakAttempts = 0;
        this.feedback.set(null);
        this.showHint.set(false);
        this.micMessage.set('');
        this.typedText.set('');

        // 2. Avanzar línea a línea mientras no toque al usuario
        while (this.isAlive && run === this.runId) {
            const index = this.step();
            const line = this.lines()[index];
            if (!line) {
                this.finish();
                return;
            }
            this.scrollTo(index);
            if (line.who === this.role() && !this.results()[index]) return; // Espera al usuario
            await this.speakLine(index);
            await wait(ROLE_PAUSE_MS);
            if (run !== this.runId) return;
            if (index + 1 >= this.lines().length) {
                this.finish();
                return;
            }
            this.step.set(index + 1);
        }
    }

    /** Escucha al usuario por el micrófono y califica lo que dijo */
    protected async speakAnswer(): Promise<void> {
        const line = this.userTurn();
        if (!line || this.speechSVC.listening()) return;
        this.micMessage.set('');
        try {
            const { transcripts } = await this.speechSVC.listen().result;
            if (!transcripts.length) {
                this.micMessage.set('No te escuché. Toca el micrófono y habla claro.');
                return;
            }
            await this.readingSVC.ensure();
            const match = this.readingSVC.bestMatch(transcripts, [line.jp]);
            this.grade(match.score, match.text, 'voz');
        } catch (error) {
            const message = (error as Error).message;
            this.micMessage.set(
                message === 'not-allowed' || message === 'service-not-allowed'
                    ? 'Permite el micrófono en tu navegador, o responde escribiendo.'
                    : 'No se pudo usar el micrófono. Prueba escribiendo.',
            );
            // Sin permiso o sin reconocimiento de voz se pasa a escribir
            if (message === 'not-allowed' || message === 'unsupported') this.answerMode.set('type');
        }
    }

    /** Califica la respuesta escrita */
    protected async typeAnswer(): Promise<void> {
        const line = this.userTurn();
        if (!line) return;
        const given = (this.kanaInput()?.read() ?? this.typedText()).trim();
        if (!given) return;
        await this.readingSVC.ensure();
        const match = this.readingSVC.bestMatch([given], [line.jp]);
        this.grade(match.score, given, 'texto');
    }

    /** Salta la línea con nota 0 */
    protected skipLine(): void {
        this.grade(0, '', 'saltada');
    }

    /** Se queda con el intento flojo y sigue */
    protected accept(): void {
        const currentFeedback = this.feedback();
        if (!currentFeedback) return;
        this.results.update((results) => ({ ...results, [this.step()]: currentFeedback }));
        this.progressSVC.addXp(1);
    }

    /** Guarda la nota de la línea, o deja repetir si el intento fue flojo */
    private grade(score: number, heard: string, method: ConversationLineResult['method']): void {
        const index = this.step();
        if (method !== 'saltada' && score < GOOD_SCORE && this.weakAttempts++ < MAX_WEAK_RETRIES) {
            // Intento flojo: se enseña la corrección y se deja reintentar (o quedarse con él)
            this.feedback.set({ score, heard, method });
            this.sfxSVC.play('bad');
            return;
        }
        const result: ConversationLineResult = { score, heard, method };
        this.results.update((results) => ({ ...results, [index]: result }));
        this.feedback.set(result);
        this.sfxSVC.play(score >= GOOD_SCORE ? 'ok' : score >= MID_SCORE ? 'tap' : 'bad');
        this.progressSVC.addXp(score >= GOOD_SCORE ? 6 : score >= MID_SCORE ? 3 : 1);
    }

    /** Lee la línea modelo y pasa a la siguiente */
    protected async continueAfter(): Promise<void> {
        const index = this.step();
        // Suena el modelo para oír la versión natural
        await this.speakLine(index);
        if (index + 1 >= this.lines().length) {
            this.finish();
            return;
        }
        this.step.set(index + 1);
        void this.advance();
    }

    /** Borra la corrección para volver a intentar la línea */
    protected retry(): void {
        this.feedback.set(null);
        this.micMessage.set('');
        this.kanaInput()?.clear();
    }

    /** Cierra el juego de rol: suma XP y cuenta la sesión */
    private finish(): void {
        this.mode.set('done');
        this.step.set(this.lines().length - 1);
        this.sfxSVC.play('done');
        this.progressSVC.addXp(FINISH_XP);
        this.progressSVC.finishSession();
    }
    // ------------------------------- Juego de rol ------------------------------------------------------------- //
}

/** Devuelve una promesa que se resuelve tras `ms` milisegundos */
function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
