# `FuriganaService`

Las lecturas de los kanji de toda la app. Con ellas se muestra un texto solo en kana o con el kanji y su furigana encima, según el ajuste `script` del usuario. Las lecturas las calcula de antemano `tools/build-furigana.mjs` y llegan en `public/data/furigana.json`; el servicio solo las busca y, para un texto que no venía en el archivo, lo segmenta con las lecturas de los tramos de kanji.

No decide cómo se pinta (eso es `JpComponent`) ni compara respuestas (eso es [`ReadingService`](reading.service.md), que lo usa).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [furigana.service.ts](../../src/app/services/furigana.service.ts) | El servicio |
| [furigana.interface.ts](../../src/app/interfaces/furigana.interface.ts) | `Seg`: texto suelto o par `[kanji, lectura]` |
| [app.config.ts](../../src/app/app.config.ts) | Llama a `load()` en `provideAppInitializer`, antes de pintar la app |
| [text.utils.ts](../../src/app/utils/text.utils.ts) | `setKanjiReader`, para que `romaji()` lea kanji ([su doc](../utils/text.utils.md#setkanjireaderreader)) |
| `public/data/furigana.json` | `{ t: { texto: Seg[] }, d: { tramoDeKanji: lectura } }` |
| `tools/build-furigana.mjs` | Genera el JSON con kuromoji a partir de `public/data` |

### Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `KANJI` | `/[一-鿿々〆ヵヶ]/` | Saber si un texto tiene kanji. Incluye 々 (repetición), 〆, ヵ y ヶ, que se leen como kanji |
| `KANJI_RUN` | `/[一-鿿々〆ヵヶ]+/g` | Encontrar tramos seguidos de kanji para leerlos juntos |

### Estado

| Miembro | Qué guarda |
|---|---|
| `ready` (signal) | `true` cuando terminó `load`, haya ido bien o mal |
| `texts` (privado) | `t` del JSON: textos completos ya segmentados |
| `runs` (privado) | `d` del JSON: lectura de cada tramo de kanji (`今日 → きょう`) |
| `cache` (privado) | Textos que no estaban en `texts` y se segmentaron aquí |

No guarda nada en `localStorage`. El JSON lo cachea el service worker.

### Reglas

- **Un tramo se lee entero**: 今日 es `きょう`, no `いま` + `ひ`. Por eso se busca primero el tramo completo en `runs`.
- **Si el tramo no está, el trozo más largo primero**: `readRun` prueba desde la posición actual el trozo más largo que esté en `runs`, y avanza. Un kanji suelto sin lectura conocida se deja tal cual (sin furigana).
- **Sin conexión y sin caché**: `load` falla en silencio, los kanji se muestran tal cual y `ready` se pone a `true` igual, para que nadie espere algo que no va a llegar.

---

## Recorrido paso a paso

Los nombres son buscables en [furigana.service.ts](../../src/app/services/furigana.service.ts).

### 1. Carga

1. `app.config.ts` ejecuta `inject(FuriganaService).load()` como inicializador de la app.
2. `load` hace `fetch('data/furigana.json')` y guarda `t` en `texts` y `d` en `runs`.
3. Registra `setKanjiReader(text => this.kana(text))`: desde ahí `romaji()` de [text.utils](../utils/text.utils.md#romajitext) pasa a kana los tokens con kanji antes de convertirlos.
4. `ready.set(true)`.

### 2. Segmentar un texto

`segs(text)`:

1. Texto vacío o sin kanji → `[text]`.
2. Si está en `texts` (o en `cache`), lo devuelve.
3. Si no, recorre los tramos de `KANJI_RUN`: copia el texto que hay entre tramos y añade `readRun(tramo)`.
4. Guarda el resultado en `cache`.

**Ejemplo**: `私は学生です` (si no estuviera en `texts`) → `[['私', 'わたし'], 'は', ['学生', 'がくせい'], 'です']`.

### 3. Pasar a kana

`kana(text)` = `segs(text)` con cada par cambiado por su lectura, todo unido. `私は学生です` → `わたしはがくせいです`.

---

## Métodos

#### `load()`

- **Qué hace**: descarga las lecturas y registra el lector de kanji.
- **Cómo**: ver el [paso 1](#1-carga).
- **Quién lo llama**: `app.config.ts` (`provideAppInitializer`).

#### `hasKanji(text)`

- **Qué hace**: `true` si el texto tiene algún kanji (`KANJI`).
- **Quién lo llama**: `JpComponent`, para pintar el texto sin más cuando no hace falta furigana.

#### `segs(text)`

- **Qué hace**: parte el texto en `Seg[]`.
- **Cómo**: ver el [paso 2](#2-segmentar-un-texto).
- **Quién lo llama**: `JpComponent` (pinta cada par como `<ruby>`) y `kana`.

#### `kana(text)`

- **Qué hace**: devuelve el texto entero en kana.
- **Quién lo llama**: `JpComponent` (modo solo kana), `ReadingService.toKana` y, a través de `setKanjiReader`, `romaji()`.
