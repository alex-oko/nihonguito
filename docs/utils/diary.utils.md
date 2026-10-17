# Temas del diario (`diary.utils.ts`)

Temas de [Mi diario](../views/diary/diary.md): una pregunta sobre la vida del alumno, un molde de huecos y las palabras de cada hueco. Japonés básico de las primeras lecciones. Los tipos están en [diary.interface.ts](../../src/app/interfaces/diary.interface.ts).

## Conceptos

- **Hueco** (`DiarySlot`): papel (`role`, decide el color), pregunta (`label`), partícula que se pega detrás (`particle`), palabra que va delante del significado (`esPrefix`: «en», «con»…), palabras (`options`) y si es opcional.
- **Palabra** (`DiaryOption`): `jp`, `es`, `tag` (interés, sale primero si coincide) e `isCustom` (la escribió el usuario).

## Constantes

| Nombre | Qué contiene |
|---|---|
| `DIARY_PROMPTS` | 8 temas: qué hiciste hoy (pasado), qué vas a hacer, qué te gusta, a dónde quieres ir, qué hay en tu cuarto, cómo estuvo tu día, a qué hora haces tus cosas y qué quieres comer o tomar. |
| `PLACES`, `PEOPLE`, `THINGS`, `LIKES` (privadas) | Palabras compartidas por varios temas, con su interés. |

**Al añadir palabras**: deben encajar con el molde (por ejemplo, el verbo del tema «hoy» va en pasado: たべました). Si una opción tiene espacios (うちを でます), `buildDiarySentence` la parte en varios trozos.

## Funciones

#### `promptOfDay(date)`

- **Qué hace**: el índice del tema del día (días desde 1970 módulo el número de temas).

#### `sortByInterest(options, interests)`

- **Qué hace**: pone primero las palabras cuyo `tag` está en los intereses del usuario.

#### `buildDiarySentence(slots, chosen)`

- **Qué hace**: arma la `GuideSentence` con las palabras elegidas: cada una con el papel del hueco y su partícula pegada al último trozo. Los huecos vacíos se saltan. `es` es «palabra por palabra»: los significados con su prefijo, separados por « · ».

#### `diaryBlockTexts()`

- **Qué hace**: el texto de todos los trozos que pueden salir en una frase del diario (cada palabra con su partícula). Lo usa `tools/build-audio.mjs` para grabarlos; la app los reproduce seguidos con `speakParts`.

#### `isDiaryComplete(slots, chosen)`

- **Qué hace**: true si todos los huecos obligatorios tienen palabra.
