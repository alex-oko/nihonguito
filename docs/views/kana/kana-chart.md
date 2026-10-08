# Tabla de kana (`/kana/:script`)

Tabla de hiragana o katakana por pestañas (básicos, con tenten, combinados y, en katakana, extranjeros). Tocar un símbolo lo pronuncia y abre su ficha con truco, parecidos y palabras. Tocar la letra de la izquierda elige la fila; las filas elegidas se guardan y son las que usan todas las prácticas, que se lanzan desde la barra de abajo. Los datos vienen de [kana.utils.ts](../../../src/app/utils/kana.utils.ts) ([su doc](../../utils/kana.utils.md)). Forma parte del [hub de kana](kana.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kana-chart.component.ts](../../../src/app/views/kana/views/kana-chart/kana-chart.component.ts) | Selección de filas, contadores, pista de Musubi, ficha de un símbolo y navegación a las prácticas |
| [kana-chart.component.html](../../../src/app/views/kana/views/kana-chart/kana-chart.component.html) | Cabecera, pista, pestañas, botones rápidos, tabla, leyenda, barra de práctica y ficha |
| [kana-chart.component.scss](../../../src/app/views/kana/views/kana-chart/kana-chart.component.scss) | Cuadrícula, puntos de color por caja, barra de práctica pegada abajo y ficha |
| [kana.utils.ts](../../../src/app/utils/kana.utils.ts) | `KANA_ROWS`, `GROUP_LABELS`, `*_TIPS`, `*_LOOKALIKES`, `LOANWORDS` |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `mastery()` y `box()` |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | `speak()` al tocar un símbolo |
| [storage.utils.ts](../../../src/app/utils/storage.utils.ts) | `loadRaw` / `save` de las filas elegidas |

Componentes que usa: `app-icon`, `app-speak` (botón de audio en la ficha) y `app-musubi-say` (la pista).

### Qué hace el usuario

- **Laboratorio** (solo en katakana, arriba a la derecha): abre [`/kana/lab`](katakana-lab.md).
- **Pestañas** (Básicos, Con tenten ゛゜, Combinados, Extranjeros): cambian las filas que se ven. Cada pestaña lleva un contador con las filas elegidas en ella.
- **Botones rápidos**:
  - **Todas / Quitar todas**: elige o quita todas las filas de la pestaña actual, sin tocar las demás.
  - **Mis débiles**: sustituye la selección por las filas con algún símbolo débil. Desactivado si no hay ninguna.
  - **Hasta donde voy**: sustituye la selección por las filas básicas desde あ hasta la última que ya practicaste (mínimo 2) y vuelve a la pestaña Básicos.
  - **Ninguna**: vacía la selección. Desactivado si no hay nada elegido.
- **Letra de la izquierda** de cada fila: elige o quita esa fila. Elegida, la fila se tiñe y la letra pasa a ✓.
- **Símbolo**: lo pronuncia y abre la **ficha**:
  - Carácter grande, todas sus lecturas en romaji (`shi / si`) y el mismo sonido en el otro silabario.
  - Truco de memoria (solo los básicos tienen; los combinados usan el de su primer carácter).
  - Hasta 2 grupos de parecidos, con el símbolo actual resaltado.
  - En katakana, hasta 3 palabras que lo llevan, con audio.
  - Se cierra con **Cerrar** o tocando fuera.
- **Barra de práctica** (pegada abajo):
  - Resumen: «N símbolos elegidos» y las cabezas de fila (hasta 8 y `…`).
  - **Quiz mixto**, **Leer**, **Reconocer**, **Escuchar**, **Escribir** → [práctica](kana-practice.md) con ese modo.
  - **Memorama** → [memorama](kana-match.md). **Trazar** → [trazar](kana-trace.md). **Contrarreloj** → `/juego/contrarreloj?kana=<script>&rows=…`.
  - Todos se desactivan sin filas elegidas, salvo **Parecidos**, que no depende de las filas.
- **Pista de Musubi**: si hay símbolos con fallos, Musubi nombra los dos que más se resisten y sugiere «Mis débiles».

### Reglas

- **Selección inicial**: las filas guardadas del silabario o, la primera vez, `DEFAULT_ROWS` = `['a', 'k']` (あ y か).
- **Símbolo débil**: ya visto (existe `k:<carácter>` en `mastery`) y con caja < `WEAK_BOX_LIMIT` (**2**). Uno no visto nunca es débil.
- **Hasta donde voy**: fila practicada = alguna celda con clave en `mastery`. Se eligen de la fila 0 a la última practicada, con un mínimo de **2** filas.
- **Pista**: ordena los símbolos con algún fallo por `wrong / seen` (de más a menos) y toma `MAX_HINT_KANA` (**2**).
- **Columnas**: 3 en Combinados (`yoon`), 5 en las demás pestañas (`cols`).
- **Color del punto** de cada celda (`data-box` = caja de Leitner): rojo/acento en 0–1 (y sin punto si nunca se vio, caja `-1`), dorado en 2–3, verde en 4–6. La leyenda lo resume en «nuevo», «aprendiendo», «dominado».

