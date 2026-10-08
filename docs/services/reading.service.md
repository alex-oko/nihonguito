# `ReadingService`

Pasa texto con kanji a kana para poder comparar respuestas. El usuario puede escribir `たべます` cuando la respuesta es `食べます`, y el reconocimiento de voz puede devolver `食べます` cuando se esperaba `たべます`: este servicio lleva las dos formas a kana y mide cuánto se parecen. Combina las lecturas de [`FuriganaService`](furigana.service.md) con una tabla kanji → kana sacada del vocabulario de todas las lecciones.

No escucha ni habla (eso es [`SpeechService`](speech.service.md)) y no decide si una respuesta vale: devuelve una puntuación y cada pantalla pone su umbral.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [reading.service.ts](../../src/app/services/reading.service.ts) | El servicio |
| [lesson.service.ts](../../src/app/services/lesson.service.ts) | `allWords()`: el vocabulario de todas las lecciones |
| [questions.utils.ts](../../src/app/utils/questions.utils.ts) | `cleanForm`: quita pistas ［…］ y alternativas (…) de una palabra y deja la forma principal |
| [furigana.service.ts](../../src/app/services/furigana.service.ts) | `kana()`: las lecturas generadas ([su doc](furigana.service.md)) |
| [text.utils.ts](../../src/app/utils/text.utils.ts) | `normJp` y `similarity` ([su doc](../utils/text.utils.md)) |

### Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `KANJI` | `/[一-龯]/` | Solo se guardan en la tabla las palabras que tienen kanji |

### Estado

| Miembro | Qué guarda |
|---|---|
| `pairs` (privado) | Pares `[kanji, kana]` del vocabulario, del kanji más largo al más corto |
| `loading` (privado) | La promesa de `ensure`, compartida: la tabla se construye una sola vez |

No guarda nada en `localStorage`.

### Reglas

- **Primero las lecturas precisas, después el vocabulario.** `toKana` pasa el texto por `FuriganaService.kana` (lecturas calculadas para ese texto) y solo después reemplaza lo que quede con `pairs`. El vocabulario sirve sobre todo para textos que no están en `furigana.json`, como lo que devuelve el reconocimiento de voz.
- **El más largo primero**: `pairs` está ordenado por longitud del kanji, para que `日本語` se reemplace antes que `日本`.
- **Raíces de verbos**: de `食べます → たべます` también se guarda `食べ → たべ`, para que la forma て (`食べて`) o la negativa se lean bien.
- **La primera lectura gana**: si dos palabras tienen el mismo kanji con lecturas distintas, se queda la primera en el orden del índice de lecciones.
- **Si falla la carga** de lecciones, `pairs` queda vacío y `toKana` solo usa el furigana.

---

## Recorrido paso a paso

Los nombres son buscables en [reading.service.ts](../../src/app/services/reading.service.ts).

### 1. Precarga

`AppComponent` llama `ensure()` 1,2 s después de arrancar (`READING_PRELOAD_DELAY_MS`) para que la tabla esté lista antes de la primera pregunta de hablar. Quien la necesita la vuelve a pedir con `await ensure()`, que devuelve la misma promesa.

### 2. Construir la tabla (`ensure`)

1. `lessonSVC.allWords()` trae el vocabulario de todas las lecciones.
2. Por cada palabra, `cleanForm` de `kanji` y de `kana`; sin forma principal en alguna de las dos, se salta.
3. Quita los espacios de las dos formas.
4. Si la forma en kanji tiene kanji y aún no está, guarda `kanji → kana`.
5. Si las dos terminan en `ます`, guarda también las raíces sin `ます`.
6. Ordena del kanji más largo al más corto y lo guarda en `pairs`.

### 3. Comparar (`bestMatch`)

1. Para cada objetivo calcula dos formas: `normJp(objetivo)` y `normJp(toKana(objetivo))`.
2. Para cada candidato, igual: su forma original y su forma en kana, normalizadas.
3. Compara todas contra todas con `similarity` (Levenshtein, de 0 a 1).
4. Devuelve la mejor puntuación y el candidato que la dio.

Comparar también la forma original sirve cuando la conversión a kana es peor que el texto tal cual (por ejemplo, un kanji que no está en ninguna tabla aparece igual en los dos lados).

**Ejemplo**: candidatos `['私は学生です']` (de la voz), objetivo `'わたし は がくせい です'` → `toKana` da `わたしはがくせいです` en los dos lados → `{ score: 1, text: '私は学生です' }`.

---

## Métodos

#### `ensure()`

- **Qué hace**: construye la tabla kanji → kana una sola vez.
- **Cómo**: ver el [paso 2](#2-construir-la-tabla-ensure).
- **Devuelve**: `Promise<void>`, siempre la misma. Nunca se rechaza (el error se traga).
- **Quién lo llama**: `AppComponent` (precarga), `QuestionRunnerComponent` y `ConversationPlayerComponent` (antes de comparar) y `LevelExamService` (al corregir).

#### `toKana(text)`

- **Qué hace**: devuelve el texto en kana y sin espacios.
- **Cómo**: `FuriganaService.kana(text)`, quita espacios y aplica cada par de `pairs` con `split/join`.
- **Quién lo llama**: `bestMatch` y `LevelExamService` (respuestas escritas).

#### `bestMatch(candidates, targets)`

- **Qué hace**: la mejor similitud entre cualquier candidato y cualquier objetivo.
- **Cómo**: ver el [paso 3](#3-comparar-bestmatch).
- **Devuelve**: `{ score, text }`; si no hay candidatos, `{ score: 0, text: '' }`.
- **Quién lo llama**: `QuestionRunnerComponent` (preguntas de hablar, contra `target` y `prompt`), `ConversationPlayerComponent` (respuesta hablada o escrita contra la línea) y `LevelExamService`.
