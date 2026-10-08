# Practicar (`/practicar`) y Sesión guiada

**Practicar** es la pestaña con todo lo que se puede repasar sin entrar en una lección: el repaso espaciado de palabras, los puntos débiles por habilidad, kana difíciles, juegos, conversaciones y verbos. Es un hub: solo calcula dos números (palabras pendientes y puntos débiles) y enlaza al resto.

La **Sesión guiada** es la práctica principal de cada lección (`/lecciones/:id/practica/guided`): 5 palabras → 2 gramáticas con su tarjeta → frases completas. No vive en este hub sino en la práctica de lección, pero se explica aquí ([abajo](#sesión-guiada)) porque es el corazón de «practicar». Sus cálculos están en [guided-session.utils.md](../../utils/guided-session.utils.md).

El repaso espaciado (`/repaso`) tiene su propio doc: [review.md](review.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [practice.component.ts](../../../src/app/views/practice/practice.component.ts) | `due` (palabras pendientes), `weak` (puntos débiles), lista `games` |
| [practice.component.html](../../../src/app/views/practice/practice.component.html) | Tarjeta de repaso, puntos débiles, kana, juegos, hablar y conjugar, aviso de exámenes |
| [practice.component.scss](../../../src/app/views/practice/practice.component.scss) | Tarjeta oscura del repaso, filas de puntos débiles teñidas por tono, iconos de color |
| [review.component.ts](../../../src/app/views/practice/views/review/review.component.ts) | Repaso espaciado ([su doc](review.md)) |
| [skills.utils.ts](../../../src/app/utils/skills.utils.ts) | `SKILLS`: etiqueta e icono de cada habilidad ([su doc](../../utils/skills.utils.md)) |
| [dashboard.utils.ts](../../../src/app/utils/dashboard.utils.ts) | `tone(pct)`: `ok` (≥ 80), `mid` (≥ 60) o `bad` |
| [guided-session.utils.ts](../../../src/app/utils/guided-session.utils.ts) | `guidedSession`, `nextGrammar`, `advanceGrammar` ([su doc](../../utils/guided-session.utils.md)) |
| [lesson-practice.component.ts](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.ts) | Arma y corre la Sesión guiada (modo `guided`) |
| [lesson-detail.component.ts](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.ts) | Tarjeta «Sesión guiada» de la lección, con la gramática de hoy (`nextGrammar`) |

La ruta `practicar` no tiene guard ni `data`: se ve con la barra de pestañas (icono `dumbbell`).

### Qué hace el usuario

- **Tarjeta «Repaso de palabras»** → `/repaso`.
  - Con palabras pendientes: etiqueta «TOCA HOY» y «N palabras listas para repasar · ~4 min» (singular con 1).
  - Sin pendientes: «CUANDO QUIERAS» y un texto que explica el repaso. El enlace funciona igual: el repaso se completa con las palabras más débiles.
- **Tus puntos débiles** (solo si hay alguno): una fila por habilidad con su icono, las lecciones donde se practicó («· L3» o «· L1, L2 y L4»), una barra y el %. Tocarla abre la práctica de esa habilidad en la lección donde está **peor**: `/lecciones/<worst>/practica/<skill>`.
- **Kana**: «Hiragana difíciles» y «Katakana difíciles» → `/kana/hiragana/practica/weak` y `/kana/katakana/practica/weak`.
- **Juegos**: Parejas, Contrarreloj, Ordena la frase y Oído fino → `/juego/<id>` (`parejas`, `contrarreloj`, `ordenar`, `escucha`).
- **Hablar y conjugar**: «Conversaciones habladas» → `/conversaciones`; «Conjugación de verbos» → `/verbos`.
- **¿Buscas los exámenes?** → `/examenes` (se movieron a su propia pestaña; el aviso queda para quien los buscaba aquí).

### Reglas

- **Palabra pendiente**: una clave `w:<id>` de `mastery` cuyo `due` es hoy o anterior (comparación de texto `YYYY-MM-DD` con `todayKey()`).
- **Punto débil**: una habilidad con **al menos 4 respuestas** (`MIN_ANSWERS_FOR_WEAK`) sumando todas las lecciones y menos del **80%** de acierto (`WEAK_SKILL_PCT`). Se enseñan **4 como máximo** (`MAX_WEAK_SPOTS`), la peor primero.
- La **lección peor** de una habilidad es la de menor % (sin redondear) entre las que tienen respuestas de esa habilidad.
- El color de la fila sale de `tone(pct)`: como todas están por debajo de 80, solo salen `mid` (60–79, dorado) o `bad` (< 60, rojo).

### Datos guardados

Solo lee, a través de `ProgressService`:

| Clave | Signal | Para qué |
|---|---|---|
| `nihongo:mastery` | `mastery` | Contar las palabras pendientes |
| `nihongo:lessonSkills` | `lessonSkills` | Aciertos por lección y habilidad. Lo escribe `app-question-runner` al terminar una práctica con lección (`saveLessonSkills` con `skillBreakdown`) |

---

## Recorrido del código paso a paso

Todo está en [practice.component.ts](../../../src/app/views/practice/practice.component.ts). No hay constructor, `effect` ni ciclo de vida: la vista son dos `computed` y una lista fija.

### 1. Palabras pendientes

**`due`** recorre `progressSVC.mastery()`, se queda con las claves que empiezan por `w:` (palabras; las `k:` son kana) y cuenta las que tienen `due <= todayKey()`. La plantilla lo usa para la etiqueta y el texto de la tarjeta.

### 2. Puntos débiles

**`weak`** recorre `SKILLS` (las 7 habilidades) y, para cada una:

1. Suma `correct` y `total` de esa habilidad en cada lección de `progressSVC.lessonSkills()`. Apunta en `lessons` las lecciones con respuestas y en `worst` la de menor %.
2. Calcula el % redondeado. Si hay ≥ 4 respuestas y queda < 80%, devuelve un `WeakSpot` (`skill`, `label`, `icon`, `pct`, `lessons`, `worst`).

Al final ordena por `pct` ascendente y se queda con 4.

**`lessonsLabel(ids)`** ordena los ids y arma «· L3» o «· L1, L2 y L4». **`toneOf(pct)`** devuelve `tone(pct)` para el `data-t` de la fila.

### 3. Juegos y enlaces

**`games`** es una lista fija con `id` (segmento de `/juego/:id`), `icon`, `color` (para `data-c`), `name` y `desc`. El resto de enlaces están escritos en la plantilla.

### Estilos

[practice.component.scss](../../../src/app/views/practice/practice.component.scss):

- `.hero`: la tarjeta del repaso con el fondo oscuro del panel (`--panel`). Lleva `!important` porque pisa los estilos globales de `.card`.
- `.spot` + `data-t`: el icono (`.ic`) y la barra (`.bar > i`) son verdes por defecto, dorados con `mid` y rojos con `bad`.
- `.gi` + `data-c`: el cuadro del icono de juegos y enlaces (`ok`, `bad`, `gold`, `indigo`; sin `data-c`, color de acento).

---

## Sesión guiada

La práctica que propone cada lección. Enseña poco (5 palabras y 2 puntos de gramática) y lo usa enseguida en frases.

### Cómo se llega

1. En la lección ([lesson-detail.component.ts](../../../src/app/views/lessons/views/lesson-detail/lesson-detail.component.ts)) la tarjeta «Sesión guiada» enseña la gramática de hoy, calculada con **`nextGrammar`** y **`grammarKeys`**, y un botón a `/lecciones/:id/practica/guided`.
2. [lesson-practice.component.ts](../../../src/app/views/lessons/views/lesson-practice/lesson-practice.component.ts), en el modo `guided`, llama a **`guidedSession`** con:
   - `words`: 5 palabras elegidas con `prioritize(studyWords(vocab), progress, 5)` (nuevas, flojas y pendientes primero).
   - `pool`: todo el vocabulario practicable de la lección (distractores).
   - `known`: `knownStems` del vocabulario de esta lección y las anteriores (para detectar partículas).
   - `tipIndex`: días desde 1970 (`Date.now() / 86400000`), así la técnica de estudio cambia cada día.
   - `interests`: los intereses del Perfil.
3. Las preguntas las corre `app-question-runner`. Al terminar, `done()` llama a **`advanceGrammar`**: la próxima sesión sigue con los 2 puntos siguientes.

### Los tres pasos

Cada tarjeta lleva la etiqueta «Paso N de M · …». M es 3, o 2 si la lección no tiene gramática.

1. **Vocabulario**
   - Tarjeta «Tus 5 palabras de hoy» (`kind: 'note'`) con las palabras (forma principal, lectura y significado, con audio) y una técnica de `STUDY_TIPS` (7 técnicas, rotan por día).
   - Una pregunta de **significado** por palabra (reconocer).
   - **3** preguntas de **producir** (al japonés, escucha o escribir) sobre 3 de las palabras.
2. **Gramática** (los `GRAMMAR_PER_SESSION` = **2** puntos que tocan)
   - Por cada punto: tarjeta con título, explicación y hasta 2 ejemplos (etiqueta «Paso 2 de 3 · Gramática 3/7»: el número es la posición del punto en la lección).
   - **2** ejercicios (`grammarQuestions`): completar el hueco y ordenar la frase; si no hay material, entender un ejemplo.
3. **Frases completas**
   - Tarjeta «Ahora, todo junto». Si hay intereses elegidos, nombra los temas («con más frases sobre lo que te gusta (viajes, comida)»).
   - **5** preguntas de frases (ordenar, escuchar, partícula o significado) con `modelSentences`, que repite 3 veces las frases de los intereses del usuario.
   - **1** frase de hasta 24 caracteres para leer en voz alta.

### Datos guardados

- `nihongo:guided`: `{ [lessonId]: cursor }`, el índice del próximo punto de gramática por lección. Lo leen `grammarCursor` / `nextGrammar` y lo escribe `advanceGrammar`.
- El resto (cajas de Leitner, XP, habilidades por lección) lo guarda `app-question-runner` como en cualquier práctica.
