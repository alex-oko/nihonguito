# Opciones de vocabulario (`vocab-builder.utils.ts`)

Opciones de [Vocabulario fácil](../views/vocab/vocab.md) y filtros por tipo de palabra que comparte con la pestaña «Palabras» de la [ficha de lección](../views/lessons/lesson-detail.md). Los tipos están en [vocab-builder.interface.ts](../../src/app/interfaces/vocab-builder.interface.ts).

## Constantes

| Nombre | Qué contiene |
|---|---|
| `WORD_TYPE_FILTERS` | Todas, Sustantivos (`noun`, `pron`), Verbos, Adjetivos (`i-adj`, `na-adj`), Expresiones (`expr`, `adv`, `other`, `counter`) y Nombres. «Todas» (`types: []`) solo la usa la ficha de lección. |
| `DEFAULT_VOCAB_TYPES` | `noun`, `verb`, `adj`, `expr`: todos menos Nombres, que casi no sirven para practicar. |
| `VOCAB_COUNTS` | 10, 20 y 30 palabras. |
| `VOCAB_DRILLS` | Las 7 formas de practicar: `cards`, `meaning`, `reverse`, `listen`, `write`, `match` y `mixed`, con su texto e icono. |

## Funciones

#### `filterByTypes(words, typeIds)`

- **Qué hace**: las palabras cuyo `type` entra en alguno de los filtros elegidos (por id).
- **Ojo**: una palabra sin `type` cuenta como `other`, así que entra en «Expresiones».
