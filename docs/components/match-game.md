# Parejas (`app-match-game`)

Juego de unir: dos columnas barajadas (japonés a la izquierda, significado a la derecha) y hay que tocar una ficha de cada lado que formen pareja. Va por rondas de 5, con cronómetro y una pantalla final con errores, tiempo y XP.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [match-game.component.ts](../../src/app/components/match-game/match-game.component.ts) | Rondas, selección, comprobación de parejas, XP y dominio |
| [match-game.component.html](../../src/app/components/match-game/match-game.component.html) | Cabecera, cronómetro, columnas y pantalla final |
| [match-game.component.scss](../../src/app/components/match-game/match-game.component.scss) | Fichas y sus estados (`.sel`, `.done`, `.err`) |
| [match-game.interface.ts](../../src/app/interfaces/match-game.interface.ts) | `MatchPair` (lo que recibe) y `MatchCard` (cada ficha en pantalla) |
| [game-timer.component.ts](../../src/app/components/game-timer/game-timer.component.ts) | El cronómetro ([su doc](game-timer.md)) |

**Quién lo usa**: [`game-host`](../views/game-host/game-host.md) (`/juego/parejas`, palabras de las lecciones elegidas), `lesson-practice` (modo `match`) y `kana-match` (kana ↔ romaji).

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `pairs` | `input.required<MatchPair[]>` | Las parejas, en orden. Unas nuevas reinician la partida |
| `title` | `input` (`'Parejas'`) | Va en la línea «<título> · ronda N/M» |
| `again` | `output<void>` | «Otra vez» en la pantalla final |

`MatchPair`: `id`, `left`, `right`, `speak` (texto japonés que se lee al tocar la ficha izquierda), `leftStyle` / `rightStyle` (`'jp'`, `'jp-big'`, `'es'`; por defecto `jp` y `es`) y `track` (clave de dominio: `w:<id>` o `k:<kana>`).

### Qué hace el usuario

- **Tocar una ficha**: la selecciona en su columna (tocarla otra vez la suelta). Las de la izquierda con `speak` se leen en voz alta.
- **Una de cada lado**:
  - Pareja correcta: las dos se apagan en verde y quedan desactivadas.
  - Incorrecta: la derecha parpadea en rojo 350 ms (`ERROR_FLASH_MS`) y se suelta; la izquierda sigue seleccionada para probar con otra.
- **Ronda completa**: a los 450 ms (`NEXT_ROUND_DELAY_MS`) sale la siguiente.
- **X** / **Terminar**: vuelve atrás. **Otra vez**: emite `again`.

### Reglas

- **Rondas**: `PAIRS_PER_ROUND` (**5**) parejas por ronda, en el orden recibido; `ceil(parejas / 5)` rondas. Cada columna se baraja por separado.
- **XP** al terminar: `max(5, parejas × 3 − errores × 2)` (`XP_MIN`, `XP_PER_PAIR`, `XP_PER_MISTAKE`). Con 15 parejas y 2 errores: 45 − 4 = **41 XP**.
- **Dominio**: al unir una pareja con `track`, `recordAnswer(track, correcto)`, donde correcto = la pareja no tuvo ningún error (`missedPairIds`). Un error se apunta a la pareja de la ficha **izquierda** seleccionada.
- Pantalla final: 完璧 «¡Sin errores!» con 0 errores; よし «¡Terminado!» en otro caso.

### Datos guardados

A través de [`ProgressService`](../services/progress.service.md): `nihongo:mastery`, `nihongo:stats` y `nihongo:answerLog` al unir cada pareja con `track`; `nihongo:activity` y `nihongo:stats` al terminar.

---

## Recorrido del código paso a paso

Todo está en [match-game.component.ts](../../src/app/components/match-game/match-game.component.ts); los nombres son buscables.

### 1. Arranque

El `effect` del `constructor` lee `pairs()` y llama a **`start`** en `untracked`: pone a cero ronda, errores, `matchedCount` y `missedPairIds`, marca `startedAt` (el ancla del cronómetro) y llama a **`setupRound`**.

**`setupRound()`**: corta las parejas de la ronda, crea una `MatchCard` por lado (`side: 'L'` o `'R'`, con su estilo) y baraja cada columna con `shuffle`. Vacía `matchedIds` y las selecciones.

`computed`: `roundCount`, `total`, `progressPercent` (parejas unidas / total, para la barra) y `clockText` (tiempo final «m:ss»).

### 2. Tocar fichas

**`tapCard(card)`**:

1. Selecciona o suelta en su columna (`selectedLeft` / `selectedRight`). Si es la izquierda y la pareja tiene `speak`, la lee.
2. Si falta un lado, suena `tap` y sale.
3. Mismo `pairId`: añade a `matchedIds`, suma `matchedCount`, suena `ok`, registra el dominio y suelta las dos. Si ya están todas las de la ronda, **`nextRound`** tras 450 ms.
4. Distinto: suma un error, apunta la pareja izquierda en `missedPairIds`, suena `bad`, pone `errorFlashKey` (`pairId + side` de la ficha derecha) y lo borra a los 350 ms; suelta solo la derecha.

**`isSelected(card)`** compara por referencia con la seleccionada de su columna (las fichas se crean una vez por ronda, así que la referencia es estable).

### 3. Final

**`nextRound()`**: si era la última ronda, fija `elapsedMs`, `isFinished`, calcula y da el XP, `finishSession` y suena `done`. Si no, sube la ronda y `setupRound`.

### 4. Salida

**`ngOnDestroy`**: para la voz.

### Estilos

[match-game.component.scss](../../src/app/components/match-game/match-game.component.scss): `.m.jp` y `.m.jp-big` cambian la fuente según el estilo de la ficha (la clase la pone `[class]="'m ' + card.style"`); `.sel` en índigo, `.done` en verde al 35 % y algo encogida, `.err` en rojo con la animación global `shake`.
