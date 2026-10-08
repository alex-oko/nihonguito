# Utils de kana (`kana.utils.ts`)

[kana.utils.ts](../../src/app/utils/kana.utils.ts) reúne **los datos de los dos silabarios** (tablas, trucos de memoria, parecidos, reglas y préstamos) y las pocas funciones que los consultan. Está separado de las vistas porque lo usan muchas piezas: las pantallas de [kana](../views/kana/kana.md), los generadores de preguntas, los exámenes, el contrarreloj y el script de audio (`tools/build-audio.mjs`, que lo re-exporta entero con `export *` para saber qué textos pronunciar). Por eso **cualquier export de aquí es una API**: no se renombra ni se quita sin revisar a todos.

Los tipos (`Script`, `KanaGroup`, `Kana`, `KanaRow`, `Lookalike`, `KatakanaRule`, `KanaRowDef`, `ExtendedRowDef`) están en [kana.interface.ts](../../src/app/interfaces/kana.interface.ts).

## Conceptos

- **Kana**: cada símbolo de los silabarios japoneses; representa un sonido (あ = a, か = ka).
- **Hiragana / katakana** (`Script`): los dos silabarios. Mismos sonidos, distinta forma. El hiragana es para palabras japonesas y partículas; el katakana, para palabras extranjeras y nombres.
- **Fila**: un grupo de la tabla que comparte consonante (あいうえお, かきくけこ…). Su `id` (`a`, `k`, `s`, `ky`, `x-f`…) es lo que viaja en el query param `rows` y se guarda en `nihongo:kanaRows:<script>`.
- **Grupo** (`KanaGroup`), una pestaña de la tabla:
  - `basic`: los 46 básicos (gojūon).
  - `dakuten`: con tenten ゛ o maru ゜ (が, ざ, だ, ば, ぱ).
  - `yoon`: combinados, consonante + ゃゅょ pequeña (きゃ, しゅ…). Ocupan **dos caracteres**.
  - `extended`: combinaciones que solo existen en katakana para palabras extranjeras (ティ, ファ, ヴァ…).
- **Romaji**: la lectura con letras latinas. Cada kana tiene una principal (`romaji[0]`, la que se enseña) y alternativas que también se aceptan al escribir (`shi` / `si`).
- **Celda vacía**: huecos de la cuadrícula (や _ ゆ _ よ). En los datos son `null`.

## Estructura de los datos

### Definiciones compactas

Las tablas no se escriben kana a kana: cada fila es una tupla de texto y `buildRows` / `buildExtended` la expanden.

```ts
// KanaRowDef: [id, etiqueta, hiragana, katakana, romaji]
['s', 'sa', 'さしすせそ', 'サシスセソ', 'sa shi/si su se so'],
['y', 'ya', 'や_ゆ_よ', 'ヤ_ユ_ヨ', 'ya _ yu _ yo'],
['ky', 'kya', 'きゃ きゅ きょ', 'キャ キュ キョ', 'kya kyu kyo'],

// ExtendedRowDef (solo katakana): [id, etiqueta, katakana, romaji]
['x-f', 'fa', 'ファ フィ フェ フォ フュ', 'fa fi fe fo fyu'],
```

- `_` = celda vacía.
- `/` separa alternativas de romaji (`shi/si` → `['shi', 'si']`).
- Si la cadena de kana lleva **espacios**, se parte por espacios (combinados de 2 caracteres); si no, carácter a carácter.

| Constante (privada) | Filas | Celdas por fila | Grupo |
|---|---|---|---|
| `BASIC` | 11 (`a` … `w`, `nn`) | 5 | `basic` |
| `DAKUTEN` | 5 (`g`, `z`, `d`, `b`, `p`) | 5 | `dakuten` |
| `YOON` | 11 (`ky` … `py`, `j`) | 3 | `yoon` |
| `EXTENDED` | 4 (`x-t`, `x-f`, `x-w`, `x-sh`) | 5 | `extended` |

### Tablas ya expandidas

`KANA_ROWS` = `{ hiragana: KanaRow[], katakana: KanaRow[] }`, en el orden en que se ven: básicos, tenten, combinados y (solo katakana) extranjeros.

| | Filas | Kana (sin vacías) | Sin extranjeros |
|---|---|---|---|
| Hiragana | 27 | 104 | 104 |
| Katakana | 31 | 124 | 104 |

Cada celda es un `Kana`:

```ts
{ char: 'シ', romaji: ['shi', 'si'], row: 's', group: 'basic', script: 'katakana' }
```

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `KANA_ROWS` | 27 filas de hiragana, 31 de katakana | La tabla entera; la usan la [tabla](../views/kana/kana-chart.md), el [hub](../views/kana/kana.md), exámenes de nivel y casi todo lo demás a través de `allKana` |
| `GROUP_LABELS` | `basic: 'Básicos'`, `dakuten: 'Con tenten ゛゜'`, `yoon: 'Combinados'`, `extended: 'Extranjeros'` | Texto de las pestañas de la tabla |
| `KATAKANA_TIPS` | 46 trucos, por carácter | Truco de memoria de cada katakana básico (ficha de la tabla, trazar) |
| `HIRAGANA_TIPS` | 46 trucos, por carácter | Lo mismo para hiragana |
| `KATAKANA_LOOKALIKES` | 12 grupos (`Lookalike`) | Símbolos que se confunden (シ/ツ, ソ/ン, ク/ケ/タ…) con el truco; laboratorio, ficha y preguntas de parecidos |
| `HIRAGANA_LOOKALIKES` | 8 grupos | Lo mismo en hiragana (ぬ/め, る/ろ…) |
| `KATAKANA_RULES` | 5 reglas (`KatakanaRule`) | Para qué sirve, ー, ッ, vocales pequeñas y adaptación de sonidos; las pinta el [laboratorio](../views/kana/katakana-lab.md) |
| `LOANWORDS` | 74 pares `[katakana, español]` | Préstamos para leer: ejemplos de la ficha, preguntas de `loanwords` y audio |

