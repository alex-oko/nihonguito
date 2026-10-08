# Lecciones (`/lecciones`)

Lista de todas las lecciones agrupadas por nivel, con lo que el usuario sabe de cada una y los exámenes de nivel intercalados donde tocan. Es el hub de la vista: desde aquí se entra a la [ficha de una lección](lesson-detail.md), y desde la ficha a la [práctica](lesson-practice.md) y a las [conversaciones](../conversations/conversation-player.md).

Los datos llegan por [`LessonService`](lesson.service.md); el formato de una lección está en [lesson-data.md](../../core/lesson-data.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [lessons.component.ts](../../../src/app/views/lessons/lessons.component.ts) | Agrupa por nivel, arma cada fila (palabras conocidas, etiqueta) e intercala los exámenes |
| [lessons.component.html](../../../src/app/views/lessons/lessons.component.html) | Cabecera, un bloque por nivel y una tarjeta por lección o examen |
| [lessons.component.scss](../../../src/app/views/lessons/lessons.component.scss) | Filas, número de lección, etiqueta de estado y tarjeta de examen |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `loadIndex()` y el signal `index` ([su doc](lesson.service.md)) |
| [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts) | `KNOWN_BOX`, `PASS_POINTS`, `weakestSkill`, `upcomingExams` |
| [level.utils.ts](../../../src/app/utils/level.utils.ts) | `LEVEL_PRESETS` (qué lecciones cubre cada examen) y `KIND_ES` |
| [readiness.service.ts](../../../src/app/services/readiness.service.ts) | `ensure()` y `for()`: los puntos estimados del próximo examen |

Las sub-pantallas tienen su propio doc:

| Ruta | Pantalla | Doc |
|---|---|---|
| `/lecciones/:id` | Ficha de la lección (pestañas) | [lesson-detail.md](lesson-detail.md) |
| `/lecciones/:id/practica/:mode` | Un ejercicio de la lección | [lesson-practice.md](lesson-practice.md) |
| `/lecciones/:id/conversacion/:cid` | Reproductor de conversación | [conversation-player.md](../conversations/conversation-player.md) |

Utilidades compartidas: [lesson.service.md](lesson.service.md) y [lesson-content-utils.md](lesson-content-utils.md).

### Qué hace el usuario

- **Tocar una lección**: abre `/lecciones/:id`.
- **Tocar un examen de nivel**: abre `/examenes`.
- Nada más: la pantalla no tiene filtros ni botones propios.
- Mientras el índice no ha llegado se ve una tarjeta «Cargando…».

### Reglas

**Niveles.** Cada lección va al nivel del examen de `LEVEL_PRESETS` que la incluye. La lección 0 (kana) no está en ningún examen y va al nivel 1. Una lección sin nivel no se lista.

**Subtítulo del nivel**: «lecciones *primera* a *última*» (sin contar la 0). Si algún examen del nivel lleva `kana: true` (hoy, el parcial del nivel 1), empieza por «kana + ».

**Examen intercalado.** Cada examen de `LEVEL_PRESETS` se pone justo después de la última lección que cubre (`Math.max(...lessons)`). El próximo examen (`nextExam`) se pinta en dorado.

**Etiqueta de cada lección** (`buildRow`, en este orden; gana la primera que se cumpla):

| Condición | Etiqueta | Tono |
|---|---|---|
| Mejor prueba final ≥ `MASTERED_TEST_PCT` (**80**) | Dominada (y un ✓ en el número) | `ok` |
| La habilidad más floja (`weakestSkill`, con al menos 4 respuestas) baja de `WEAK_SKILL_PCT` (**60**) | «Escucha 45%» | `bad` |
| Es la última lección abierta | En curso (borde de acento) | `mid` |
| Tiene palabras conocidas o estadísticas | Empezada | `none` |
| Es la siguiente a la última abierta | Siguiente | `next` |
| Resto | Sin empezar | `none` |

**Palabras conocidas**: las de la caja de Leitner `KNOWN_BOX` (**2**) o más. La barra verde es conocidas / `vocabCount`.

**Línea del examen** (`examLine`):

1. Si ya lo hizo: «Tu mejor nota: N%».
2. Si no es el próximo: «Después de la lección N».
3. Si es el próximo y aún no hay estimación: «Tu próximo examen · toca para ver qué tan listo vas».
4. Con estimación: cuántos puntos faltan para `PASS_POINTS` (**35** de 50), o «ya aprobarías».

### Datos guardados

Solo lee, a través de [`ProgressService`](../../services/progress.service.md): `nihongo:mastery`, `nihongo:lessonBest`, `nihongo:lessonSkills` y `nihongo:lastLesson`. La mejor nota de cada examen la lee de `LevelExamService.best()` (`nihongo:levelBest`). No escribe nada.

---

## Recorrido del código paso a paso

Todo empieza en [lessons.component.ts](../../../src/app/views/lessons/lessons.component.ts). Los nombres se pueden buscar tal cual en el archivo.

### 1. Arranque

1. **Plantilla**: la cabecera dice «N lecciones · vas en la M» cuando ya hay índice, y si no, una frase genérica. Debajo, `@for` sobre `groups()`; con la lista vacía, «Cargando…».
2. **`constructor`**:
   1. `lessonSVC.loadIndex()`: pide `data/lessons/index.json` una sola vez y lo deja en `lessonSVC.index`.
   2. `readinessSVC.ensure(nextExam().lessons)`: carga las lecciones del próximo examen para que `examLine` pueda estimar los puntos. Se llama una vez con el examen que toca al entrar.

No hay `effect`: todo lo demás son `computed` que se recalculan cuando llega el índice o cambia el progreso.

### 2. Palabras conocidas sin cargar lecciones

**`knownByLesson`** recorre `progressSVC.mastery()`. Las claves de palabras tienen la forma `w:L01-003`, así que la expresión `/^w:L(\d+)/` saca el número de lección sin abrir el JSON de la lección. Cuenta las que están en `KNOWN_BOX` o más. Resultado: `{ 1: 12, 2: 4, … }`.

### 3. Grupos de nivel

**`groups`** (vacío hasta que hay índice):

1. **Agrupa por nivel** con `levelOf(id)`: el `level` del preset que incluye la lección; la 0 va al 1; el resto se descarta.
2. **Arma las filas** de cada nivel: una `{ kind: 'lesson', row }` por lección con **`buildRow`**, y detrás de cada lección los exámenes que terminan en ella como `{ kind: 'exam', exam: { preset, after } }`. Los tipos `LessonListItem`, `LessonRow` y `LessonExamRow` están en [lesson.interface.ts](../../../src/app/interfaces/lesson.interface.ts).
3. **Subtítulo** `sub`, según las [reglas](#reglas).

**`buildRow(meta, lastLessonId, best, stats)`** calcula `known`, `state` (`done` / `now` / `todo`) y la etiqueta según la tabla de [reglas](#reglas). `state` va al atributo `data-state`, que pinta el número en acento (`now`) o en verde (`done`).

### 4. Exámenes

- **`kindEs(preset)`**: «Examen parcial» (`chukan`) o «Examen final» (`kimatsu`).
- **`examLine(examRow)`**: la línea gris de la tarjeta ([reglas](#reglas)). La estimación sale de `readinessSVC.for(preset)`, que devuelve `null` hasta que `ensure` terminó de cargar las lecciones del examen.

### 5. Salida

No hay nada que limpiar: ni timers ni suscripciones.

### Estilos

[lessons.component.scss](../../../src/app/views/lessons/lessons.component.scss), por bloques:

- **Cabecera y títulos de nivel**: el `small` del título de nivel va en minúsculas y gris.
- **Filas**: `.lesson` y `.exam` comparten el `flex`. `[data-state='now']` pone borde de acento; `.num` cambia de color con `data-state`.
- **Etiqueta**: `.pill[data-t]` con los tonos `ok`, `mid`, `bad` y `next`.
- **Examen**: tarjeta discontinua; `.exam.next` (el próximo) en dorado.

Los `!important` existen porque `.card` (estilos globales) define `display`, borde y fondo.
