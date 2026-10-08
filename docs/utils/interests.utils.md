# Utils de intereses (`interests.utils.ts`)

[interests.utils.ts](../../src/app/utils/interests.utils.ts) reúne los **intereses** que el usuario elige en Perfil (viajes, comida, anime…) y cómo se usan: escoger las frases extra de la lección que hablan de ellos y repetirlas para que salgan más en las prácticas. La idea es que las frases sobre lo que le gusta se recuerdan mejor.

Tipo en [interest.interface.ts](../../src/app/interfaces/interest.interface.ts): `Interest` (`id`, `label`, `icon`). Los intereses elegidos se guardan como ids en `settings().interests` de `ProgressService` (`nihongo:settings`).

## Conceptos

- **Interés**: un tema con id, etiqueta e icono de [`app-icon`](../components/icon.md).
- **Etiqueta de frase** (`Sentence.tags`): las frases extra de la lección (`lesson.extras`) llevan los ids de los temas de los que hablan.
- **Peso**: una frase de los intereses del usuario se repite en la lista para que una elección al azar la saque más a menudo.

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `INTERESTS` (exportada) | `viajes` Viajes `plane` · `comida` Comida `bowl` · `trabajo` Trabajo `briefcase` · `estudios` Estudios `cap` · `anime` Anime y manga `tv` · `videojuegos` Videojuegos `gamepad` · `deporte` Deporte `run` · `musica` Música `music` | Lista que se enseña en Perfil |
| `DEFAULT_INTEREST_WEIGHT` | `3` | Veces que `weighByInterest` repite cada frase de los intereses |

Los ids de `INTERESTS` son los mismos que llevan las frases en `tags` y los que se guardan en los ajustes: no se cambian.

---

## Funciones

### Etiquetas

#### `interestLabel(id)`

- **Qué hace**: la etiqueta del interés; si el id no existe, el propio id.
- **Quién la llama**: la sesión guiada (tarjeta de frases) y el detalle de lección (chip de la frase).
- **Ejemplo**: `interestLabel('anime')` → `'Anime y manga'`.

### Frases por interés

#### `matchesInterests(sentence, interests)` (interna)

- **Qué hace**: dice si alguna etiqueta de la frase está entre los intereses elegidos.

#### `forYou(lesson, interests)`

- **Qué hace**: las frases extra de la lección sobre los intereses del usuario.
- **Devuelve**: si no eligió ninguno, **todas** las extras; si la lección no tiene extras, `[]`.
- **Quién la llama**: el detalle de lección (sección «Frases para ti»), la práctica de lección y `modelSentences` de la [sesión guiada](guided-session.utils.md).
- **Ejemplo**: extras con tags `['comida']` y `['viajes']`, intereses `['comida']` → solo la de comida.

#### `weighByInterest(sentences, interests, weight = 3)`

- **Qué hace**: repite `weight` veces cada frase de los intereses; las demás quedan una vez.
- **Devuelve**: la misma lista si no hay intereses.
- **Quién la llama**: la práctica de lección y `modelSentences`. `sentenceQuestions` sabe que el pool trae repetidas a propósito y no repite una frase mientras queden otras sin usar.
- **Ejemplo**: `[A (comida), B]` con `['comida']` → `[A, A, A, B]`: A sale 3 de cada 4 veces.
