# DiaryService

Guarda las frases propias de [Mi diario](../views/diary/diary.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [diary.service.ts](../../src/app/services/diary.service.ts) | `entries`, `add` y `remove`. |

### Estado

| Miembro | Qué guarda | Quién lo lee |
|---|---|---|
| `entries` | `DiaryEntry[]` (`{ id, date, promptId, sentence }`), la más nueva primero | `DiaryComponent`, `DiaryPracticeComponent` |

Se guarda en `nihongo:diary` con `persisted` (`merge = false`). Como máximo `MAX_ENTRIES` (**300**) frases: al pasar de ahí se descartan las más viejas.

## Métodos

#### `add(promptId, sentence)`

Crea la entrada con `id` = `Date.now()` en base 36 y `date` = `todayKey()`, y la pone al principio.

#### `remove(id)`

Borra esa frase.
