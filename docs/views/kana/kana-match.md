# Memorama de kana (`/kana/:script/memorama`)

Juego de parejas kana ↔ romaji con las filas elegidas en la [tabla](kana-chart.md). Esta vista solo **arma las parejas**; el tablero, los aciertos y el registro en Leitner son de `app-match-game`. Forma parte del [hub de kana](kana.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kana-match.component.ts](../../../src/app/views/kana/views/kana-match/kana-match.component.ts) | Título y `pairs` (las parejas, barajadas) |
| [kana-match.component.html](../../../src/app/views/kana/views/kana-match/kana-match.component.html) | Solo `<app-match-game>` |
| [kana-match.component.scss](../../../src/app/views/kana/views/kana-match/kana-match.component.scss) | Vacío: sin estilos propios |
| [match-game.component.ts](../../../src/app/components/match-game/match-game.component.ts) | El juego: tablero, emparejar, registro en `mastery` y botón «Otra vez» |
| [match-game.interface.ts](../../../src/app/interfaces/match-game.interface.ts) | `MatchPair` |
| [text.utils.ts](../../../src/app/utils/text.utils.ts) | `sample`: elige N elementos al azar |

La ruta lleva `data: immersive`. Se abre desde **Memorama** en la barra de práctica de la tabla, con `?rows=…`.

### Qué hace el usuario

- Empareja cada kana con su romaji (lo gestiona `app-match-game`). Cada kana se puede escuchar.
- **Otra vez**: saca otra muestra de parejas de las mismas filas.

### Reglas

- Como máximo `MAX_PAIRS` (**15**) parejas por partida.
- Si las filas elegidas dan menos de `MIN_KANA` (**5**) símbolos, se usan las filas あ, か y さ (`['a', 'k', 's']`): con menos el juego no tiene gracia.
- La parte derecha es el romaji principal (`romaji[0]`).
- Cada pareja lleva `track: 'k:<carácter>'`: `app-match-game` registra en Leitner un acierto si la pareja salió sin fallos y un fallo si se equivocó antes.

### Datos guardados

Esta vista no guarda nada. `app-match-game` escribe en `nihongo:mastery` a través de `ProgressService.recordAnswer`.

---

## Recorrido del código paso a paso

Todo está en [kana-match.component.ts](../../../src/app/views/kana/views/kana-match/kana-match.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta carga `KanaMatchComponent`; `:script` → `script`, `?rows=` → `rows`.
2. **`title`**: «Parejas カタカナ» o «Parejas ひらがな».

### 2. Las parejas

**`pairs`** (`computed<MatchPair[]>`):

1. Lee `seed()` solo como dependencia: cambiarlo fuerza a recalcular.
2. Parte `rows` por comas y saca `allKana(script, rowIds)`.
3. Si quedan menos de `MIN_KANA`, cambia a las filas `a`, `k`, `s`.
4. `sample(list, min(MAX_PAIRS, list.length))` y convierte cada kana en `MatchPair`: `id` y `left` = carácter, `right` = romaji, `speak` = carácter, estilos `jp-big` / `es` y `track`.

`app-match-game` empieza una partida nueva cada vez que recibe parejas nuevas.

### 3. Otra vez

`app-match-game` emite `again` y la plantilla hace `seed.set(seed() + 1)`. `pairs` se recalcula con otra muestra al azar y el juego se reinicia.

### 4. Salida

Nada que limpiar en esta vista.

### Estilos

Sin estilos propios: [kana-match.component.scss](../../../src/app/views/kana/views/kana-match/kana-match.component.scss) solo lleva un comentario.
