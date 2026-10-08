# Tarjetas (`app-flashcards`)

Tarjetas de vocabulario para aprender palabras nuevas: se ve la palabra, se voltea para ver la lectura en romaji y el significado, y se desliza a la derecha si se sabe o a la izquierda para repasarla. Es el modo «Aprender» de una lección (`lesson-practice` con `mode = 'learn'`).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [flashcards.component.ts](../../src/app/components/flashcards/flashcards.component.ts) | Cola de palabras, volteo, gesto de arrastre, respuestas, audio |
| [flashcards.component.html](../../src/app/components/flashcards/flashcards.component.html) | Cabecera con progreso, tarjeta, botones y pantalla final |
| [flashcards.component.scss](../../src/app/components/flashcards/flashcards.component.scss) | Tarjeta, animación de salida y sellos «¡La sé!» / «Repasar» |
| [questions.utils.ts](../../src/app/utils/questions.utils.ts) | `wordMain` (forma con kanji) y `wordReading` (lectura en kana) |

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `words` | `input.required<Word[]>` | Las palabras. Una lista nueva reinicia la ronda |
| `title` | `input` (`'Tarjetas'`) | Hoy no se pinta |
| `lessonId` | `input<number \| null>` | A dónde lleva «Ahora ponte a prueba» |
| `again` | `output<void>` | «Otra ronda de tarjetas» |

### Qué hace el usuario

- **Tocar la tarjeta**: la voltea (romaji y significado). No voltea si el toque es el final de un arrastre.
- **Arrastrar**: la tarjeta sigue al dedo y gira (`dragX / 20` grados). Pasados 40 px sale el sello «¡La sé!» o «Repasar»; al soltar pasados **90 px** (`SWIPE_THRESHOLD_PX`) responde; si no, vuelve al centro.
- **Botones** «Repasar» / «¡La sé!»: lo mismo que deslizar.
- **Altavoz** de la tarjeta: lee la palabra sin voltearla.
- **Pantalla final**: «Ahora ponte a prueba» lleva a `/lecciones/<id>/practica/meaning` (con `replaceUrl`); sin lección, vuelve atrás. «Otra ronda de tarjetas» emite `again`.

### Reglas

- **XP**: 3 por «¡La sé!» (`XP_KNOWN`) y 1 por «Repasar» (`XP_REVIEW`), en cada respuesta, también en las repetidas.
- **Repetición**: una palabra marcada para repasar vuelve **una vez** al final de la cola (`retriedIds`).
- **Dominio**: solo la primera respuesta de cada palabra llama a `recordAnswer('w:<id>', …)` y cuenta en «que ya sabías» / «para repasar».
- **Insignia de tipo**: `TYPE_LABEL` traduce el tipo de palabra (`verb` → «verbo», `i-adj` → «adjetivo い»…).
- La lectura en kana bajo la palabra solo sale si difiere de la forma principal y el ajuste de escritura es `kanji`.

### Datos guardados

A través de [`ProgressService`](../services/progress.service.md): `nihongo:mastery`, `nihongo:stats` y `nihongo:answerLog` en cada primera respuesta; `nihongo:activity` con cada XP; `nihongo:stats` (sesiones) al acabar la ronda.

---

## Recorrido del código paso a paso

Todo está en [flashcards.component.ts](../../src/app/components/flashcards/flashcards.component.ts); los nombres son buscables.

### 1. Arranque

El `effect` del `constructor` lee `words()` y, en `untracked`, copia la lista en `queue`, pone a cero `index`, `knownCount`, `reviewCount` y `retriedIds`, y llama a **`show`**.

**`show()`**: tarjeta boca arriba (`isFlipped = false`), sin arrastre ni dirección de salida; cancela el audio pendiente y programa la lectura de la palabra a los `AUTOPLAY_DELAY_MS` (**200 ms**). La palabra se lee **al disparar** el timer (`this.current()`), no al programarlo: así un deslizamiento rápido nunca reproduce la palabra anterior.

### 2. Gesto de arrastre

1. **`onPointerDown`**: guarda `pointerStartX` y `hasMoved = false`.
2. **`onPointerMove`**: `dragX` = desplazamiento; si pasa de `DRAG_START_PX` (**8 px**), `hasMoved = true`.
3. **`onPointerUp`** (también en `pointercancel`): responde o devuelve la tarjeta, y limpia `hasMoved` en un `setTimeout` sin espera. El `click` llega **después** del `pointerup`: si se limpiara ya, **`flip`** creería que fue un toque y voltearía la tarjeta al soltarla.

### 3. Responder

**`answer(isKnown)`** (ignora toques mientras la tarjeta sale, `leavingDirection`):

1. Primera respuesta de la palabra: `recordAnswer` y suma a `knownCount` o `reviewCount`.
2. `addXp` y sonido (`ok` o `tap`).
3. Si es «Repasar» y no se había repetido, la palabra vuelve al final de `queue`.
4. `leavingDirection` activa la animación `.go-right` / `.go-left`; a los `LEAVE_ANIMATION_MS` (**220 ms**) avanza `index`. Si ya no hay tarjeta, suena `done` y `finishSession`. Después, `show`.

### 4. Final

Sin `current()` la plantilla enseña おつかれさま, el recuento y los dos botones. **`toQuiz`** navega a la práctica de significado de la lección o vuelve atrás.

### Estilos

[flashcards.component.scss](../../src/app/components/flashcards/flashcards.component.scss): `.fc` lleva `touch-action: pan-y` para que el arrastre horizontal no haga scroll; `.go-right` / `.go-left` usan `!important` porque tienen que ganar al `transform` en línea que pone el arrastre; `.stamp` son los sellos girados.
