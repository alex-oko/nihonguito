# `ProgressService`

El corazón del progreso: ajustes del usuario, XP y nivel, racha, meta diaria, cajas de Leitner de cada kana y cada palabra, mejor nota por lección, resultados por habilidad e historial de exámenes. Cada dato es un signal guardado en `localStorage` con [`persisted`](../core/local-storage.md#persistedkey-fallback-merge). Lo usan casi todas las vistas, los juegos y los servicios de exámenes, mascota y voz.

No decide qué preguntar ni qué repasar (eso lo hacen las vistas y los utils con `mastery()`), no habla (eso es [`SpeechService`](speech.service.md)) y no guarda el estado de la mascota ni los exámenes de nivel a medias (tienen sus propias claves, ver la [tabla de claves](../core/local-storage.md#todas-las-claves-nihongo)).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [progress.service.ts](../../src/app/services/progress.service.ts) | El servicio, más las constantes exportadas `SCRIPT_OPTIONS` y `MASTERED_BOX` |
| [progress.interface.ts](../../src/app/interfaces/progress.interface.ts) | `Theme`, `Settings`, `Stats`, `MasteryEntry`, `ExamRecord`, `SkillStat` |
| [skill.interface.ts](../../src/app/interfaces/skill.interface.ts) | `Skill` y `SkillScore`, que recibe `saveLessonSkills` |
| [storage.utils.ts](../../src/app/utils/storage.utils.ts) | `persisted` y `clearAll` ([su doc](../core/local-storage.md)) |
| [text.utils.ts](../../src/app/utils/text.utils.ts) | `todayKey` y `daysBetween` para fechas y rachas ([su doc](../utils/text.utils.md)) |

### Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `LEGACY_THEMES` (privada) | `{ eva00: 'sol', eva01: 'violeta', eva02: 'carmesi' }` | Migrar los ids de tema viejos |
| `SCRIPT_OPTIONS` (exportada) | `kana` «Solo kana», `furigana` «Kanji + furigana», `kanji` «Kanji» | Selector de escritura en `ProfileComponent` y `LessonDetailComponent` |
| `INTERVALS` (privada) | `[0, 1, 3, 7, 14, 30, 60]` | Días hasta el próximo repaso; la posición es la caja (0 a 6) |
| `MASTERED_BOX` (exportada) | `4` | Caja desde la que un kana o una palabra cuenta como dominado |
| `XP_PER_LEVEL` (privada) | `25` | Base de la curva de niveles |
| `MAX_EXAMS` (privada) | `30` | Tamaño del historial de exámenes |

### Estado

Todos los signals son `readonly` (la referencia), pero son `WritableSignal`: algunas vistas escriben `settings` y `lastLesson` directamente.

| Signal | Clave | Forma guardada | Quién lo escribe | Quién lo lee |
|---|---|---|---|---|
| `settings` | `nihongo:settings` | `Settings` (ver abajo) | la migración de tema, `ProfileComponent`, `LessonDetailComponent` (`script`, `romaji`) | `AppComponent` (tema y `data-script`), `SpeechService` (`rate`), `SfxService` (`sound`, `vibration`), `JpComponent`, `QuestionRunnerComponent`, `HomeComponent`, `LessonPracticeComponent` (`interests`)… |
| `stats` | `nihongo:stats` | `Stats`: `{ xp, streak, bestStreak, lastDay, answered, correct, sessions }` | `addXp`, `recordAnswer`, `finishSession` | `PetService`, `PetHouseComponent`, `ProfileComponent`, `level`, `currentStreak` |
| `activity` | `nihongo:activity` | `{ "2026-10-07": 42 }` (XP por día) | `addXp` | `todayXp`, `HomeComponent` y `ProfileComponent` (gráficas por día) |
| `answerLog` | `nihongo:answerLog` | `{ "2026-10-07": [respondidas, correctas] }` | `recordAnswer` | nadie fuera del servicio |
| `mastery` | `nihongo:mastery` | `{ "k:あ": MasteryEntry, "w:L01-003": MasteryEntry }` | `recordAnswer` | `box`, `isDue`, `HomeComponent`, `KanaComponent`, `KanaChartComponent`, `KanaPracticeComponent`, `ReviewComponent`, `LessonsComponent`, `LessonDetailComponent`, `PracticeComponent`, `PetService`, `ReadinessService`, `lesson-content.utils` |
| `lessonBest` | `nihongo:lessonBest` | `{ "3": 85 }` (mejor % por lección) | `saveLessonScore` | `ExamsComponent`, `LessonsComponent`, `LessonDetailComponent`, `HomeComponent`, `PetService`, `ReadinessService` |
| `lessonSkills` | `nihongo:lessonSkills` | `{ "3": { "listen": SkillStat, … } }` | `saveLessonSkills` | `HomeComponent`, `PracticeComponent`, `LessonsComponent`, `LessonDetailComponent`, `ReadinessService` |
| `exams` | `nihongo:exams` | `ExamRecord[]`: `{ date, title, score, total }`, el más reciente primero | `saveExam` | `ExamBuilderComponent` (historial, 8 últimos) |
| `lastLesson` | `nihongo:lastLesson` | `{ id: number }` | `LessonDetailComponent` (al abrir una lección) | `HomeComponent`, `LessonsComponent`, `ExamsComponent`, `LessonPickerComponent`, `GameHostComponent`, `PetHouseComponent`, `ExamBuilderComponent`, `LevelListComponent` |

`Settings` y su valor por defecto:

| Campo | Defecto | Qué es |
|---|---|---|
| `name` | `''` | Nombre del usuario para los saludos |
| `romaji` | `true` | Mostrar romaji |
| `script` | `'kana'` | `kana`, `furigana` o `kanji` |
| `rate` | `0.9` | Velocidad de la voz (también la de las grabaciones, ver [`SpeechService`](speech.service.md#reglas)) |
| `theme` | `'base'` | `base`, `sol`, `violeta` o `carmesi` |
| `interests` | `[]` | Ids de [interests.utils.ts](../../src/app/utils/interests.utils.ts): la práctica prefiere frases de esos temas |
| `sound` | `true` | Efectos de sonido |
| `vibration` | `true` | Vibración |
| `dailyGoal` | `50` | Meta de XP diaria |

Valores derivados (`computed`):

| Computed | Qué da |
|---|---|
| `todayXp` | `activity()[todayKey()] ?? 0` |
| `level` | `floor(sqrt(xp / 25)) + 1` |
| `levelProgress` | Avance dentro del nivel, de 0 a 1 |
| `currentStreak` | La racha si sigue viva hoy, o 0 |

### Reglas

- **Leitner**: 7 cajas (0 a 6) con `INTERVALS = [0, 1, 3, 7, 14, 30, 60]` días.
  - Un acierto sube **una** caja, con tope en la 6.
  - Un fallo baja **dos** cajas, con mínimo 0.
  - La fecha de repaso (`due`) es hoy + `INTERVALS[caja nueva]`.
  - La primera respuesta parte de la caja 0: acertar deja la palabra en la caja 1 (repaso mañana); fallar la deja en la 0 (repaso hoy).
  - Acertar antes de la fecha de repaso también sube de caja: no se comprueba `due`.
  - `box(key)` devuelve **-1** para lo que nunca se respondió, para distinguirlo de la caja 0.
- **Dominado** = caja ≥ `MASTERED_BOX` (4, es decir, repaso a 14 días o más). Lo usan `KanaComponent` (kana dominados por tabla), `ProfileComponent` y `LessonDetailComponent`. Hay otro umbral, `KNOWN_BOX = 2` de [dashboard.utils.ts](../../src/app/utils/dashboard.utils.ts), para «palabras conocidas» (mascota y panel).
- **Claves de `mastery`**: `k:<kana>` para kana (`k:あ`) y `w:<id de palabra>` para vocabulario (`w:L01-003`). Las arman los que llaman a `recordAnswer` (`QuestionRunnerComponent`, `SpeedGameComponent`, `FlashcardsComponent`, `MatchGameComponent`, `LevelExamService`).
- **XP y nivel**: el nivel N empieza en `25 × (N - 1)²` XP. Nivel 2 a los 25 XP, nivel 3 a los 100, nivel 4 a los 225, nivel 5 a los 400.
- **Racha**: solo la mueve `addXp`, con la **primera XP del día**. Si el último día activo (`lastDay`) fue ayer, +1; si fue antes (o nunca), vuelve a 1. `bestStreak` guarda el máximo.
- **Racha viva**: el `streak` guardado no se pone a 0 cuando se rompe; lo hace `currentStreak` al leer: si `lastDay` es hoy o ayer devuelve `streak`, si no 0. Por eso las pantallas leen `currentStreak()` y no `stats().streak`.
- **Meta diaria**: `settings().dailyGoal` (50 XP por defecto). `HomeComponent` la compara con `todayXp()` (barra de la meta y ánimo de Musubi).
- **Habilidades por lección**: `saveLessonSkills` **acumula** `correct` y `total` de cada habilidad y guarda en `last` el % de la última sesión y en `date` el día.
- **Mejor nota**: `saveLessonScore` solo guarda si mejora, redondeado. `QuestionRunnerComponent` lo llama solo en la práctica final (`final()`).
- **Exámenes**: se guardan los 30 más recientes, el nuevo primero.
- **Migración de temas**: los temas `eva00`, `eva01` y `eva02` (v1.2 y anteriores) pasan a `sol`, `violeta` y `carmesi`. Se hace al crear el servicio (ver [paso 1](#1-arranque-y-migración)).
- **Campos nuevos en objetos guardados**: `settings` y `stats` se leen mezclados con su valor por defecto (`load`), así que un campo añadido en una versión nueva toma el defecto en vez de quedar `undefined`. Es una mezcla **superficial**.

---

## Recorrido paso a paso

Los nombres son buscables en [progress.service.ts](../../src/app/services/progress.service.ts).

### 1. Arranque y migración

1. El primer componente que inyecta el servicio (en la práctica `AppComponent`) lo crea.
2. Los campos se inicializan en orden. `settings` llama a `persisted('settings', …)`, que lee `nihongo:settings` mezclado con el defecto y crea un `effect` que lo guarda en cada cambio.
3. Justo después se inicializa `isThemeMigrated`: lee `settings().theme` y, si es una clave de `LEGACY_THEMES`, hace `settings.update` con el tema nuevo. El `effect` de `persisted` lo guarda. Tiene que ir **después** de `settings` porque usa el signal ya creado.
4. El resto de signals se crean igual, cada uno con su clave. `exams` pasa `merge = false` (es un array y se lee tal cual).

### 2. Responder una pregunta

`recordAnswer(key, correct)`:

1. Suma 1 a `stats.answered` y, si acertó, a `stats.correct`.
2. Suma al registro de hoy en `answerLog` (`[respondidas, correctas]`).
3. Si no hay `key` (pregunta que no se sigue con Leitner), termina.
4. Si la hay, mueve la caja según las [reglas](#reglas), calcula `due` con `INTERVALS` y suma `seen` (y `wrong` si falló).

No da XP: la XP la suma quien llama, al acabar, con `addXp`.

### 3. Ganar XP

`addXp(amount)`:

1. Ignora cantidades ≤ 0.
2. Suma `amount` a `activity[hoy]`.
3. En `stats`: suma la XP, actualiza la racha (solo si `lastDay` no es hoy), `bestStreak` y pone `lastDay = hoy`.

Quién da XP y cuánta: `FlashcardsComponent` (3 por acierto, 1 por fallo), `QuestionRunnerComponent` (la XP de la sesión), `SpeedGameComponent` (puntuación × 2), `MatchGameComponent`, `KanaTraceComponent` (2), `TimeComponent` (2 por acierto), `ConversationPlayerComponent` (1, 3, 6 o 10 según el paso) y `LevelExamService` (`(score + bonus) × 2`).

### 4. Terminar una sesión

Los juegos y prácticas llaman `finishSession()` (suma 1 a `stats.sessions`) y, si son de una lección, `saveLessonSkills` y `saveLessonScore`. Los exámenes llaman `saveExam`.

### 5. Borrar todo

`ProfileComponent.reset` pide confirmación y llama `resetAll()`: `clearAll()` borra todas las claves `nihongo:*` y `location.reload()` recarga. La recarga es necesaria porque los signals siguen en memoria con los valores viejos y, al cambiar cualquiera, su `effect` lo volvería a escribir.

---

## Métodos

### XP y racha

#### `addXp(amount)`

- **Qué hace**: suma XP a hoy y al total, y alarga o reinicia la racha.
- **Cómo**: ver el [paso 3](#3-ganar-xp).
- **Quién lo llama**: ver la lista del paso 3.

#### `finishSession()`

- **Qué hace**: suma 1 a `stats.sessions`.
- **Quién lo llama**: `FlashcardsComponent`, `QuestionRunnerComponent`, `SpeedGameComponent`, `MatchGameComponent`, `KanaTraceComponent`, `ConversationPlayerComponent` y `LevelExamService`.

### Respuestas y Leitner

#### `recordAnswer(key, correct)`

- **Qué hace**: cuenta la respuesta y mueve la caja de Leitner de `key`.
- **Cómo**: ver el [paso 2](#2-responder-una-pregunta).
- **Quién lo llama**: `QuestionRunnerComponent`, `SpeedGameComponent` y `MatchGameComponent` (con `k:` o `w:` según `track`), `FlashcardsComponent` (`w:`) y `LevelExamService` (`w:` de los ítems con palabra; acierto si sacó todos los puntos del ítem).
- **Ejemplo**: `w:L01-003` en caja 2, fallo → caja 0, `due` = hoy. Acierto → caja 3, `due` = hoy + 7.

#### `box(key)`

- **Qué hace**: devuelve la caja de `key`, o -1 si nunca se respondió.
- **Quién lo llama**: `KanaChartComponent` (color de cada kana) y `LessonDetailComponent` (estado de cada palabra).

#### `isDue(key)`

- **Qué hace**: `true` si `key` ya se vio y su `due` es hoy o anterior.
- **Quién lo llama**: nadie. Las vistas filtran `mastery()` directamente con `v.due <= todayKey()`.

### Lecciones y exámenes

#### `saveLessonScore(lessonId, pct)`

- **Qué hace**: guarda `round(pct)` en `lessonBest[lessonId]` si mejora el anterior.
- **Quién lo llama**: `QuestionRunnerComponent`, en la práctica final de una lección.

#### `saveLessonSkills(lessonId, scores)`

- **Qué hace**: acumula los resultados por habilidad de una sesión.
- **Cómo**: por cada `SkillScore` suma `correct` y `total` a lo que había y pone `last = pct` y `date = hoy`. Si `scores` viene vacío no hace nada.
- **Quién lo llama**: `QuestionRunnerComponent`, con `skillBreakdown(records)` de [skills.utils.ts](../../src/app/utils/skills.utils.ts).
- **Ejemplo**: había `listen: { correct: 4, total: 5 }`; llega `{ skill: 'listen', correct: 2, total: 4, pct: 50 }` → `{ correct: 6, total: 9, last: 50, date: hoy }`.

#### `saveExam(record)`

- **Qué hace**: pone el examen al principio de `exams` y recorta a 30.
- **Quién lo llama**: `ExamRunComponent` (exámenes personalizados) y `LevelExamService` (exámenes de nivel).

### Reinicio

#### `resetAll()`

- **Qué hace**: borra todo el progreso y recarga la app.
- **Cómo**: ver el [paso 5](#5-borrar-todo). Borra **todas** las claves `nihongo:*`, no solo las de este servicio (también mascota, exámenes de nivel, juegos…).
- **Quién lo llama**: `ProfileComponent.reset`.
