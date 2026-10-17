// Tipos del «Plan de hoy» de Inicio: una sesión corta con repaso, aprendizaje, kanji, diario y escucha

/** Pasos del plan */
export type PlanStepId = 'review' | 'learn' | 'kanji' | 'diary' | 'listen';

/** Lo que se guarda en nihongo:dailyPlan: los pasos hechos del día y si ya se recogió el premio */
export interface PlanState {
    /** Día al que se refiere (YYYY-MM-DD); otro día empieza vacío */
    date: string;
    done: PlanStepId[];
    isRewarded: boolean;
}

/** Paso del plan tal como lo pinta Inicio */
export interface PlanStep {
    id: PlanStepId;
    icon: string;
    title: string;
    sub: string;
    /** Minutos aproximados */
    minutes: number;
    link: (string | number)[];
    queryParams?: Record<string, string | number>;
    isDone: boolean;
}
