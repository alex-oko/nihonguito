# PlanService

Guarda qué pasos del **Plan de hoy** de [Inicio](../views/home/home.md) se hicieron y si ya se recogió el premio. Cada día empieza de cero.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [plan.service.ts](../../src/app/services/plan.service.ts) | Estado del día, `markDone` y `claimReward`. |
| [plan.utils.ts](../../src/app/utils/plan.utils.ts) | Constantes del plan y la escucha corta ([su doc](../utils/plan.utils.md)). |

### Estado

| Miembro | Qué guarda |
|---|---|
| `state` (privado) | `PlanState`: `{ date, done, isRewarded }` en `nihongo:dailyPlan` (`persisted`, `merge = false`). |
| `doneToday` | Los pasos hechos hoy; vacío si `date` no es hoy. |
| `isRewardedToday` | Ya se recogió el premio hoy. |

### Quién marca cada paso

| Paso | Dónde |
|---|---|
| `review` | `ReviewComponent`, en el `(finished)` del runner |
| `learn` | `LessonPracticeComponent.done()` (cualquier sesión de lección que termine en el runner) |
| `kanji` | `KanjiPracticeComponent` (`(finished)`) y `KanjiTraceComponent` al terminar |
| `diary` | `DiaryComponent.save()` |
| `listen` | `ListenPlayerComponent` al terminar la lista (o al completar una vuelta en bucle) |

Inicio además da por hechos el repaso si no hay palabras pendientes y el diario si ya hay una frase de hoy.

## Métodos

#### `markDone(id)`

Si lo guardado es de otro día, empieza un día nuevo vacío; añade `id` si no estaba.

#### `claimReward()`

Una vez al día: suma `PLAN_BONUS_XP` (**20**) con `progressSVC.addXp` y marca `isRewarded`.
