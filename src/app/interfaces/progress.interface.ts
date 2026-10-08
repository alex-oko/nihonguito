/** Tema de color de la app */
export type Theme = 'base' | 'sol' | 'violeta' | 'carmesi';

/** Ajustes del usuario (nihongo:settings) */
export interface Settings {
    name: string;
    romaji: boolean;
    /** Cómo se muestran los kanji: solo kana, kanji con furigana o kanji solo */
    script: 'kana' | 'furigana' | 'kanji';
    /** Velocidad de la voz (1 = normal) */
    rate: number;
    theme: Theme;
    /** Temas que le gustan al usuario (utils/interests.utils.ts): la práctica prefiere frases sobre ellos */
    interests: string[];
    sound: boolean;
    vibration: boolean;
    /** Meta de XP diaria */
    dailyGoal: number;
}

/** Estadísticas globales (nihongo:stats) */
export interface Stats {
    xp: number;
    streak: number;
    bestStreak: number;
    /** Último día con XP, como YYYY-MM-DD */
    lastDay: string;
    answered: number;
    correct: number;
    sessions: number;
}

/** Estado de Leitner de un kana o una palabra */
export interface MasteryEntry {
    box: number;
    /** Día del próximo repaso, como YYYY-MM-DD */
    due: string;
    seen: number;
    wrong: number;
}

/** Un examen del historial */
export interface ExamRecord {
    date: string;
    title: string;
    score: number;
    total: number;
}

/** Resultado acumulado de una habilidad dentro de una lección */
export interface SkillStat {
    correct: number;
    total: number;
    /** % de la sesión más reciente que entrenó esta habilidad */
    last: number;
    date: string;
}
