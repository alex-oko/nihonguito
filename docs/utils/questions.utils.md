# Utils de preguntas (`questions.utils.ts`)

[questions.utils.ts](../../src/app/utils/questions.utils.ts) reúne los **generadores de preguntas** del motor compartido: kana, katakana de préstamo, vocabulario, frases y verbos. Todos devuelven `Question[]` (tipos en [question.interface.ts](../../src/app/interfaces/question.interface.ts)) listas para `app-question-runner`, los juegos y los exámenes. Son funciones puras salvo por el azar y un contador de ids.

También tiene las ayudas para limpiar las formas de una palabra (`cleanForm`, `wordMain`, `wordReading`), que usan muchas vistas. `cleanForm` lo reutiliza además [tools/build-audio.mjs](../../tools/build-audio.mjs) (lo re-exporta con esbuild): no le cambies el nombre ni le añadas dependencias de Angular.

Quién lo usa: la práctica de kana, de lección y de verbos, el [repaso](../views/practice/review.md), los juegos, `ExamService`, `LevelExamService`, `ReadingService` y la [sesión guiada](guided-session.utils.md).

## Conceptos

- **Pregunta** (`Question`): `choice` (elegir), `type` (escribir), `order` (ordenar trozos), `speak` (decir en voz alta) o `note` (tarjeta de explicación, la usa la sesión guiada).
- **Modo**: qué se pregunta de un mismo elemento. Kana: `read`, `recognize`, `type`, `listen`, `mixed`. Vocabulario: `meaning`, `reverse`, `listen`, `write`, `speak`. Frases: `order`, `particle`, `meaning`, `listen`, `speak`.
- **`track`**: `{ kind: 'kana' | 'word', id }`. El runner lo convierte en la clave `k:<char>` o `w:<id>` de las cajas de Leitner. Las preguntas de frases y verbos no lo llevan.
- **Forma principal / alternativas**: el vocabulario trae formas como `あの ひと（あの かた）`. Lo de los paréntesis son alternativas (se aceptan al escribir); lo de los corchetes `［たばこを～］` es contexto y se tira.
- **Palabra limpia** (`isPlainWord`): tiene lectura, no tiene huecos (`～`, `-`) y mide como mucho 14 caracteres. Solo esas se piden escribir o decir.
- **Distractor parecido**: para kana y verbos las opciones incorrectas salen primero de lo que se confunde (シ/ツ, las otras formas del mismo verbo). Es más difícil y se aprende mejor.
- **Raíz conocida** (`knownStems`): formas de las palabras ya estudiadas. Sirve para decidir si el final de un trozo es una partícula (`わたしは`) o parte de la palabra (`いつも`).

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `PARTICLES` | `から まで は を へ が に で と も の` | Partículas que se buscan al final de un trozo. Las de dos letras van primero para que `まで` no se lea como `ま` + `で` |
| `BASE_KNOWN_STEMS` | `わたし あなた これ それ あれ ここ そこ あそこ だれ なん なに どこ きょう あした きのう うち えき` | Siempre cuentan como raíz conocida |
| `VERB_FORM_LABEL` (exportada) | `dict` → «forma diccionario», `te` → «forma て», `nai` → «forma ない», `ta` → «forma た» | Enunciados de verbos; la usa también la vista de verbos |

Los ids de pregunta salen de un contador de módulo (`nextQuestionId`: `q1`, `q2`…). Solo tienen que ser únicos dentro de una sesión.

---

## Funciones

### Formas de una palabra

#### `cleanForm(form)`

- **Qué hace**: separa la forma principal de las alternativas y quita el contexto.
- **Cómo**:
  1. Borra lo que va entre corchetes (`［］` o `[]`) y los `*`.
  2. Saca lo que va entre paréntesis (`（）` o `()`) a `alts`.
  3. Junta los espacios repetidos y recorta.
- **Devuelve**: `{ main, alts }`. Con `undefined` → `{ main: '', alts: [] }`.
- **Ejemplo**: `'すいます［たばこを～］'` → `{ main: 'すいます', alts: [] }`; `'あの ひと（あの かた）'` → `{ main: 'あの ひと', alts: ['あの かた'] }`.

#### `wordMain(word, kanji = true)`

- **Qué hace**: la forma que se enseña. Con `kanji` y forma en kanji, esa; si no, la kana.
- **Ejemplo**: `{ kanji: '先生', kana: 'せんせい' }` → `'先生'`; con `kanji = false` → `'せんせい'`.

#### `wordReading(word)`

- **Qué hace**: la lectura en kana limpia (`cleanForm(word.kana).main`).

#### `isPlainWord(word)`

