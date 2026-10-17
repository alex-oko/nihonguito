# Kanji (`kanji.utils.ts`)

Los 100 kanji básicos (N5) y su cruce con el vocabulario de las lecciones. Los usa la sección [Kanji](../views/kanji/kanji.md). Los tipos están en [kanji.interface.ts](../../src/app/interfaces/kanji.interface.ts).

## Constantes

| Nombre | Qué contiene |
|---|---|
| `KANJI_N5` | 100 `KanjiEntry` por tema (números, tiempo, personas, lugares, naturaleza, acciones, adjetivos, cosas): `char`, `meaning` (varias acepciones separadas por «; »), `on` (katakana), `kun` (hiragana, con la terminación entre paréntesis: た(べる)), `strokes` y `tip` (truco original). |
| `KANJI_DRILLS` | Los 5 tipos de práctica. |
| `MAX_WORDS_PER_KANJI` | **8** palabras de ejemplo por kanji. |

**Al añadir kanji**: que el `meaning` no repita acepciones de otro (las opciones falsas descartan los kanji que compartan alguna, como 前 «antes» y 先).

## Funciones

#### `kanjiWithLessons(lessons)`

- **Qué hace**: los `KanjiInfo`: cada kanji con `lesson` (primera lección cuyo vocabulario lo usa, o null) y `words` (hasta 8 palabras distintas, con la forma principal de `cleanForm`; se saltan las entradas de varios nombres juntos «A／B»).
- **Orden**: por `lesson` (los null al final) y, dentro de cada lección, en el orden de `KANJI_N5`.

#### `kanjiInScope(kanji, scope, lastLesson)`

- **Qué hace**: `all` → todos; `upto` → los que tienen lección y es ≤ `lastLesson` (mínimo 1).

#### `prioritizeKanji(kanji, mastery, count)`

- **Qué hace**: elige `count` kanji como `prioritize` con las palabras: +2 si toca repasar hoy, +0,5 por cada caja que le falta para la 5, nuevos con prioridad media, y un poco de azar.

#### `groupByLesson(kanji)`

- **Qué hace**: agrupa la lista ya ordenada en `{ lesson, kanji[] }`.
