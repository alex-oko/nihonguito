# Motor de preguntas (`app-question-runner`)

El motor central de práctica: recibe una lista de preguntas ya generadas y las hace una a una (opción múltiple, escribir, ordenar, pronunciar y tarjetas de explicación), corrige, reparte XP, actualiza el dominio de cada palabra o kana, da granos a Musubi y, al final, muestra [`app-result-screen`](result-screen.md).

No genera preguntas: eso lo hacen los utils de [questions.utils.ts](../../src/app/utils/questions.utils.ts) desde cada vista. Este componente solo las ejecuta.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [question-runner.component.ts](../../src/app/components/question-runner/question-runner.component.ts) | Cola de preguntas, corrección, XP, racha, sonidos, micrófono, cierre de sesión |
| [question-runner.component.html](../../src/app/components/question-runner/question-runner.component.html) | Cabecera con progreso, nota o enunciado, zona de respuesta por tipo, pie con corrección y Musubi |
| [question-runner.component.scss](../../src/app/components/question-runner/question-runner.component.scss) | Estilos por tipo de pregunta y del pie de corrección |
| [question.interface.ts](../../src/app/interfaces/question.interface.ts) | `Question` (`ChoiceQuestion`, `TypeQuestion`, `OrderQuestion`, `SpeakQuestion`, `NoteQuestion`), `AnswerRecord`, `SessionResult` |
| [skills.utils.ts](../../src/app/utils/skills.utils.ts) | `skillBreakdown`: nota por habilidad a partir de los registros |
| [progress.service.ts](../../src/app/services/progress.service.ts) | XP, dominio, sesiones y notas de lección ([su doc](../services/progress.service.md)) |
| [pet.service.ts](../../src/app/services/pet.service.ts) | `reward`: granos de arroz para Musubi |
| [speech.service.ts](../../src/app/services/speech.service.ts) / [reading.service.ts](../../src/app/services/reading.service.ts) | Voz (leer y escuchar) y comparación de lo oído con el objetivo |
| [sfx.service.ts](../../src/app/services/sfx.service.ts) | Sonidos y vibración (`ok`, `bad`, `combo`, `tap`, `done`) |

**Quién lo usa** (todas con `[questions]`, `[title]` y `(again)`):

| Vista | Además pasa |
|---|---|
| `lesson-practice` (`/lecciones/:id/practica/:modo`) | `[lessonId]`, `[final]="mode() === 'test'"`, `(finished)` |
| `exam-run` | `[exam]` (examen estricto), `(finished)` para guardar el examen |
| `kana-practice`, `review`, `verb-practice` | nada más |
| [`game-host`](../views/game-host/game-host.md) (Ordena la frase, Oído fino) | nada más |

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `questions` | `input.required<Question[]>` | Las preguntas. Una lista nueva reinicia la sesión |
| `title` | `input` (`'Práctica'`) | Título que sale en el resultado |
| `exam` | `input` (`false`) | Modo examen: sin corrección hasta el final y sin repetir falladas |
| `lessonId` | `input<number \| null>` | Guarda las notas por habilidad de esa lección |
| `final` | `input` (`false`) | Prueba final: además guarda la mejor nota de la lección |
| `again` | `output<void>` | «Otra vez» en el resultado: el padre genera preguntas nuevas |
| `finished` | `output<SessionResult>` | Al terminar, con el resultado completo |

### Qué hace el usuario

- **Opción múltiple** (`choice`): toca una opción o pulsa **1–6**. Con la corrección, la buena se pinta en verde, la elegida mal en rojo y el resto se atenúa.
- **Escribir** (`type`): escribe en `app-kana-input` (romaji que se convierte a kana, o texto latino/español) y pulsa **Comprobar** o Enter. **No sé** la salta como fallo.
- **Ordenar** (`order`): toca fichas del banco para formar la frase; tocar una ficha de la frase la devuelve. **Borrar** vacía la frase.
- **Pronunciar** (`speak`): toca el micrófono y lo dice. Con micrófono no disponible, error o algún intento hecho, aparece la **autoevaluación** («Necesito práctica» / «¡Lo dije bien!»), salvo en examen. **Saltar** = fallo.
- **Nota** (`note`): tarjeta de explicación con palabras y ejemplos que se leen al tocarlos. **Entendido, a practicar** o Enter avanza sin registrar nada.
- **Audio**: el altavoz reproduce el audio; **Lento** a velocidad 0,6. En los ejercicios de solo escucha (`audioOnly`) el texto está oculto hasta responder.
- **Corrección**: Musubi reacciona, se ve la respuesta correcta y la explicación. **Continuar** o Enter (pasados 300 ms) sigue.
- **X** de la cabecera: vuelve atrás (`location.back()`) sin guardar la sesión.

### Reglas

**Corrección por tipo** (`submitTyped`, `submitOrder`, `choose`):

