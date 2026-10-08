# Ficha de una lección (`/lecciones/:id`)

Todo lo de una lección en cinco pestañas: los ejercicios con tu acierto en cada uno, el vocabulario, la gramática, las frases y el material extra. También marca la lección como «la última abierta», que es lo que usan la [lista](lessons.md), el inicio y el selector de lecciones para saber por dónde vas.

Los datos llegan por [`LessonService`](lesson.service.md). Los ejercicios abren [lesson-practice](lesson-practice.md) y las conversaciones el [reproductor](../conversations/conversation-player.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [lesson-detail.component.ts](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.ts) | Carga la lección, calcula el plan de la sesión guiada, el informe de acierto, los filtros de palabras y las flechas |
| [lesson-detail.component.html](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.html) | Barra superior, cabecera, pestañas y un bloque por pestaña |
| [lesson-detail.component.scss](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.scss) | Pestañas pegadas arriba, piedras de la sesión guiada, baldosas de ejercicio, puntos de dominio |
| [guided-session.utils.ts](../../../src/app/utils/guided-session.utils.ts) | `nextGrammar` (qué gramática toca) y `grammarKeys` (su nombre corto) |
| [interests.utils.ts](../../../src/app/utils/interests.utils.ts) | `forYou` (frases sobre tus intereses) e `interestLabel` |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `wordMain` y `wordReading` ([su doc](../../utils/questions.utils.md)) |
| [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts) | `tone` (ok / mid / bad) y `KNOWN_BOX` |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | Ajustes, `mastery`, `lessonSkills`, `lessonBest`, `lastLesson`, `box` ([su doc](../../services/progress.service.md)) |

### Qué hace el usuario

- **Flechas de la barra superior**: lección anterior y siguiente del índice. No salen en la primera ni en la última.
- **Pestañas** (`tabs`): Ejercicios, Palabras, Gramática, Frases y Extra. Al cambiar de lección vuelve a Ejercicios. En «Extra» sale debajo una línea que dice qué hay dentro (`tabHint`).
- **Ejercicios**:
  - **Empezar sesión guiada**: abre `practica/guided`. La tarjeta enseña los pasos (`steps`) y la gramática de hoy.
  - **Baldosas de vocabulario** (7) y **de frases y gramática** (hasta 4): abren `practica/<modo>`. Cada una enseña tu acierto en ese modo, «sin probar» o una nota fija («conocer», «juego», «explicada»). La del modo más flojo lleva la marca «Refuerza».
  - **Se te escapan**: hasta 4 palabras más falladas; tocar una la lee en voz alta.
  - **Conversación: …**: abre el reproductor.
  - **Prueba de la lección**: abre `practica/test`; si ya la hiciste, enseña tu mejor nota con su color.
- **Palabras**:
  - Chips de tipo (`typeFilters`): solo salen los tipos que la lección tiene.
  - Escritura (Solo kana / Kanji + furigana / Kanji) y casilla de romaji: cambian los **ajustes globales** del usuario, no solo esta pantalla.
  - Tocar una palabra la lee. El punto de la izquierda dice cuánto la dominas.
- **Gramática**: tarjetas con explicación y ejemplos con botón de audio; abajo, «Practicar esta gramática» (`practica/grammar`).
- **Frases**: tocar una frase enseña u oculta su traducción (está desenfocada). Secciones: Frases para ti, Frases modelo, Preguntas y respuestas, Frases útiles del diálogo y enlaces a las conversaciones.
- **Extra**: temas de vocabulario en acordeón (el primero abierto; tocar un elemento lo lee) y notas «Japón en la vida real».
- Si la lección no existe: «No se pudo cargar la lección.».

### Reglas

**Palabras aprendidas** (barra de la cabecera, `learned`): las que están en la caja `KNOWN_BOX` (**2**) o más.

**Punto de dominio** (`masteryBox` → `data-b`): sin ver (-1) gris; cajas 0–1 acento; 2–3 dorado; 4–6 verde.

**Acierto de cada baldosa** (`modeStat`): `correct / total` de `lessonSkills[lección][modo]`, coloreado con `tone` (≥ 80 ok, ≥ 60 mid, resto bad).

**Informe** (`report`), `null` si no se practicó nada:

1. Acierto por habilidad (`SKILLS`). Sin frases en la lección, no cuenta «Ordenar» ni «Partículas».
2. Palabras difíciles: las que tienen algún fallo, ordenadas por proporción de fallos (`wrong / seen`) y luego por número de fallos. Se enseñan `HARD_WORDS_SHOWN` (**4**).
3. `weak`: la habilidad practicada con menor acierto si baja de `WEAK_SKILL_PCT` (**80**).

**Ejercicio a reforzar** (`weakMode`): el `weak` del informe, pero solo si baja de `WEAK_MODE_PCT` (**60**).

**Plan de la sesión guiada** (`plan`): `GUIDED_WORDS` (**5**) palabras (o menos si la lección tiene menos), los puntos de gramática que devuelve `nextGrammar` y si hay frases. Cada sesión guiada terminada avanza la gramática (ver [lesson-practice](lesson-practice.md#4-al-terminar)).

**Baldosas de frases** (`sentenceModes`): «Gramática» solo si la lección tiene gramática; «Frases», «Ordenar» y «Partículas» solo si tiene `patterns`, `examples` o conversaciones (`hasSentences`).

### Datos guardados

A través de [`ProgressService`](../../services/progress.service.md):

- **Escribe** `nihongo:lastLesson` al abrir una lección numerada (la 0, de kana, no cuenta) y `nihongo:settings` (`script`, `romaji`) desde la pestaña Palabras.
- **Lee** `nihongo:mastery`, `nihongo:lessonSkills`, `nihongo:lessonBest`, `nihongo:settings` (intereses) y, vía `nextGrammar`, `nihongo:guided`.

---

## Recorrido del código paso a paso

Todo empieza en [lesson-detail.component.ts](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.ts). Los nombres se pueden buscar tal cual.

### 1. Arranque

1. **Ruta**: `lecciones/:id` llega como `input` `id` (texto) gracias a `withComponentInputBinding`. `lessonId` lo pasa a número.
2. **`constructor`**: un `effect` que lee `lessonId()` y llama a **`loadLesson(id)`** dentro de `untracked`. El `untracked` evita que los signals que lee `loadLesson` vuelvan a disparar el effect. El effect también es lo que recarga la ficha al pulsar las flechas: el componente no se destruye al pasar de `/lecciones/3` a `/lecciones/4`, solo cambia el input.
3. **Plantilla**: mientras `lesson()` es `null` enseña «Cargando…» (o el error si `hasError`).

### 2. Carga de la lección

**`loadLesson(id)`**:

1. Vacía `lesson`, `hasError`, vuelve a la pestaña `practice` y al filtro `all`.
2. `lessonSVC.get(id)`: pide `data/lessons/NN.json` (con caché).
3. Si `id >= 1`, `progressSVC.lastLesson.set({ id })`.
4. `lessonSVC.loadIndex()`, sin esperar: el índice hace falta para las flechas (`prev`, `next`).
5. Si falla la petición, `hasError = true`.

### 3. Cabecera y flechas

- **`learned`**: palabras en `KNOWN_BOX` o más → barra y «N/M palabras».
- **`prev`** / **`next`**: la posición de la lección en `lessonSVC.index()` ± 1, o `null` en los extremos.

### 4. Pestaña Ejercicios

La cadena de `computed`, en orden de dependencia:

1. **`hasSentences`**: la lección tiene `patterns`, `examples` o conversaciones.
2. **`plan`**: `nextGrammar(lesson)` da los índices de los puntos de gramática que tocan; de cada uno se enseña el primer fragmento japonés (`grammarKeys`) o, si no tiene, el título hasta « — ».
3. **`steps`**: las piedras del camino a partir del plan: «N palabras», «Gramática» (si hay), «Frases» (si hay) y siempre «Repaso». La primera lleva `.now`.
4. **`report`**: acierto por habilidad, mejor prueba y palabras difíciles ([reglas](#reglas)).
5. **`weakMode`**: el modo a marcar con «Refuerza».
6. **`sentenceModes`**: las baldosas de frases que aplican.

En cada baldosa, **`modeStat(exerciseMode)`** devuelve `{ text, tone }`: la nota fija si el modo la tiene, «sin probar» si nunca se respondió, o el porcentaje. `vocabModes` es una lista fija de 7 modos con su icono y color (`data-c`).

La tarjeta de la prueba usa **`toneOf(best)`** para colorear la nota.

### 5. Pestaña Palabras

1. **`typeFilters`**: `TYPE_FILTERS` menos los tipos sin palabras en la lección. «Todas» siempre está.
2. **`words`**: el vocabulario filtrado por `typeFilter`.
3. Por palabra: **`mainForm(word)`** (con kanji si los tiene), **`readingOf(word)`** (en kana) y **`toRomaji`** si `showRomaji()`. La lectura en kana se enseña aparte solo si la escritura es `kanji` y difiere de la forma principal (con furigana ya va encima).
4. **`setScript`** y **`toggleRomaji`** actualizan `progressSVC.settings`. Como `script` y `showRomaji` son `computed` de esos ajustes, la lista se repinta sola, y el cambio se nota en toda la app.
5. Tocar una palabra: **`say(readingOf(word))`** → `speechSVC.speak`.

### 6. Pestañas Gramática y Frases

- Gramática: `@for` sobre `grammar` con sus `examples` y `<app-speak>`.
- Frases: **`forYouList`** = `forYou(lesson, intereses)` (las `extras` con tus intereses, o todas si no elegiste ninguno). `hasInterests` cambia el texto de ayuda que enlaza a Perfil.
- **`toggleReveal(key)`** añade o quita la clave de `revealed`. Las claves llevan prefijo por sección para no chocar: `y` (para ti), `p` (modelo), `e` (preguntas). Crea un `Set` nuevo cada vez: el signal solo avisa si cambia la referencia.

### 7. Pestaña Extra

- `openTopic` guarda el tema abierto del acordeón (empieza en 0). Tocar la cabecera abierta lo cierra.
- Tocar un elemento lee `kana` (o `kanji`).

### 8. Salida

No hay nada que limpiar. Al salir, `lastLesson` ya quedó guardado.

### Estilos

[lesson-detail.component.scss](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.scss), por bloques:

- **Cabecera** y **pestañas pegadas** (`.sticky` con `position: sticky` y una sombra del color de fondo para tapar lo que pasa por debajo).
- **Palabras**: `.dot[data-b]` con los colores de la caja.
- **Frases**: `.tr.hide` desenfoca la traducción (`blur(5px)`).
- **Ejercicios**: `.stones` dibuja la sesión guiada como piedras unidas por una línea (`::before`); `.mode[data-c]` colorea el icono de cada baldosa y `.mode em[data-t]` el acierto; `.mode.weak::after` pone la etiqueta «Refuerza».
- **Pestañas con icono** (`.ltabs`): pensadas para que quepan las cinco.

Hay bloques de una versión anterior que la plantilla ya no usa (`.steps`, `.tiles`, `.tile`, `.report`, `.sk-*`…); están marcados con un comentario.
