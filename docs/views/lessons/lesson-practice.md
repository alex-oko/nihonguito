# Práctica de una lección (`/lecciones/:id/practica/:mode`)

Pantalla a pantalla completa que arma un ejercicio de la lección según el modo de la ruta (tarjetas, parejas, sesión guiada, prueba final…) y se lo pasa al componente que lo juega. No pinta nada propio: decide **qué preguntas** van y **cuál** de los tres reproductores las enseña.

Se entra desde las baldosas de la [ficha de la lección](lesson-detail.md), desde el inicio y desde Practicar («tu punto flojo»). Las palabras salen de [lesson-content.utils](lesson-content-utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [lesson-practice.component.ts](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.ts) | Carga la lección y las anteriores, y arma la práctica del modo (`build`) |
| [lesson-practice.component.html](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.html) | `@switch` del modo: `app-flashcards`, `app-match-game` o `app-question-runner` |
| [lesson-practice.component.scss](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.scss) | Vacío (solo un comentario): cada reproductor trae sus estilos |
| [lesson-content.utils.ts](../../../src/app/utils/lesson-content.utils.ts) | `studyWords`, `prioritize`, `lessonSentences` ([su doc](lesson-content-utils.md)) |
| [guided-session.utils.ts](../../../src/app/utils/guided-session.utils.ts) | `guidedSession`, `modelSentences`, `grammarPractice`, `advanceGrammar` |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `vocabQuestions`, `sentenceQuestions`, `knownStems`, `wordMain`, `wordReading` ([su doc](../../utils/questions.utils.md)) |
| [interests.utils.ts](../../../src/app/utils/interests.utils.ts) | `forYou`, `weighByInterest` |
| [question-runner.component.ts](../../../src/app/components/question-runner/question-runner.component.ts) | Juega las preguntas y guarda el acierto de la lección ([su doc](../../components/question-runner.md)) |

La ruta lleva `data: immersive`: se oculta la barra de pestañas de la app.

### Qué hace el usuario

Lo que se ve depende del modo (`:mode`):

| Modo | Título | Componente | Qué se arma |
|---|---|---|---|
| `learn` | Tarjetas | `app-flashcards` | 10 palabras |
| `match` | Parejas | `app-match-game` | 15 parejas palabra ↔ significado |
| `guided` | Sesión guiada | `app-question-runner` | `guidedSession`: 5 palabras + gramática del día + frases |
| `sentences` | Frases completas | `app-question-runner` | 10 preguntas de ordenar, partícula, significado, escucha y pronunciar sobre las frases modelo |
| `grammar` | Gramática | `app-question-runner` | 2 ejercicios por punto de gramática (`grammarPractice`) |
| `order` | Ordenar frases | `app-question-runner` | 10 de ordenar |
| `particles` | Partículas | `app-question-runner` | 10 de partícula |
| `test` | Prueba final | `app-question-runner` con `final` | 10 de vocabulario + 6 de frases + 2 de pronunciar, mezcladas |
| `meaning`, `reverse`, `listen`, `write`, `speak` | Significado, Al japonés, Escucha, Escribir, Pronunciar | `app-question-runner` | 12 preguntas de ese tipo |

- El título es «Lección N · *modo*» (`MODE_TITLES`); un modo desconocido dice «Práctica».
- **Otra vez** (evento `again` de cualquiera de los tres): vuelve a llamar a `build()` y arma una ronda nueva.
- Mientras la lección carga, la pantalla está vacía.

### Reglas

- **Qué palabras se practican** (`studyWords`): sin nombres propios, salvo que queden menos de 4. En `write` y `speak`, además, sin palabras con marcadores como `～`.
- **Cuáles primero** (`prioritize`): las que toca repasar hoy, después las de caja baja y las nuevas, con algo de azar.
- **Frases**: las de la lección (`lessonSentences`) más las extras de tus intereses (`forYou`). `weighByInterest` repite **3 veces** las de tus intereses para que salgan más.
- **Partículas**: para saber si el final de un bloque (`わたしは`) es una partícula o parte de la palabra, `particleQuestion` comprueba que lo de delante sea una palabra conocida (`knownStems`: vocabulario de esta lección y de las anteriores), o que acabe en kanji, katakana, ん o さん. Por eso se cargan todas las lecciones hasta la actual.
- **Sesión guiada**: cada vez que se termina, la lección avanza **2** puntos de gramática (`GRAMMAR_PER_SESSION`) y la siguiente sesión enseña los dos siguientes (da la vuelta al final).
- **Prueba final**: `final = true` hace que `question-runner` guarde la nota en `lessonBest`. Con **80%** la lección cuenta como dominada en la [lista](lessons.md#reglas).

### Datos guardados

- Esta vista solo escribe `nihongo:guided` (cursor de gramática por lección), vía `advanceGrammar`.
- Los reproductores guardan el resto a través de [`ProgressService`](../../services/progress.service.md): `nihongo:mastery` (cajas de Leitner de cada palabra `w:<id>`), `nihongo:lessonSkills` (acierto por habilidad, porque reciben `lessonId`) y, en la prueba, `nihongo:lessonBest`.

---

## Recorrido del código paso a paso

Todo empieza en [lesson-practice.component.ts](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.ts). Los nombres se pueden buscar tal cual.

### 1. Arranque

1. **Ruta**: `id` y `mode` llegan como `input` por `withComponentInputBinding`. `lessonId` es `Number(id)`; `title` sale de `MODE_TITLES`.
2. **`constructor`**: un `effect` lee `lessonId()` y `mode()` y llama a **`loadLesson(id)`** en `untracked`. Así, pasar de un modo a otro sin salir del componente (por ejemplo, el botón de flashcards que lleva a `practica/meaning`) vuelve a cargar y armar.

### 2. Carga de datos

**`loadLesson(id)`**:

1. `lessonSVC.get(id)`: la lección.
2. `lessonSVC.loadIndex()` y `lessonSVC.getMany(…)` con todos los ids `<= id`: la lección y las anteriores (la 0 incluida).
3. **`knownStems`** sobre el vocabulario de todas ellas → `knownWordStems`: las formas de palabra que el alumno ya vio.
4. `lesson.set(lesson)` y **`build()`**.

### 3. Armado de la práctica

**`build()`**:

1. Sale si no hay lección.
2. `words = studyWords(lesson.vocab)`.
3. `sentences = weighByInterest([...lessonSentences(lesson), ...forYou(lesson, intereses)], intereses)`.
4. `switch (mode)` según la [tabla](#qué-hace-el-usuario). Cada rama llena **uno** de los tres signals: `questions`, `cards` o `pairs`.
   - `guided`: `guidedSession(lesson, prioritize(words, 5), words, knownWordStems, dayNumber, intereses)`. `dayNumber` (días desde 1970, con `MS_PER_DAY`) elige el consejo de estudio de la tarjeta inicial: cambia una vez al día.
   - `match`: cada pareja lleva `left` (palabra con kanji), `right` (`shortEs` del significado), `speak` (lectura) y `track` = `w:<id>`, para que el juego registre la palabra en Leitner.
   - `test`: tres bloques con `vocabQuestions` y `sentenceQuestions`, mezclados con `shuffle`.
   - `default` (modos de vocabulario): `studyWords(lesson.vocab, mode)` para filtrar palabras escribibles en `write` / `speak`.

`useKanji` está fijo a `true`: las preguntas usan la forma con kanji y `app-jp` decide cómo enseñarla según los ajustes de escritura.

### 4. Al terminar

**`done()`** recibe el evento `finished` de `app-question-runner`. Solo hace algo en `guided`: **`advanceGrammar(lesson)`** suma `GRAMMAR_PER_SESSION` al cursor de esa lección en `nihongo:guided`. El resto de la puntuación la guarda el propio runner.

### 5. Salida

No hay nada que limpiar en esta vista; cada reproductor detiene su audio al destruirse.

### Estilos

[lesson-practice.component.scss](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.scss) está vacío a propósito: toda la pantalla la pinta el componente del modo.
