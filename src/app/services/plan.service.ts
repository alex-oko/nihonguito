import { computed, inject, Injectable } from '@angular/core';
import { PlanState, PlanStepId } from '../interfaces/plan.interface';
import { PLAN_BONUS_XP } from '../utils/plan.utils';
import { persisted } from '../utils/storage.utils';
import { todayKey } from '../utils/text.utils';
import { ProgressService } from './progress.service';

/** Qué pasos del «Plan de hoy» se hicieron (nihongo:dailyPlan); cada día empieza de cero */
@Injectable({
    providedIn: 'root'
})
export class PlanService {
    // --- Inyección de Dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Estados con Signals ---
    private readonly state = persisted<PlanState>('dailyPlan', { date: '', done: [], isRewarded: false }, false);

    // --- Valores derivados (computed) ---
    /** Pasos hechos hoy (vacío si lo guardado es de otro día) */
    readonly doneToday = computed(() => (this.state().date === todayKey() ? this.state().done : []));
    /** Ya se recogió hoy el premio del plan */
    readonly isRewardedToday = computed(() => this.state().date === todayKey() && this.state().isRewarded);

    // ------------------------------- Pasos ------------------------------------------------------------- //
    /** Marca un paso como hecho hoy (lo llaman las prácticas al terminar) */
    markDone(id: PlanStepId): void {
        const today = todayKey();
        this.state.update((state) => {
            const current = state.date === today ? state : { date: today, done: [], isRewarded: false };
            return current.done.includes(id) ? current : { ...current, done: [...current.done, id] };
        });
    }

    /** Da el premio del plan completo (una vez al día) */
    claimReward(): void {
        if (this.isRewardedToday()) return;
        const today = todayKey();
        this.progressSVC.addXp(PLAN_BONUS_XP);
        this.state.update((state) => ({ ...(state.date === today ? state : { date: today, done: [] }), isRewarded: true }));
    }
    // ------------------------------- Pasos ------------------------------------------------------------- //
}
