# Utils de texto (`text.utils.ts`)

Funciones puras de texto que usa casi toda la app: barajar y elegir opciones, normalizar respuestas en japonés y en español para compararlas, pasar a romaji, medir la distancia entre dos textos y manejar fechas `YYYY-MM-DD`. Están separadas porque las comparten vistas, componentes, servicios y otros utils, y no dependen de Angular.

## Conceptos

- **Texto separado por espacios**: las frases de las lecciones se escriben con espacios entre palabras (`わたし は がくせい です`) para poder partirlas en tokens y ordenar palabras. Al comparar o al hablar, los espacios se quitan.
- **Normalizar**: dejar dos respuestas en la misma forma antes de compararlas (sin puntuación, sin espacios, mismo silabario o sin tildes).
- **Hepburn**: el sistema de romaji de la app (`し → shi`, `つ → tsu`). Las partículas は, へ y を se escriben `wa`, `e` y `o`.
- **Levenshtein**: el número mínimo de letras que hay que insertar, borrar o cambiar para pasar de un texto a otro.
- **Lector de kanji**: la función kanji → kana que registra [`FuriganaService`](../services/furigana.service.md) al cargar. Hasta entonces `romaji()` deja los kanji como están.

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `PUNCT` | espacios (también el japonés `　`), `。、．，,.!！?？・「」『』（）()〜~-…` | Lo que `normJp` quita antes de comparar |
| `KANJI` | `/[一-龯]/` | Saber si un token de `romaji()` necesita el lector de kanji |
| `MS_PER_DAY` | `86400000` | Milisegundos de un día, para `daysBetween` |

Además hay una variable de módulo, `kanjiReader`, que guarda el lector registrado con `setKanjiReader` (`null` hasta que carga el furigana).

---

## Funciones

### Azar y opciones

#### `shuffle(items)`

- **Qué hace**: devuelve una copia barajada (Fisher-Yates). No toca el array original.
- **Quién la llama**: casi todos: `ExamService`, `LevelExamService`, `questions.utils`, `guided-session.utils`, `lesson-content.utils`, `MatchGameComponent`, `GameHostComponent`, `PetHouseComponent`, `ReviewComponent`, `LessonPracticeComponent`, `KanaPracticeComponent`, `KanaTraceComponent`.

#### `sample(items, count)`

- **Qué hace**: `count` elementos al azar (`shuffle` + `slice`).
- **Quién la llama**: `distractors`, `questions.utils` y `KanaMatchComponent`.

#### `pick(items)`

- **Qué hace**: un elemento al azar.
- **Quién la llama**: `questions.utils`, `guided-session.utils` y `QuestionRunnerComponent`.

#### `distractors(answer, pool, count = 3)`

- **Qué hace**: `count` opciones falsas de `pool`, distintas de `answer` y sin repetidas (ni vacías).
- **Quién la llama**: `choicesWith`.

#### `choicesWith(answer, pool, count = 4)`

- **Qué hace**: las opciones de una pregunta de elección: la respuesta más `count - 1` distractores, barajadas.
- **Devuelve**: puede traer menos de `count` si `pool` no tiene bastantes valores distintos.
- **Quién la llama**: `questions.utils` (preguntas de opción múltiple).
- **Ejemplo**: `choicesWith('perro', ['gato', 'perro', 'pez', 'gato', 'ave'])` → `['pez', 'perro', 'ave', 'gato']` (orden al azar).

### Normalización

#### `normJp(text)`

- **Qué hace**: normaliza una respuesta japonesa: quita `PUNCT`, pasa todo a hiragana y a minúsculas (el romaji se deja pasar).
- **Por qué pasa por katakana**: así la marca de vocal larga `ー` se expande igual en los dos lados; `みらー` y `ミラー` quedan iguales.
- **Quién la llama**: `ReadingService.bestMatch` y `QuestionRunnerComponent`.
- **Ejemplo**: `'ミラー です。'` → `'みらあです'`.

#### `normKana(text)`

- **Qué hace**: quita espacios y puntuación pero conserva `ー`, para comparar palabras en katakana.
- **Quién la llama**: nadie.

#### `normEs(text)`

