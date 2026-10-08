# Inicio (`/`)

La pantalla de entrada: el barrio de Musubi (una casa por lección cuyas ventanas se encienden al aprender sus palabras), lo que dice Musubi, su casa, la racha y la meta del día, **el siguiente paso recomendado**, la preparación para el próximo examen, los últimos 14 días, las habilidades, las palabras que más se fallan y la palabra del día.

Casi todo son `computed` sobre [`ProgressService`](../../services/progress.service.md); los cálculos de habilidades y examen vienen de [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [home.component.ts](../../../src/app/views/home/home.component.ts) | Carga de lecciones, todos los `computed` de la pantalla, voz |
| [home.component.html](../../../src/app/views/home/home.component.html) | Barrio en SVG, bocadillo, tarjeta de la casa, cifras, siguiente paso, examen, farolillos, habilidades, palabras |
| [home.component.scss](../../../src/app/views/home/home.component.scss) | Estilos por bloque, en el orden de la pantalla |
| [home.interface.ts](../../../src/app/interfaces/home.interface.ts) | `NextStep`, `AltStep`, `House`, `HomeDay`, `HardWord` |
| [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts) | `knownWords`, `skillRows`, `weakestSkill`, `tone`, `upcomingExams` |
| [readiness.service.ts](../../../src/app/services/readiness.service.ts) | `ensure`, `for`, `start`: preparación para el examen de nivel |
| [pet.service.ts](../../../src/app/services/pet.service.ts) | `state`, `status`, `baseMood`, `needsYou`, `fresh` para la tarjeta de la casa |
| [update.service.ts](../../../src/app/services/update.service.ts) | `version` y `state` para la línea de versión del pie ([su doc](../../services/update.service.md)) |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `loadIndex`, `getMany`, `get` |

Componentes que usa: `app-musubi-say`, `app-musubi`, `app-icon`, `app-exam-readiness`, `app-jp`, `app-speak`.

### Qué hace el usuario

- **Fecha** (arriba a la izquierda): la dice en voz alta en japonés (`sayToday`): `きょうは ${jpDate} ${kana}です。`, por ejemplo 「きょうは 9月27日 にちようびです。」.
- **Nivel** (arriba a la derecha): va a Perfil.
- **Musubi** (bocadillo): cada toque pasa a la siguiente frase (`nextLine`). Las frases dan la vuelta.
- **Tarjeta «Casa de Musubi»**: va a `/musubi`. Con hambre (`food` < 40) o algo nuevo desbloqueado lleva la clase `alert`; con algo nuevo, además la etiqueta «¡Nuevo!».
- **Cifras**: racha, XP de hoy sobre la meta (anillo) y palabras por repasar. La última va a `/repaso`.
- **«¿Qué te gusta?»**: solo si no hay intereses elegidos; va a `/perfil#intereses`.
- **Tu siguiente paso**: una tarjeta grande con botón y hasta 2 alternativas pequeñas ([paso 4](#4-siguiente-paso)).
- **¿Listo para el examen?**: la tarjeta de `app-exam-readiness`; su botón empieza el examen de nivel (`readinessSVC.start`). «Ver exámenes» va a `/examenes`.
- **Tus habilidades**: cada fila va a la práctica de esa habilidad en la lección actual.
- **Palabras que se te escapan**: cada palabra se lee en voz alta al tocarla.
- **Palabra del día**: botón de altavoz grande.
- **Versión** al pie: va a Perfil; si hay versión nueva descargada añade «· nueva versión disponible».

### Reglas

**Siguiente paso** (el primero que se cumpla, sobre la lección actual `lastLesson`):

| Prioridad | Condición | Tipo | Lleva a |
|---|---|---|---|
| 1 | La habilidad más floja con al menos 4 respuestas (`weakestSkill`) está por debajo de **`WEAK_SKILL_PCT`** (60%) | `skill` | `/lecciones/:id/practica/<habilidad>` |
| 2 | **`REVIEW_DUE_MIN`** (10) palabras o más por repasar | `review` | `/repaso` |
| 3 | Conoce al menos **`TEST_KNOWN_SHARE`** (60%) del vocabulario de la lección y su mejor prueba está por debajo de **`LESSON_MASTERED_PCT`** (80%) | `test` | `/lecciones/:id/practica/test` |
| 4 | Si no | `guided` | Sesión guiada de la lección actual, o de la siguiente si la actual ya tiene ≥ 80% en la prueba |

- Una palabra **se conoce** desde la caja de Leitner `KNOWN_BOX` (**2**).
- Una palabra está **por repasar** (`dueCount`) si su clave empieza por `w:` y su `due` es hoy o antes.
- **Alternativas** (`altSteps`): de «Repaso de palabras», «Sesión guiada» y «Conversación», las que no sean del mismo tipo que el paso principal; el repaso solo si hay alguna pendiente. Máximo 2.

**Barrio** (`houses`): **`VISIBLE_HOUSES`** (4) casas desde la lección anterior a la actual (sin pasarse del final del índice). Cada casa tiene **`WINDOWS_PER_HOUSE`** (6) ventanas: se encienden `round(conocidas / total × 6)`. Una casa sale atenuada (`faded`) si su lección es posterior a la actual y no tiene ninguna palabra conocida.

**Farolillos** (`days`): **`HISTORY_DAYS`** (14) días. `on` si el XP del día llega a la meta, `half` si llega a la mitad, `off` si no.

**Habilidades** (`skills`): suma de todas las lecciones, la peor primero; las no practicadas al final. Tono con `tone`: `ok` ≥ 80%, `mid` ≥ 60%, `bad` por debajo, `none` sin datos. Texto de estado en **`SKILL_STATUS`**: Fuerte, Mejorable, Refuerza, Sin probar.

**Palabras que se te escapan** (`hardWords`): palabras con algún fallo, ordenadas por proporción de fallos (`wrong / seen`) y, a igualdad, por número de fallos. Se toman 6 y se muestran como mucho 4: alguna puede no tener su lección cargada.

**Palabra del día**: fija para cada fecha. Se calcula un hash de `todayKey()` (`hash × 31 + código`, empezando en 7) que elige la lección (entre la 1 y la actual) y la palabra (sin nombres propios y con lectura).

**Saludo** (`greeting`): おはよう antes de las 11, こんにちは antes de las 18, こんばんは después.

### Datos guardados

Inicio no escribe nada. Lee, a través de `ProgressService`: `nihongo:settings` (nombre, meta, romaji, escritura, intereses), `nihongo:stats` (nivel, racha), `nihongo:activity` (XP por día), `nihongo:mastery`, `nihongo:lessonSkills`, `nihongo:lessonBest` y `nihongo:lastLesson`; a través de `PetService`, `nihongo:pet`.

---

## Recorrido del código paso a paso

Cada paso empieza en [home.component.ts](../../../src/app/views/home/home.component.ts). Los nombres son buscables en el archivo.

### 1. Arranque

1. **Plantilla**: se pinta enseguida con lo que ya hay en `localStorage` (racha, XP, habilidades). Lo que depende de lecciones (casas, siguiente paso completo, palabras, palabra del día, examen) se rellena cuando llegan.
2. **`constructor`**: solo lanza `load()`. No hay `effect` ni ciclo de vida.

### 2. Carga de datos

**`load()`**:

1. `lessonSVC.loadIndex()` → `lessonIndex`. Con la lección actual, `upcomingExams(lastLessonId)[0]` da el próximo examen de nivel y `readinessSVC.ensure(exam.lessons)` carga sus lecciones en segundo plano (sin `await`).
2. Lecciones que necesita Inicio: la anterior, la actual y las dos siguientes (las del barrio) más las de cada palabra con fallos (`lessonOfWord` saca el número de la clave: `w:L01-003` → 1). Se piden con `lessonSVC.getMany` y se guardan en `loadedLessons`.
3. **Palabra del día** ([reglas](#reglas)): `lessonSVC.get` de la lección elegida y `wordOfTheDay.set`.

### 3. Cabecera, Musubi y cifras

- **`today`**: kanji (`WEEKDAY_KANJI`) y kana (`WEEKDAY_KANA`) del día, fecha en español con mayúscula inicial y `jpDate` (`9月27日`).
- **`lines`**: 4 frases en HTML. La primera saluda con el nombre y, si hay una palabra difícil, la nombra; la segunda depende de la racha (> 1 día); las otras dos son fijas. El nombre y la palabra pasan por **`escapeHtml`**: el nombre lo escribe el usuario y la frase se pinta con `[innerHTML]`.
- **`line`**: `lines()[lineIndex % lines().length]`. `nextLine` suma 1 a `lineIndex`.
- **`musubiMood`**: `happy` si el XP de hoy llega a la meta; si no, `idle`.
- **`goalPct`** (tope 100) alimenta la variable CSS `--p` del anillo; **`goalMessage`** cambia según no haya XP, falte o se haya cumplido la meta.

### 4. Siguiente paso

**`nextStep`** sigue la tabla de [reglas](#reglas) con pasos numerados en el código. Las `chips` son hasta 3 palabras difíciles de la lección actual (`hardWords` filtradas por `lesson`); el paso de repaso no lleva. **`nextLessonId`** busca en `lessonIndex` la lección que sigue a la actual (null si es la última).

**`altSteps`** se calcula después de `nextStep` para no repetir su `kind`.

### 5. Examen, días, habilidades y palabras

- **`exam`**: `readinessSVC.for(preset)`. Es null hasta que `ensure` termina, y entonces aparece la sección.
- **`days`**: 14 objetos `HomeDay` del más viejo a hoy, con `total` de XP y `met` (días `on`).
- **`skills`**: `skillRows` de todas las lecciones, con `tone`, `status`, `icon` (`skillIcon`) y `color` (`ok`, `gold`, `bad` o `indigo`). Se ordena con las no practicadas como 101% para dejarlas al final. `practiced` decide si se ve la lista o el texto vacío.
- **`hardWords`**: ver [reglas](#reglas). Cada entrada lleva `word`, `lesson`, `wrong` y `es` (traducción sin paréntesis, `shortEs`).

### 6. Voz y texto

- **`sayToday`** y **`say`** llaman a `speechSVC.speak`.
- **`mainText`** (`wordMain` con kanji), **`readingText`** (`wordReading`) y **`toRomaji`** (`romaji`) son envoltorios para usarlos desde la plantilla. El romaji de la palabra del día solo sale con el ajuste `romaji`; la lectura en kana, solo con escritura `kanji` y si difiere del texto principal.

### 7. Salida

No hay nada que limpiar: no hay timers ni suscripciones. Si se sale antes de que `load()` termine, la promesa sigue y escribe en signals de un componente ya destruido, sin efecto visible.

### Estilos

[home.component.scss](../../../src/app/views/home/home.component.scss) va por bloques en el orden de la pantalla, cada uno con su banner `/* ---- … ---- */`: comunes, iconos en pastilla (`.ki` con `data-c`), barrio, bocadillo, tarjeta de la casa, cifras (el anillo usa `--p`), siguiente paso, farolillos (`data-s`), habilidades (`data-t`), palabras, palabra del día y versión. Los colores salen de las variables del tema ([styles-and-themes.md](../../core/styles-and-themes.md)).
