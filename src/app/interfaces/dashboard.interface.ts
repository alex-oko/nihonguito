import { Skill } from './skill.interface';
import { LevelPreset } from './level-exam.interface';
import { Lesson } from './lesson.interface';
import { MasteryEntry, SkillStat } from './progress.interface';

/** Precisión por habilidad de una lección */
export type LessonSkills = Partial<Record<Skill, SkillStat>>;

/** Color de un porcentaje (ver tone en dashboard.utils) */
export type Tone = 'ok' | 'mid' | 'bad' | 'none';

/** Una fila de precisión por habilidad */
export interface SkillRow {
    skill: Skill;
    label: string;
    pct: number | null;
    total: number;
}

// ------------------------------- Preparación para el examen ------------------------------------------------------------- //

/** Una comprobación de la preparación (kana, palabras, ejercicios o prueba de una lección) */
export interface ReadinessCheck {
    label: string;
    value: string;
    tone: Tone;
    /** 0–100: entra en la estimación y decide qué consejo se da */
    pct: number;
    advice: string;
    /** Qué practicar: decide el icono y el enlace */
    kind: 'kana' | 'vocab' | 'skill' | 'test';
    lesson?: number;
    skill?: Skill;
    /** Puntos aproximados (sobre 50) que se ganan llevándola a su meta */
    gain: number;
    /** Peso en la estimación */
    w: number;
    /** Porcentaje con el que cuenta como hecha */
    goal: number;
}

/** Preparación estimada para un examen de nivel */
export interface Readiness {
    preset: LevelPreset;
    /** Puntos estimados sobre 50; null cuando no hay nada de lo que estimar */
    score: number | null;
    verdict: 'ready' | 'close' | 'notyet' | 'nodata';
    checks: ReadinessCheck[];
    advice: string;
    /** Mejor intento real (simulacro), en % */
    attempt: number | null;
}

/** Datos de progreso que necesita readiness() */
export interface ReadinessInput {
    lessons: Lesson[];
    mastery: Record<string, MasteryEntry>;
    lessonSkills: Record<string, LessonSkills>;
    lessonBest: Record<string, number>;
    levelBest: Record<string, number>;
    /** Kana dominados / total (0–1); solo se usa si el examen incluye kana */
    kana: number;
}
// ------------------------------- Preparación para el examen ------------------------------------------------------------- //