| Tipo | Se compara |
|---|---|
| `choice` | La opción, tal cual, con `answer` |
| `type` con `input: 'romaji'` | En minúsculas y sin espacios, con cada una de `answers` |
| `type` con `input: 'es'` | `normEs` (sin tildes, mayúsculas ni puntuación) |
| `type` con kana | `normJp` (sin puntuación; hiragana y katakana cuentan igual) |
| `order` | `normJp` de las fichas unidas contra `answer.join('')` |
| `speak` | `readingSVC.bestMatch` de lo oído contra `target` y `prompt` |

**Pronunciación** (`listen`): aprobada con precisión ≥ `SPEAK_PASS_SCORE` (**0,75**). Por debajo, se pide otro intento («¡Casi!» si llega a `SPEAK_CLOSE_SCORE`, **0,5**) hasta `SPEAK_MAX_ATTEMPTS` (**3**) intentos; en examen, el primer intento fallido ya cuenta como fallo.

**Repetición**: en práctica, una pregunta fallada a la primera vuelve **una vez** al final de la cola (`retriedIds`). La barra de progreso y el contador crecen con ella. En examen no vuelve.

**XP**:

| Caso | XP | Constante |
|---|---|---|
| Acierto a la primera | 10 | `XP_FIRST_TRY` |
| Acierto de una repetida | 4 | `XP_RETRY` |
| Bonus por acierto con racha ≥ 3 | +2 | `XP_COMBO_BONUS`, `COMBO_MIN` |
| Examen (sustituye a todo lo anterior) | 10 por acierto | `XP_EXAM_PER_CORRECT` |
| Sesión perfecta con ≥ 5 preguntas | +20 | `XP_PERFECT_BONUS`, `PERFECT_MIN_QUESTIONS` |

**Racha** (`combo`): aciertos seguidos; un fallo la pone a 0. Desde 3 se ve la llama en la cabecera (fuera de examen) y cada 5 suena `combo` en vez de `ok` y Musubi pone cara `wow`.

**Nota final**: cuenta solo el **primer intento** de cada pregunta (`firstAttempts`). Las notas no cuentan.

**Granos**: `petSVC.reward(aciertos)` = 5 por acierto (`GRAINS_PER_CORRECT`) + 5 por terminar (`GRAINS_FOR_FINISHING`). Si la sesión solo tenía notas, 0.

**Dominio** (`progressSVC.recordAnswer`): solo en el primer intento y solo si la pregunta tiene `track`. La clave es `k:<kana>` o `w:<id de palabra>`. Un acierto sube una caja de Leitner (máximo 6), un fallo baja dos (mínimo 0); los intervalos son `[0, 1, 3, 7, 14, 30, 60]` días.

### Datos guardados

Todo a través de [`ProgressService`](../services/progress.service.md) y `PetService`:

| Clave | Cuándo |
|---|---|
| `nihongo:stats`, `nihongo:answerLog`, `nihongo:mastery` | Cada primera respuesta (`recordAnswer`) |
| `nihongo:activity`, `nihongo:stats` | Al terminar (`addXp`, `finishSession`) |
| `nihongo:lessonSkills` | Al terminar con `lessonId` (`saveLessonSkills`) |
| `nihongo:lessonBest` | Al terminar con `lessonId` y `final` (`saveLessonScore`) |
| `nihongo:pet` (`PetService`) | Al terminar, si hubo preguntas (`reward`) |

---

## Recorrido del código paso a paso

Cada paso empieza en [question-runner.component.ts](../../src/app/components/question-runner/question-runner.component.ts); los nombres son buscables.

### 1. Arranque

1. **Plantilla**: con `result()` pinta `app-result-screen`; si no, con `current()` pinta la sesión; sin preguntas, el estado vacío «No hay ejercicios para esta selección».
2. **`constructor`**: un `effect` lee `questions()` y llama a **`reset`** dentro de `untracked`, para que el effect no se suscriba a las signals que toca `reset` (si no, cada respuesta reiniciaría la sesión).
3. **`reset(questions)`**: copia la lista en `queue`, pone a cero `index`, `records`, `xp`, `combo`, `result` y `retriedIds`, guarda `startedAt` y llama a **`prepare`**.

### 2. Preparar cada pregunta

**`prepare()`**:

1. Cancela el `autoplayTimer` y para la voz: el audio del ejercicio anterior no debe sonar encima del nuevo.
2. Vuelve a `phase = 'asking'` y limpia `feedback`, `selected`, `picked`, `heard`, `micError`, `attempts`, `typed`, el `app-kana-input` (`kanaInput()?.clear()`) e `isRevealed`.
3. Si la pregunta tiene audio y es de solo escucha o `promptStyle: 'jp-big'` (un kana grande), programa **`play`** a los `AUTOPLAY_DELAY_MS` (**250 ms**).

