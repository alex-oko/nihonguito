# Números y tiempo (`/tiempo`)

Pantalla de consulta y práctica de números, días de la semana, meses, fechas, horas y duraciones. Cada tema es una lista de expresiones con lectura, significado y audio lento, que se pueden marcar como repasadas, y un quiz rápido de 8 preguntas de opción múltiple. Se llega desde el [hub de kana](../kana/kana.md). Todos los datos están dentro del propio componente (`TOPICS`).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [time.component.ts](../../../src/app/views/time/time.component.ts) | Datos de los temas (`TOPICS`), marcas de repasado y quiz |
| [time.component.html](../../../src/app/views/time/time.component.html) | Cabecera, pestañas, explicación del tema, lista de estudio, pregunta y resultado |
| [time.component.scss](../../../src/app/views/time/time.component.scss) | Estilos por sección |
| [time.interface.ts](../../../src/app/interfaces/time.interface.ts) | `TopicId`, `TimeEntry`, `TimeTopic` |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `addXp` en cada acierto |
| [storage.utils.ts](../../../src/app/utils/storage.utils.ts) | `persisted` para las marcas de repasado |

Componente que usa: `app-speak` (con `[slow]="true"`).

### Temas

| `id` | Pestaña | Expresiones | Ejemplos |
|---|---|---|---|
| `numbers` | 数 Números | 14 | 一 いち 1, 百 ひゃく 100 (nota: さんびゃく, ろっぴゃく, はっぴゃく) |
| `week` | 曜 Días | 7 | 月曜日 げつようび lunes |
| `months` | 月 Meses | 12 | 四月 しがつ abril |
| `dates` | 日 Fechas | 14 | 一日 ついたち día 1, 二十日 はつか día 20 |
| `clock` | 時 Horas y expresiones | 12 | 今日 きょう hoy, 七時半 しちじはん 7:30 |
| `duration` | 間 Duraciones | 8 | 九時から五時まで de 9 a 5 |

Cada tema trae una frase de explicación (`intro`) que se ve encima de la lista.

### Qué hace el usuario

- **Pestañas**: cambian de tema. Si había un quiz a medias, se abandona y vuelve a la lista.
- **Lista de estudio**: cada expresión muestra el japonés, la lectura en kana, el significado y, a veces, una nota.
  - **○ / ✓**: marca o desmarca la expresión como repasada. El borde de la tarjeta se pone verde.
  - **Altavoz**: lee la expresión despacio (lee la lectura en kana, no el kanji).
- **Practicar <tema>**: empieza el quiz.
- **Quiz**: «PREGUNTA n / 8», la expresión y su lectura, y 4 significados.
  - Al tocar uno se bloquean las opciones: la correcta en verde y, si fallaste, la tuya en rojo, con «正解 · ¡Correcto!» o «La respuesta es: …».
  - **Siguiente** (o **Ver resultado** en la última).
- **Resultado**: aciertos sobre el total, **Otra vez** (nuevo quiz del mismo tema) o **Volver a estudiar**.

### Reglas

- **Quiz**: `QUIZ_LENGTH` (**8**) expresiones del tema al azar (todas si el tema tiene menos, como Duraciones con 8).
- **Opciones**: la correcta + `WRONG_CHOICES` (**3**) significados de otras expresiones del mismo tema, todo barajado.
- **Acierto**: +1 punto, la expresión queda marcada como repasada y `XP_PER_ANSWER` (**2**) XP. El fallo no resta nada ni desmarca.
- Solo cuenta el primer toque de cada pregunta.
- El contador «n/total repasados» es del tema actual.
- **No usa Leitner**: estas expresiones no entran en `mastery` ni en los repasos.

### Datos guardados

- `nihongo:time-seen`: objeto `{ "<tema>:<jp>": true/false }` con las marcas de repasado. Lo escribe esta vista con `persisted`, que lo guarda solo en cada cambio.
- XP y racha a través de `ProgressService.addXp`.

---

## Recorrido del código paso a paso

Todo está en [time.component.ts](../../../src/app/views/time/time.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta `/tiempo` carga `TimeComponent` (selector `app-time-hub`).
2. Signals iniciales: `topicId = 'numbers'`, `quiz = false`.
3. **`seen`** = `persisted('time-seen', {})`: lee `nihongo:time-seen` y registra un `effect` que lo guarda en cada cambio.

### 2. Cadena de `computed`

1. **`topic`**: el `TimeTopic` de `TOPICS` con `id === topicId()`.
2. **`masteredCount`**: expresiones del tema con `isSeen`.
3. **`current`**: `quizItems()[quizIndex()]`, o `null` cuando ya se respondieron todas. Ese `null` es lo que hace que la plantilla pase a la pantalla de resultado.
4. **`choices`**: sin pregunta, `[]`. Si no, los significados (`es`) de las demás expresiones del tema, barajados con `sort(() => Math.random() - 0.5)`, los 3 primeros, más el correcto, y otra vez barajado.

### 3. Estudio

- **`choose(id)`**: `topicId.set(id)` y `quiz.set(false)`.
- **`isSeen(entry)`**: `seen()['<topicId>:<jp>']`.
- **`toggleSeen(entry)`**: invierte esa clave con `seen.update`.

### 4. Quiz

1. **`startQuiz()`**: baraja una copia de las expresiones, toma `QUIZ_LENGTH`, reinicia `quizIndex`, `score` y `feedback`, y `quiz.set(true)`.
2. **`answer(value)`**:
   - Sale si no hay pregunta o si `feedback` ya tiene valor (ya respondió).
   - `feedback.set(value)`: bloquea las opciones y enseña el resultado.
   - Si `value === question.es`: `score + 1`, marca `seen` y `progressSVC.addXp(XP_PER_ANSWER)`.
3. **`next()`**: `quizIndex + 1` y `feedback = null`. Tras la última, `current()` es `null` → resultado.
4. **Volver a estudiar**: `quiz.set(false)` directo en la plantilla.

### 5. Salida

Nada que limpiar: el `effect` de `persisted` se destruye con el componente.

### Estilos

[time.component.scss](../../../src/app/views/time/time.component.scss), por secciones:

- **Cabecera**: `.seal`, el sello 時 con esquinas asimétricas (`border-radius: 18px 4px`).
- **Pestañas y explicación**: `.mission` es una rejilla de dos columnas (nombre y progreso arriba, `intro` ocupando todo el ancho debajo).
- **Lista de estudio**: `.entry.seen` cambia el borde a verde.
- **Quiz**: `.answers` en dos columnas; `.correct` / `.wrong` colorean las opciones.
- **Móvil estrecho** (≤ 420 px): opciones en una columna y glifo más pequeño.
