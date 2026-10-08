import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    HostListener,
    inject,
    input,
    OnDestroy,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { AnswerRecord, OrderQuestion, Question, SessionResult } from '../../interfaces/question.interface';
import { ProgressService } from '../../services/progress.service';
import { SfxService } from '../../services/sfx.service';
import { SpeechService } from '../../services/speech.service';
import { ReadingService } from '../../services/reading.service';
import { skillBreakdown } from '../../utils/skills.utils';
import { PetService } from '../../services/pet.service';
import { normEs, normJp, pick, romaji } from '../../utils/text.utils';
import { IconComponent } from '../icon/icon.component';
import { KanaInputComponent } from '../kana-input/kana-input.component';
import { ResultScreenComponent } from '../result-screen/result-screen.component';
import { JpComponent } from '../jp/jp.component';
import { MusubiComponent } from '../musubi/musubi.component';

type Phase = 'asking' | 'feedback' | 'done';

interface Feedback {
    correct: boolean;
    /** «Casi»: pronunciación con una precisión entre el 50 y el 75 % */
    close?: boolean;
    answer: string;
    given: string;
    note?: string;
    praise: string;
}

/** Frases de ánimo; se elige una al azar en cada acierto */
const PRAISE = ['¡Muy bien!', '¡Excelente!', '¡Correcto!', 'すごい！', '¡Así se hace!', 'いいですね！', '¡Perfecto!'];
/** XP por acertar a la primera */
const XP_FIRST_TRY = 10;
/** XP por acertar una pregunta que ya se falló y volvió a la cola */
const XP_RETRY = 4;
/** XP extra por acierto mientras la racha es de COMBO_MIN o más */
const XP_COMBO_BONUS = 2;
/** Aciertos seguidos desde los que cuenta la racha (llama en la cabecera y bonus de XP) */
const COMBO_MIN = 3;
/** Cada cuántos aciertos seguidos suena el sonido de combo en vez del normal */
const COMBO_SOUND_EVERY = 5;
/** XP por acierto en modo examen (sustituye al XP acumulado) */
const XP_EXAM_PER_CORRECT = 10;
/** XP extra por una sesión sin fallos */
const XP_PERFECT_BONUS = 20;
/** Mínimo de preguntas para que una sesión perfecta dé el bonus (evita regalarlo en rondas de 1 o 2) */
const PERFECT_MIN_QUESTIONS = 5;
/** Precisión de pronunciación a partir de la cual se da por buena */
const SPEAK_PASS_SCORE = 0.75;
/** Precisión a partir de la cual el fallo se muestra como «¡Casi!» */
const SPEAK_CLOSE_SCORE = 0.5;
/** Intentos de pronunciación antes de darla por fallada (fuera de examen) */
const SPEAK_MAX_ATTEMPTS = 3;
/** Espera antes de reproducir el audio de una pregunta nueva, para que no se pise con la transición */
const AUTOPLAY_DELAY_MS = 250;
/** Tiempo tras responder durante el que Enter no avanza (el mismo Enter que respondió) */
const ENTER_GUARD_MS = 300;
/** Velocidad del botón «Lento» */
const SLOW_RATE = 0.6;
/** Factor sobre la velocidad configurada en los ejercicios de solo escucha */
const LISTEN_RATE_FACTOR = 0.92;