Las `computed` que pinta la plantilla: `current` (`queue()[index()]`), `total`, `progressPercent` (`index / total`), `orderQuestion` y `pickedTokens` (las fichas elegidas, en orden), `showRomaji` y `script` (de los ajustes).

**`play(slow)`**: con `slow`, velocidad `SLOW_RATE` (**0,6**). En solo escucha, la velocidad de los ajustes × `LISTEN_RATE_FACTOR` (**0,92**): sin el texto, cada sonido cuenta.

### 3. Responder

Todos los caminos acaban en **`resolve(isCorrect, answer, given, note?, isClose?)`**:

- **`choose(choice)`**: guarda `selected` y compara con `answer`.
- **`submitTyped()`**: lee `kanaInput()?.read()` (el texto ya convertido) o `typed()`, ignora vacíos y compara según `input` ([reglas](#reglas)).
- **`tapToken` / `untapToken`**: añaden o quitan índices de `picked` (`tap` suena al añadir). **`submitOrder()`** compara.
- **`listen()`**:
  1. `speechSVC.listen().result` → `transcripts`; suma un intento. Sin transcripción, «No te escuché…».
  2. `readingSVC.ensure()` (carga las lecturas, necesarias para comparar kanji con kana) y `bestMatch(transcripts, [target, prompt])` → precisión y texto oído.
  3. Aprueba, suspende o pide otro intento con sonido `bad` y sacudida (`shakeKey`).
  4. Los errores del micrófono se traducen: `not-allowed` → pedir permiso; `unsupported` → usar la autoevaluación; el resto, «No se pudo escuchar».
- **`selfAssess(isCorrect)`**: resuelve con «✓»/«✗» y la nota «Autoevaluación».
- **`skip()`**: en una nota solo avanza; en el resto resuelve como fallo con la respuesta correcta según el tipo y `given = '—'`.

**`resolve`**:

1. Añade el intento a `records`. Si es el primero de esa pregunta, `progressSVC.recordAnswer(clave, isCorrect)`.
2. Acierto: `combo + 1`, suma XP ([tabla](#reglas)) y suena `ok` (o `combo` cada 5). Fallo: `combo = 0`, sonido `bad`, sacudida y, en práctica y primer intento, la pregunta vuelve al final de `queue`.
3. Rellena `feedback` con una frase de `PRAISE` al azar y guarda `answeredAt`. En examen llama directamente a **`next`** (sin corrección).
4. Si no, `phase = 'feedback'` y reproduce el audio modelo; en solo escucha, en vez de eso, destapa el texto (`isRevealed`).

### 4. Teclado

**`onKey`** (`@HostListener('document:keydown')`):

- Enter en una nota → `next`.
- Enter en la corrección → `next`, solo si pasaron más de `ENTER_GUARD_MS` (**300 ms**) desde `answeredAt`. Sin esa espera, el mismo Enter que envió la respuesta se saltaba la corrección.
- **1–6** en opción múltiple → `choose` de esa opción.

### 5. Siguiente y final

**`next()`**: si era la última de `queue`, **`finish`**; si no, `index + 1` y `prepare`.

**`finish()`**:

1. `phase = 'done'` y para la voz.
2. **`firstAttempts`**: un registro por pregunta (el primero). Con ellos, aciertos y porcentaje.
3. XP: el acumulado, o en examen 10 × aciertos; +20 si es perfecta con ≥ 5 preguntas. `addXp` (también mantiene la racha de días) y `finishSession`.
4. Con `lessonId`: `saveLessonSkills(lessonId, skillBreakdown(records))`. `skillBreakdown` deduce la habilidad de cada pregunta (`skillOf`: ordenar, pronunciar, escribir, escucha, partículas, significado o «al japonés») y devuelve la nota de cada una, de peor a mejor. Con `final`, además `saveLessonScore` (guarda el máximo).
5. Arma el `SessionResult` (título, registros, XP, duración desde `startedAt`, granos de `petSVC.reward`), lo guarda en `result` (la plantilla pasa a `app-result-screen`), suena `done` y emite `finished`.

Desde el resultado: **Otra vez** → **`restart`** → emite `again` (el padre manda preguntas nuevas, que reinician por el `effect`). **Terminar** → **`close`** → para la voz y `location.back()`.

### 6. Salida

**`ngOnDestroy`**: cancela `autoplayTimer` y para la voz.

### Estilos

[question-runner.component.scss](../../src/app/components/question-runner/question-runner.component.scss) va por secciones: estructura y enunciado (`.prompt-text.jp-big` usa `--font-hand` a 5,5 rem para los kana grandes), opción múltiple (`.right`, `.wrong`, `.dim`; `.two` para las opciones de kana grande en dos columnas), escribir, ordenar (`.token.used` queda al 20 % de opacidad), pronunciar (`.mic.on` con el pulso), pie (`.foot.ok` / `.foot.bad` tiñen todo el pie), notas y la fila de Musubi. El pie es `position: sticky` para que el botón quede siempre a mano en móvil.
