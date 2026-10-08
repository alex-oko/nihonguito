# localStorage

Dónde y cómo guarda la app el progreso del usuario. No hay backend: todo vive en `localStorage` del navegador, bajo claves con el prefijo `nihongo:`, y se lee y se escribe siempre a través de [storage.utils.ts](../../src/app/utils/storage.utils.ts). Léelo antes de añadir una clave nueva o de cambiar la forma de una que ya existe.

## Modelo mental

- **Una clave por dato**, con el prefijo `nihongo:` (`nihongo:settings`, `nihongo:mastery`…). El código usa la clave **sin** prefijo; lo añade `storage.utils`.
- **Todo es JSON**. Se guarda con `JSON.stringify` y se lee con `JSON.parse`.
- **Nada falla hacia fuera.** Si el almacenamiento está lleno, bloqueado (modo privado de algunos navegadores) o el JSON está corrupto, la lectura devuelve el valor por defecto y la escritura no hace nada. La app sigue funcionando, pero sin recordar.
- **Las claves guardan el progreso del usuario**: no se renombran ni se cambia la forma de lo guardado sin una migración. Un usuario que actualiza la app tiene que seguir viendo su racha.
- **Sin caducidad**: nada expira. Solo se borra con [`clearAll`](#clearall) (botón «Borrar progreso» de Perfil) o si el usuario borra los datos del sitio.

## Las cinco funciones

### Leer

#### `load(key, fallback)`

- **Qué hace**: lee un **objeto** y lo mezcla sobre `fallback`: `{ ...fallback, ...guardado }`.
- **Por qué mezcla**: si una versión nueva añade un campo a `Settings` (por ejemplo `dailyGoal`), el objeto guardado por la versión anterior no lo trae; con la mezcla toma el valor por defecto en vez de quedar `undefined`.
- **Ojo**: la mezcla es superficial. Un campo que es objeto se reemplaza entero.
- **Devuelve**: `fallback` si no hay nada guardado o si falla.

#### `loadRaw(key, fallback)`

- **Qué hace**: lee el valor **tal cual**, sin mezclar. Para arrays, números, `null` o mapas `id → valor` donde mezclar no tiene sentido.
- **Devuelve**: `fallback` si no hay nada guardado o si falla.
- **Quién la llama**: `LevelExamService` (`levelDraft`, `levelBest`, `levelCustom`), `guided-session.utils` (`guided`), `SpeedGameComponent` (`best:*`), `KanaComponent` y `KanaChartComponent` (`kanaRows:*`), `GameHostComponent` (`gameLessons`), `ExamBuilderComponent` (`examConfig`) y `persisted`.

### Escribir

#### `save(key, value)`

- **Qué hace**: guarda `JSON.stringify(value)` en `nihongo:<key>`. Si falla (cuota llena, almacenamiento bloqueado), no hace nada.
- **Quién la llama**: los mismos que `loadRaw`, más `persisted` en cada cambio.

#### `persisted(key, fallback, merge)`

- **Qué hace**: crea un `WritableSignal` que se lee de `localStorage` al crearse y se guarda solo cada vez que cambia.
- **Cómo**:
  1. Valor inicial: si `merge` (por defecto `true`) y `fallback` es un objeto normal (no array ni `null`), `load`; si no, `loadRaw`.
  2. Crea un `effect(() => save(key, signal()))`.
- **Requisito**: hay que llamarla en un **contexto de inyección** (inicializador de campo de un servicio o componente, o constructor), porque usa `effect`. Fuera de ahí, Angular lanza un error.
- **Por qué un `effect`**: así nadie tiene que acordarse de guardar; cualquier `set` o `update` del signal acaba en `localStorage`. El `effect` corre de forma asíncrona, así que varias actualizaciones seguidas se guardan una sola vez.
- **Quién la llama**: `ProgressService` (nueve signals), `PetService` (`pet`) y `TimeComponent` (`time-seen`).

#### `clearAll()`

- **Qué hace**: borra todas las claves que empiezan por `nihongo:` y deja las demás del mismo origen.
- **Quién la llama**: `ProgressService.resetAll`, que después recarga la página. La recarga es obligatoria: los signals de `persisted` siguen en memoria y volverían a escribir sus valores en cuanto cambiaran.

## Todas las claves `nihongo:*`

Buscadas con `grep` en `src/app` (llamadas a `persisted`, `load`, `loadRaw` y `save`). Los nombres van sin el prefijo `nihongo:`.

| Clave | Forma | Función | Quién la usa |
|---|---|---|---|
| `settings` | `Settings`: `{ name, romaji, script, rate, theme, interests, sound, vibration, dailyGoal }` | `persisted` (mezcla) | [`ProgressService`](../services/progress.service.md#estado) |
| `stats` | `Stats`: `{ xp, streak, bestStreak, lastDay, answered, correct, sessions }` | `persisted` (mezcla) | `ProgressService` |
| `activity` | `{ "YYYY-MM-DD": xp }` | `persisted` | `ProgressService` |
| `answerLog` | `{ "YYYY-MM-DD": [respondidas, correctas] }` | `persisted` | `ProgressService` |
| `mastery` | `{ "k:あ" \| "w:L01-003": { box, due, seen, wrong } }` | `persisted` | `ProgressService` (Leitner) |
| `lessonBest` | `{ "idLección": mejor% }` | `persisted` | `ProgressService` |
| `lessonSkills` | `{ "idLección": { habilidad: { correct, total, last, date } } }` | `persisted` | `ProgressService` |
| `exams` | `[{ date, title, score, total }]`, máximo 30 | `persisted` (`merge = false`) | `ProgressService` |
| `lastLesson` | `{ id }` | `persisted` | `ProgressService` |
| `pet` | `PetState` (necesidades, granos, ropa, metas…, ver [pet.interface.ts](../../src/app/interfaces/pet.interface.ts)) | `persisted` (mezcla) | `PetService` |
| `time-seen` | `{ "tema:frase": true }` | `persisted` | `TimeComponent` (frases de la hora y fechas ya acertadas) |
| `guided` | `{ "idLección": cursor }` (punto de gramática por el que va cada lección) | `loadRaw` / `save` | [guided-session.utils.ts](../../src/app/utils/guided-session.utils.ts) (`grammarCursor`, `advanceGrammar`) |
| `levelDraft` | `Draft`: `{ exam, answers, overrides, startedAt, submittedAt? }` o `null` | `loadRaw` / `save` | `LevelExamService` (examen de nivel a medias) |
| `levelBest` | `{ "presetId": mejor% }` (tope 100) | `loadRaw` / `save` | `LevelExamService` |
| `levelCustom` | `LevelPreset` del examen personalizado, o `null` | `loadRaw` / `save` | `LevelExamService` |
| `examConfig` | `ExamConfig`: `{ lessons, sections, count, strict }` | `loadRaw` / `save` | `ExamBuilderComponent` (recuerda la última configuración) |
| `gameLessons` | `number[]` (lecciones elegidas) | `loadRaw` / `save` | `GameHostComponent` |
| `best:<storageKey>` | `number` (mejor puntuación) | `loadRaw` / `save` | `SpeedGameComponent`. `GameHostComponent` pasa `speed-hiragana`, `speed-katakana` o `speed-vocab`; sin `storageKey` sería `best:speed` |
| `kanaRows:<script>` | `string[]` (ids de filas elegidas), con `script` = `hiragana` o `katakana` | `loadRaw` / `save` | `KanaChartComponent` (lee y escribe; por defecto `['a', 'k']`) y `KanaComponent` (lee) |

Fuera de `localStorage`, la app solo guarda en la caché del service worker (`ngsw-config.json`): datos de lecciones, `furigana.json`, el manifiesto de audio y los mp3.

## Migraciones de datos viejos

Las hace quien es dueño de la clave, al crearla:

- **Temas** (`settings.theme`): `eva00 → sol`, `eva01 → violeta`, `eva02 → carmesi`. En `ProgressService` (`LEGACY_THEMES` e `isThemeMigrated`), ver [su doc](../services/progress.service.md#1-arranque-y-migración).
- **Campos nuevos** en objetos: los cubre la mezcla de `load` (ver arriba), sin código extra.

## Añadir una clave nueva

1. Elige un nombre que no esté en la tabla y escríbelo sin prefijo.
2. Si es estado vivo de un servicio o componente, usa `persisted(clave, defecto)` en un inicializador de campo. Si se lee o escribe en momentos concretos (al empezar, al guardar), `loadRaw` + `save`.
3. Para objetos que pueden ganar campos con el tiempo, deja `merge` en `true` y da todos los campos en el defecto.
4. Añade la fila a la tabla de este doc.
5. Si algún día cambias la forma, lee la vieja y conviértela (como `LEGACY_THEMES`); no cambies el nombre de la clave.
