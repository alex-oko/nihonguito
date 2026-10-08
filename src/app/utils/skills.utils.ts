/**
 * Habilidades que entrena cada pregunta (significado, escucha, escritura…): su lista con etiqueta
 * e icono, cómo se deduce la habilidad de una pregunta y el desglose de aciertos por habilidad.
 */
import { AnswerRecord, Question } from '../interfaces/question.interface';
import { Skill, SkillScore } from '../interfaces/skill.interface';

/** Habilidades con su etiqueta y su icono, en el orden en que se enseñan */
export const SKILLS: { id: Skill; label: string; icon: string }[] = [
    { id: 'meaning', label: 'Significado', icon: 'eye' },
    { id: 'reverse', label: 'Al japonés', icon: 'swap' },
    { id: 'listen', label: 'Escucha', icon: 'headphones' },
    { id: 'write', label: 'Escribir', icon: 'pencil' },
    { id: 'speak', label: 'Pronunciar', icon: 'mic' },
    { id: 'order', label: 'Ordenar', icon: 'sort' },
    { id: 'particles', label: 'Partículas', icon: 'link' },
];

// ------------------------------- Etiquetas e iconos ------------------------------------------------------------- //
/** Devuelve la etiqueta en español de una habilidad (o su id si no existe) */
export function skillLabel(skill: Skill): string {
    return SKILLS.find((entry) => entry.id === skill)?.label ?? skill;
}

/** Devuelve el icono de una habilidad ('target' si no existe) */
export function skillIcon(skill: Skill): string {
    return SKILLS.find((entry) => entry.id === skill)?.icon ?? 'target';
}
// ------------------------------- Etiquetas e iconos ------------------------------------------------------------- //

// ------------------------------- Desglose por habilidad ------------------------------------------------------------- //
/** Deduce la habilidad por la forma de la pregunta, así los generadores no tienen que etiquetarla */
export function skillOf(question: Question): Skill | null {
    switch (question.kind) {
        case 'note':
            return null;
        case 'order':
            return 'order';
        case 'speak':
            return 'speak';
        case 'type':
            return 'write';
        case 'choice':
            if (question.audioOnly) return 'listen';
            // Se reconoce por la etiqueta: solo las de partícula dicen «partícula»
            if (question.label.includes('partícula')) return 'particles';
            return question.choiceStyle === 'jp' || question.choiceStyle === 'jp-big' ? 'reverse' : 'meaning';
    }
}

/** Calcula la nota por habilidad de una sesión, la peor primero */
export function skillBreakdown(records: AnswerRecord[]): SkillScore[] {
    const totals = new Map<Skill, { correct: number; total: number }>();
    for (const record of records) {
        const skill = skillOf(record.question);
        if (!skill) continue;
        const counts = totals.get(skill) ?? { correct: 0, total: 0 };
        counts.total++;
        if (record.correct) counts.correct++;
        totals.set(skill, counts);
    }
    // A igual porcentaje, primero la que tiene más respuestas
    return [...totals]
        .map(([skill, counts]) => ({ skill, ...counts, pct: Math.round((counts.correct / counts.total) * 100) }))
        .sort((first, second) => first.pct - second.pct || second.total - first.total);
}
// ------------------------------- Desglose por habilidad ------------------------------------------------------------- //
