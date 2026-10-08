# Juegos (`/juego/:game`)

Una sola vista para los cuatro juegos de la sección «Juegos» de [Practicar](../practice/practice.md): **Parejas**, **Contrarreloj**, **Ordena la frase** y **Oído fino**. Primero pide con qué lecciones jugar y luego genera el contenido y monta el componente del juego: [`app-match-game`](../../components/match-game.md), [`app-speed-game`](../../components/speed-game.md) o [`app-question-runner`](../../components/question-runner.md).

El Contrarreloj de kana (`?kana=…`) se salta el selector de lecciones y arranca directo con kana.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [game-host.component.ts](../../../src/app/views/game-host/game-host.component.ts) | Lecciones elegidas, generación del contenido de cada juego |
| [game-host.component.html](../../../src/app/views/game-host/game-host.component.html) | Selector de lecciones o el componente del juego |
| [game-host.component.scss](../../../src/app/views/game-host/game-host.component.scss) | Solo el margen del botón «Jugar» |
| [lesson-picker.component.ts](../../../src/app/components/lesson-picker/lesson-picker.component.ts) | Selector de lecciones (`[(selected)]`) |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `getMany(ids)` y `index()`: las lecciones |
| [lesson-content.utils.ts](../../../src/app/utils/lesson-content.utils.ts) | `studyWords`, `lessonSentences`, `prioritize` |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `vocabQuestions`, `sentenceQuestions`, `kanaQuestions`, `knownStems`, `wordMain`, `wordReading` |
| [kana.utils.ts](../../../src/app/utils/kana.utils.ts) | `allKana(script, rowIds)` |

La ruta ([app.routes.ts](../../../src/app/app.routes.ts)) es `juego/:game` con `data: immersive` (oculta la barra de pestañas). Gracias a `withComponentInputBinding`, `:game` llega al input `game` y los query params `kana` y `rows` a los inputs del mismo nombre.

**Quién enlaza aquí**: las tarjetas de juegos de [Practicar](../practice/practice.md) (`/juego/<id>`), el botón Contrarreloj de la [tabla de kana](../kana/kana-chart.md) (`/juego/contrarreloj?kana=<silabario>&rows=<filas>`) y el laboratorio de katakana (`?kana=katakana`).

### Qué hace el usuario

- **Selector de lecciones** (sin `?kana`): marca lecciones y pulsa **Jugar** (desactivado sin lecciones o mientras carga, con «Preparando…»). La flecha vuelve atrás.
- **Jugar**: aparece el juego. Las salidas, «Otra vez» y el final las gestiona cada componente:
  - Parejas y Ordena / Oído fino: «Otra vez» → **`start`** (contenido nuevo con las mismas lecciones).
  - Contrarreloj: «Otra vez» → **`rebuildSpeed`**.

### Reglas

| Juego (`:game`) | Componente | Contenido |
|---|---|---|
| `parejas` | `app-match-game` | 15 palabras (`MATCH_WORD_COUNT`) priorizadas → 3 rondas de 5. Izquierda: forma con kanji; derecha: significado corto (`shortEs`, sin paréntesis); se lee la lectura |
| `contrarreloj` (vocabulario) | `app-speed-game` | 60 palabras priorizadas (`SPEED_WORD_COUNT`) → 90 preguntas (`SPEED_QUESTION_COUNT`) de significado y «al japonés», barajadas; solo las de opción múltiple |
| `contrarreloj` con `?kana` | `app-speed-game` | 120 preguntas (`KANA_SPEED_QUESTION_COUNT`) de leer kana de las filas de `rows`; con menos de 4 kana (`MIN_KANA_COUNT`), el silabario básico |
| `ordenar` | `app-question-runner` | 10 frases (`ORDER_QUESTION_COUNT`) de las lecciones elegidas para ordenar |
| `escucha` | `app-question-runner` | 8 palabras de escucha (`LISTEN_WORD_COUNT`) + 6 frases de escucha (`LISTEN_SENTENCE_COUNT`), barajadas |
| otro valor | `app-question-runner` | Título de Parejas por defecto y ningún contenido: «No hay ejercicios para esta selección» |