- **Qué hace**: dice si la palabra se puede escribir o decir tal cual.
- **Ejemplo**: `'たべます'` → `true`; `'～さん'` → `false`.

### Kana

#### `kanaQuestions(list, mode, count, script)`

- **Qué hace**: `count` preguntas sobre los kana de `list` (o el silabario entero si está vacía).
- **Cómo**:
  1. Baraja la lista en rondas hasta tener `count` kana.
  2. Con `mode = 'mixed'` elige el modo al azar en cada pregunta.
  3. Opciones de kana: los parecidos (`lookalikesOf`) van **dos veces** en el pool para que salgan más, luego la lista y luego el silabario.
  4. Según el modo:
     - `read`: «¿Cómo se lee?» con el kana grande; opciones en romaji.
     - `recognize`: «Encuentra «ka»»; opciones en kana.
     - `type`: «Escribe la lectura en romaji»; acepta cualquier romaji del kana (`shi` y `si`).
     - `listen`: «Escucha y elige»; el kana se oye pero no se ve.
- **Quién la llama**: la práctica de kana, los juegos y `ExamService`.
- **Ejemplo**: `kanaQuestions([つ], 'recognize', 1, 'katakana')` → «Encuentra «tsu»» con opciones como `ツ シ ソ ン`.

#### `lookalikeQuestions(script, count)`

- **Qué hace**: `count` preguntas «¿Cuál es «X»?» dentro de un grupo de kana parecidos (`KATAKANA_LOOKALIKES` / `HIRAGANA_LOOKALIKES`).
- **Cómo**: elige un grupo y un kana al azar. Las opciones son los otros del grupo; si el grupo tiene menos de 4, completa con kana de todos los grupos. Al responder enseña el truco del grupo (`explain: tip`).
- **Ejemplo**: grupo `ぬ め` → «¿Cuál es «nu»?», opciones `ぬ め` + 2 de otros grupos, explicación «ぬ (nu) termina con un rizo; め (me) no.».

#### `choicesFromPriority(answer, priority, pool, choiceCount = 4)` (interna)

- **Qué hace**: arma las opciones con hasta 2 distractores de `priority` (3 contando la respuesta) y completa con `pool` hasta 4.
- **Por qué el tope de 3**: deja sitio a un distractor «normal», si no todas las opciones serían casi iguales.

### Katakana de préstamo

#### `loanwordQuestions(count, extra = [])`

- **Qué hace**: `count` preguntas con palabras en katakana (`LOANWORDS` + `extra`, sin repetidas).
- **Cómo**: 2 de cada 3 son de leer («Lee la palabra: ¿qué significa?», opciones en español); la tercera (índices 2, 5, 8…) es de escribir en katakana desde el español (`input: 'katakana'`, «Usa «-» para ー»).
- **Ejemplo**: `['コーヒー', 'café']` → «Escribe «café» en katakana», respuesta `コーヒー`.

#### `katakanaFromWords(words)`

- **Qué hace**: saca del vocabulario de las lecciones las palabras en katakana de 2 o más letras, como pares `[katakana, español corto]`.
- **Quién la llama**: la práctica de kana, para pasarlas como `extra` a `loanwordQuestions`.
- **Ejemplo**: `{ kana: 'テレビ', es: 'televisión' }` → `['テレビ', 'televisión']`; `{ kana: 'ほん' }` se descarta.

### Vocabulario

#### `vocabQuestion(word, mode, pool, kanji)`

- **Qué hace**: una pregunta de vocabulario del modo pedido. `pool` da los distractores.
- **Cómo**, según el modo:
  - `meaning`: «¿Qué significa?» con la palabra y, si es distinta, la lectura debajo (`subIsReading`); opciones en español.
  - `reverse`: «¿Cómo se dice en japonés?» desde el español; opciones en japonés.
  - `listen`: «Escucha: ¿qué significa?»; la palabra solo se oye.
  - `write`: «Escríbelo en hiragana» (o katakana si la lectura es katakana) desde el español. Acepta la lectura y sus alternativas.
  - `speak`: «Pronuncia en voz alta»; se compara con la lectura.
- **Quién la llama**: `vocabQuestions`. Se exporta pero hoy nadie más la usa.

#### `vocabQuestions(words, modes, count, pool, kanji)`

- **Qué hace**: `count` preguntas de vocabulario con modos al azar entre `modes`.
- **Cómo**:
  1. Descarta palabras sin lectura. Si todos los modos son `write` o `speak`, se queda con las limpias (si hay alguna).
  2. Baraja en rondas hasta `count`: con pocas palabras, alguna se repite.
  3. Por palabra, `write` y `speak` solo si es limpia; si no queda modo, `meaning`.
  4. Si `pool` tiene 4 palabras o menos, los distractores salen de las propias palabras.
