import { computed, inject, Injectable, signal } from '@angular/core';
import { persisted } from '../utils/storage.utils';
import { ProgressService } from './progress.service';
import { LevelExamService } from './level-exam.service';
import { KNOWN_BOX } from '../utils/dashboard.utils';
import { PetState, Topping, Stage, Metric, PetItem, PetMood } from '../interfaces/pet.interface';

/** Mínimo de cada necesidad: Musubi nunca llega a 0, por mucho tiempo que pase sin entrar */
export const FLOOR = 10;
/** Granos que da una práctica por cada respuesta correcta */
export const GRAINS_PER_CORRECT = 5;
/** Granos extra por terminar una práctica */
export const GRAINS_FOR_FINISHING = 5;

/** Comida de la despensa: precio en granos, lecciones dominadas para desbloquearla y panza que llena */
export const TOPPINGS: Topping[] = [
    { id: 'shio', ja: 'しお', es: 'sal', color: '#f4f4f4', cost: 5, need: 0, food: 15, say: ['しおは しょっぱい！', 'La sal es salada.'] },
    { id: 'ume', ja: 'うめぼし', es: 'ciruela encurtida', color: '#d9415a', cost: 10, need: 1, food: 25, say: ['すっぱい！でも おいしい！', '¡Ácida! Pero rica.'] },
    { id: 'sake', ja: 'さけ', es: 'salmón', color: '#f08a5d', cost: 15, need: 2, food: 35, say: ['さけ、だいすき！', '¡Me encanta el salmón!'] },
    { id: 'tuna', ja: 'ツナマヨ', es: 'atún con mayo', color: '#e9d8a6', cost: 20, need: 3, food: 45, say: ['ツナマヨは さいこう！', '¡El atún con mayo es lo máximo!'] },
];

/** Etapas de crecimiento, cada una con el XP total desde el que empieza */
export const STAGES: Stage[] = [
    { name: 'Granito', ja: 'こめ', xp: 0, look: 'Una bolita de arroz chiquita' },
    { name: 'Onigiri', ja: 'おにぎり', xp: 300, look: 'Más grande y con ajonjolí' },
    { name: 'Con alga', ja: 'のりまき', xp: 1300, look: 'Estrena su alga con に' },
    { name: 'Bentō', ja: 'べんとう', xp: 3000, look: 'Vive en su caja bentō' },
];

/** Ropa y objetos de la casa: los que tienen `goal` se ganan con un logro, los que tienen `cost` se compran */
export const ITEMS: PetItem[] = [
    { id: 'hoja', kind: 'ropa', slot: 'head', name: 'Hojita', goal: { metric: 'mastered', n: 1 } },
    { id: 'lazo', kind: 'ropa', slot: 'head', name: 'Moño', cost: 40 },
    { id: 'hachimaki', kind: 'ropa', slot: 'head', name: 'Hachimaki', goal: { metric: 'streak', n: 7 } },
    { id: 'lentes', kind: 'ropa', slot: 'face', name: 'Lentes', goal: { metric: 'words', n: 50 } },
    { id: 'pajarita', kind: 'ropa', slot: 'neck', name: 'Corbatín', cost: 60 },
    { id: 'bufanda', kind: 'ropa', slot: 'neck', name: 'Bufanda', goal: { metric: 'mastered', n: 2 } },
    { id: 'sombrero', kind: 'ropa', slot: 'head', name: 'Sombrero de paja', goal: { metric: 'streak', n: 30 } },
    { id: 'gorro', kind: 'ropa', slot: 'head', name: 'Birrete', goal: { metric: 'exam', n: 1 } },
    { id: 'corona', kind: 'ropa', slot: 'head', name: 'Corona', goal: { metric: 'xp', n: 5000 } },

    // Las alfombras van primero: la habitación los pinta en este orden y lo demás queda encima
    { id: 'alfombra', kind: 'casa', name: 'Alfombra', cost: 50, vb: '80 206 200 60' },
    { id: 'cojin', kind: 'casa', name: 'Cojín', cost: 30, vb: '100 226 160 44' },
    { id: 'cuadro', kind: 'casa', name: 'Cuadro del Fuji', goal: { metric: 'words', n: 100 }, vb: '40 16 72 50' },
    { id: 'lantern', kind: 'casa', name: 'Farol', goal: { metric: 'streak', n: 7 }, vb: '152 14 56 54' },
    { id: 'plant', kind: 'casa', name: 'Planta', goal: { metric: 'mastered', n: 2 }, vb: '284 140 62 62' },
    { id: 'furin', kind: 'casa', name: 'Campanita de viento', goal: { metric: 'streak', n: 14 }, vb: '214 14 48 52' },
    { id: 'pecera', kind: 'casa', name: 'Pecera', cost: 100, vb: '240 150 60 52' },
    { id: 'daruma', kind: 'casa', name: 'Daruma', goal: { metric: 'xp', n: 2000 }, vb: '70 62 38 34' },
    { id: 'kotatsu', kind: 'casa', name: 'Kotatsu', goal: { metric: 'mastered', n: 5 }, vb: '12 166 106 52' },
    { id: 'trophy', kind: 'casa', name: 'Trofeo', goal: { metric: 'exam', n: 1 }, vb: '98 62 30 34' },
];

