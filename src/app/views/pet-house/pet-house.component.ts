import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { Word } from '../../interfaces/lesson.interface';
import { GRAINS_FOR_FINISHING, GRAINS_PER_CORRECT, ITEMS, PetService, STAGES, TOPPINGS } from '../../services/pet.service';
import { PetEvolution, PetGameState, PetItem, PetPop, Topping } from '../../interfaces/pet.interface';
import { ProgressService } from '../../services/progress.service';
import { SfxService } from '../../services/sfx.service';
import { SpeechService } from '../../services/speech.service';
import { wordReading } from '../../utils/questions.utils';
import { romaji, shortEs, shuffle } from '../../utils/text.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { MusubiComponent } from '../../components/musubi/musubi.component';

/** Días de la semana para el reloj de la cabecera (getDay() empieza en domingo) */
const WEEK_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Frases de la primera caricia */
const FIRST_PAT_LINES: [string, string][] = [
    ['くすぐったい！', '¡Me haces cosquillas!'],
    ['ありがとう！', '¡Gracias!'],
    ['えへへ', 'Jeje.'],
    ['なでなで', 'Caricias, caricias.'],
];
/** Frases tras unas cuantas caricias seguidas */
const LOVE_LINES: [string, string][] = [
    ['きもちいい〜', 'Qué rico se siente.'],
    ['もっと なでて！', '¡Acaríciame más!'],
    ['しあわせ〜', 'Qué feliz soy.'],
];
/** Trazo SVG del corazón que sale al acariciar */
const HEART_PATH = 'M12 21s-8-5-10-10a5.5 5.5 0 0 1 10-4 5.5 5.5 0 0 1 10 4c-2 5-10 10-10 10z';
/** Trazo SVG de la estrella del combo grande */
const STAR_PATH = 'M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z';

/** Caricia del combo que pone ojos de corazón */
const LOVE_PAT = 3;
/** Caricia del combo que da el «だいすき» con voltereta */
const BIG_PAT = 6;
/** Desde esta caricia del combo Musubi se ríe de las cosquillas */
const TICKLE_PAT = 9;
/** Tiempo sin caricias tras el que el combo vuelve a 0 (ms) */
const COMBO_RESET_MS = 1800;
/** Intervalo mínimo entre caricias al frotar con el dedo (ms) */
const RUB_INTERVAL_MS = 260;
/** Lo que dura la animación de «cargando» antes de enseñar la etapa nueva (ms) */
const EVOLUTION_REVEAL_MS = 1800;
/** Cada cuánto se refrescan el reloj, el cielo y las necesidades con la casa abierta (ms) */
const CLOCK_INTERVAL_MS = 60_000;
/** Lo que dura un corazón en pantalla, un poco más que su animación CSS (ms) */
const POP_LIFETIME_MS = 1150;
/** Pausa tras responder en el juego, para ver el verde o el rojo (ms) */
const ANSWER_DELAY_MS = 650;
/** Lo que tarda Musubi en comer antes de decir algo (ms) */
const EATING_MS = 1000;
/** Rondas del juego */
const GAME_ROUNDS = 5;
/** Palabras vistas mínimas para no usar todo el vocabulario de las lecciones abiertas */
const MIN_SEEN_WORDS = 8;
/** Energía por debajo de la que Musubi no quiere jugar */
const MIN_ENERGY_TO_PLAY = 20;