- **Devuelve**: `[]` si no queda ninguna palabra usable.
- **Quién la llama**: el [repaso](../views/practice/review.md), la práctica de lección, la [sesión guiada](guided-session.utils.md), los juegos y `ExamService`.
- **Ejemplo**: `vocabQuestions([たべます, のみます], ['meaning', 'write'], 4, vocabLeccion, true)` → 4 preguntas, cada palabra dos veces, mezclando significado y escritura.

### Frases

#### `orderQuestion(sentence)`

- **Qué hace**: «Ordena la frase» desde el español con los trozos (separados por espacios) barajados.
- **Devuelve**: `null` si la frase tiene menos de 3 o más de 9 trozos.
- **Cómo baraja** (`shuffleDifferent`, interna): hasta 6 intentos para que el orden no salga ya correcto; si no lo logra, los invierte.
- **Ejemplo**: `'わたしは がくせいです'` → `null` (2 trozos); `'これは わたしの ほんです'` → trozos `ほんです これは わたしの`.

#### `splitParticle(token, known)`

- **Qué hace**: separa la partícula final de un trozo si la raíz parece una palabra.
- **Cómo**: si el trozo entero es conocido, `null`. Si termina en una de `PARTICLES`, la raíz vale si es conocida, termina en kanji, katakana o `ん`, o termina en `さん`.
- **Quién la llama**: `LevelExamService`.
- **Ejemplo**: `splitParticle('わたしは', known)` → `{ stem: 'わたし', particle: 'は' }`; `splitParticle('ちょっと', known)` → `null` (`ちょっ` no es conocida ni termina en kanji, katakana o `ん`).

#### `particleQuestion(sentence, known)`

- **Qué hace**: «Completa con la partícula»: tapa una partícula de la frase y ofrece 4.
- **Cómo**: busca los trozos que terminan en partícula con la misma regla que `splitParticle` (el código está duplicado), elige uno al azar, lo cambia por `raíz＿＿` y pone la partícula + 3 al azar de `PARTICLES`.
- **Devuelve**: `null` si ningún trozo vale.
- **Ejemplo**: `'ミラーさんは かいしゃいんです'` → `ミラーさん＿＿ かいしゃいんです`, respuesta `は`.

#### `sentenceMeaningQuestion(sentence, pool, listen = false)`

- **Qué hace**: «¿Qué significa?» (o «Escucha: ¿qué dice?» con `listen`) con opciones en español de `pool`.

#### `speakSentenceQuestion(sentence)`

- **Qué hace**: «Lee en voz alta» con la traducción debajo; compara con la frase entera.

#### `sentenceQuestions(sentences, modes, count, known)`

- **Qué hace**: hasta `count` preguntas de frases con modos al azar.
- **Cómo**:
  1. Descarta frases sin japonés o sin español.
  2. Elige una frase al azar. No repite una frase mientras queden otras sin usar (el pool puede traer repetidas a propósito, pesadas por intereses).
  3. Elige un modo al azar. `meaning` y `listen` necesitan al menos 4 frases (distractores). Si el generador devuelve `null` (frase muy corta para ordenar, sin partícula), lo intenta otra vez.
  4. Para tras `count × 8` intentos: si ningún modo sirve, devuelve menos de `count`.
- **Quién la llama**: la práctica de lección, la sesión guiada, los juegos y `ExamService`.

#### `knownStems(words)`

- **Qué hace**: el conjunto de raíces conocidas: forma principal y alternativas (kana y kanji, sin espacios) de cada palabra, más `BASE_KNOWN_STEMS`.
- **Quién la llama**: la práctica de lección (palabras de esta lección y las anteriores), los juegos y los exámenes.

### Verbos

#### `verbQuestions(verbs, forms, count)`

- **Qué hace**: `count` preguntas de conjugación desde la forma ます (`count` verbos distintos como máximo).
- **Cómo**: forma al azar entre `forms`. 1 de cada 3 (índices 1, 4, 7…) es de elegir, con las otras formas del mismo verbo como distractores preferidos; el resto es de escribir en kana y explica `たべます → たべて`.
- **Ejemplo**: `{ masu: 'たべます', te: 'たべて', group: 2 }`, forma `te` → «Escribe la forma て», debajo «comer · grupo II», respuesta `たべて`.

### Otros

#### `toKata(text)`

- **Qué hace**: pasa un texto a katakana con `toKatakana` de wanakana.
- **Ojo**: hoy nadie la importa.
