# Práctica de kana (`/kana/:script/practica/:mode`)

Quiz de kana. Esta vista solo **elige y genera las preguntas** según el modo y las filas elegidas; el quiz en sí (preguntas, respuestas, puntuación, XP, cajas de Leitner, pantalla de resultado) lo pinta `app-question-runner`. Las preguntas salen de [questions.utils.ts](../../../src/app/utils/questions.utils.ts) y los kana de [kana.utils.ts](../../../src/app/utils/kana.utils.ts) ([su doc](../../utils/kana.utils.md)). Forma parte del [hub de kana](kana.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kana-practice.component.ts](../../../src/app/views/kana/views/kana-practice/kana-practice.component.ts) | Título por modo y `build()`, que genera las preguntas |
| [kana-practice.component.html](../../../src/app/views/kana/views/kana-practice/kana-practice.component.html) | Solo `<app-question-runner>` |
| [kana-practice.component.scss](../../../src/app/views/kana/views/kana-practice/kana-practice.component.scss) | Vacío: sin estilos propios |
| [question-runner.component.ts](../../../src/app/components/question-runner/question-runner.component.ts) | El quiz: preguntas, respuestas, XP, Leitner y resultado |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `kanaQuestions`, `lookalikeQuestions`, `loanwordQuestions`, `katakanaFromWords` |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `allWords()`: vocabulario de las lecciones (modo `loanwords`) |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `mastery()` (modo `weak`) |

La ruta lleva `data: immersive` (sin barra de pestañas). Se llega desde la [tabla](kana-chart.md), el [hub](kana.md) («Practicar» con tus filas) y el [laboratorio](katakana-lab.md).

### Modos (`:mode`)

| Modo | Título (`TITLES`) | Qué pregunta | Usa `rows` |
|---|---|---|---|
| `mixed` | Quiz mixto | Un modo al azar en cada pregunta (leer, reconocer, escribir, escuchar) | Sí |
| `read` | Leer kana | Kana → elegir el romaji | Sí |
| `recognize` | Reconocer kana | Romaji → elegir el kana | Sí |
| `listen` | Escuchar kana | Audio → elegir el kana | Sí |
| `type` | Escribir romaji | Kana → escribir el romaji | Sí |
| `lookalikes` | Símbolos parecidos | Romaji → elegir entre símbolos que se confunden | No |
| `loanwords` | Palabras en katakana | Préstamos en katakana: leer o escribir | No |
| `weak` | Tus símbolos difíciles | Quiz mixto con los símbolos más flojos | No |

Un modo desconocido usa el título «Kana». El título acaba en «· カタカナ» o «· ひらがな».

### Qué hace el usuario

- Responde el quiz (lo gestiona `app-question-runner`).
- **Otra vez** (en el resultado): emite `again` y la vista llama a `build()`, que genera preguntas nuevas.

### Reglas

- **Número de preguntas**:
  - Modos normales: dos por símbolo elegido, entre `MIN_QUESTIONS` (**12**) y `MAX_QUESTIONS` (**24**). Con 5 símbolos, 12; con 15, 24.
  - `lookalikes` y `loanwords`: `SPECIAL_MODE_QUESTIONS` (**14**).
  - `weak`: `WEAK_MODE_QUESTIONS` (**16**) sobre los `WEAK_KANA_COUNT` (**12**) símbolos más flojos.
- **Más flojos** (`weak`): todos los kana del silabario salvo los extranjeros, ordenados por caja de Leitner ascendente (los no vistos cuentan como `-1` y van primero).
- Sin `rows` (o vacío), los modos normales usan el silabario entero.

### Datos guardados

Esta vista no guarda nada. `app-question-runner` registra cada respuesta en `nihongo:mastery` (clave `k:<carácter>`) y la XP y estadísticas a través de `ProgressService`.

---

## Recorrido del código paso a paso

Todo empieza en [kana-practice.component.ts](../../../src/app/views/kana/views/kana-practice/kana-practice.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta carga `KanaPracticeComponent`; `:script` → `script`, `:mode` → `mode`, `?rows=` → `rows`.
2. **`title`** (`computed`): `TITLES[mode]` (o «Kana») + «· カタカナ» / «· ひらがな».
3. **`constructor`**: un `effect` que lee `script()`, `mode()` y `rows()` y llama a `build()` dentro de `untracked`. El `untracked` evita que los signals que `build` lee por dentro (como `mastery`) se vuelvan dependencias: si no, cada respuesta (que cambia `mastery`) regeneraría las preguntas a mitad del quiz.

### 2. Generar las preguntas

**`build()`** (async, también la llama «Otra vez»):

1. Parte `rows` por comas → `rowIds` (o `undefined`) y saca `list = allKana(script, rowIds)`.
2. Según `mode`:
   - **`lookalikes`** → `lookalikeQuestions(script, 14)`: elige grupos de `*_LOOKALIKES` al azar; pregunta el romaji y ofrece como opciones los símbolos del grupo (más otros parecidos si el grupo es pequeño).
   - **`loanwords`** → `await lessonSVC.allWords()` (si falla, `[]`), `katakanaFromWords(words)` saca las palabras de las lecciones cuya lectura es katakana, y `loanwordQuestions(14, extra)` las junta con `LOANWORDS`, quita duplicados y genera 14 preguntas (una de cada tres es de escribir).
   - **`weak`** → `shuffle` de todos los kana no extranjeros y luego `sort` por caja. Se baraja antes para que los empates (por ejemplo, todos los no vistos) no salgan siempre en el orden de la tabla. Toma 12 y llama a `kanaQuestions(weakest, 'mixed', 16, script)`.
   - **Cualquier otro** → `kanaQuestions(list, mode, max(12, min(24, list.length * 2)), script)`. `kanaQuestions` baraja la lista en rondas hasta llegar al número pedido y, en `mixed`, elige un modo al azar por pregunta.
3. `questions.set(...)`. `app-question-runner` reinicia la sesión cada vez que recibe una lista nueva.

### 3. Salida

Nada que limpiar en esta vista. `app-question-runner` se encarga de lo suyo.

### Estilos

Sin estilos propios: [kana-practice.component.scss](../../../src/app/views/kana/views/kana-practice/kana-practice.component.scss) solo lleva un comentario.
