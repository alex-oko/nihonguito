# Escuchar (`listen.utils.ts`)

Opciones del modo [Escuchar](../views/listen/listen.md), armado de la lista de audios y limpieza del español para leerlo en voz alta. Los tipos están en [listen.interface.ts](../../src/app/interfaces/listen.interface.ts).

## Constantes

| Nombre | Qué contiene |
|---|---|
| `DEFAULT_LISTEN_CONFIG` | Palabras y frases, japonés → español, normal, 1 vez, pausa normal, mezclado, 30, sin repetir. |
| `LISTEN_CONTENTS` / `LISTEN_MODES` / `LISTEN_PAUSES` | Opciones del formulario con texto e icono. |
| `PAUSE_MS` | Pausa para pensar: corta **1500**, normal **3000**, larga **5000** ms. |
| `GAP_MS` | **1200** ms de silencio entre elementos. |
| `LISTEN_COUNTS` | 20, 30, 50 y 0 (todos). |
| `SLOW_RATE` | **0,6**, la misma velocidad que el botón «Lento». |

## Funciones

#### `buildListenItems(lessons, config, interests)`

- **Qué hace**: la lista de `ListenItem` (`show`, `say`, `es`, `voice?`, `note?`, `lesson`).
- **Cómo**:
  1. Palabras: todo el vocabulario menos los nombres propios; se enseña la forma con kanji y se pronuncia la lectura en kana.
  2. Frases: patrones, preguntas y respuestas, ejemplos de gramática, frases útiles y las extras de los intereses del usuario (`forYou`), sin repetir.
  3. Diálogos: cada conversación es un bloque con sus líneas en orden, su voz (A = 0, B = 1) y una nota con el título y quién habla.
  4. Baraja los bloques si `isShuffled` y recorta a `count` sin partir un diálogo.

#### `spokenEs(es)`

- **Qué hace**: limpia una traducción para leerla: quita paréntesis, corchetes y ～, y lee «/» como «, o». `estudiar (～を します)` → `estudiar`.

#### `estimateMinutes(itemCount, config)`

- **Qué hace**: minutos aproximados de una sesión (unos 2 s por frase hablada, ×1,4 en lento, más pausas y silencios). Mínimo 1.