/** Texto de cada logro para la ficha del objeto («7 días de racha») */
const METRIC_TEXT: Record<Metric, (goal: number) => string> = {
    streak: (goal) => `${goal} días de racha`,
    mastered: (goal) => (goal === 1 ? 'Dominar 1 lección' : `Dominar ${goal} lecciones`),
    words: (goal) => `Aprender ${goal} palabras`,
    xp: (goal) => `Llegar a ${goal} XP`,
    exam: () => 'Aprobar un examen de nivel',
};

/** Caricias por día que todavía suben la alegría: acariciar ayuda, pero no sustituye a practicar */
const PETS_PER_DAY = 20;
/** Horas máximas que se descuentan de golpe: tras 3 días fuera ya está en el piso, no hace falta más */
const MAX_DRIFT_HOURS = 72;

/** Redondea una necesidad y la deja entre FLOOR y 100 */
function clampNeed(value: number): number {
    return Math.max(FLOOR, Math.min(100, Math.round(value)));
}

/** Indica si es de noche (de 21:00 a 7:00) */
function isNightTime(date = new Date()): boolean {
    return date.getHours() >= 21 || date.getHours() < 7;
}

/** Devuelve el día de hoy como texto, para contar las caricias por día */
function todayKey(): string {
    return new Date().toDateString();
}