### Datos guardados

- Lee y escribe `nihongo:kanaRows:hiragana` y `nihongo:kanaRows:katakana` (array de ids de fila) con `loadRaw` / `save`. Las lee también el [hub](kana.md).
- Lee `nihongo:mastery` a través de `ProgressService`. No lo escribe.

---

## Recorrido del código paso a paso

Todo empieza en [kana-chart.component.ts](../../../src/app/views/kana/views/kana-chart/kana-chart.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta `/kana/:script` carga `KanaChartComponent`; `:script` llega como `script` (`input.required<Script>()`).
2. **`constructor`**: un `effect` que solo depende de `script()`. Dentro de `untracked`:
   - `loadRaw('kanaRows:<script>', DEFAULT_ROWS)` → `selected`.
   - `group.set('basic')`.
   - El `untracked` evita que leer o escribir `selected` dentro convierta ese signal en dependencia del effect. Así el effect solo se repite si cambia el silabario con la misma instancia (por ejemplo, de `/kana/hiragana` a `/kana/katakana`).

### 2. Cadena de `computed`

En orden de dependencia:

1. **`groups`**: las pestañas; `extended` solo en katakana.
2. **`rows`**: filas de `KANA_ROWS[script]` del grupo actual. **`cols`**: 3 o 5.
3. **`selectedCount`**: celdas no vacías de las filas elegidas (de todas las pestañas).
4. **`rowsParam`**: `selected().join(',')`, el query param `rows`.
5. **`groupAllSelected`**: todas las filas de la pestaña actual están elegidas. Decide si el botón dice «Todas» o «Quitar todas».
6. **`groupCount`**: filas elegidas por grupo, para los contadores de las pestañas.
7. **`selectedHeads`**: primer carácter de las primeras `MAX_DOCK_HEADS` (**8**) filas elegidas.
8. **`weakRows`**: filas con algún símbolo débil (ver [reglas](#reglas)).
9. **`hint`**: texto de Musubi o `null`. Usa `errorRate(char) = wrong / seen`.

### 3. Selección de filas

- **`toggleRow(id)`**: añade o quita el id y guarda con `save`.
- **`selectGroup(selectAll)`**: con `true` une los ids de la pestaña a la selección (con `Set`, sin duplicados); con `false` los quita. Guarda.
- **`pickWeak()`** → **`setRows(weakRows())`**.
- **`pickUpTo()`**: busca el índice de la última fila básica practicada, pone la pestaña en `basic` y llama a `setRows` con las filas `0 … max(2, último + 1)`.
- **`clear()`** → `setRows([])`.
- **`setRows(ids)`** (privado): `selected.set` + `save`. Todos los caminos guardan al momento: no hay botón de guardar.

### 4. Tabla y ficha

1. La plantilla recorre `rows()`; cada celda vacía (`null`) se pinta como `.empty-cell`.
2. **`box(char)`** → `progressSVC.box('k:<char>')` (o `-1`) para `data-box`.
3. Tocar una celda → **`open(kana)`**: `detail.set(kana)` y `speechSVC.speak(kana.char)`.
4. La ficha (`@if (detail(); as kana)`) llama a:
   - **`twin(kana)`**: `toHiragana` / `toKatakana` de wanakana.
   - **`tip(kana)`**: `KATAKANA_TIPS` o `HIRAGANA_TIPS` con el primer carácter (`[...kana.char][0]`), por eso きゃ usa el truco de き.
   - **`lookalikes(kana)`**: grupos de `*_LOOKALIKES` que incluyen el carácter, hasta `MAX_DETAIL_LOOKALIKES` (**2**).
   - **`examples(kana)`**: solo katakana; `LOANWORDS` que contienen el carácter, hasta `MAX_DETAIL_EXAMPLES` (**3**).
5. El fondo (`.sheet-backdrop`) cierra con `detail.set(null)`; la hoja para la propagación del clic.

### 5. Lanzar una práctica

- **`go(mode)`**: `router.navigate(['/kana', script, 'practica', mode], { queryParams: { rows: rowsParam() } })`. Lo usan Quiz mixto, los cuatro modos y Parecidos.
- Memorama, Trazar y Contrarreloj son `routerLink` con los mismos `rows`. Al ser enlaces, se «desactivan» con la clase `.off` (`pointer-events: none`), no con `disabled`.

### 6. Salida

Nada que limpiar. La selección ya está guardada en cada cambio.

### Estilos

[kana-chart.component.scss](../../../src/app/views/kana/views/kana-chart/kana-chart.component.scss), por secciones:

- **Tabla**: `.krow` es una cuadrícula de `34px` + `var(--cols)` columnas; `--cols` lo pone la plantilla con `[style.--cols]`.
- **Punto de color**: `.cell::after` según `data-box`.
- **Barra de práctica** (`.dock`): `position: sticky` con `bottom` = alto de la barra de pestañas + zona segura, y un margen inferior negativo para pegarse a ella sin dejar hueco.
- **Ficha**: `.det-*`, `.tipbox`, `.warn`, `.lk .me` (el símbolo actual resaltado entre sus parecidos).
