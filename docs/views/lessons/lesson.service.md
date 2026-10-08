# `LessonService`

Pide los datos de las lecciones y del apéndice a `public/data/` y los guarda en memoria para que cada archivo se descargue una sola vez por sesión. No guarda nada en `localStorage` ni sabe nada del progreso del usuario: eso es de [`ProgressService`](../../services/progress.service.md).

Lo usan casi todas las vistas (lecciones, conversaciones, verbos, exámenes, juegos, repaso, inicio, kana, Musubi) y varios servicios (`ExamService`, `LevelExamService`, `ReadinessService`, `ReadingService`). El formato de lo que devuelve está en [lesson-data.md](../../core/lesson-data.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `loadIndex`, `get`, `getMany`, `allLessons`, `allWords`, `appendix` |
| [lesson.interface.ts](../../../src/app/interfaces/lesson.interface.ts) | `Lesson`, `LessonMeta`, `Word`, `Appendix`… |
| `public/data/lessons/index.json` | Índice: un `LessonMeta` por lección (lo genera `tools/build-data.mjs`) |
| `public/data/lessons/NN.json` | Una lección completa (`00.json` … `25.json`) |
| `public/data/appendix.json` | Gramática general, tablas de palabras y verbos conjugados |

### Estado

| Miembro | Qué guarda | Quién lo escribe | Quién lo lee |
|---|---|---|---|
| `index` (signal público) | `LessonMeta[]`; vacío hasta que termina `loadIndex()` | `loadIndex` | Plantillas de la lista de lecciones, la ficha (flechas) y `app-lesson-picker` |
| `cache` | `Map<id, Promise<Lesson>>` | `get` | `get` |
| `indexPromise` | La promesa del índice | `loadIndex` | `loadIndex` |
| `appendixPromise` | La promesa del apéndice | `appendix` | `appendix` |

Todo vive en memoria: al recargar la página se vuelve a pedir (el service worker lo sirve de su caché).

### Reglas

- **Se guardan promesas, no resultados.** Si dos vistas piden la misma lección a la vez, comparten la misma petición en vuelo.
- **Un fallo no se queda en caché**: si `get` falla, su promesa se borra de `cache` para que el siguiente intento vuelva a pedirla.
- **Nombre del archivo**: el id con dos cifras (`3` → `03.json`).
- `get` lanza `Error('not found')` si la respuesta no es `ok` (por ejemplo, `/lecciones/99`). El índice y el apéndice no comprueban `ok`.

---

## Recorrido paso a paso

### 1. Índice

1. Una vista llama a **`loadIndex()`** (lista de lecciones, ficha, selector de lecciones, exámenes…).
2. La primera vez, `fetch(INDEX_URL)` → JSON → `index.set(…)` y la promesa queda en `indexPromise` (`??=`). Las siguientes llamadas devuelven esa misma promesa.
3. Las plantillas leen `lessonSVC.index()` y se repintan solas cuando llega.

### 2. Una lección

1. **`get(id)`** busca la promesa en `cache`.
2. Si no está: `fetch('data/lessons/NN.json')`, comprueba `ok` y la guarda en `cache`. Engancha un `catch` que la borra de `cache` si falla.
3. Devuelve la promesa (del caché o nueva).

### 3. Varias lecciones

- **`getMany(ids)`**: `Promise.all` de `get` por cada id; el orden del resultado es el de `ids`.
- **`allLessons()`**: `loadIndex()` y después `getMany` con todos los ids del índice.
- **`allWords()`**: `allLessons()` y aplana los `vocab`.

### 4. Apéndice

**`appendix()`**: igual que el índice, una sola petición a `APPENDIX_URL` guardada en `appendixPromise`.

## Métodos

### Lecciones

#### `loadIndex()`

- **Qué hace**: carga el índice de lecciones y lo deja en `index`.
- **Devuelve**: `Promise<LessonMeta[]>`.
- **Quién lo llama**: [lessons](lessons.md), [lesson-detail](lesson-detail.md), [lesson-practice](lesson-practice.md), [lesson-picker](../../components/lesson-picker.md), exámenes, inicio, Musubi.

#### `get(id)`

- **Qué hace**: devuelve una lección completa.
- **Cómo**: caché de promesas por id; si falla, se saca del caché.
- **Devuelve**: `Promise<Lesson>`; rechaza con `not found` si el archivo no existe.
- **Quién lo llama**: la ficha, la práctica y el [reproductor de conversaciones](../conversations/conversation-player.md).

#### `getMany(ids)`

- **Qué hace**: varias lecciones en paralelo.
- **Quién lo llama**: la práctica (lecciones hasta la actual), `ReadinessService`, `ExamService`, `LevelExamService`, juegos, inicio.

#### `allLessons()`

- **Qué hace**: todas las lecciones del índice.
- **Quién lo llama**: la [lista de conversaciones](../conversations/conversations.md).

#### `allWords()`

- **Qué hace**: el vocabulario de todas las lecciones en una lista.
- **Quién lo llama**: `ReadingService` (tabla kanji → kana para calificar respuestas), el repaso y la práctica de kana.

### Apéndice

#### `appendix()`

- **Qué hace**: carga `data/appendix.json`.
- **Devuelve**: `Promise<Appendix>` con `grammar`, `tables` y `verbs`.
- **Quién lo llama**: [verbos](../verbs/verbs.md), [práctica de verbos](../verbs/verb-practice.md), `ExamService` y `LevelExamService` (preguntas de verbos).
