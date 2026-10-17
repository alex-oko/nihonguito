# Lienzo de trazo (`app-trace-pad`)

Lienzo cuadrado para trazar con el dedo un carácter sobre una guía tenue (letra Klee One), con una cruz de referencia. Lo usa el [trazo de kanji](../views/kanji/kanji-trace.md); el trazo de kana tiene su propio lienzo con el mismo código.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [trace-pad.component.ts](../../src/app/components/trace-pad/trace-pad.component.ts) | Pincel, eventos del puntero y `clear()`. |
| [trace-pad.component.html](../../src/app/components/trace-pad/trace-pad.component.html) | Guía, cruz y `<canvas>`. |
| [trace-pad.component.scss](../../src/app/components/trace-pad/trace-pad.component.scss) | Cuadrado de hasta el 55 % del alto y estados de la guía. |

### Uso

```html
<app-trace-pad [char]="info.char" [guide]="guide()" />
```

| Input | Qué hace |
|---|---|
| `char` (obligatorio) | Carácter de la guía. |
| `guide` | `show` (tenue, para copiar), `hide` (de memoria) o `reveal` (resaltada en el color de acento, para comparar). |

El padre borra el lienzo con `viewChild(TracePadComponent)` → `clear()`.

---

## Recorrido del código paso a paso

1. `afterNextRender` → **`resize()`**: ajusta la resolución a `devicePixelRatio` (sin eso el trazo se ve borroso) y prepara el pincel con el color `--ink` del tema; grosor = el mayor entre `MIN_LINE_WIDTH` (**8**) y el ancho entre `LINE_WIDTH_DIVISOR` (**30**).
2. **`startStroke`** captura el puntero (para seguir aunque el dedo salga del lienzo) y pinta un punto; **`continueStroke`** une con el punto anterior; **`endStroke`** termina.
