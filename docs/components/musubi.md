# Musubi (`app-musubi` y `app-musubi-say`)

Musubi es la mascota de la app: el onigiri del icono (`public/logo.svg`) dibujado en SVG, con once estados de ánimo, cuatro etapas de crecimiento y ropa. `app-musubi` lo pinta; `app-musubi-say` lo pone al lado de un bocadillo de texto. Si no se le pasa etapa ni ropa, enseña **la mascota del usuario**, leída de [`PetService`](../views/pet-house/pet.service.md). Donde vive y se cuida es la [casa de Musubi](../views/pet-house/pet-house.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [musubi.component.ts](../../src/app/components/musubi/musubi.component.ts) | Inputs, etapa y ropa efectivas, cara que se ve y toque |
| [musubi.component.html](../../src/app/components/musubi/musubi.component.html) | El SVG: sombra, caja bentō, cuerpo, caras, ropa y efectos |
| [musubi.component.scss](../../src/app/components/musubi/musubi.component.scss) | Colores del dibujo, qué partes enseña cada ánimo y sus animaciones |
| [musubi-say.component.ts](../../src/app/components/musubi-say/musubi-say.component.ts) | Musubi + bocadillo; reenvía `mood`, `size` y `poke` |
| [musubi-say.component.html](../../src/app/components/musubi-say/musubi-say.component.html) | `<app-musubi>` y el bocadillo con `<ng-content />` |
| [musubi-say.component.scss](../../src/app/components/musubi-say/musubi-say.component.scss) | El bocadillo y su pico apuntando a Musubi |
| [pet.interface.ts](../../src/app/interfaces/pet.interface.ts) | `MusubiMood` |
| [pet.service.ts](../../src/app/services/pet.service.ts) | `stageIndex()` y `state().wearing`, los valores por defecto ([su doc](../views/pet-house/pet.service.md)) |

Dónde aparece: `app-musubi` en Inicio (tarjeta de la casa, con `petSVC.baseMood()`), Kana, Perfil, la casa de Musubi y el feedback de `app-question-runner`; `app-musubi-say` en `app-result-screen`, Exámenes, Inicio y la tabla de kana.

### Inputs y outputs

`app-musubi`:

| Nombre | Tipo | Por defecto | Para qué |
|---|---|---|---|
| `mood` | `MusubiMood` | `'idle'` | Cara y animación ([tabla](#estados-de-ánimo)) |
| `size` | número | `64` | Ancho y alto del SVG en px |
| `wearing` | `string[]` o `undefined` | `undefined` | Ids de ropa a pintar; sin él, la que lleva puesta la mascota del usuario. `[]` lo pinta sin ropa |
| `stage` | número o `undefined` | `undefined` | Etapa 0–3; sin él, `petSVC.stageIndex()` |
| `tappable` | booleano | `true` | Si un toque lo hace saltar. La casa lo pone a `false` porque gestiona ella las caricias |
| `poke` | output | | Se emite en cada toque (solo con `tappable`) |

`app-musubi-say` tiene `mood`, `size` y `poke` (los pasa tal cual a `app-musubi`) y proyecta el texto: `<app-musubi-say mood="happy">¡Bien!</app-musubi-say>`. El bocadillo lleva el título fijo «MUSUBI» y `role="status"`, para que un lector de pantalla lo anuncie.

### Qué hace el usuario

- **Tocar a Musubi** (si `tappable`): pone la cara `happy` durante **1 s** (`TAP_HOP_DURATION_MS`), vuelve al `mood` del input y emite `poke`.
- No hay más interacción: el resto lo decide el componente padre con los inputs.

### Estados de ánimo

Todas las piezas de la cara llevan la clase `f` y están ocultas (`display: none`). Cada ánimo enseña las suyas con un selector `[data-mood='…']` sobre el SVG:

| `mood` | Ojos | Boca | Extra | Animación |
|---|---|---|---|---|
| `idle` | `open` | `smile` | | `bob` (flota, 3,2 s) |
| `happy` | `arcs` | `grin` | `sparks` | `hop` ×2 y luego `bob` |
| `wow` | `open` | `o` | | `bob` |
| `oops` | `open` | `sad` | `drop` (gota) | `wobble` ×2; a los **1,3 s** vuelve a `idle` |
| `eat` | `arcs` | `chew` (masca) | | `bob` + `chew` |
| `sad` | `open` | `sad` | `brows` | `wobble` ×2 |
| `hungry` | `open` | `o` | `drop` | `bob` |
| `sleep` | `closed` | `calm` | `zz` | `breathe` |
| `sleepy` | `half` | `calm` | | `bob` |
| `love` | `hearts` | `grin` | mejillas más rojas | `sway` |
| `laugh` | `squint` | `laughm` | mejillas más rojas | `giggle` |

Con `prefers-reduced-motion: reduce` no hay ninguna animación.

> `oops` es el único ánimo que se quita solo: lo usa el feedback de una respuesta incorrecta y Musubi no debe quedarse triste mientras se lee la explicación. El resto dura lo que el padre mantenga el input.

### Etapas

La etapa viene de `stage()` o, si no hay, de `petSVC.stageIndex()` (XP total, ver [`STAGES`](../views/pet-house/pet.service.md#constantes)).

| Etapa | Nombre | Escala (`STAGE_SCALE`) | Qué se pinta |
|---|---|---|---|
| 0 | Granito | 0,78 | Arroz con 7 granos, sombra en el suelo |
| 1 | Onigiri | 0,9 | 7 granos + 8 semillas de ajonjolí (`sesame`) |
| 2 | Con alga | 1 | 4 granos y el alga (`nori`) con に |
| 3 | Bentō | 1 | Como la 2, dentro de una caja bentō: fondo y guarniciones detrás, frente de la caja delante; sin sombra |

Las etapas 0 y 1 se encogen alrededor de `512 792` (el centro de la base del onigiri), así la ropa, que está dibujada para el tamaño completo, sigue en su sitio relativo.

### Ropa

Cada prenda es un `@if (isWearing('<id>'))` en la plantilla. Las zonas (`slot`) las define [`ITEMS`](../views/pet-house/pet.service.md#constantes): una prenda por zona la garantiza `PetService.wear`, no este componente (si se le pasan dos sombreros, pinta los dos).

| Zona | Ids |
|---|---|
| `head` | `hoja`, `lazo`, `hachimaki`, `sombrero`, `gorro`, `corona` |
| `face` | `lentes` |
| `neck` | `bufanda`, `pajarita` |

---

## Recorrido del código paso a paso

Todo empieza en [musubi.component.ts](../../src/app/components/musubi/musubi.component.ts); los nombres son buscables.

### 1. Arranque

1. **`constructor`** registra un `effect` que lee `mood()`:
   1. Dentro de `untracked` (para que el `effect` dependa solo del input, no de `shownMood`, que escribe él mismo) cancela `moodTimer` y copia el ánimo a **`shownMood`**.
   2. Si es `oops`, programa la vuelta a `idle` a los `OOPS_DURATION_MS` (**1300 ms**).
2. La plantilla pone `shownMood()` en `data-mood` del SVG; el SCSS hace el resto.

### 2. Lo que se pinta

- **`currentStage`** = `stage() ?? petSVC.stageIndex()`.
- **`wornItems`** = `wearing() ?? petSVC.state().wearing`.
- **`bodyTransform`**: sube todo el cuerpo 14 unidades (`translate(0 -14)`) y, con escala distinta de 1, añade el `scale` alrededor de `512 792`.
- **`isWearing(id)`**: `wornItems().includes(id)`.

El orden del SVG es el orden de capas: sombra → fondo de la caja bentō → cuerpo (`rice`, `grain`, `sesame`, `nori`) → contorno y mejillas → ojos → bocas → ropa → frente de la caja → efectos (`drop`, `sparks`, `zz`).

### 3. Toque

**`onTap()`**: si `tappable()` es `false` no hace nada. Si no, cancela `moodTimer`, pone `happy`, programa la vuelta a `mood()` a los **1000 ms** y emite `poke`.

### 4. Salida

No hay `ngOnDestroy`: si el componente se destruye con `moodTimer` pendiente, el `setTimeout` escribe en un signal ya sin vista (inofensivo).

### Estilos

[musubi.component.scss](../../src/app/components/musubi/musubi.component.scss), en bloques:

- **Contenedor y SVG**: `inline-flex`, `overflow: visible` (la ropa y los efectos salen del `viewBox`) y la animación `bob` por defecto.
- **Colores de las piezas**: una clase por pieza (`rice`, `grain`, `nori`, `ln` para trazos…). Los colores son fijos, no dependen del tema.
- **Caras**: `.f { display: none }` y la lista de `[data-mood]` de la [tabla](#estados-de-ánimo).
- **Animación de cada ánimo** y **keyframes**.

[musubi-say.component.scss](../../src/app/components/musubi-say/musubi-say.component.scss): `:host` en fila alineado abajo; `.bubble` con esquina inferior izquierda casi recta y un `::before` recortado con `clip-path` como pico.
