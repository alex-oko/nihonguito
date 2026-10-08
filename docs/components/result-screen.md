# Pantalla de resultado (`app-result-screen`)

La pantalla con la que termina cada sesión de [`app-question-runner`](question-runner.md): comentario de Musubi, estrellas, porcentaje, XP, tiempo, granos ganados, nota por habilidad, atajo para reforzar la habilidad más floja y la lista de errores para repasar. No guarda nada: solo pinta el `SessionResult` que recibe.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [result-screen.component.ts](../../src/app/components/result-screen/result-screen.component.ts) | Porcentaje, estrellas, titular, comentario de Musubi, habilidades, errores y duración |
| [result-screen.component.html](../../src/app/components/result-screen/result-screen.component.html) | Cabecera, cifras, granos, desglose por habilidad, «Refuerza», errores y botones |
| [result-screen.component.scss](../../src/app/components/result-screen/result-screen.component.scss) | Estilos de la tarjeta de granos, estrellas y barras por habilidad |
| [skills.utils.ts](../../src/app/utils/skills.utils.ts) | `skillBreakdown` y `skillLabel` |
| [pet.service.ts](../../src/app/services/pet.service.ts) | `state().grains`: granos totales tras la sesión |

Solo lo usa `app-question-runner`. Los juegos de Parejas, Contrarreloj y las tarjetas tienen su propia pantalla final.

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `result` | `input.required<SessionResult>` | Registros (uno por pregunta), XP, duración, granos y título |
| `exam` | `input` (`false`) | Lo recibe, pero hoy la plantilla no lo usa |
| `lessonId` | `input<number \| null>` | Activa el atajo «Refuerza» hacia la práctica de esa lección |
| `again` | `output<void>` | Botón **Otra vez** |
| `exit` | `output<void>` | Botón **Terminar** |

### Qué hace el usuario

- **Darle de comer a Musubi** (solo si ganó granos): va a `/musubi`.
- **Refuerza: <habilidad>** (solo en una lección): va a `/lecciones/<id>/practica/<habilidad>` con `replaceUrl`, para que «atrás» no vuelva al resultado.
- **Altavoz** en cada error con audio (`app-speak`): lo vuelve a oír.
- **Otra vez** / **Terminar**: emiten `again` / `exit`; el motor decide qué hacer.

### Reglas

| Porcentaje | Estrellas | Titular | Cara de Musubi |
|---|---|---|---|
| 100 | 3 | ¡Perfecto! 🎉 | `happy` |
| ≥ 90 | 3 | ¡Excelente! | `happy` |
| ≥ 70 | 2 | ¡Muy bien! | `happy` |
| ≥ 40 | 1 | Vas progresando | `idle` |
| < 40 | 0 | Sigue practicando | `oops` |

- **Habilidades**: el desglose solo se ve con más de una habilidad. Barra verde ≥ 80 %, dorada 60–79 %, roja < 60 %.
- **Refuerza**: la peor habilidad (la primera de `skillBreakdown`), solo con `lessonId`, más de una habilidad y nota < `WEAK_SKILL_MAX_PERCENT` (**80**).
- **Granos**: el texto «5 por cada acierto y 5 por terminar» está escrito en la plantilla; si cambian `GRAINS_PER_CORRECT` o `GRAINS_FOR_FINISHING` en `pet.service.ts`, hay que cambiarlo a mano.

### Datos guardados

Ninguno. Lee `nihongo:pet` a través de `petSVC.state()` para enseñar los granos totales.

---

## Recorrido del código paso a paso

Todo está en [result-screen.component.ts](../../src/app/components/result-screen/result-screen.component.ts) como `computed` sobre `result()`; los nombres son buscables.

### 1. Cifras

1. **`percent`**: aciertos / registros, redondeado. Los registros ya vienen con un solo intento por pregunta (`firstAttempts` del motor), así que las preguntas repetidas no inflan la nota.
2. **`stars`** y **`headline`**: según la [tabla](#reglas).
3. **`durationText`**: `durationMs` como «45s» por debajo de un minuto y «m:ss» desde ahí.

### 2. Musubi

**`cheerMessage`**: un mensaje por tramo de porcentaje. Entre 90 y 99 cuenta los errores («Solo se te escapó una» / «se te escaparon N»). Va dentro de `app-musubi-say` con la cara de la [tabla](#reglas).

### 3. Habilidades

1. **`skills`** = `skillBreakdown(records)`: agrupa por habilidad (`skillOf` la deduce del tipo de pregunta) y ordena de peor a mejor nota (a igual nota, la de más preguntas primero).
2. **`skillLabel`** traduce el id (`meaning` → «Significado»…).
3. **`weakestSkill`**: la primera de `skills` si cumple las [reglas](#reglas); si no, `null` y no se pinta el atajo.

### 4. Errores

**`mistakes`**: los registros con `correct: false`. Por cada uno se pinta la etiqueta, el enunciado (**`promptOf`**), la respuesta correcta (**`answerOf`**: `answer`, `answers[0]`, las fichas unidas con espacios o el `target` de pronunciación) y, si `given` no es «—» (pregunta saltada), «tu respuesta». Sin errores se ve «¡Sin errores! 完璧 (kanpeki)».

### Estilos

[result-screen.component.scss](../../src/app/components/result-screen/result-screen.component.scss): la tarjeta de granos (`.reward`) y el botón de dar de comer usan los tonos dorados (`--gold`, `--gold-soft`); las estrellas encendidas entran con la animación `pop` escalonada 150 ms cada una (el retraso se pone en línea desde la plantilla); `.bar.low` y `.bar.mid` recolorean las barras de habilidad; `.weak` lleva un borde izquierdo rojo.
