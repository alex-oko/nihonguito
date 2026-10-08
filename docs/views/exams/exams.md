# Exámenes (`/examenes`)

La pestaña de exámenes: cuánto le falta al usuario para el próximo examen de nivel, la lista de exámenes de nivel hasta el siguiente, las pruebas de lección, el enlace al creador de exámenes y el historial. Es un **hub**: no corre ningún examen, solo enlaza a las pantallas hijas.

La estimación de «preparado para el examen» la calcula [`readiness`](../../utils/dashboard.utils.md) a través de [`ReadinessService`](../../services/readiness.service.md) y la pinta [`app-exam-readiness`](../../components/exam-readiness.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [exams.component.ts](../../../src/app/views/exams/exams.component.ts) | Próximo examen, niveles visibles, pruebas de lección, historial y frase de Musubi |
| [exams.component.html](../../../src/app/views/exams/exams.component.html) | Cabecera, tarjeta de preparación, lista de niveles, pruebas de lección, enlace al creador, historial |
| [exams.component.scss](../../../src/app/views/exams/exams.component.scss) | Filas de la lista (`.lv-row`), número de nivel (`.lv`, `.lv.now`), píldoras de nota (`.pill[data-t]`) |
| [readiness.service.ts](../../../src/app/services/readiness.service.ts) | `ensure`, `for`, `start`, `busy` ([su doc](../../services/readiness.service.md)) |
| [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts) | `upcomingExams`, `tone` ([su doc](../../utils/dashboard.utils.md)) |
| [level.utils.ts](../../../src/app/utils/level.utils.ts) | `LEVEL_PRESETS`, `KIND_ES`, `KIND_JP` ([su doc](level-utils.md)) |
| [level-exam.service.ts](../../../src/app/services/level-exam.service.ts) | `best`: mejor nota por examen de nivel ([su doc](level-exam.service.md)) |

### Pantallas hijas

| Ruta | Pantalla | Doc |
|---|---|---|
| `/examen` | Creador de exámenes personalizados | [exam-builder.md](exam-builder.md) |
| `/examen/prueba` | Examen personalizado en curso (inmersivo, sin barra de pestañas) | [exam-run.md](exam-run.md) |
| `/examen/nivel` | Lista de exámenes de nivel y examen de nivel personalizado | [level-list.md](level-list.md) |
| `/examen/nivel/hoja` | Hoja de papel del examen de nivel (inmersiva) | [level-sheet.md](level-sheet.md) |

Las rutas están en [app.routes.ts](../../../src/app/app.routes.ts). Ojo: el hub es `/examenes` (plural) y el creador `/examen` (singular).

Los servicios del dominio: [exam.service.md](exam.service.md) (examen personalizado) y [level-exam.service.md](level-exam.service.md) (hoja de 50 puntos). Los utils: [level-utils.md](level-utils.md).

### Qué hace el usuario

- **Tarjeta de preparación** (`app-exam-readiness`): regla de 0 a 50 con su nota estimada, qué subir primero y el botón **Hacer examen de nivel**, que llama a `readinessSVC.start`. No aparece hasta que se cargan las lecciones del examen (`next()` es `null` mientras tanto).
- **Musubi** (`app-musubi-say`) comenta el veredicto con `musubiLine`. Pone cara contenta (`happy`) solo con veredicto `ready`.
- **Exámenes de nivel**: una fila por examen hasta el nivel **siguiente** al del próximo examen. Tocar una fila llama a `readinessSVC.start(preset)`. Las filas se desactivan mientras se genera la hoja (`readinessSVC.busy()`).
  - Con nota guardada: píldora con el mejor porcentaje, coloreada con `tone` (verde desde 80, ámbar desde 60).
  - El próximo examen lleva el número resaltado (`.lv.now`) y, sin nota, la píldora **Siguiente**.
  - El resto: **Sin hacer**.
- **Ver todos los niveles y el examen personalizado**: va a `/examen/nivel`.
- **Pruebas de lección**: una fila por lección hasta la siguiente a la que se estudia (o cualquiera que ya tenga nota). Va a `/lecciones/:id/practica/test`.
- **Crear examen**: va a `/examen`.
- **Historial**: los últimos **5** exámenes (`HISTORY_SIZE`) de `progressSVC.exams()`, con su porcentaje coloreado.

### Reglas

- **Próximo examen**: `upcomingExams(lastLesson)` devuelve el examen de `LEVEL_PRESETS` que contiene la lección en estudio y el siguiente. Si la lección no está en ninguno (por ejemplo la 0, kana), se toma el primero (`n1-chukan`).
- **Niveles visibles**: `preset.level <= nivelActual + 1`. Con la lección 5 (examen `n2-chukan`, nivel 2) se ven los niveles 1, 2 y 3.
- **Pruebas de lección visibles**: `id >= 1` y (`id <= última + 1` o con nota en `lessonBest`).

### Datos guardados

Solo lee:

- `nihongo:levelBest` (vía `levelExamSVC.best()`).
- `nihongo:exams`, `nihongo:lessonBest` y la lección actual (vía [`ProgressService`](../../services/progress.service.md)).

---

## Recorrido del código paso a paso

Todo empieza en [exams.component.ts](../../../src/app/views/exams/exams.component.ts). Los nombres son buscables en el archivo.

### 1. Arranque

1. **Plantilla**: pinta la cabecera, la lista de niveles y el enlace al creador enseguida (no dependen de nada asíncrono). La tarjeta de preparación y las pruebas de lección aparecen cuando llegan sus datos.
2. **`constructor`**:
   1. `lessonSVC.loadIndex()` sin `await`: cuando llega, `lessonTests` se rellena.
   2. `upcoming()` da `[actual, siguiente]` y `readinessSVC.ensure` carga las lecciones de los dos exámenes. Se cargan también las del siguiente para que, al acabar la lección, la estimación del nuevo examen salga sin espera.

### 2. Cadena de `computed`

En orden de dependencia:

1. **`upcoming`**: `upcomingExams(progressSVC.lastLesson().id)`.
2. **`nextId`**: id del examen actual (para resaltarlo en la lista).
3. **`next`**: `readinessSVC.for(upcoming()[0])`. `null` hasta que `ensure` termina; entonces el `@if` pinta la tarjeta. Ver el cálculo en [dashboard.utils.md](../../utils/dashboard.utils.md#readinesspreset-input).
4. **`best`**: copia de `levelExamSVC.best()`.
5. **`levels`**: `LEVEL_PRESETS` filtrado hasta `upcoming()[0].level + 1`.
6. **`lessonTests`**: del índice de lecciones, con `best` = `lessonBest[id]` o `null`.
7. **`history`**: los 5 primeros de `progressSVC.exams()` con `pct = round(score / total × 100)` (0 si `total` es 0).
8. **`musubiLine`**: sin estimación (`score === null`) invita a practicar; `ready` → «¡Vas listo!…»; `close` → «Ya aprobarías…»; si no, «Todavía no…».

### 3. Empezar un examen de nivel

Tanto la tarjeta (`(start)`) como una fila de la lista llaman a **`readinessSVC.start(preset)`**:

- Con una hoja sin entregar del **mismo** examen: navega a `/examen/nivel/hoja` para seguirla.
- Con una hoja sin entregar de **otro** examen: navega a `/examen/nivel`, donde el usuario puede continuarla o, al tocar otro examen, confirmar que la sustituye.
- Si no: `busy = true`, `levelExamSVC.create(preset)` genera la hoja y navega a `/examen/nivel/hoja`.

### 4. Ayudas de plantilla

- **`toneOf(pct)`**: `tone(pct)` → `ok` / `mid` / `bad` para `data-t`.
- **`kindEs` / `kindJp`**: «Examen parcial» / «中間テスト», «Examen final» / «期末テスト».
- **`lessonsOf(preset)`**: «Lección 1», «Lecciones 4 y 5» o, con kana, «Kana + lección 1».

### 5. Salida

No hay nada que limpiar: no hay timers ni suscripciones manuales.

### Estilos

[exams.component.scss](../../../src/app/views/exams/exams.component.scss): cabecera, filas de la lista (`.lv-row`) con el número de nivel en un cuadro (`.lv`, en color de acento con `.now`), y la píldora de nota (`.pill`) cuyo color sale de `data-t` (`ok`, `mid`, `bad`, `next`; `none` se queda con el estilo base). El enlace «Ver todos los niveles» es `.more` y la tarjeta del creador `.create`.