Los trucos solo existen para los **básicos**: un kana con tenten (が) no tiene truco propio, y un combinado (きゃ) usa el de su primer carácter cuando quien lo busca lo pide así (la tabla lo hace; trazar no incluye combinados).

Los textos de trucos, parecidos y reglas son de **redacción propia**: no copies textos de libros o webs aquí.

---

## Funciones

### Construir la tabla (privadas)

#### `splitChars(text)`

- **Qué hace**: parte una cadena de kana en celdas.
- **Cómo**: si tiene espacios, `split(' ')`; si no, `[...text]` (por carácter, seguro con caracteres fuera del BMP).
- **Ejemplo**: `'かきくけこ'` → `['か','き','く','け','こ']`; `'きゃ きゅ きょ'` → `['きゃ','きゅ','きょ']`.

#### `buildRows(definitions, group, script)`

- **Qué hace**: convierte un bloque de `KanaRowDef` en `KanaRow[]` para un silabario.
- **Cómo**:
  1. Toma la columna de hiragana o de katakana según `script` y la parte con `splitChars`.
  2. Parte el romaji por espacios.
  3. Cada carácter `_` pasa a `null`; los demás, a `Kana` con `romaji` partido por `/`.
- **Quién la llama**: `KANA_ROWS`, una vez por grupo y silabario, al cargar el módulo.

#### `buildExtended()`

- **Qué hace**: lo mismo para `EXTENDED`, que solo tiene katakana y nunca celdas vacías.

### Consultar

#### `allKana(script, rowIds?)`

- **Qué hace**: devuelve los kana de un silabario, sin celdas vacías.
- **Cómo**: filtra `KANA_ROWS[script]` por `rowIds` (si se pasan) y aplana las celdas quitando los `null`.
- **Devuelve**: `Kana[]` en el orden de la tabla.
- **Quién la llama**: el [hub](../views/kana/kana.md) (progreso), [práctica](../views/kana/kana-practice.md), [memorama](../views/kana/kana-match.md), [trazar](../views/kana/kana-trace.md), los generadores de preguntas (`questions.utils.ts`), el contrarreloj (`game-host`), los exámenes y `readiness.service.ts`.
- **Ejemplo**: `allKana('hiragana', ['a', 'k'])` → あいうえおかきくけこ (10 kana). `allKana('katakana')` → 124.

#### `findKana(char)`

- **Qué hace**: busca un carácter en hiragana y, si no, en katakana.
- **Devuelve**: el `Kana`, o `undefined` si no está en la tabla.
- **Ejemplo**: `findKana('シ')` → `{ char: 'シ', romaji: ['shi', 'si'], row: 's', group: 'basic', script: 'katakana' }`.

### Nombres en katakana

#### `nameToKatakana(name)`

- **Qué hace**: adapta de forma aproximada un nombre en español a katakana. Es un juego, no una transcripción oficial.
- **Cómo**:
  1. Minúsculas, `normalize('NFD')`, quita diacríticos (`̀-ͯ`) y todo lo que no sea letra, espacio o guion.
  2. Cambia sonidos del español que el japonés no tiene: `ll` → `y`, `qu` → `k`, `ce/ci` → `se/si`, `c` → `k`, `x` → `ks`, `z` → `s`, `v` → `b`, `l` → `r`, `j` → `h`, `ge/gi` → `he/hi`, `w` → `u` y quita las `h` que no van antes de vocal. `ch` se protege en mayúsculas mientras se aplica la regla de la `c`.
  3. Añade una vocal tras cada consonante suelta (`o` tras `t`/`d`, `u` tras las demás): en japonés casi toda sílaba acaba en vocal.
  4. Marca `ti`, `di`, `tu`, `du` para que salgan ティ, ディ, トゥ, ドゥ (con `NAME_KANA_MAPPING`) y no チ, ヂ, ツ, ヅ.
  5. `toKatakana` de wanakana; los espacios pasan a `・`.
- **Quién la llama**: el [laboratorio de katakana](../views/kana/katakana-lab.md) («Tu nombre en katakana») y la hoja de examen de nivel (`level-sheet`, sugerencia de nombre).
- **Ejemplos**: `'Alexis'` → アレクシス, `'Carlos'` → カルロス, `'María José'` → マリア・ホセ, `'Diego'` → ディエゴ.
- **Limitaciones conocidas**: la regla `ñ` → `ny` va **después** de `normalize('NFD')`, que ya ha separado la tilde, así que nunca se cumple: `'Peña'` → ペナ en vez de ペニャ. Y `gui`/`gue` no pierden la `u` (`'Guillermo'` → グイイェルモ).
