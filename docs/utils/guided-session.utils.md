# Utils de la sesión guiada (`guided-session.utils.ts`)

[guided-session.utils.ts](../../src/app/utils/guided-session.utils.ts) arma la **Sesión guiada** de una lección: 5 palabras con una técnica de estudio, 2 puntos de gramática explicados con sus ejercicios y frases completas al final. También guarda por dónde va la gramática de cada lección (cada sesión sigue donde terminó la anterior) y genera los ejercicios de gramática sueltos del modo «Gramática».

El flujo visto desde el usuario está en [practice.md](../views/practice/practice.md#sesión-guiada). Las preguntas de vocabulario y frases salen de [questions.utils.md](questions.utils.md); el peso por intereses, de [interests.utils.md](interests.utils.md).

Quién lo usa: [lesson-practice.component.ts](../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.ts) (`guidedSession`, `advanceGrammar`, `grammarPractice`, `modelSentences`) y [lesson-detail.component.ts](../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.ts) (`nextGrammar`, `grammarKeys`, para enseñar la gramática de hoy).

## Conceptos

- **Punto de gramática** (`GrammarPoint`): `title` (p. ej. `じゃ ありません — 'no es'`), `explain` y `examples`.
- **Clave de gramática** (`grammarKeys`): el trozo japonés del título que se puede tapar en una frase (`じゃありません`, `の`, `てください`).
- **Cursor de gramática**: por lección, el índice del próximo punto que toca. Avanza 2 al terminar cada sesión y da la vuelta al llegar al final.
- **Tarjeta** (`NoteQuestion`, `kind: 'note'`): no es una pregunta; el runner la enseña con un botón para seguir.
- **Frases modelo** (`modelSentences`): las frases escritas para enseñar la lección (patrones, preguntas y respuestas, ejemplos de gramática, extras por intereses), sin las líneas de diálogo.

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `STUDY_TIPS` (exportada) | 7 técnicas (recuerdo activo, de 5 en 5, imagen absurda, en voz alta, repaso espaciado, hazlo tuyo, contexto) | Una por sesión en la tarjeta de vocabulario (`tipIndex % 7`) |
| `GRAMMAR_PER_SESSION` (exportada) | `2` | Puntos de gramática por sesión y paso del cursor |
| `PARTICLES` | `は が を に で へ と も の か から まで や より` | Distractores de los huecos; `findKey` les aplica reglas de palabra |
| `SINGLE_KANA_KEYS` | `は が を に で へ と も の か や ね よ` | Kana sueltos que valen como clave (la て de «forma て», no) |
| `CURSOR_KEY` | `'guided'` | Clave del cursor en `localStorage` (`nihongo:guided`) |
| `EXERCISES_PER_GRAMMAR` | `2` | Ejercicios por punto de gramática |
| `FINAL_SENTENCE_QUESTIONS` | `5` | Preguntas de frases del último paso |
| `MAX_SPOKEN_SENTENCE_LENGTH` | `24` | Largo máximo de la frase para leer en voz alta |
| `MIN_MODEL_SENTENCES` | `6` | Con menos frases modelo se usan todas las de la lección |

Los ids de las tarjetas y huecos salen de su propio contador (`nextGuidedId`: `g1`, `g2`…), aparte del `q1`, `q2`… de `questions.utils`.

### Datos guardados

`nihongo:guided`: `{ "<lessonId>": cursor }`. Lo leen `grammarCursor` y `nextGrammar`; lo escribe `advanceGrammar`. Usa `loadRaw` y `save` de `storage.utils`, que añaden el prefijo `nihongo:`.

---

## Funciones

### Rotación de la gramática

#### `grammarCursor(lessonId)`

- **Qué hace**: el cursor guardado de la lección; `0` si nunca se hizo una sesión.

#### `nextGrammar(lesson)`

- **Qué hace**: los índices de los puntos que enseñará la próxima sesión.
- **Cómo**: desde `cursor % nº de puntos`, toma 2 (o 1 si la lección tiene uno) dando la vuelta.
- **Devuelve**: `[]` si la lección no tiene gramática.
- **Ejemplo**: lección con 5 puntos y cursor 4 → `[4, 0]`.

#### `advanceGrammar(lesson)`

- **Qué hace**: suma 2 al cursor (módulo el nº de puntos) y lo guarda.
- **Quién la llama**: `LessonPracticeComponent.done()`, solo en modo `guided`, al terminar la sesión.
- **Ojo**: el `|| 1` evita dividir entre 0 en una lección sin gramática.

### Gramática → ejercicios

#### `grammarKeys(grammar)`

- **Qué hace**: saca del título los fragmentos japoneses que se pueden tapar.
- **Cómo**:
  1. Se queda con lo que va antes de la raya (`—`, `–` o ` - `): lo de después es la traducción.
  2. Parte por `/`, `・`, `、`, `,`, `|`; quita paréntesis, `～`, espacios y `…`; corta por letras latinas y números (`N1`, `V`).
  3. Se queda con trozos de hasta 8 caracteres, solo kana o kanji. Un kana suelto solo si está en `SINGLE_KANA_KEYS`.
- **Ejemplo**: `"じゃ ありません — 'no es'"` → `['じゃありません']`; `"N1のN2"` → `['の']`; `"Vてください"` → `['てください']`; `"forma て"` → `[]`.

#### `findKey(jp, key)` (interna)

- **Qué hace**: busca la clave en la frase aunque haya espacios entre sus letras (`じゃ ありません`).
- **Reglas para partículas**: necesita una palabra delante (no al principio ni tras un espacio o signo); si es de una letra, detrás debe venir un corte (espacio o signo); y no vale tras こ/そ/あ/ど sueltos. Así no encuentra は en `はい` ni の en `この`.
- **Devuelve**: `{ start, end }` o `null`.

#### `grammarSentences(grammar, all)`

- **Qué hace**: las frases que usan el punto: primero sus propios ejemplos, después las de la lección que contienen alguna clave (barajadas).

#### `blankQuestion(sentence, grammar, otherKeys)` (interna)

- **Qué hace**: «Completa la frase»: tapa la clave con `＿＿` y ofrece 4 opciones.
- **Cómo**: prueba las claves en orden aleatorio. Distractores: claves de los otros puntos de la lección y partículas, quitando las que contienen la respuesta o están contenidas en ella (si no, dos opciones serían correctas). Con menos de 3 opciones prueba otra clave.
- **Ejemplo**: `ミラーさんは 会社員です` con clave `は` → `ミラーさん＿＿ 会社員です`, explicación = título del punto.

#### `grammarQuestions(grammar, lesson, count = 2)`

- **Qué hace**: `count` ejercicios de un punto.
- **Cómo**:
  1. Recorre `grammarSentences` alternando hueco (posiciones pares) y ordenar (impares). Lo que no se puede generar se salta.
  2. Si faltan, pregunta el significado de las frases no usadas (solo si la lección tiene 4 frases o más, para los distractores).
- **Devuelve**: todas las preguntas con `explain` = título del punto (salvo que ya traigan uno).

#### `grammarPractice(lesson)`

- **Qué hace**: el modo «Gramática» de la práctica de lección: 2 ejercicios por **cada** punto, sin tarjetas.

### Sesión guiada

#### `modelSentences(lesson, interests = [])`

- **Qué hace**: las frases para el último paso (y para el modo «Frases» de la lección).
- **Cómo**: junta `patterns`, las preguntas y respuestas de `examples`, los ejemplos de gramática y `forYou(lesson, interests)`, sin las que no tienen japonés o español. Con menos de 6, usa `lessonSentences` (todas). Después `weighByInterest` repite 3 veces las de los intereses del usuario.

#### `guidedSession(lesson, words, pool, known, tipIndex, interests = [])`

- **Qué hace**: arma la sesión completa.
- **Cómo**:
  1. Calcula los pasos: 3, o 2 si la lección no tiene gramática. Cada tarjeta lleva «Paso N de M · …».
  2. **Vocabulario** (si hay palabras): tarjeta «Tus 5 palabras de hoy» con las palabras (forma principal con kanji, lectura, español corto) y `STUDY_TIPS[tipIndex % 7]`. Después una pregunta `meaning` por palabra y 3 de `reverse`/`listen`/`write` sobre las palabras barajadas.
  3. **Gramática** (los puntos de `nextGrammar`): por punto, tarjeta con título, explicación y 2 ejemplos (etiqueta «… · Gramática 3/7») y `grammarQuestions(punto, lesson, 2)`.
  4. **Frases completas** (si hay frases modelo): tarjeta «Ahora, todo junto» (nombra los intereses si hay), 5 preguntas de `sentenceQuestions` con `order`, `listen`, `particle` y `meaning`, y una `speakSentenceQuestion` con una frase de hasta 24 caracteres.
- **Quién la llama**: `LessonPracticeComponent.build()` en modo `guided`, con `words` = 5 palabras de `prioritize`, `pool` = vocabulario practicable de la lección, `known` = `knownStems` hasta esta lección y `tipIndex` = días desde 1970.
- **Ejemplo**: lección con 5 palabras y 7 puntos, cursor 2 → tarjeta de vocabulario + 5 + 3 preguntas, tarjeta «Gramática 3/7» + 2, tarjeta «Gramática 4/7» + 2, tarjeta de frases + 5 + 1. Unas 22 pantallas.
- **Ojo**:
  - El comentario dice que cada palabra se ve dos veces, pero el segundo bloque son solo 3 preguntas: con 5 palabras, 2 se ven una sola vez.
  - El total de pasos cuenta siempre el vocabulario y las frases, aunque falten palabras o frases: sin palabras, la primera tarjeta diría «Paso 1 de 3 · Gramática».
