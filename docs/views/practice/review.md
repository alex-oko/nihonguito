# Repaso espaciado (`/repaso`)

Repaso de las palabras que el usuario ya practicó. Trae primero las que **tocan hoy** según su caja de Leitner y, si son pocas, lo completa con las **más débiles**. Las preguntas las corre `app-question-runner`; cada respuesta mueve la palabra de caja y con eso decide cuándo vuelve.

Se entra desde la tarjeta «Repaso de palabras» del hub [Practicar](practice.md) y desde el inicio. Las preguntas salen de `vocabQuestions` ([questions.utils.md](../../utils/questions.utils.md#vocabquestionswords-modes-count-pool-kanji)).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [review.component.ts](../../../src/app/views/practice/views/review/review.component.ts) | `build()`: elige las palabras y arma las preguntas |
| [review.component.html](../../../src/app/views/practice/views/review/review.component.html) | `app-question-runner`, pantalla vacía o «Preparando repaso…» |
| [review.component.scss](../../../src/app/views/practice/views/review/review.component.scss) | Vacío: usa las clases globales |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `vocabQuestions` ([su doc](../../utils/questions.utils.md)) |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `mastery()` (cajas de Leitner) y `recordAnswer` (lo llama el runner) |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `allWords()`: el vocabulario de todas las lecciones |

La ruta lleva `data: IMMERSIVE`: se ve a pantalla completa, sin barra de pestañas.

### Qué hace el usuario

- **Responde** preguntas de 4 tipos al azar: significado, al japonés, escucha y escribir (escribir solo con palabras sin huecos como ～).
- **Otra vez** (al terminar): vuelve a llamar a `build()` con el progreso ya actualizado.
- **Sin palabras practicadas**: pantalla «Aún no hay palabras para repasar» con el botón **Ir a lecciones** y la flecha **Volver** (`location.back()`).

### Reglas

- **Caja de Leitner** (`ProgressService.recordAnswer`): un acierto sube una caja y un fallo baja dos (mínimo 0). Cada caja tiene su intervalo en días: `INTERVALS = [0, 1, 3, 7, 14, 30, 60]`. Solo cuenta el primer intento de cada pregunta.
- **Pendiente**: la palabra tiene `due` igual a hoy o anterior.
- Con **menos de 6** pendientes (`MIN_DUE_WORDS`) se completa hasta **12** palabras (`TOP_UP_POOL_SIZE`) con las más débiles: caja más baja primero y, a igual caja, más fallos (`wrong`).
- Se baraja el grupo y se toman **15 palabras como máximo** (`MAX_REVIEW_QUESTIONS`).
- Número de preguntas: tantas como palabras, entre **8** (`MIN_REVIEW_QUESTIONS`) y **15**. Con menos de 8 palabras alguna se pregunta dos veces.
- Título: «Repaso · N pendientes» si había pendientes; si no, «Repaso de refuerzo».

### Datos guardados

| Clave | Quién | Para qué |
|---|---|---|
| `nihongo:mastery` | `ProgressService.mastery` | Lee las claves `w:<id>` (caja, `due`, `wrong`). Las escribe `recordAnswer` desde el runner |

El repaso no pasa `lessonId` al runner: no suma a las habilidades por lección (`lessonSkills`).

---

## Recorrido del código paso a paso

Todo empieza en [review.component.ts](../../../src/app/views/practice/views/review/review.component.ts).

### 1. Arranque

- **Plantilla**: según `state()`: `'loading'` → «Preparando repaso…»; `'empty'` → pantalla vacía; `'ready'` → `<app-question-runner [questions] [title] (again)="build()">`.
- **`constructor`**: llama a `build()` sin esperar (`void`).

### 2. Armar el repaso

**`build()`**:

1. Lee `progressSVC.mastery()` y se queda con las claves `w:` (palabras). Sin ninguna: `state = 'empty'` y sale.
2. Pide `lessonSVC.allWords()` y arma un `Map` id → palabra. **`due`**: las palabras con `due <= todayKey()` (las que ya no existen en las lecciones se descartan).
3. Si hay menos de 6, añade las más débiles que no estén ya: ordena por `box` y luego por `wrong` (descendente) y toma hasta completar 12.
4. Pone el título, baraja, toma 15 y llama a **`vocabQuestions(elegidas, ['meaning', 'reverse', 'listen', 'write'], n, allWords, true)`**:
   - Repite las palabras barajadas en rondas hasta llegar a `n`.
   - Para cada una elige un modo al azar; `write` solo si la palabra es «limpia» (`isPlainWord`).
   - Los distractores salen de **todo** el vocabulario (`allWords`), con kanji.
   - Cada pregunta lleva `track: { kind: 'word', id }`, que el runner convierte en la clave `w:<id>` para `recordAnswer`.
5. `state = 'ready'`.

### 3. Repetir

El runner emite `again` en «Otra vez» y la plantilla llama a `build()` otra vez. Como las cajas ya cambiaron, salen otras palabras pendientes.

### 4. Salida

No hay nada que limpiar: ni timers ni suscripciones. El audio y el micrófono son del runner.

### Estilos

[review.component.scss](../../../src/app/views/practice/views/review/review.component.scss) está vacío. La pantalla vacía usa clases globales (`.page`, `.topbar`, `.empty`, `.glyph`, `.btn`) y un `style="margin-top: 20px"` en línea en el botón.
