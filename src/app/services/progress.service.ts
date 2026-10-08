import { computed, Injectable } from '@angular/core';
import { clearAll, persisted } from '../utils/storage.utils';
import { daysBetween, todayKey } from '../utils/text.utils';
import { Skill, SkillScore } from '../interfaces/skill.interface';
import { Theme, Settings, Stats, MasteryEntry, ExamRecord, SkillStat } from '../interfaces/progress.interface';

/** Temas de color renombrados en la v1.3 (sus ids viejos hacían referencia a un anime) */
const LEGACY_THEMES: Record<string, Theme> = { eva00: 'sol', eva01: 'violeta', eva02: 'carmesi' };

/** Opciones de escritura del japonés que se ofrecen en Perfil y en el detalle de lección */
export const SCRIPT_OPTIONS: { id: Settings['script']; label: string }[] = [
    { id: 'kana', label: 'Solo kana' },
    { id: 'furigana', label: 'Kanji + furigana' },
    { id: 'kanji', label: 'Kanji' },
];

/** Días hasta el próximo repaso para cada caja de Leitner (la posición es la caja) */
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

/** Caja de Leitner a partir de la cual un kana o una palabra cuenta como dominado */
export const MASTERED_BOX = 4;

/** XP base de la curva de niveles: el nivel N empieza en XP_PER_LEVEL × (N - 1)² */
const XP_PER_LEVEL = 25;