- **Priorizar** (`prioritize`): baraja y ordena por puntuación: palabra nunca vista 1–2; vista, +2 si toca repaso, +0,5 por cada caja de Leitner por debajo de 5, + azar. Se queda con las N primeras.
- **Kanji**: los juegos usan siempre la forma con kanji (`USE_KANJI = true`), sin mirar el ajuste de escritura.
- **Récord del contrarreloj**: uno por silabario y otro de vocabulario (`speedKey`: `speed-hiragana`, `speed-katakana`, `speed-vocab`).
- **Primera visita**: si no hay lecciones guardadas, se preseleccionan de la 1 a la última abierta (`lastLesson`, mínimo 1).

### Datos guardados

- `nihongo:gameLessons` (`SELECTED_LESSONS_KEY`, directo con `loadRaw` / `save`): las lecciones elegidas. Se lee al entrar y se guarda en cada **Jugar**.
- Lee `nihongo:lastLesson` y `nihongo:mastery` a través de [`ProgressService`](../../services/progress.service.md).
- El progreso del juego lo guarda cada componente (ver sus docs).

---

## Recorrido del código paso a paso

Todo empieza en [game-host.component.ts](../../../src/app/views/game-host/game-host.component.ts); los nombres son buscables.

### 1. Arranque

1. **Campos**: `selectedLessons` se inicializa con `loadRaw('gameLessons', [])`.
2. **`constructor`**:
   1. Sin lecciones guardadas, preselecciona `1…lastLesson().id`.
   2. Un `effect` lee `kana()` y `game()`. Con `kana`, llama a **`rebuildSpeed`** y pone `isStarted = true` (en `untracked`, para no suscribirse a lo que toca). Sin `kana` no hace nada: se queda el selector.
3. **Plantilla**: sin `isStarted`, el selector con `info()` (título y descripción de `GAME_INFO`, o los de Parejas si el juego no existe); con `isStarted`, el `@switch` por `game()`.

### 2. Contrarreloj de kana

**`rebuildSpeed()`** con `kana`:

1. `rows` se parte por comas → `allKana(script, rowIds)`: los kana de esas filas.
2. Con menos de 4, `allKana(script)` filtrado al grupo `basic`.
3. `kanaQuestions(lista, 'read', 120, script)` y se queda con las de opción múltiple → `choiceQuestions`.

Sin `kana`, `rebuildSpeed` delega en **`start`** (contrarreloj de vocabulario).

### 3. Jugar con lecciones

**`start()`** (público, también desde «Otra vez»):

1. Sin lecciones elegidas, sale. Si no, guarda la selección, `isLoading = true` y `lessonSVC.getMany(ids)`.
2. **`studyWords`** junta el vocabulario sin nombres propios (si quedan menos de 4, usa todo). **`lessonSentences`** junta patrones, ejemplos, gramática, conversaciones y frases, sin repetidos.
3. Según el juego ([tabla](#reglas)):
   - **Parejas**: `prioritize(words, progressSVC, 15)` → un `MatchPair` por palabra con `track: 'w:<id>'`.
   - **Contrarreloj**: `vocabQuestions(prioritizadas, ['meaning', 'reverse'], 90, words, true)`, barajadas y filtradas a `choice`.
   - **Ordenar**: carga además todas las lecciones hasta la más alta elegida (`lessonSVC.index()`) para calcular `knownStems` (las formas de las palabras ya vistas). Luego `sentenceQuestions(sentences, ['order'], 10, stems)`, que elige frases al azar sin repetir y las parte en fichas. Ojo: `sentenceQuestions` solo usa `known` en el modo `particle`, así que con `['order']` esa segunda carga hoy no cambia el resultado.
   - **Oído fino**: `vocabQuestions(…, ['listen'], 8, …)` + `sentenceQuestions(sentences, ['listen'], 6, new Set())`, barajadas.
4. `isLoading = false` e `isStarted = true`.

Cada juego toma el control desde ahí: ver [Parejas](../../components/match-game.md), [Contrarreloj](../../components/speed-game.md) y el [motor de preguntas](../../components/question-runner.md).

### 4. Salida

No hay `ngOnDestroy`: la vista no tiene timers propios. Los de cada juego los limpian sus componentes.

### Estilos

[game-host.component.scss](../../../src/app/views/game-host/game-host.component.scss) solo separa el botón «Jugar» del selector. El resto (`.page`, `.topbar`, `.section-title`) son estilos globales.
