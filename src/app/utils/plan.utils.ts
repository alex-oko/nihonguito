/**
 * Constantes del «Plan de hoy» de Inicio y la configuración de escucha corta que usa su último paso.
 */
import { ListenConfig } from '../interfaces/listen.interface';
import { PlanStepId } from '../interfaces/plan.interface';
import { DEFAULT_LISTEN_CONFIG } from './listen.utils';

/** Kanji que se practican en el paso de kanji */
export const PLAN_KANJI_COUNT = 5;

/** Audios del paso de escucha (unos 3 minutos) */
export const PLAN_LISTEN_COUNT = 15;

/** XP de premio por completar el plan del día */
export const PLAN_BONUS_XP = 20;

/** Minutos aproximados de cada paso */
export const PLAN_MINUTES: Record<PlanStepId, number> = { review: 4, learn: 5, kanji: 2, diary: 2, listen: 3 };

/** Configuración de la escucha del plan: palabras y frases de las lecciones hasta la actual, sin tocar la del usuario */
export function planListenConfig(lastLesson: number): ListenConfig {
    return {
        ...DEFAULT_LISTEN_CONFIG,
        lessons: Array.from({ length: Math.max(1, lastLesson) }, (_, i) => i + 1),
        content: ['words', 'sentences'],
        count: PLAN_LISTEN_COUNT,
        isLooping: false,
    };
}