@Component({
    selector: 'app-pet-house',
    imports: [RouterLink, NgTemplateOutlet, IconComponent, MusubiComponent],
    templateUrl: './pet-house.component.html',
    styleUrl: './pet-house.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetHouseComponent implements OnInit, OnDestroy {
    // --- Inyección de dependencias ---
    protected petSVC = inject(PetService);
    private progressSVC = inject(ProgressService);
    private lessonSVC = inject(LessonService);
    private sfxSVC = inject(SfxService);
    private speechSVC = inject(SpeechService);

    // --- Estados UI con Signals ---
    /** Estado guardado de la mascota (atajo a petSVC.state) */
    protected petState = this.petSVC.state;
    /** Hora actual; se refresca cada minuto */
    protected now = signal(new Date());
    /** Comida que está comiendo ahora (su nombre en japonés), o null */
    protected eating = signal<string | null>(null);
    /** Lo que dice Musubi en la burbuja: [japonés, español] */
    protected bubbleLine = signal<[string, string]>(['', '']);
    /** Respuesta elegida en la ronda actual del juego */
    protected pickedAnswer = signal<string | null>(null);
    /** Partida del juego de 5 palabras, o null si está cerrado */
    protected game = signal<PetGameState | null>(null);
    /** Celebración de crecimiento en curso, o null */
    protected evolution = signal<PetEvolution | null>(null);
    /** Corazones y estrellas en pantalla */
    protected pops = signal<PetPop[]>([]);
    /** Si ya lo acarició en esta visita (oculta la pista «Tócalo…») */
    protected hasPatted = signal(false);

    // --- Valores derivados (computed) ---
    /** De noche (de 21:00 a 7:00) la habitación se oscurece */
    protected isNight = computed(() => {
        const hour = this.now().getHours();
        return hour >= 21 || hour < 7;
    });
    /** El sol se ve por la ventana de 7:00 a 20:00; el resto, la luna */
    protected showSun = computed(() => {
        const hour = this.now().getHours();
        return hour >= 7 && hour < 20;
    });
    /** Color del cielo de la ventana según la hora: noche, amanecer, día, atardecer */
    protected skyColor = computed(() => {
        const hour = this.now().getHours();
        return hour < 7 ? '#25285a' : hour < 9 ? '#f6c39a' : hour < 17 ? '#bfe3ff' : hour < 20 ? '#f3a77a' : '#25285a';
    });
    /** Texto del reloj: «Lunes · 08:05» */
    protected clockText = computed(() => {
        const date = this.now();
        return `${WEEK_DAYS[date.getDay()]} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    /** Etapa actual de Musubi */
    protected currentStage = computed(() => STAGES[this.petSVC.stageIndex()]);
    /** Tamaño de Musubi en la habitación: crece 12 px por etapa */
    protected petSize = computed(() => 96 + this.petSVC.stageIndex() * 12);
    /** Datos de la barra hacia la siguiente etapa, o null en la última */
    protected nextStage = computed(() => {
        const stageIndex = this.petSVC.stageIndex();
        const next = STAGES[stageIndex + 1];
        if (!next) return null;
        const xp = this.progressSVC.stats().xp;
        const fromXp = STAGES[stageIndex].xp;
        return { name: next.name, look: next.look, xp, goal: next.xp, pct: ((xp - fromXp) / (next.xp - fromXp)) * 100 };
    });
    /** Objetos de la casa que tiene; el orden de ITEMS pone primero lo del suelo para que lo demás quede encima */
    protected roomItems = computed(() => this.houseItems.filter((item) => this.petSVC.has(item.id)));

    /** Las tres barras de necesidades, con una frase según el valor */
    protected meters = computed(() => {
        const petState = this.petState();
        // Cuatro tramos: < 25, < 50, < 80 y el resto
        const describe = (value: number, texts: string[]) => texts[value < 25 ? 0 : value < 50 ? 1 : value < 80 ? 2 : 3];
        return [
            { id: 'food', icon: 'rice', label: 'Panza', value: petState.food, text: describe(petState.food, ['Con mucha hambre', 'Tiene hambre', 'Le vendría bien comer', 'Lleno y feliz']) },
            { id: 'joy', icon: 'heart', label: 'Alegría', value: petState.joy, text: describe(petState.joy, ['Te extraña', 'Un poco triste', 'Contento', '¡Feliz!']) },
            { id: 'energy', icon: 'moon', label: 'Energía', value: petState.energy, text: describe(petState.energy, ['Muy cansado', 'Se va cansando', 'Con energía', '¡A tope!']) },
        ];
    });

    // Catálogos para la plantilla
    protected toppings = TOPPINGS;
    protected stages = STAGES;
    protected clothes = ITEMS.filter((item) => item.kind === 'ropa');
    protected houseItems = ITEMS.filter((item) => item.kind === 'casa');
    protected perCorrect = GRAINS_PER_CORRECT;
    protected perFinish = GRAINS_FOR_FINISHING;
    protected heartPath = HEART_PATH;
    protected starPath = STAR_PATH;

    /** Desbloqueos que no había visto antes de esta visita, marcados «Nuevo» */
    protected newIds: string[] = [];

    // Elementos del DOM: la habitación (para situar los corazones) y el envoltorio que rebota
    private roomEl = viewChild.required<ElementRef<HTMLElement>>('room');
    private squishEl = viewChild.required<ElementRef<HTMLElement>>('squish');

    // Palabras para el juego
    private wordPool: Word[] = [];

    // Temporizadores y estado de las caricias
    private clockTimer?: ReturnType<typeof setInterval>;
    private comboCount = 0;
    private comboTimer?: ReturnType<typeof setTimeout>;
    private isRubbing = false;
    private lastPatAt = 0;
    private lastPopId = 0;

    ngOnInit(): void {
        // 1. Poner al día las necesidades y saludar
        this.petSVC.update();
        this.greet();

        // 2. Guardar qué es nuevo antes de marcarlo como visto
        this.newIds = this.petSVC.fresh();
        this.petSVC.markSeen();

        // 3. Creció desde la última visita: se celebra antes que nada
        const fromStage = this.petState().stageSeen;
        const toStage = this.petSVC.stageIndex();
        if (toStage > fromStage) {
            this.evolution.set({ from: fromStage, to: toStage, done: false });
            setTimeout(() => {
                this.evolution.set({ from: fromStage, to: toStage, done: true });
                this.sfxSVC.play('done');
            }, EVOLUTION_REVEAL_MS);
        } else if (toStage < fromStage) {
            // Si el XP bajó no hay nada que celebrar: solo se corrige la etapa vista
            this.petSVC.markStage();
        }

        // 4. Las necesidades y el cielo siguen al reloj real mientras la casa está abierta
        this.clockTimer = setInterval(() => {
            this.now.set(new Date());
            this.petSVC.update();
        }, CLOCK_INTERVAL_MS);

        // 5. Palabras para el juego, en segundo plano
        void this.loadWords();
    }

    ngOnDestroy(): void {
        clearInterval(this.clockTimer);
        clearTimeout(this.comboTimer);
    }

    // ------------------------------- Saludo y evolución ------------------------------------------------------------- //
    /** Elige la primera frase de Musubi según cómo está */
    private greet(): void {
        const petState = this.petState();
        const hour = new Date().getHours();
        const greeting = hour < 11 ? 'おはよう！' : hour < 18 ? 'こんにちは！' : 'こんばんは！';
        if (petState.asleep) return this.bubbleLine.set(['むにゃむにゃ…', 'Está dormido.']);
        if (this.petSVC.fresh().length) return this.bubbleLine.set(['みて みて！', '¡Mira! Tengo algo nuevo. Está abajo, en Ropa y Casa.']);
        if (petState.food < 40) return this.bubbleLine.set(['おなか すいた！', `¿Me das de comer? Tienes ${petState.grains} granos.`]);
        if (petState.joy < 40) return this.bubbleLine.set(['さびしかった…', 'Te extrañé. ¿Jugamos un ratito?']);
        this.bubbleLine.set([greeting, `Hoy llevas ${this.progressSVC.todayXp()} XP. ¡Qué bien me cuidas!`]);
    }

    /** Cierra la celebración de crecimiento y la guarda como vista */
    protected closeEvolve(): void {
        this.petSVC.markStage();
        this.evolution.set(null);
        this.bubbleLine.set(['みて！ おおきく なった！', `¡Mira! Ya soy ${this.currentStage().name.toLowerCase()}.`]);
        this.petSVC.react('happy', 1600);
    }
    // ------------------------------- Saludo y evolución ------------------------------------------------------------- //

    // ------------------------------- Comida y sueño ------------------------------------------------------------- //
    /** Le da una comida; si no puede comer, Musubi dice por qué */
    protected feed(topping: Topping): void {
        const result = this.petSVC.feed(topping);
        if (!result.ok) {
            this.bubbleLine.set([result.ja, result.es]);
            // Lleno no es algo malo: pone cara contenta en vez de hambrienta
            this.petSVC.react(result.ja.startsWith('おなか いっぱい') ? 'happy' : 'hungry', 1500);
            return;
        }
        // 1. Mientras come: la comida entra volando y masca
        this.eating.set(topping.ja);
        this.petSVC.react('eat', EATING_MS);
        this.sfxSVC.play('tap');
        // 2. Al terminar dice su frase
        setTimeout(() => {
            this.eating.set(null);
            this.bubbleLine.set([result.ja, result.es]);
            this.petSVC.react('happy', 1400);
            this.sfxSVC.play('ok');
        }, EATING_MS);
    }

    /** Botón «Comer»: la mejor comida que se puede pagar (o la sal, para que diga qué falta) */
    protected feedBest(): void {
        const petState = this.petState();
        const topping = [...TOPPINGS].reverse().find((candidate) => this.petSVC.canEat(candidate) && candidate.cost <= petState.grains) ?? TOPPINGS[0];
        this.feed(topping);
    }

    /** Botón «Dormir» / «Despertar» */
    protected toggleSleep(): void {
        const wasAsleep = this.petState().asleep;
        if (!this.petSVC.toggleSleep()) {
            this.bubbleLine.set(['まだ ねむくない！', 'Todavía no tengo sueño. ¡Es de día!']);
            return;
        }
        this.bubbleLine.set(wasAsleep ? ['おはよう！', '¡Buenos días! ¿Practicamos un poquito?'] : ['おやすみなさい', 'Buenas noches. Mañana repasamos lo de hoy.']);
    }
    // ------------------------------- Comida y sueño ------------------------------------------------------------- //

    // ------------------------------- Caricias: tocar o frotar a Musubi ------------------------------------------------------------- //
    /** Empieza una caricia al poner el dedo sobre Musubi */
    protected onPointerDown(event: PointerEvent): void {
        this.isRubbing = true;
        // Captura el puntero para seguir frotando aunque el dedo salga un poco de Musubi
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        this.patAt(event.clientX, event.clientY);
    }

    /** Frotar cuenta como caricias seguidas, como mucho una cada RUB_INTERVAL_MS */
    protected onPointerMove(event: PointerEvent): void {
        if (this.isRubbing && Date.now() - this.lastPatAt > RUB_INTERVAL_MS) this.patAt(event.clientX, event.clientY);
    }

    /** Termina de frotar */
    protected onPointerUp(): void {
        this.isRubbing = false;
    }

    /** El botón «Mimar» le acaricia la cabeza */
    protected onPet(): void {
        const rect = this.squishEl().nativeElement.getBoundingClientRect();
        this.patAt(rect.left + rect.width / 2, rect.top + rect.height * 0.35);
    }

    /**
     * Cada caricia seguida tiene una reacción mayor: una risita, luego ojos de corazón (3) y un
     * gran salto «だいすき» en la 6; con demasiadas (9) Musubi se ríe de las cosquillas.
     */
    private patAt(clientX: number, clientY: number): void {
        // 1. Contar la caricia dentro del combo
        this.lastPatAt = Date.now();
        this.hasPatted.set(true);
        const roomRect = this.roomEl().nativeElement.getBoundingClientRect();
        const patNumber = ++this.comboCount;
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => (this.comboCount = 0), COMBO_RESET_MS);
        const isBigPat = patNumber === BIG_PAT;

        // 2. Alegría, corazones, sonido y rebote
        this.petSVC.pet(isBigPat ? 6 : 0);
        this.spawnPops(clientX - roomRect.left, clientY - roomRect.top, isBigPat ? 9 : patNumber >= LOVE_PAT ? 2 : 1);
        this.sfxSVC.pat(patNumber - 1);
        this.bounce(isBigPat);

        // 3. Lo que dice y la cara que pone
        const petState = this.petState();
        if (petState.asleep) {
            if (patNumber === 1) this.bubbleLine.set(['むにゃむにゃ…', 'Sigue dormido, pero sonríe.']);
            return;
        }
        if (patNumber >= TICKLE_PAT) {
            this.petSVC.react('laugh', 1600);
            if (patNumber === TICKLE_PAT) this.bubbleLine.set(['くすぐったい！ やめて〜', '¡Jaja, cosquillas! ¡Para, para!']);
            return;
        }
        this.petSVC.react(patNumber >= LOVE_PAT ? 'love' : 'happy', patNumber >= LOVE_PAT ? 1700 : 1200);
        if (isBigPat) {
            this.bubbleLine.set(['だいすき！', '¡Te quiero mucho! Gracias por cuidarme.']);
            this.sfxSVC.play('combo');
        } else if (patNumber === LOVE_PAT) {
            this.bubbleLine.set(LOVE_LINES[Math.floor(Math.random() * LOVE_LINES.length)]);
        } else if (patNumber === 1) {
            if (petState.food < 30) this.bubbleLine.set(['なでなで うれしい… でも おなか すいた', 'Me encantan los mimos… pero tengo hambre.']);
            else if (petState.energy < 30) this.bubbleLine.set(['ふわぁ… ねむい', 'Mmm… qué sueño me da.']);
            else this.bubbleLine.set(FIRST_PAT_LINES[Math.floor(Math.random() * FIRST_PAT_LINES.length)]);
        }
    }

    /** Lanza corazones (y alguna estrella si son varios) desde el punto tocado */
    private spawnPops(x: number, y: number, count: number): void {
        // Uno solo sale justo encima del dedo; varios se reparten alrededor
        const newPops: PetPop[] = Array.from({ length: count }, (_, index) => ({
            id: ++this.lastPopId,
            x: x + (count > 1 ? (Math.random() - 0.5) * 90 : 0),
            y: y + (count > 1 ? (Math.random() - 0.5) * 40 : -10),
            driftX: (Math.random() - 0.5) * 50,
            isStar: count > 1 && index % 3 === 2,
        }));
        this.pops.update((current) => [...current, ...newPops]);
        const newIds = new Set(newPops.map((pop) => pop.id));
        setTimeout(() => this.pops.update((current) => current.filter((pop) => !newIds.has(pop.id))), POP_LIFETIME_MS);
    }

    /** Aplasta a Musubi un momento; con el combo grande da una voltereta */
    private bounce(isBig: boolean): void {
        const element = this.squishEl().nativeElement;
        if (!element.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (isBig) {
            element.animate(
                [
                    { transform: 'none' },
                    { transform: 'translateY(-28%) rotate(180deg) scale(1.05)', offset: 0.45 },
                    { transform: 'translateY(0) rotate(360deg) scale(1.1, 0.9)', offset: 0.85 },
                    { transform: 'none' },
                ],
                { duration: 800, easing: 'ease-out' },
            );
        } else {
            element.animate([{ transform: 'none' }, { transform: 'scale(1.1, 0.88)' }, { transform: 'scale(0.97, 1.04)' }, { transform: 'none' }], {
                duration: 300,
                easing: 'ease-out',
            });
        }
    }
    // ------------------------------- Caricias: tocar o frotar a Musubi ------------------------------------------------------------- //

    // ------------------------------- Ropa y casa ------------------------------------------------------------- //
    /** Indica si Musubi lleva puesta la prenda `id` */
    protected isWearing(id: string): boolean {
        return this.petState().wearing.includes(id);
    }

    /** Cuenta cuántos objetos de la lista ya tiene */
    protected countOwned(list: PetItem[]): number {
        return list.filter((item) => this.petSVC.has(item.id)).length;
    }

    /** Toque en una ficha: explica cómo se gana, la compra, o se pone / quita la prenda */
    protected tapItem(item: PetItem): void {
        // 1. No lo tiene: se gana con un logro o se compra
        if (!this.petSVC.has(item.id)) {
            if (!item.cost) {
                this.bubbleLine.set(['まだ だめ', `${item.name} se gana así: ${this.petSVC.how(item)}.`]);
                return;
            }
            if (!this.petSVC.buy(item)) {
                this.bubbleLine.set(['たりない…', `${item.name} cuesta ${item.cost} granos y tienes ${this.petState().grains}. ¡Una práctica y lo compramos!`]);
                this.petSVC.react('sad', 1300);
                return;
            }
            this.sfxSVC.play('combo');
            if (item.kind === 'casa') {
                this.bubbleLine.set(['ありがとう！', `¡${item.name} nuevo para mi casa! Míralo arriba.`]);
                this.petSVC.react('happy', 1500);
                return;
            }
            // La ropa recién comprada sigue abajo y se pone directamente
        }

        // 2. Objeto de la casa que ya tiene: solo lo comenta
        if (item.kind === 'casa') {
            this.bubbleLine.set(['すてき！', `Me encanta mi ${item.name.toLowerCase()}.`]);
            this.petSVC.react('happy', 1200);
            return;
        }

        // 3. Ropa: se la pone o se la quita
        this.petSVC.wear(item.id);
        if (this.isWearing(item.id)) {
            this.bubbleLine.set(['にあう？', `¿Cómo me veo con ${item.name.toLowerCase()}?`]);
            this.petSVC.react('happy', 1200);
            this.sfxSVC.play('tap');
        } else {
            this.bubbleLine.set(['はい！', `Listo, me quité ${item.name.toLowerCase()}.`]);
        }
    }
    // ------------------------------- Ropa y casa ------------------------------------------------------------- //

    // ------------------------------- Juego de 5 palabras ------------------------------------------------------------- //
    /** Lee un texto en voz alta */
    protected say(text: string): void {
        void this.speechSVC.speak(text);
    }

    /** Carga las palabras ya vistas; el juego nunca enseña palabras nuevas */
    private async loadWords(): Promise<void> {
        // 1. Lecciones hasta la última abierta
        const lastLessonId = Math.max(1, this.progressSVC.lastLesson().id);
        const ids = (await this.lessonSVC.loadIndex()).map((lesson) => lesson.id).filter((id) => id >= 1 && id <= lastLessonId);
        const lessons = await this.lessonSVC.getMany(ids);

        // 2. Su vocabulario con lectura, sin nombres propios
        const mastery = this.progressSVC.mastery();
        const allWords = lessons.flatMap((lesson) => lesson.vocab).filter((word) => word.type !== 'name' && wordReading(word));

        // 3. Las ya practicadas; si son pocas, todas las de esas lecciones
        const seenWords = allWords.filter((word) => mastery[`w:${word.id}`]);
        this.wordPool = seenWords.length >= MIN_SEEN_WORDS ? seenWords : allWords;
    }

    /** Abre el juego con 5 palabras al azar y cuatro opciones cada una */
    protected openGame(): void {
        if (this.petState().energy < MIN_ENERGY_TO_PLAY) {
            this.bubbleLine.set(['つかれた…', 'Estoy muy cansado para jugar. ¿Me dejas dormir?']);
            this.petSVC.react('sleepy', 1500);
            return;
        }
        // Hacen falta 4 palabras para tener 3 distractores
        if (this.wordPool.length < 4) return;
        const words = shuffle(this.wordPool).slice(0, GAME_ROUNDS);
        const meaningPool = [...new Set(this.wordPool.map((word) => shortEs(word.es)))];
        const rounds = words.map((word) => {
            const answer = shortEs(word.es);
            const wrongOptions = shuffle(meaningPool.filter((meaning) => meaning !== answer)).slice(0, 3);
            return { japanese: wordReading(word), romaji: romaji(wordReading(word)), answer, options: shuffle([answer, ...wrongOptions]) };
        });
        this.pickedAnswer.set(null);
        this.game.set({ rounds, index: 0, correct: 0, results: [], done: false, grains: 0 });
        this.say(rounds[0].japanese);
    }

    /** Responde la ronda actual y, tras una pausa, pasa a la siguiente o cierra la partida */
    protected pickAnswer(option: string): void {
        const game = this.game();
        if (!game || this.pickedAnswer()) return;
        const isCorrect = option === game.rounds[game.index].answer;
        this.pickedAnswer.set(option);
        this.sfxSVC.play(isCorrect ? 'ok' : 'bad');
        setTimeout(() => {
            const results = [...game.results, isCorrect];
            const index = game.index + 1;
            const correct = game.correct + (isCorrect ? 1 : 0);
            const done = index >= game.rounds.length;
            // Los granos solo se dan al final, una vez
            const grains = done ? this.petSVC.played(correct) : 0;
            this.pickedAnswer.set(null);
            this.game.set({ ...game, index, correct, results, done, grains });
            if (done) {
                this.sfxSVC.play('done');
                this.bubbleLine.set(correct >= 4 ? ['たのしい！', `¡Qué divertido! ${correct} de 5. Me diste ${grains} granos.`] : ['もう いっかい？', `${correct} de 5. ¿Otra vez?`]);
            } else {
                this.say(game.rounds[index].japanese);
            }
        }, ANSWER_DELAY_MS);
    }

    /** Cierra el juego; si se terminó, Musubi se alegra */
    protected closeGame(): void {
        const game = this.game();
        this.game.set(null);
        if (game?.done) this.petSVC.react('happy', 1400);
    }
    // ------------------------------- Juego de 5 palabras ------------------------------------------------------------- //
}
