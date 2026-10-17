# Contenido de Gramática fácil (`grammar-guide.utils.ts`)

Todo el texto de [/gramatica](../views/grammar/grammar.md): conceptos, partículas, moldes, el método para armar frases y las frases por interés. Las frases van partidas en trozos con su papel para pintarlas por colores y para generar los ejercicios (`grammarQuestions` en [questions.utils](questions.utils.md#gramática-fácil)). Los tipos están en [grammar-guide.interface.ts](../../src/app/interfaces/grammar-guide.interface.ts).

## Conceptos

- **Trozo** (`SentenceBlock`): `{ word, particle?, role, comma? }`. La partícula va aparte para poder resaltarla y taparla. El texto del trozo es `word + particle` (+ `、` con `comma`, ver `blockText`), igual que los bloques separados por espacios de las lecciones.
- **Frase doble**: dos frases unidas por が / けど («pero») o から («porque»). El final de la primera se crea con `clause(word, particle)`: papel `verb` y coma detrás. Esas frases no aceptan otros órdenes y su primer verbo no se pregunta en «¿Qué papel cumple?».
- **Ficha** (`ParticleGuide`): `id` estable (la partícula, o `pero` para が・けど), `forms` (las partículas que cuentan como suyas: `['から', 'まで']`) y `extraUses` (otros usos con sus propios ejemplos).
- **Papel** (`BlockRole`): `topic`, `subject`, `object`, `place`, `time`, `extra`, `describe` o `verb`. Decide el color y la explicación (`ROLE_INFO`).
- **Frase guiada** (`GuideSentence`): trozos, traducción y, para el ejercicio de partículas, `why` (por qué va esa partícula), `blank` (qué trozo se tapa) y `distractors` (partículas incorrectas). Sin `distractors` la frase no entra en ese ejercicio.

## Constantes

| Nombre | Qué contiene |
|---|---|
| `ROLE_ORDER` | Los 8 papeles en el orden habitual dentro de la frase (el de la leyenda). |
| `ROLE_INFO` | Por papel: `label`, `question` («¿Dónde?») y `hint` (lo que se enseña al corregir). |
| `GRAMMAR_CONCEPTS` | 10 conceptos de «Básico». |
| `PARTICLE_GUIDES` | 18 fichas: は, が, を, に, で, へ, と, も, の, から・まで, か, や, より, ぐらい, だけ, でも, が・けど y ね・よ. Con `extraUses`: に (para qué), を (salir/bajarse y por dónde pasas), から (porque) y か («o»). Cubren todas las partículas de las lecciones 1–25. |
| `PARTICLE_PAIRS` | 7 confusiones: に/で, は/が, を/が, に/へ, と/や, ぐらい/ごろ y から (desde/porque). |
| `CHEAT_SHEET` | 3 grupos (`CheatGroup`): las de cada frase, las que añaden un matiz y las que unen o cierran frases. |
| `GOLDEN_RULES` | 5 reglas del orden de la frase. |
| `MAIN_TEMPLATE` | El molde general con un trozo de cada papel. |
| `WORKED_EXAMPLES` | 3 ejemplos del método paso a paso (`steps` y `result`). |
| `FILL_STEPS` | 4 pasos para resolver «completa la frase». |
| `SENTENCE_MOLDS` | 10 moldes (`A は B です`, `[lugar] で [verbo]`…). |
| `INTEREST_SENTENCES` | 74 frases, de 8 a 11 por cada uno de los 8 intereses (`tag`), todas con `blank`, `distractors` y `why`; cada ficha tiene al menos 2. Las de `viajes` son útiles en un viaje a Japón. Las del «pero» llevan `guide: 'pero'` para no confundirse con el が de sujeto. |
| `GRAMMAR_DRILLS` | Los 4 ejercicios de la pestaña «Practicar». |

**Al escribir frases nuevas**: los `distractors` no pueden incluir otra partícula que también sea correcta (por ejemplo, へ en «がっこうに いきます», o を en «こうえんで はしります»). La traducción `es` se enseña bajo el hueco y ayuda a decidir (は frente a も).

## Funciones

#### `blockText(block)` y `sentenceText(sentence)`

El texto de un trozo con su partícula, y la frase entera con espacios y 。 al final.

#### `blankIndex(sentence, forms)`

- **Qué hace**: el índice del trozo que se tapa: `blank` si existe; si no, el primero cuya partícula esté en `forms`; `-1` si no hay.

#### `interestSentences(interests)`

- **Qué hace**: las frases de `INTEREST_SENTENCES` cuyo `tag` está en `interests`; todas si `interests` está vacío.

#### `interestSentencesFor(guide, interests)`

- **Qué hace**: de las anteriores, las que pertenecen a esa ficha: si la frase tiene `guide`, solo la ficha con ese `id`; si no, las que tapan una partícula de `guide.forms`. Alimenta «Con tus temas» en cada ficha de partícula.
