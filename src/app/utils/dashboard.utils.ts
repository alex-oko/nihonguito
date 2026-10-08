import { Lesson } from '../interfaces/lesson.interface';
import { MasteryEntry } from '../interfaces/progress.interface';
import { SKILLS, skillLabel } from './skills.utils';
import { LEVEL_PRESETS } from './level.utils';
import { LevelPreset } from '../interfaces/level-exam.interface';
import { LessonSkills, Tone, SkillRow, ReadinessCheck, Readiness, ReadinessInput } from '../interfaces/dashboard.interface';

/** Una palabra cuenta como sabida desde la caja 2 de Leitner (la misma regla que la pantalla de lección) */
export const KNOWN_BOX = 2;
/** Puntos (sobre 50) con los que se aprueba el examen de nivel */
export const PASS_POINTS = 35;
/** Puntos (sobre 50) a partir de los cuales se va «listo», con margen */
export const READY_POINTS = 40;
/** Nota máxima del examen de nivel */
const EXAM_POINTS = 50;
/** Peso de un intento real del examen frente a la estimación (el resto, 0.4, es la estimación) */
const ATTEMPT_WEIGHT = 0.6;
/** Peso de la prueba final de una lección; palabras, ejercicios y kana pesan 1 */
const LESSON_TEST_WEIGHT = 1.5;

// ------------------------------- Colores y habilidades ------------------------------------------------------------- //
/** Devuelve el color de un porcentaje: ok desde 80, mid desde 60, bad por debajo y none sin dato */
export function tone(pct: number | null, okFrom = 80, midFrom = 60): Tone {
    if (pct === null) return 'none';
    return pct >= okFrom ? 'ok' : pct >= midFrom ? 'mid' : 'bad';
}