@Injectable({
    providedIn: 'root'
})
export class PetService {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);
    private levelExamSVC = inject(LevelExamService);

    // --- Estados UI con Signals ---
    /** Estado de la mascota, guardado en `nihongo:pet` */
    readonly state = persisted<PetState>('pet', {
        food: 60,
        joy: 70,
        energy: 80,
        grains: 20,
        asleep: false,
        tick: Date.now(),
        wearing: [],
        owned: [],
        seen: [],
        stageSeen: 0,
        petDay: '',
        petN: 0,
    });

    /** Reacción corta (comer, un salto…) que se enseña encima del ánimo de fondo */
    readonly reaction = signal<PetMood | null>(null);

    // --- Valores derivados (computed) ---
    /** Lecciones cuyo test de lección llegó al 80% */
    readonly mastered = computed(() => Object.values(this.progressSVC.lessonBest()).filter((percent) => percent >= 80).length);
    /** Si aprobó algún examen de nivel (70% o más) */
    readonly examPassed = computed(() => Object.values(this.levelExamSVC.best()).some((percent) => percent >= 70));
    /** Mejor racha de la historia, contando la actual aunque aún no se haya guardado como récord */
    readonly bestStreak = computed(() => Math.max(this.progressSVC.stats().bestStreak, this.progressSVC.currentStreak()));

    /** Palabras de vocabulario que ya están en la caja KNOWN_BOX o más arriba */
    readonly wordsKnown = computed(
        () => Object.entries(this.progressSVC.mastery()).filter(([masteryKey, mastery]) => masteryKey.startsWith('w:') && mastery.box >= KNOWN_BOX).length,
    );

    /** Objetos y comidas ganados con logros (lo comprado está en state.owned) */
    readonly unlocked = computed(() => {
        const ids = ITEMS.filter((item) => item.goal && this.metric(item.goal.metric) >= item.goal.n).map((item) => item.id);
        // Las comidas se guardan con el prefijo food: para no chocar con los ids de objetos
        for (const topping of TOPPINGS) if (topping.need > 0 && this.mastered() >= topping.need) ids.push('food:' + topping.id);
        return ids;
    });

    /** Desbloqueos que el usuario todavía no ha visto */
    readonly fresh = computed(() => this.unlocked().filter((id) => !this.state().seen.includes(id)));

    /** Índice de la etapa actual en STAGES según el XP total */
    readonly stageIndex = computed(() => {
        const xp = this.progressSVC.stats().xp;
        return STAGES.reduce((current, stage, index) => (xp >= stage.xp ? index : current), 0);
    });

    /** Ánimo de fondo según las necesidades; el orden marca la prioridad */
    readonly baseMood = computed<PetMood>(() => {
        const petState = this.state();
        if (petState.asleep) return 'sleep';
        if (petState.food < 30) return 'hungry';
        if (petState.joy < 30) return 'sad';
        // De noche se cansa antes: con menos de 60 ya tiene sueño
        if (petState.energy < 30 || (isNightTime() && petState.energy < 60)) return 'sleepy';
        if (petState.food >= 70 && petState.joy >= 70) return 'happy';
        return 'idle';
    });
    /** Ánimo que se ve: la reacción del momento o, si no hay, el de fondo */
    readonly mood = computed<PetMood>(() => this.reaction() ?? this.baseMood());

    /** Una línea para la tarjeta de Inicio */
    readonly status = computed(() => {
        const petState = this.state();
        if (petState.asleep) return 'Está dormido. Shh…';
        if (this.fresh().length) return 'Tiene algo nuevo para mostrarte.';
        if (petState.food < 40) return `Tiene hambre. Tienes ${petState.grains} granos para darle de comer.`;
        if (petState.joy < 40) return 'Te extraña. Juega un ratito con él.';
        if (petState.food >= 70 && petState.joy >= 70) return 'Está feliz y lleno. ¡Bien cuidado!';
        return 'Tiene un poquito de hambre. Toca para entrar.';
    });
    /** Si Inicio debe llamar la atención sobre Musubi (hambre o algo nuevo) */
    readonly needsYou = computed(() => this.state().food < 40 || this.fresh().length > 0);

    // Temporizador que devuelve la reacción a null
    private reactionTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // Las partidas antiguas guardaban una sola prenda como texto
        const savedWearing = this.state().wearing as unknown;
        if (!Array.isArray(savedWearing)) {
            this.state.update((petState) => ({ ...petState, wearing: typeof savedWearing === 'string' ? [savedWearing] : [] }));
        }
        this.update();
    }

    // ------------------------------- Logros ------------------------------------------------------------- //
    /** Devuelve el valor actual de una métrica de progreso */
    metric(metric: Metric): number {
        switch (metric) {
            case 'streak':
                return this.bestStreak();
            case 'mastered':
                return this.mastered();
            case 'words':
                return this.wordsKnown();
            case 'xp':
                return this.progressSVC.stats().xp;
            case 'exam':
                return this.examPassed() ? 1 : 0;
        }
    }

    /** Indica si el usuario ya tiene un objeto (ganado o comprado) */
    has(id: string): boolean {
        return this.unlocked().includes(id) || this.state().owned.includes(id);
    }

    /** Devuelve cómo se consigue un objeto, con lo que lleva: «7 días de racha · 3/7» */
    how(item: PetItem): string {
        if (!item.goal) return `${item.cost} granos`;
        const text = METRIC_TEXT[item.goal.metric](item.goal.n);
        // El examen es sí o no: «0/1» no aporta nada
        return item.goal.metric === 'exam' ? text : `${text} · ${Math.min(this.metric(item.goal.metric), item.goal.n)}/${item.goal.n}`;
    }

    /** Guarda como vista la etapa actual, para no volver a celebrarla */
    markStage(): void {
        this.state.update((petState) => ({ ...petState, stageSeen: this.stageIndex() }));
    }

    /** Marca como vistos todos los desbloqueos actuales */
    markSeen(): void {
        const allUnlocked = this.unlocked();
        this.state.update((petState) => ({ ...petState, seen: [...new Set([...petState.seen, ...allUnlocked])] }));
    }
    // ------------------------------- Logros ------------------------------------------------------------- //

    // ------------------------------- Ánimo y tiempo ------------------------------------------------------------- //
    /** Muestra una reacción durante `durationMs` y luego vuelve al ánimo de fondo */
    react(mood: PetMood, durationMs = 1400): void {
        clearTimeout(this.reactionTimer);
        this.reaction.set(mood);
        this.reactionTimer = setTimeout(() => this.reaction.set(null), durationMs);
    }

    /** Pone al día las necesidades con el tiempo que pasó desde la última visita */
    update(now = Date.now()): void {
        this.state.update((petState) => {
            // 1. Horas desde el último tick, con tope y nunca negativas (por si cambió el reloj)
            const hours = Math.min(MAX_DRIFT_HOURS, Math.max(0, (now - petState.tick) / 3_600_000));
            // Menos de 3 minutos: no cambia nada y se evita reescribir localStorage
            if (hours < 0.05) return petState;

            // 2. La panza y la alegría bajan; la energía sube dormido y baja despierto (más rápido de noche)
            let { food, joy, energy, asleep } = petState;
            food -= hours * 2;
            joy -= hours * 1.5;
            energy += asleep ? hours * 10 : -hours * (isNightTime() ? 4 : 2.5);

            // 3. Musubi se despierta solo por la mañana
            if (asleep && !isNightTime(new Date(now))) asleep = false;
            return { ...petState, food: clampNeed(food), joy: clampNeed(joy), energy: clampNeed(energy), asleep, tick: now };
        });
    }

    /** Indica si ahora es de noche (de 21:00 a 7:00) */
    isNight(): boolean {
        return isNightTime();
    }
    // ------------------------------- Ánimo y tiempo ------------------------------------------------------------- //

    // ------------------------------- Cuidados ------------------------------------------------------------- //
    /** Da los granos de una práctica terminada y devuelve cuántos fueron */
    reward(correct: number): number {
        const grains = correct * GRAINS_PER_CORRECT + GRAINS_FOR_FINISHING;
        this.update();
        this.state.update((petState) => ({ ...petState, grains: petState.grains + grains, joy: clampNeed(petState.joy + 5) }));
        return grains;
    }

    /** Indica si una comida ya está desbloqueada */
    canEat(topping: Topping): boolean {
        return this.mastered() >= topping.need;
    }

    /** Le da de comer; devuelve lo que dice Musubi o por qué no pudo comer */
    feed(topping: Topping): { ok: boolean; ja: string; es: string } {
        const petState = this.state();
        if (petState.asleep) return { ok: false, ja: 'むにゃむにゃ…', es: 'Está dormido. Despiértalo primero.' };
        if (!this.canEat(topping)) return { ok: false, ja: 'まだ だめ', es: `Se desbloquea al dominar ${topping.need === 1 ? 'una lección' : topping.need + ' lecciones'}.` };
        if (petState.food >= 95) return { ok: false, ja: 'おなか いっぱい！', es: 'Estoy lleno. Mejor juguemos.' };
        if (petState.grains < topping.cost) return { ok: false, ja: 'おなか すいた…', es: `Me faltan granos para ${topping.es}. Una práctica corta te da varios.` };
        this.state.update((current) => ({
            ...current,
            grains: current.grains - topping.cost,
            food: clampNeed(current.food + topping.food),
            joy: clampNeed(current.joy + 5),
        }));
        return { ok: true, ja: topping.say[0], es: `${topping.say[1]} (${topping.ja} = ${topping.es})` };
    }

    /** Suma una caricia; `bonus` es para el abrazo grande al final de un combo */
    pet(bonus = 0): void {
        this.state.update((petState) => {
            // Las caricias se cuentan por día: al cambiar de día el contador vuelve a 0
            const petsToday = petState.petDay === todayKey() ? petState.petN : 0;
            return {
                ...petState,
                petDay: todayKey(),
                petN: petsToday + 1,
                joy: petsToday < PETS_PER_DAY ? clampNeed(petState.joy + 2 + bonus) : petState.joy,
            };
        });
    }

    /** Aplica el resultado del juego de 5 palabras y devuelve los granos ganados */
    played(correct: number): number {
        const grains = correct * 2;
        this.state.update((petState) => ({
            ...petState,
            joy: clampNeed(petState.joy + 6 + correct * 5),
            energy: clampNeed(petState.energy - 8),
            grains: petState.grains + grains,
        }));
        return grains;
    }

    /** Lo duerme o lo despierta; devuelve false (y sigue despierto) si es de día y no está cansado */
    toggleSleep(): boolean {
        const petState = this.state();
        if (!petState.asleep && !isNightTime() && petState.energy > 60) return false;
        // Despertarlo a mano también le da energía: más si fue una siesta de día
        this.state.update((current) => ({
            ...current,
            asleep: !current.asleep,
            energy: current.asleep ? clampNeed(current.energy + (isNightTime() ? 10 : 30)) : current.energy,
        }));
        return true;
    }
    // ------------------------------- Cuidados ------------------------------------------------------------- //

    // ------------------------------- Ropa y tienda ------------------------------------------------------------- //
    /** Se pone una prenda (quitando la que hubiera en la misma zona) o se la quita */
    wear(id: string): void {
        const slot = ITEMS.find((item) => item.id === id)?.slot;
        this.state.update((petState) => {
            if (petState.wearing.includes(id)) return { ...petState, wearing: petState.wearing.filter((wornId) => wornId !== id) };
            const others = petState.wearing.filter((wornId) => ITEMS.find((item) => item.id === wornId)?.slot !== slot);
            return { ...petState, wearing: [...others, id] };
        });
    }

    /** Compra un objeto con granos; devuelve false si no alcanza o no se vende */
    buy(item: PetItem): boolean {
        if (!item.cost || this.has(item.id) || this.state().grains < item.cost) return false;
        this.state.update((petState) => ({ ...petState, grains: petState.grains - item.cost!, owned: [...petState.owned, item.id] }));
        return true;
    }
    // ------------------------------- Ropa y tienda ------------------------------------------------------------- //
}