/** Cuántos exámenes se guardan en el historial (los más recientes) */
const MAX_EXAMS = 30;

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    // --- Ajustes del usuario (nihongo:settings) ---
    readonly settings = persisted<Settings>('settings', {
        name: '',
        romaji: true,
        script: 'kana',
        rate: 0.9,
        theme: 'base',
        interests: [],
        sound: true,
        vibration: true,
        dailyGoal: 50,
    });

    // Migración de temas viejos: va justo después de `settings` porque los campos se
    // inicializan en orden y necesita el signal ya creado. Corre una vez por arranque.
    private readonly isThemeMigrated = (() => {
        const savedTheme = this.settings().theme as string;
        if (LEGACY_THEMES[savedTheme]) this.settings.update((settings) => ({ ...settings, theme: LEGACY_THEMES[savedTheme] }));
        return true;
    })();

    // --- Estadísticas globales (nihongo:stats) ---
    readonly stats = persisted<Stats>('stats', {
        xp: 0,
        streak: 0,
        bestStreak: 0,
        lastDay: '',
        answered: 0,
        correct: 0,
        sessions: 0,
    });

    // --- Historial y dominio, cada uno en su clave ---
    /** XP de cada día, por fecha YYYY-MM-DD */
    readonly activity = persisted<Record<string, number>>('activity', {});
    /** Respuestas de cada día como [respondidas, correctas], por fecha YYYY-MM-DD */
    readonly answerLog = persisted<Record<string, [number, number]>>('answerLog', {});
    /** Cajas de Leitner. Claves: `k:あ` para kana, `w:L01-003` para palabras */
    readonly mastery = persisted<Record<string, MasteryEntry>>('mastery', {});
    /** Mejor porcentaje de cada lección en su práctica final, por id de lección */
    readonly lessonBest = persisted<Record<string, number>>('lessonBest', {});
    /** Resultados acumulados por lección y por habilidad. Claves: id de lección → habilidad */
    readonly lessonSkills = persisted<Record<string, Partial<Record<Skill, SkillStat>>>>('lessonSkills', {});
    /** Historial de exámenes, el más reciente primero. Sin mezcla: es un array */
    readonly exams = persisted<ExamRecord[]>('exams', [], false);
    /** Última lección abierta */
    readonly lastLesson = persisted<{ id: number }>('lastLesson', { id: 1 });

    // --- Valores derivados (computed) ---
    /** XP ganada hoy */
    readonly todayXp = computed(() => this.activity()[todayKey()] ?? 0);
    /** Nivel actual según la curva cuadrática de XP */
    readonly level = computed(() => Math.floor(Math.sqrt(this.stats().xp / XP_PER_LEVEL)) + 1);
    /** Avance dentro del nivel actual, de 0 a 1 */
    readonly levelProgress = computed(() => {
        const level = this.level();
        const levelStartXp = XP_PER_LEVEL * (level - 1) ** 2;
        const nextLevelXp = XP_PER_LEVEL * level ** 2;
        return (this.stats().xp - levelStartXp) / (nextLevelXp - levelStartXp);
    });

    /** Racha que sigue viva hoy (0 si el último día activo fue antes de ayer) */
    readonly currentStreak = computed(() => {
        const stats = this.stats();
        if (!stats.lastDay) return 0;
        return daysBetween(stats.lastDay, todayKey()) <= 1 ? stats.streak : 0;
    });

    // ------------------------------- XP y racha ------------------------------------------------------------- //
    /** Suma XP al día de hoy y al total, y alarga o reinicia la racha */
    addXp(amount: number): void {
        if (amount <= 0) return;
        const today = todayKey();
        this.activity.update((activity) => ({ ...activity, [today]: (activity[today] ?? 0) + amount }));
        this.stats.update((stats) => {
            let streak = stats.streak;
            // La racha solo cambia con la primera XP del día: +1 si el último día activo fue ayer, si no vuelve a 1
            if (stats.lastDay !== today) {
                streak = stats.lastDay && daysBetween(stats.lastDay, today) === 1 ? stats.streak + 1 : 1;
            }
            return {
                ...stats,
                xp: stats.xp + amount,
                streak,
                bestStreak: Math.max(stats.bestStreak, streak),
                lastDay: today,
            };
        });
    }

    /** Cuenta una sesión terminada */
    finishSession(): void {
        this.stats.update((stats) => ({ ...stats, sessions: stats.sessions + 1 }));
    }
    // ------------------------------- XP y racha ------------------------------------------------------------- //

    // ------------------------------- Respuestas y Leitner ------------------------------------------------------------- //
    /** Registra una respuesta en las estadísticas, en el log del día y, si trae clave, en su caja de Leitner */
    recordAnswer(key: string | undefined, correct: boolean): void {
        // 1. Totales globales
        this.stats.update((stats) => ({
            ...stats,
            answered: stats.answered + 1,
            correct: stats.correct + (correct ? 1 : 0),
        }));

        // 2. Log del día
        const today = todayKey();
        this.answerLog.update((log) => {
            const [answered, correctCount] = log[today] ?? [0, 0];
            return { ...log, [today]: [answered + 1, correctCount + (correct ? 1 : 0)] };
        });

        // 3. Caja de Leitner: un acierto sube una caja (tope en la última) y un fallo baja dos (mínimo 0)
        if (!key) return;
        this.mastery.update((mastery) => {
            const previous = mastery[key] ?? { box: 0, due: today, seen: 0, wrong: 0 };
            const box = correct ? Math.min(previous.box + 1, INTERVALS.length - 1) : Math.max(0, previous.box - 2);
            const due = new Date();
            due.setDate(due.getDate() + INTERVALS[box]);
            return {
                ...mastery,
                [key]: {
                    box,
                    due: todayKey(due),
                    seen: previous.seen + 1,
                    wrong: previous.wrong + (correct ? 0 : 1),
                },
            };
        });
    }

    /** Devuelve la caja de Leitner de una clave, o -1 si nunca se respondió */
    box(key: string): number {
        return this.mastery()[key]?.box ?? -1;
    }

    /** Indica si una clave ya vista toca repasarla hoy (o está atrasada) */
    isDue(key: string): boolean {
        const entry = this.mastery()[key];
        return !!entry && entry.due <= todayKey();
    }
    // ------------------------------- Respuestas y Leitner ------------------------------------------------------------- //

    // ------------------------------- Lecciones y exámenes ------------------------------------------------------------- //
    /** Guarda el porcentaje de una lección si mejora el mejor que había (redondeado) */
    saveLessonScore(lessonId: number, pct: number): void {
        this.lessonBest.update((best) => ({ ...best, [lessonId]: Math.max(best[lessonId] ?? 0, Math.round(pct)) }));
    }

    /** Acumula los resultados por habilidad de una sesión en la lección y apunta el % más reciente */
    saveLessonSkills(lessonId: number, scores: SkillScore[]): void {
        if (!scores.length) return;
        const date = todayKey();
        this.lessonSkills.update((all) => {
            const lessonStats = { ...(all[lessonId] ?? {}) };
            for (const score of scores) {
                const previous = lessonStats[score.skill] ?? { correct: 0, total: 0, last: 0, date };
                lessonStats[score.skill] = { correct: previous.correct + score.correct, total: previous.total + score.total, last: score.pct, date };
            }
            return { ...all, [lessonId]: lessonStats };
        });
    }

    /** Añade un examen al principio del historial y conserva solo los MAX_EXAMS más recientes */
    saveExam(record: ExamRecord): void {
        this.exams.update((exams) => [record, ...exams].slice(0, MAX_EXAMS));
    }
    // ------------------------------- Lecciones y exámenes ------------------------------------------------------------- //

    // ------------------------------- Reinicio ------------------------------------------------------------- //
    /** Borra todo el progreso (todas las claves nihongo:*) y recarga la app */
    resetAll(): void {
        clearAll();
        // Recarga porque los signals persistidos siguen en memoria y los effects volverían a escribirlos
        location.reload();
    }
    // ------------------------------- Reinicio ------------------------------------------------------------- //
}
