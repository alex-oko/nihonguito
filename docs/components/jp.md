# Texto japonés (`app-jp`)

Pinta un texto japonés según la preferencia de escritura del usuario: **solo kana**, **kanji con furigana** (la lectura en hiragana encima) o **solo kanji**. Las lecturas salen de `FuriganaService`, que las carga de `data/furigana.json` (las genera `tools/build-furigana.mjs`).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [jp.component.ts](../../src/app/components/jp/jp.component.ts) | Inputs `text` y `as`, `mode`, `segments`, `kana` |
| [jp.component.html](../../src/app/components/jp/jp.component.html) | `@switch` por modo: `<span>` o `<ruby>` con `<rt>` |
| [jp.component.scss](../../src/app/components/jp/jp.component.scss) | `:host` en línea y estilo de la furigana (`rt`) |
| [furigana.service.ts](../../src/app/services/furigana.service.ts) | `ready`, `hasKanji`, `segs`, `kana` |
| [progress.service.ts](../../src/app/services/progress.service.ts) | `settings().script`: la preferencia del usuario |

### Uso

```html
<app-jp [text]="question.prompt" />
<app-jp text="今日は 月曜日です" as="kanji" />
```

| Input | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `text` | `string` | `''` | El texto japonés |
| `as` | `'kana' \| 'furigana' \| 'kanji' \| null` | `null` | Fuerza un modo (p. ej. `'kanji'` para enseñar el original). Hoy ninguna plantilla lo pasa |

### Reglas

- **Preferencia** (`settings().script`, en Perfil): `kana` (Solo kana, el valor por defecto), `furigana` (Kanji + furigana) o `kanji` (Kanji). Se guarda en `nihongo:settings`.
- **Texto sin kanji** o **lecturas aún sin cargar** (`ready()` en `false`): se pinta tal cual (modo `plain`). Si `furigana.json` no se pudo descargar, `ready` se pone en `true` igual y los kanji sin lectura conocida se quedan como están.
- **Sin espacios entre nodos** en la plantilla: un espacio de texto entre dos `<span>` o `<ruby>` partiría la palabra. Los saltos de línea solos entre etiquetas no cuentan: Angular quita los nodos que son solo espacios (`preserveWhitespaces` está en `false`, el valor por defecto). No metas texto suelto ni `&nbsp;` entre los trozos.

---

## Recorrido del código paso a paso

En [jp.component.ts](../../src/app/components/jp/jp.component.ts):

1. **`mode`** (`computed`): `'plain'` si `furiganaSVC.ready()` es `false` o `furiganaSVC.hasKanji(text)` es `false`; si no, `as()` o, sin él, `progressSVC.settings().script`. Depende de `ready`, así que cuando llegan las lecturas el texto se repinta solo.
2. **`segments`** (`computed`): `furiganaSVC.segs(text)`: lista de trozos, cada uno texto suelto o par `[kanji, lectura]`. Ejemplo: `今日は` → `[['今日', 'きょう'], 'は']`.
3. **`kana`** (`computed`): `furiganaSVC.kana(text)`, el texto entero en kana (`きょうは`).
4. **Plantilla** (`@switch (mode())`):
   - `kana` → un `<span>` con `kana()`.
   - `furigana` → por cada trozo, `<ruby>kanji<rt>lectura</rt></ruby>` si **`isPair`** (es un array), o un `<span>` con el texto.
   - el resto (`kanji` y `plain`) → un `<span>` con el texto original.

### Estilos

[jp.component.scss](../../src/app/components/jp/jp.component.scss):

- `:host { display: inline }`: el texto fluye dentro de la frase que lo contiene.
- `rt`: la mitad del tamaño, peso normal, color `--muted`, sin espaciado extra y `user-select: none` para que al copiar el texto no se copie la furigana.