- **Qué hace**: normaliza una respuesta en español: minúsculas, sin tildes ni signos, solo `a-z`, `0-9` y espacios simples.
- **Cómo**: `normalize('NFD')` separa cada letra de su tilde (marcas combinantes U+0300–U+036F) y se quitan; después se quita todo lo que no sea letra, número o espacio.
- **Ojo con la ñ**: NFD también la separa en `n` + tilde, así que `niño` queda `nino`. La `ñ` que permite el filtro nunca llega. Como los dos lados se normalizan igual, la comparación funciona; solo significa que `nino` y `niño` cuentan como iguales.
- **Quién la llama**: `QuestionRunnerComponent` y `LevelExamService`.
- **Ejemplo**: `'¡Buenos  días!'` → `'buenos dias'`.

### Romaji

#### `setKanjiReader(reader)`

- **Qué hace**: guarda la función kanji → kana que usará `romaji()`.
- **Quién la llama**: `FuriganaService.load`, con `text => this.kana(text)`.

#### `romaji(text)`

- **Qué hace**: romaji Hepburn de un texto separado por espacios.
- **Cómo**:
  1. Parte por espacios. Cada token con kanji pasa por el lector de kanji (si ya está registrado).
  2. Vuelve a partir (el lector puede haber cambiado el texto) y convierte cada token con `toRomaji` de wanakana.
  3. Si un token termina en は, へ o を (con puntuación detrás o sin ella) y lo de delante tiene 2 o más caracteres o algo que no es hiragana, esa última letra es una partícula: se escribe aparte como `wa`, `e` u `o`.
- **Por qué la condición de longitud**: `はは` (madre) tiene una sola letra delante, así que se queda `haha`; `これは` sí lleva partícula.
- **Quién la llama**: `QuestionRunnerComponent`, `FlashcardsComponent`, `ConversationPlayerComponent`, `HomeComponent`, `PetHouseComponent` y `LessonDetailComponent`.
- **Ejemplo**: `'これは ほん です'` → `'kore wa hon desu'`; `'がっこうへ いきます'` → `'gakkou e ikimasu'`.

### Similitud

#### `levenshtein(first, second)`

- **Qué hace**: la distancia de edición entre dos textos.
- **Cómo**: programación dinámica guardando solo dos filas de la matriz (la anterior y la actual).
- **Quién la llama**: `similarity`.
- **Ejemplo**: `('たべます', 'たべました')` → `2`.

#### `similarity(first, second)`

- **Qué hace**: `1 - distancia / longitud del más largo`, de 0 a 1. Dos textos vacíos dan 1.
- **Quién la llama**: `ReadingService.bestMatch` y `LevelExamService`.
- **Ejemplo**: `('たべます', 'たべました')` → `1 - 2/5 = 0.6`.

### Frases

#### `tokens(jp)`

- **Qué hace**: parte una frase separada por espacios en palabras, sin vacíos.
- **Quién la llama**: `questions.utils` (ordenar palabras), `LevelExamService` y `level-exam.interface.ts`.

#### `shortEs(es)`

- **Qué hace**: quita las notas entre paréntesis de una traducción, para opciones cortas. Si no queda nada, devuelve el original.
- **Quién la llama**: `questions.utils`, `guided-session.utils`, `LevelExamService`, `GameHostComponent`, `HomeComponent`, `PetHouseComponent`, `LessonPracticeComponent` y `LessonDetailComponent`.
- **Ejemplo**: `'usted (formal)'` → `'usted'`.

### Fechas

#### `todayKey(date = new Date())`

- **Qué hace**: la fecha **local** como `YYYY-MM-DD`. Es la clave de los registros por día (`activity`, `answerLog`) y el formato de `due` en Leitner.
- **Por qué local y no `toISOString`**: la ISO va en UTC; en España, de 0:00 a 2:00 seguiría siendo «ayer» y la racha se contaría mal.
- **Quién la llama**: `ProgressService`, `HomeComponent`, `ProfileComponent`, `PracticeComponent` y `ReviewComponent`.

#### `daysBetween(from, to)`

- **Qué hace**: días entre dos fechas `YYYY-MM-DD`, positivo si `to` es posterior.
- **Cómo**: crea las dos fechas a medianoche local y redondea la diferencia, así un día de 23 o 25 horas (cambio de horario) sigue contando como 1.
- **Quién la llama**: `ProgressService` (racha).
- **Ejemplo**: `('2026-10-06', '2026-10-07')` → `1`.
