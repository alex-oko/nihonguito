/** Qué entrena una pregunta; sirve para desglosar las notas y señalar los puntos débiles */
export type Skill = 'meaning' | 'reverse' | 'listen' | 'write' | 'speak' | 'order' | 'particles';

/** Aciertos de una habilidad en una sesión */
export interface SkillScore {
    skill: Skill;
    correct: number;
    total: number;
    /** Porcentaje de acierto redondeado (0–100) */
    pct: number;
}
