# Reloj de juego (`app-game-timer`)

Reloj reutilizable con dos modos: **cuenta atrás** (tiempo restante y una barra que se vacía, con alarma en los últimos segundos) y **cronómetro** (una píldora con el tiempo transcurrido). No sabe nada del juego: el padre le pasa un momento de referencia (`anchor`) y si está corriendo.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [game-timer.component.ts](../../src/app/components/game-timer/game-timer.component.ts) | Cálculo del tiempo, alarma, texto y etiqueta accesible |
| [game-timer.component.html](../../src/app/components/game-timer/game-timer.component.html) | Barra de cuenta atrás o píldora de cronómetro |
| [game-timer.component.scss](../../src/app/components/game-timer/game-timer.component.scss) | Estilos de los dos modos y el parpadeo de alarma |

**Quién lo usa**:

| Componente | Modo | Entradas |
|---|---|---|
| [`app-speed-game`](speed-game.md) | `countdown` | `totalMs` = 60 000, `anchor` = fin de la partida, `running` en juego, `frozenMs` = tiempo restante |
| [`app-match-game`](match-game.md) | `stopwatch` | `anchor` = inicio, `running` siempre `true`, `compact` |
| `level-sheet` (examen de nivel) | `stopwatch` | `anchor` = inicio del borrador, `running` hasta corregir, `frozenMs` = tiempo final, `compact` |

### API

| Input | Por defecto | Para qué |
|---|---|---|
| `mode` | `'countdown'` | `'countdown'` o `'stopwatch'` |
| `totalMs` | `60000` | Duración total; solo para el ancho de la barra |
| `anchor` | `null` | Cuenta atrás: momento en que se acaba. Cronómetro: momento en que empezó |
| `running` | `false` | Si corre. Parado, muestra `frozenMs` |
| `frozenMs` | `0` | Valor mostrado mientras no corre |
| `lowAtMs` | `10000` | Cuenta atrás: milisegundos desde los que entra en alarma |
| `compact` | `false` | Hoy no se usa en la plantilla |

### Reglas

- **Texto** «m:ss»: la cuenta atrás redondea los segundos **hacia arriba** (con 0,4 s quedan «0:01», no «0:00»); el cronómetro, hacia abajo.
- **Alarma** (`isLow`): solo en cuenta atrás, con el tiempo ≤ `lowAtMs` mientras corre, o al llegar a 0. El tiempo se pone rojo y la barra parpadea.
- **Accesibilidad**: `role="timer"` y `aria-label` «Quedan N segundos» / «Tiempo: N segundos».

### Datos guardados

Ninguno.

---

## Recorrido del código paso a paso

Todo está en [game-timer.component.ts](../../src/app/components/game-timer/game-timer.component.ts); los nombres son buscables.

### 1. El pulso

El `effect` del `constructor` depende de `running()`: limpia el intervalo anterior y, si corre, pone `now` a la hora actual y la refresca cada `REFRESH_MS` (**40 ms**, 25 fps). Es suficiente para que el número cambie en el momento justo y sigue funcionando cuando el navegador limita los frames en segundo plano. Al pasar a parado, solo limpia.

### 2. Lo que se pinta

1. **`displayMs`**: parado o sin `anchor`, `frozenMs`; corriendo, `anchor − now` (cuenta atrás) o `now − anchor` (cronómetro), nunca negativo.
2. **`percent`**: `displayMs / totalMs`, entre 0 y 100 (ancho de la barra).
3. **`isLow`**, **`timeText`** y **`ariaLabel`**: según las [reglas](#reglas). `padTwoDigits` rellena los segundos a dos cifras.

### 3. Salida

**`ngOnDestroy`**: limpia el intervalo.

### Estilos

[game-timer.component.scss](../../src/app/components/game-timer/game-timer.component.scss): `.base` es la tarjeta de la cuenta atrás con su `.track`; `.base.low` pone el tiempo y la barra en `--bad` y la barra parpadea con la animación global `blink`; `.watch` es la píldora del cronómetro. Los números usan `font-variant-numeric: tabular-nums` para que no bailen al cambiar.
