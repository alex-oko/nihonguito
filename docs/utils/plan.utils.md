# Plan de hoy (`plan.utils.ts`)

Constantes del **Plan de hoy** de [Inicio](../views/home/home.md) y la configuración de su escucha corta.

## Constantes

| Nombre | Valor | Para qué |
|---|---|---|
| `PLAN_KANJI_COUNT` | **5** | Kanji del paso de kanji. |
| `PLAN_LISTEN_COUNT` | **15** | Audios del paso de escucha (unos 3 minutos). |
| `PLAN_BONUS_XP` | **20** | Premio por completar el plan. |
| `PLAN_MINUTES` | repaso 4, aprende 5, kanji 2, diario 2, escucha 3 | Minutos que enseña cada paso y el total que falta. |

## Funciones

#### `planListenConfig(lastLesson)`

- **Qué hace**: la `ListenConfig` del paso de escucha: palabras y frases de las lecciones 1 a `lastLesson`, japonés → español, mezclado, 15 audios y sin bucle.
- **Quién la usa**: [el reproductor](../views/listen/listen-player.md) con `?preset=plan`. No se guarda: la configuración propia del usuario (`listenConfig`) no cambia.
