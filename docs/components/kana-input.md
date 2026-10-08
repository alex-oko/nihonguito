# Campo de kana (`app-kana-input`)

Campo de texto que convierte **romaji a hiragana o katakana mientras escribes**, para responder en japonés sin teclado japonés. También acepta kana escrito directamente. La conversión la hace la librería [wanakana](https://github.com/WaniKani/WanaKana) (`bind` / `unbind`).

Lo usan el quiz genérico (`app-question-runner`, en las preguntas de escribir) y el reproductor de conversaciones.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kana-input.component.ts](../../src/app/components/kana-input/kana-input.component.ts) | Engancha wanakana, sincroniza el valor y expone `read()` y `clear()` |
| [kana-input.component.html](../../src/app/components/kana-input/kana-input.component.html) | Un `<input #field>` sin autocorrección ni autocompletado |
| [kana-input.component.scss](../../src/app/components/kana-input/kana-input.component.scss) | Campo centrado; fuente japonesa más grande en modo kana |

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `mode` | `input<'kana' \| 'katakana' \| 'romaji' \| 'es'>`, por defecto `'kana'` | `kana` convierte a hiragana, `katakana` a katakana; `romaji` y `es` dejan el texto tal cual |
| `placeholder` | `input<string>` | Texto de ayuda |
| `disabled` | `input<boolean>` | Deshabilita el campo (por ejemplo, tras responder) |
| `value` | `model<string>` | El texto; admite `[(value)]` |
| `enter` | `output<void>` | Se emite al pulsar Intro |
| `read()` | método público | Devuelve el valor final (ver abajo) |
| `clear()` | método público | Vacía el campo y le devuelve el foco |
| `sync()` | método público | Lo llama la plantilla en cada `input` |

Uso típico (reproductor de conversaciones):

```html
<app-kana-input #kinput mode="kana" placeholder="escribe en romaji…" [(value)]="typed" (enter)="typeAnswer()" />
```

y en el componente `viewChild<KanaInputComponent>('kinput')` para llamar a `read()` al comprobar y a `clear()` al pasar a la siguiente.

### Qué hace el usuario

- Escribe en romaji: `ka` → か, `kyo` → きょ, `-` → ー. En modo `katakana`, カ, キョ…
- **Intro**: emite `enter` (el padre comprueba la respuesta).
- El campo recibe el foco al aparecer, sin hacer scroll.

### Reglas

- Una **«n» final** se queda sin convertir mientras escribes (wanakana espera a ver si viene `na`, `ni`…). **`read()`** la convierte en ん (o ン en katakana) antes de devolver el valor. Por eso el padre debe comprobar con `read()` y no con `value`.
- El modo se lee **una sola vez**, al primer render.

### Datos guardados

Ninguno.

---

## Recorrido del código paso a paso

Todo está en [kana-input.component.ts](../../src/app/components/kana-input/kana-input.component.ts); los nombres son buscables.

### 1. Arranque

**`constructor`** → `afterNextRender` (wanakana necesita el elemento ya en el DOM):

1. Lee el `<input>` con `inputRef` (`viewChild.required('field')`).
2. Con `mode` `kana` o `katakana`: `bind(field, { IMEMode: 'toHiragana' | 'toKatakana' })` y `isBound = true`.
3. Copia `value()` al campo y le da el foco con `preventScroll: true`.

### 2. Mientras se escribe

**`sync()`** (evento `input`): wanakana reescribe el valor del campo **después** del evento, así que se lee en el siguiente tick con `setTimeout` y se copia a `value`.

### 3. Leer la respuesta

**`read()`**:

1. Toma el texto del campo.
2. Si wanakana está enganchado, cambia una `n` final por ん/ン y la escribe también en el campo.
3. `value.set(texto)` y lo devuelve.

### 4. Limpiar

**`clear()`**: vacía el campo y `value`, y devuelve el foco tras `REFOCUS_DELAY_MS` (**30 ms**). La espera es porque el padre suele rehabilitar el campo (`disabled = false`) en el mismo gesto, y un campo deshabilitado no acepta el foco hasta que pasa la detección de cambios.

### 5. Salida

**`ngOnDestroy`**: si estaba enganchado, `unbind`. Va en `try/catch` porque el elemento puede haber desaparecido ya.

### Estilos

[kana-input.component.scss](../../src/app/components/kana-input/kana-input.component.scss): `:host` en bloque, `.field` a todo el ancho, centrado y con borde que se oscurece al enfocar; `.jp` (modos `kana` y `katakana`) usa `--font-jp` a 1.5rem.