/** Suma la precisión por habilidad de las lecciones dadas: mejor primero, las no practicadas al final */
export function skillRows(stats: LessonSkills[]): SkillRow[] {
    return SKILLS.map((skill) => {
        let correct = 0;
        let total = 0;
        for (const lessonStats of stats) {
            correct += lessonStats[skill.id]?.correct ?? 0;
            total += lessonStats[skill.id]?.total ?? 0;
        }
        return { skill: skill.id, label: skill.label, total, pct: total ? Math.round((correct / total) * 100) : null };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}

/** Devuelve la habilidad más floja con respuestas suficientes para fiarse (4 por defecto) */
export function weakestSkill(stats: LessonSkills | undefined, minAnswers = 4): SkillRow | null {
    const rows = skillRows(stats ? [stats] : []).filter((row) => row.pct !== null && row.total >= minAnswers);
    return rows.length ? rows[rows.length - 1] : null;
}

/** Cuenta las palabras de la lección en caja KNOWN_BOX o más */
export function knownWords(lesson: Lesson, mastery: Record<string, MasteryEntry>): number {
    return lesson.vocab.filter((word) => (mastery[`w:${word.id}`]?.box ?? -1) >= KNOWN_BOX).length;
}
// ------------------------------- Colores y habilidades ------------------------------------------------------------- //

// ------------------------------- Preparación para el examen de nivel ------------------------------------------------------------- //
/**
 * Estima la nota (sobre 50) de un examen de nivel a partir de lo demostrado en cada lección que cubre:
 * palabras sabidas, precisión en los ejercicios y la prueba final de la lección. Un intento real pesa más que la estimación.
 */
export function readiness(preset: LevelPreset, input: ReadinessInput): Readiness {
    const checks: ReadinessCheck[] = [];
    const parts: { pct: number; weight: number }[] = [];

    // 1. Kana (solo el parcial del Nivel 1)
    if (preset.kana) {
        const pct = Math.round(input.kana * 100);
        checks.push({
            label: 'Hiragana y katakana',
            value: `${pct}%`,
            tone: tone(pct),
            pct,
            advice: 'Repasa las tablas de kana',
            kind: 'kana',
            gain: 0,
            w: 1,
            goal: 80,
        });
        parts.push({ pct, weight: 1 });
    }

    for (const lesson of input.lessons.filter((candidate) => preset.lessons.includes(candidate.id))) {
        // 2. Palabras sabidas de la lección (meta 70 %)
        const known = knownWords(lesson, input.mastery);
        const vocabPct = lesson.vocab.length ? Math.round((known / lesson.vocab.length) * 100) : 100;
        checks.push({
            label: `Palabras dominadas (L${lesson.id})`,
            value: `${known}/${lesson.vocab.length}`,
            tone: tone(vocabPct, 70, 40),
            pct: vocabPct,
            advice: `aprende ${Math.max(1, Math.ceil(lesson.vocab.length * 0.7) - known)} palabras más de la lección ${lesson.id}`,
            kind: 'vocab',
            lesson: lesson.id,
            gain: 0,
            w: 1,
            goal: 70,
        });
        parts.push({ pct: vocabPct, weight: 1 });

        // 3. Ejercicios: la media ponderada por respuestas entra en la nota; se enseña la habilidad más floja si baja de 80 %
        const stats = input.lessonSkills[lesson.id];
        const weakest = weakestSkill(stats);
        const practicedRows = skillRows(stats ? [stats] : []).filter((row) => row.pct !== null);
        if (practicedRows.length) {
            const totalAnswers = practicedRows.reduce((sum, row) => sum + row.total, 0);
            const average = Math.round(practicedRows.reduce((sum, row) => sum + row.pct! * row.total, 0) / totalAnswers);
            parts.push({ pct: average, weight: 1 });
            if (weakest && weakest.pct! < 80) {
                checks.push({
                    label: `${weakest.label} (L${lesson.id})`,
                    value: `${weakest.pct}%`,
                    tone: tone(weakest.pct),
                    pct: weakest.pct!,
                    advice: `sube ${weakest.label.toLowerCase()} de la lección ${lesson.id} a 60% o más`,
                    kind: 'skill',
                    lesson: lesson.id,
                    skill: weakest.skill,
                    gain: 0,
                    w: 1,
                    goal: 80,
                });
            } else {
                checks.push({
                    label: `Ejercicios (L${lesson.id})`,
                    value: `${average}%`,
                    tone: tone(average),
                    pct: average,
                    advice: `practica la lección ${lesson.id}`,
                    kind: 'skill',
                    lesson: lesson.id,
                    gain: 0,
                    w: 1,
                    goal: 80,
                });
            }
        }

        // 4. Prueba final de la lección (pesa 1.5)
        const best = input.lessonBest[lesson.id];
        if (best !== undefined) {
            checks.push({
                label: `Prueba de la lección ${lesson.id}`,
                value: `${best}% · meta 80%`,
                tone: tone(best),
                pct: best,
                advice: `repite la prueba de la lección ${lesson.id}`,
                kind: 'test',
                lesson: lesson.id,
                gain: 0,
                w: LESSON_TEST_WEIGHT,
                goal: 80,
            });
            parts.push({ pct: best, weight: LESSON_TEST_WEIGHT });
        }
    }

    // 5. Nota estimada: media ponderada; con un intento real, 60 % intento + 40 % estimación
    const attempt = input.levelBest[preset.id] ?? null;
    // Con kana, la parte de kana sola no cuenta como práctica salvo que ya sepa alguno
    const practiced = parts.length > (preset.kana ? 1 : 0) || attempt !== null || (preset.kana && input.kana > 0);
    let score: number | null = null;
    if (practiced) {
        const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
        let pct = weightSum ? parts.reduce((sum, part) => sum + part.pct * part.weight, 0) / weightSum : 0;
        if (attempt !== null) pct = weightSum ? ATTEMPT_WEIGHT * attempt + (1 - ATTEMPT_WEIGHT) * pct : attempt;
        score = Math.round((pct / 100) * EXAM_POINTS);
    }

    // 6. Puntos que daría cada comprobación si llegara a su meta (la estimación es una media ponderada)
    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
    if (totalWeight) {
        const share = attempt !== null ? 1 - ATTEMPT_WEIGHT : 1;
        for (const check of checks) check.gain = Math.round((Math.max(0, check.goal - check.pct) * check.w * share * EXAM_POINTS) / (totalWeight * 100));
    }

    // 7. Veredicto: listo pide READY_POINTS y nada en rojo; casi pide PASS_POINTS
    const hasRed = checks.some((check) => check.tone === 'bad');
    const verdict: Readiness['verdict'] =
        score === null ? 'nodata' : score >= READY_POINTS && !hasRed ? 'ready' : score >= PASS_POINTS ? 'close' : 'notyet';

    // 8. Consejo con las dos comprobaciones más bajas que no están en verde
    const todo = checks.filter((check) => check.tone !== 'ok').sort((a, b) => a.pct - b.pct).slice(0, 2);
    const advice =
        verdict === 'nodata'
            ? 'Practica las lecciones del examen o haz un simulacro para estimar tu nota.'
            : verdict === 'ready'
                ? 'Vas bien. Haz un simulacro para confirmarlo.'
                : todo.length
                    ? `${verdict === 'close' ? 'Aprobarías por poco.' : 'Todavía no alcanza.'} Para llegar con margen: ${todo.map((check) => check.advice).join(' y ')}.`
                    : 'Haz un simulacro para confirmar tu nivel.';

    return { preset, score, verdict, checks: checks.slice(0, 5), advice: advice.charAt(0).toUpperCase() + advice.slice(1), attempt };
}

/** Devuelve el examen de nivel que cubre la lección en estudio y el siguiente */
export function upcomingExams(lastLesson: number): [LevelPreset, LevelPreset | null] {
    const index = Math.max(0, LEVEL_PRESETS.findIndex((preset) => preset.lessons.includes(lastLesson)));
    return [LEVEL_PRESETS[index], LEVEL_PRESETS[index + 1] ?? null];
}
// ------------------------------- Preparación para el examen de nivel ------------------------------------------------------------- //

export { skillLabel };