@Component({
    selector: 'app-question-runner',
    imports: [IconComponent, KanaInputComponent, ResultScreenComponent, JpComponent, MusubiComponent],
    templateUrl: './question-runner.component.html',
    styleUrl: './question-runner.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionRunnerComponent implements OnDestroy {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);
    private sfxSVC = inject(SfxService);
    protected speechSVC = inject(SpeechService);
    private readingSVC = inject(ReadingService);
    private petSVC = inject(PetService);
    private location = inject(Location);

    // --- Inputs y outputs ---
    readonly questions = input.required<Question[]>();
    readonly title = input('Práctica');
    /** Modo examen: sin correcciones hasta el final y sin repetir las falladas */
    readonly exam = input(false);
    /** Lección a la que pertenece la sesión: se guardan sus puntuaciones por habilidad */
    readonly lessonId = input<number | null>(null);
    /** Prueba final de la lección: además guarda la mejor nota */
    readonly final = input(false);
    readonly again = output<void>();
    readonly finished = output<SessionResult>();

    // --- Estados UI con Signals ---
    protected queue = signal<Question[]>([]);
    protected index = signal(0);
    protected phase = signal<Phase>('asking');
    protected feedback = signal<Feedback | null>(null);
    protected selected = signal<string | null>(null);
    protected combo = signal(0);
    protected xp = signal(0);
    protected records = signal<AnswerRecord[]>([]);
    protected isRevealed = signal(false);
    protected shakeKey = signal(0);
    protected result = signal<SessionResult | null>(null);
    protected typed = signal('');

    // Estado de las preguntas de ordenar: índices de las fichas tocadas, en orden
    protected picked = signal<number[]>([]);

    // Estado de las preguntas de pronunciar
    protected heard = signal<string>('');
    protected micError = signal<string>('');
    protected attempts = signal(0);

    // --- Valores derivados (computed) ---
    protected current = computed(() => this.queue()[this.index()]);
    protected total = computed(() => this.queue().length);
    protected progressPercent = computed(() => (this.total() ? (this.index() / this.total()) * 100 : 0));

    protected orderQuestion = computed(() => {
        const question = this.current();
        return question?.kind === 'order' ? (question as OrderQuestion) : null;
    });
    protected pickedTokens = computed(() => {
        const question = this.orderQuestion();
        return question ? this.picked().map((tokenIndex) => question.tokens[tokenIndex]) : [];
    });

    protected showRomaji = computed(() => this.progressSVC.settings().romaji);
    protected script = computed(() => this.progressSVC.settings().script);

    // Campo de texto de las preguntas de escribir (puede no existir)
    private kanaInput = viewChild<KanaInputComponent>('kanaInput');

    // Tiempos de la sesión
    private startedAt = Date.now();
    private answeredAt = 0;
    private autoplayTimer?: ReturnType<typeof setTimeout>;

    // Ids de las preguntas falladas que ya se devolvieron a la cola (solo vuelven una vez)
    private retriedIds = new Set<string>();

    constructor() {
        // Cada lista nueva de preguntas reinicia la sesión; untracked para que reset no suscriba el effect a sus signals
        effect(() => {
            const questions = this.questions();
            untracked(() => this.reset(questions));
        });
    }

    ngOnDestroy(): void {
        clearTimeout(this.autoplayTimer);
        this.speechSVC.stopSpeaking();
    }

    // ------------------------------- Sesión ------------------------------------------------------------- //
    /** Reinicia la sesión con una lista nueva de preguntas */
    private reset(questions: Question[]): void {
        this.queue.set([...questions]);
        this.index.set(0);
        this.records.set([]);
        this.xp.set(0);
        this.combo.set(0);
        this.result.set(null);
        this.retriedIds.clear();
        this.startedAt = Date.now();
        this.prepare();
    }

    /** Limpia el estado de la pregunta anterior y deja lista la actual */
    private prepare(): void {
        // El audio del ejercicio anterior no debe seguir sonando encima del nuevo
        clearTimeout(this.autoplayTimer);
        this.speechSVC.stopSpeaking();
        this.phase.set('asking');
        this.feedback.set(null);
        this.selected.set(null);
        this.picked.set([]);
        this.heard.set('');
        this.micError.set('');
        this.attempts.set(0);
        this.typed.set('');
        this.kanaInput()?.clear();
        this.isRevealed.set(false);
        const question = this.current();
        if (question?.audio && (question.audioOnly || question.promptStyle === 'jp-big')) {
            this.autoplayTimer = setTimeout(() => this.play(), AUTOPLAY_DELAY_MS);
        }
    }

    /** Pasa a la siguiente pregunta o termina la sesión si no quedan */
    protected next(): void {
        if (this.index() + 1 >= this.queue().length) {
            this.finish();
            return;
        }
        this.index.update((index) => index + 1);
        this.prepare();
    }

    /** Cierra la sesión: calcula XP, granos y habilidades, guarda el progreso y muestra el resultado */
    private finish(): void {
        // 1. Parar el audio y pasar a la fase final
        this.phase.set('done');
        this.speechSVC.stopSpeaking();

        // 2. Puntuar solo el primer intento de cada pregunta
        const records = this.firstAttempts();
        const correctCount = records.filter((record) => record.correct).length;
        const percent = records.length ? (correctCount / records.length) * 100 : 0;

        // 3. XP: en examen se recalcula por aciertos (sin rachas); bonus si es perfecta y tiene suficientes preguntas
        let xp = this.xp();
        if (this.exam()) xp = correctCount * XP_EXAM_PER_CORRECT;
        if (percent === 100 && records.length >= PERFECT_MIN_QUESTIONS) xp += XP_PERFECT_BONUS;
        this.progressSVC.addXp(xp);
        this.progressSVC.finishSession();

        // 4. Habilidades de la lección y, en la prueba final, la mejor nota
        const lessonId = this.lessonId();
        if (lessonId != null) {
            this.progressSVC.saveLessonSkills(lessonId, skillBreakdown(records));
            if (this.final()) this.progressSVC.saveLessonScore(lessonId, percent);
        }

        // 5. Armar el resultado (los granos solo si hubo preguntas de verdad, no solo notas) y avisar
        const sessionResult: SessionResult = {
            title: this.title(),
            records,
            xp,
            durationMs: Date.now() - this.startedAt,
            grains: records.length ? this.petSVC.reward(correctCount) : 0,
        };
        this.result.set(sessionResult);
        this.sfxSVC.play('done');
        this.finished.emit(sessionResult);
    }

    /** Devuelve un registro por pregunta (el primer intento), que es el que cuenta para la nota */
    private firstAttempts(): AnswerRecord[] {
        const seenIds = new Set<string>();
        return this.records().filter((record) => (seenIds.has(record.question.id) ? false : (seenIds.add(record.question.id), true)));
    }

    /** Sale de la sesión volviendo a la pantalla anterior */
    protected close(): void {
        this.speechSVC.stopSpeaking();
        this.location.back();
    }

    /** Pide al padre una sesión nueva (botón «Otra vez» del resultado) */
    protected restart(): void {
        this.again.emit();
    }
    // ------------------------------- Sesión ------------------------------------------------------------- //

    // ------------------------------- Audio ------------------------------------------------------------- //
    /** Devuelve el romaji de un texto en kana */
    protected romajiOf(text: string): string {
        return romaji(text);
    }

    /** Lee en voz alta un texto suelto (palabras y ejemplos de las notas) */
    protected say(text: string): void {
        void this.speechSVC.speak(text);
    }

    /** Reproduce el audio de la pregunta actual, normal o lento */
    protected play(slow = false): void {
        const question = this.current();
        if (!question?.audio) return;
        // Los ejercicios de escucha van un poco más lentos: sin el texto, cada sonido cuenta
        const rate = slow ? SLOW_RATE : question.audioOnly ? this.progressSVC.settings().rate * LISTEN_RATE_FACTOR : undefined;
        void this.speechSVC.speak(question.audio, rate ? { rate } : {});
    }
    // ------------------------------- Audio ------------------------------------------------------------- //

    // ------------------------------- Respuestas ------------------------------------------------------------- //
    /** Responde una pregunta de opción múltiple */
    protected choose(choice: string): void {
        const question = this.current();
        if (question?.kind !== 'choice' || this.phase() !== 'asking') return;
        this.selected.set(choice);
        this.resolve(choice === question.answer, question.answer, choice);
    }

    /** Comprueba lo escrito en una pregunta de escribir, normalizando según el tipo de entrada */
    protected submitTyped(): void {
        const question = this.current();
        if (question?.kind !== 'type' || this.phase() !== 'asking') return;
        const given = (this.kanaInput()?.read() ?? this.typed()).trim();
        if (!given) return;
        let isCorrect = false;
        if (question.input === 'romaji') {
            const compactGiven = given.toLowerCase().replace(/\s+/g, '');
            isCorrect = question.answers.some((answer) => answer.toLowerCase() === compactGiven);
        } else if (question.input === 'es') {
            isCorrect = question.answers.some((answer) => normEs(answer) === normEs(given));
        } else {
            isCorrect = question.answers.some((answer) => normJp(answer) === normJp(given));
        }
        this.resolve(isCorrect, question.answers[0], given);
    }

    /** Añade una ficha del banco a la frase que se está ordenando */
    protected tapToken(tokenIndex: number): void {
        if (this.phase() !== 'asking') return;
        this.sfxSVC.play('tap');
        this.picked.update((picked) => (picked.includes(tokenIndex) ? picked : [...picked, tokenIndex]));
    }

    /** Quita de la frase la ficha que está en la posición indicada */
    protected untapToken(position: number): void {
        if (this.phase() !== 'asking') return;
        this.picked.update((picked) => picked.filter((_, pickedPosition) => pickedPosition !== position));
    }

    /** Comprueba el orden de las fichas comparando sin espacios */
    protected submitOrder(): void {
        const question = this.orderQuestion();
        if (!question || this.phase() !== 'asking') return;
        const given = this.pickedTokens().join(' ');
        const isCorrect = normJp(given) === normJp(question.answer.join(''));
        this.resolve(isCorrect, question.answer.join(' '), given);
    }

    /** Escucha al usuario por el micrófono y puntúa su pronunciación */
    protected async listen(): Promise<void> {
        const question = this.current();
        if (question?.kind !== 'speak' || this.speechSVC.listening()) return;
        this.micError.set('');
        this.heard.set('');
        try {
            // 1. Escuchar y contar el intento
            const { transcripts } = await this.speechSVC.listen().result;
            this.attempts.update((attempts) => attempts + 1);
            if (!transcripts.length) {
                this.micError.set('No te escuché. Intenta hablar un poco más fuerte.');
                return;
            }

            // 2. Comparar lo oído con el objetivo (las lecturas hacen falta para comparar kanji con kana)
            await this.readingSVC.ensure();
            const { score: bestScore, text: bestText } = this.readingSVC.bestMatch(transcripts, [question.target, question.prompt]);
            this.heard.set(bestText);
            const scorePercent = Math.round(bestScore * 100);

            // 3. Aprobar, suspender (examen o sin intentos) o pedir otro intento
            if (bestScore >= SPEAK_PASS_SCORE) {
                this.resolve(true, question.prompt, bestText, `Precisión ${scorePercent}%`);
            } else if (this.exam() || this.attempts() >= SPEAK_MAX_ATTEMPTS) {
                this.resolve(false, question.prompt, bestText, `Precisión ${scorePercent}%`, bestScore >= SPEAK_CLOSE_SCORE);
            } else {
                this.micError.set(
                    bestScore >= SPEAK_CLOSE_SCORE
                        ? `¡Casi! (${scorePercent}%). Escucha el modelo e inténtalo otra vez.`
                        : `Entendí «${bestText}». Inténtalo otra vez.`,
                );
                this.sfxSVC.play('bad');
                this.shakeKey.update((key) => key + 1);
            }
        } catch (error) {
            const message = (error as Error).message;
            this.micError.set(
                message === 'not-allowed' || message === 'service-not-allowed'
                    ? 'Permite el acceso al micrófono para practicar la pronunciación.'
                    : message === 'unsupported'
                        ? 'Tu navegador no reconoce voz. Usa la autoevaluación.'
                        : 'No se pudo escuchar. Inténtalo de nuevo.',
            );
        }
    }

    /** Autoevaluación de la pronunciación cuando el micrófono no está disponible */
    protected selfAssess(isCorrect: boolean): void {
        const question = this.current();
        if (question?.kind !== 'speak') return;
        this.resolve(isCorrect, question.prompt, isCorrect ? '✓' : '✗', 'Autoevaluación');
    }

    /** Salta la pregunta («No sé»): cuenta como fallo; en una nota solo avanza */
    protected skip(): void {
        const question = this.current();
        if (!question || this.phase() !== 'asking') return;
        if (question.kind === 'note') return this.next();
        const answer =
            question.kind === 'choice'
                ? question.answer
                : question.kind === 'type'
                    ? question.answers[0]
                    : question.kind === 'order'
                        ? question.answer.join(' ')
                        : question.prompt;
        this.resolve(false, answer, '—');
    }

    /** Registra la respuesta, reparte XP, suena y muestra la corrección (o avanza en examen) */
    private resolve(isCorrect: boolean, answer: string, given: string, note?: string, isClose = false): void {
        const question = this.current();
        if (!question) return;

        // 1. Guardar el intento; el dominio (cajas de Leitner) solo se toca en el primero
        const isFirstTry = !this.retriedIds.has(question.id);
        this.records.update((records) => [...records, { question, correct: isCorrect, given }]);
        if (isFirstTry) {
            const trackKey = question.track ? `${question.track.kind === 'kana' ? 'k' : 'w'}:${question.track.id}` : undefined;
            this.progressSVC.recordAnswer(trackKey, isCorrect);
        }

        // 2. Racha, XP y sonido
        if (isCorrect) {
            this.combo.update((combo) => combo + 1);
            const gain = (isFirstTry ? XP_FIRST_TRY : XP_RETRY) + (this.combo() >= COMBO_MIN ? XP_COMBO_BONUS : 0);
            this.xp.update((xp) => xp + gain);
            this.sfxSVC.play(this.combo() > 0 && this.combo() % COMBO_SOUND_EVERY === 0 ? 'combo' : 'ok');
        } else {
            this.combo.set(0);
            this.sfxSVC.play('bad');
            this.shakeKey.update((key) => key + 1);
            // En práctica la pregunta fallada vuelve al final de la cola, una sola vez
            if (!this.exam() && isFirstTry) {
                this.retriedIds.add(question.id);
                this.queue.update((queue) => [...queue, question]);
            }
        }

        // 3. Corrección; el mismo Enter que respondió no debe saltarse también la corrección
        this.feedback.set({ correct: isCorrect, answer, given, note, close: isClose, praise: pick(PRAISE) });
        this.answeredAt = Date.now();
        if (this.exam()) {
            this.next();
            return;
        }
        this.phase.set('feedback');

        // 4. Reproducir el modelo, o destapar el texto si era un ejercicio de solo escucha
        if (question.audio && !question.audioOnly && question.kind !== 'speak') {
            void this.speechSVC.speak(question.audio);
        } else if (question.audioOnly) {
            this.isRevealed.set(true);
        }
    }
    // ------------------------------- Respuestas ------------------------------------------------------------- //

    // ------------------------------- Teclado ------------------------------------------------------------- //
    /** Atajos de teclado: Enter avanza en notas y correcciones, 1–6 elige opción */
    @HostListener('document:keydown', ['$event'])
    onKey(event: KeyboardEvent): void {
        const question = this.current();
        if (!question || this.phase() === 'done') return;
        if (this.phase() === 'asking' && question.kind === 'note' && event.key === 'Enter') {
            event.preventDefault();
            this.next();
            return;
        }
        if (this.phase() === 'feedback' && event.key === 'Enter' && Date.now() - this.answeredAt > ENTER_GUARD_MS) {
            event.preventDefault();
            this.next();
            return;
        }
        if (this.phase() === 'asking' && question.kind === 'choice' && /^[1-6]$/.test(event.key)) {
            const choice = question.choices[Number(event.key) - 1];
            if (choice) this.choose(choice);
        }
    }
    // ------------------------------- Teclado ------------------------------------------------------------- //
}
