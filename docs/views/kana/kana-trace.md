# Trazar kana (`/kana/:script/trazar`)

Escribir cada símbolo con el dedo en tres pasos: copiarlo sobre una guía, hacerlo de memoria y compararlo con la guía. El propio usuario decide si le salió. Usa los kana de las filas elegidas en la [tabla](kana-chart.md) y los trucos de [kana.utils.ts](../../../src/app/utils/kana.utils.ts) ([su doc](../../utils/kana.utils.md)). Forma parte del [hub de kana](kana.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kana-trace.component.ts](../../../src/app/views/kana/views/kana-trace/kana-trace.component.ts) | Lista de símbolos, dibujo en el `<canvas>`, pasos y puntuación |
| [kana-trace.component.html](../../../src/app/views/kana/views/kana-trace/kana-trace.component.html) | Cabecera con progreso, romaji, lienzo con guía, truco y botones de cada paso |
| [kana-trace.component.scss](../../../src/app/views/kana/views/kana-trace/kana-trace.component.scss) | Lienzo cuadrado con la guía detrás y la cruz de referencia |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `addXp`, `finishSession` |
| [sfx.service.ts](../../../src/app/services/sfx.service.ts) | Sonidos `tap`, `ok`, `done` |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | Pronunciar el símbolo |

La ruta lleva `data: immersive`. Se abre desde **Trazar** en la tabla y desde el paso «Traza de memoria» del [laboratorio](katakana-lab.md) (con `rows=a,k,s,t,n`).

### Qué hace el usuario

- **✕** (arriba): sale con `location.back()`, sin guardar nada más.
- **Altavoz**: vuelve a pronunciar el símbolo. Se pronuncia solo al entrar y al pasar al siguiente.
- **Dibujar** sobre el lienzo con dedo, lápiz o ratón. Un toque sin arrastrar deja un punto.
- **Borrar**: limpia el lienzo sin cambiar de paso.
- Pasos:
  1. **Copia sobre la guía** (guía al 10 % de opacidad) → **Siguiente paso** borra el lienzo.
  2. **Ahora de memoria** (guía oculta) → **Comprobar**.
  3. **¿Se parece?** (guía al 22 % y en color de acento, encima de tu trazo) → **Repetir** vuelve al paso 1 con el mismo símbolo; **¡Bien!** pasa al siguiente.
- Tras el último **¡Bien!**, la sesión termina y vuelve a la pantalla anterior.
- Debajo del lienzo sale el truco de memoria si el símbolo lo tiene.

### Reglas

- **Qué se traza**: los kana de las filas elegidas **sin combinados ni extranjeros** (son dos caracteres). Si no queda ninguno, la fila あ/ア. La lista se baraja.
- **XP**: `XP_PER_KANA` (**2**) por cada **¡Bien!**. **Repetir** no da ni quita nada.
- Al terminar: `finishSession()` (cuenta una sesión).
- **No toca Leitner**: trazar no registra respuestas en `mastery`.
- **Truco**: solo los básicos tienen; los de tenten (が, ば…) quedan sin truco.

### Datos guardados

No escribe directamente. A través de `ProgressService`: XP y racha (`nihongo:stats`, `nihongo:activity`) y el contador de sesiones.

---

## Recorrido del código paso a paso

Todo empieza en [kana-trace.component.ts](../../../src/app/views/kana/views/kana-trace/kana-trace.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta carga `KanaTraceComponent`; `:script` → `script`, `?rows=` → `rows`.
2. **`list`** (`computed`): `allKana(script, rowIds)` sin `yoon` ni `extended`, con la fila `a` como reserva, y `shuffle`. **`current`** = `list()[index()]`. **`tip`** = truco del primer carácter de `current` en `KATAKANA_TIPS` o `HIRAGANA_TIPS` (o `''`).
3. **`constructor`** → `afterNextRender`: el lienzo necesita su tamaño real en pantalla, que solo existe tras el primer render.
   - **`resize()`**: ajusta `canvas.width/height` al tamaño en CSS × `devicePixelRatio` (sin eso el trazo se ve borroso en pantallas retina), escala el contexto, pone pincel redondo con grosor `max(10, ancho / 26)` y color `--ink` del tema (o `#222`).
   - `setTimeout(speak, FIRST_SPEAK_DELAY_MS)` (**300 ms**): pronuncia el primer símbolo con la pantalla ya pintada.

### 2. Dibujar

El lienzo es un `<canvas #canvas>` con eventos de puntero (sirven para dedo, lápiz y ratón). El estado del trazo (`isDrawing`, `lastPoint`) son campos normales, no signals: cambian en cada `pointermove` y la plantilla no los pinta.

1. **`startStroke(event)`** (`pointerdown`): `isDrawing = true`, `setPointerCapture` (para seguir recibiendo eventos aunque el dedo salga del lienzo), guarda `lastPoint` con **`pointFromEvent`** y pinta un círculo del grosor del pincel.
2. **`continueStroke(event)`** (`pointermove`): si está dibujando, una línea de `lastPoint` al punto nuevo.
3. **`endStroke()`** (`pointerup`, `pointercancel`, `pointerleave`): corta el trazo.
4. **`clear()`**: `clearRect` de todo el lienzo.

`.pad` lleva `touch-action: none` para que arrastrar el dedo no haga scroll.

### 3. Pasos

- `step` = `'copy'` → **`toMemory()`**: `clear()` y `step = 'memory'`.
- `step` = `'memory'` → **Comprobar**: `step = 'check'` (directo en la plantilla).
- La guía (`.guide`) cambia con clases: `hidden` en `memory`, `reveal` en `check`.

### 4. Puntuar

**`rate(isCorrect)`** (desde `check`), siempre empieza con `clear()`:

1. **Repetir** (`false`): `step = 'copy'` y sonido `tap`.
2. **¡Bien!** (`true`): sonido `ok`, `correctCount++` y `addXp(XP_PER_KANA)`.
3. Si era el último: sonido `done`, `finishSession()` y `location.back()`.
4. Si no: `index + 1`, `step = 'copy'` y pronuncia el siguiente tras `NEXT_SPEAK_DELAY_MS` (**200 ms**) para que no se pise con el sonido de acierto.

### 5. Salida

No hay `ngOnDestroy`. Los `setTimeout` de pronunciar son cortos y no se cancelan.

### Estilos

[kana-trace.component.scss](../../../src/app/views/kana/views/kana-trace/kana-trace.component.scss):

- **`.pad`**: cuadrado (`aspect-ratio: 1`, máximo 60 % del alto), con `touch-action: none`.
- Dentro, por capas: **`.guide`** (el símbolo enorme, `pointer-events: none`, con transición de opacidad), **`.cross`** (dos líneas centrales hechas con `linear-gradient`) y el **`canvas`** encima de todo.
