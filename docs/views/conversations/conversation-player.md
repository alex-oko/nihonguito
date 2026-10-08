# Reproductor de conversaciones (`/lecciones/:id/conversacion/:cid`)

Pantalla a pantalla completa para practicar un diálogo de una lección en dos fases: **escucharlo** entero con dos voces y luego **interpretar a un personaje**. En el juego de rol la app dice las líneas del otro personaje y el usuario responde las suyas hablando al micrófono o escribiendo en romaji; cada respuesta se califica por parecido con la línea original.

Se abre desde la [lista de conversaciones](conversations.md) y desde la [ficha de la lección](../lessons/lesson-detail.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [conversation-player.component.ts](../../../src/app/views/conversations/views/conversation-player/conversation-player.component.ts) | Carga el diálogo, reproduce el audio, lleva el turno del juego de rol y califica |
| [conversation-player.component.html](../../../src/app/views/conversations/views/conversation-player/conversation-player.component.html) | Cabecera, interruptores de texto, intro, chat y panel inferior por fase |
| [conversation-player.component.scss](../../../src/app/views/conversations/views/conversation-player/conversation-player.component.scss) | Burbujas de chat, panel pegado abajo, micrófono que late, colores de nota |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | `speak` (dos voces), `listen`, `listening`, `speaking`, `canListen`, `stopSpeaking` ([su doc](../../services/speech.service.md)) |
| [reading.service.ts](../../../src/app/services/reading.service.ts) | `ensure` y `bestMatch`: compara lo dicho o escrito con la línea ([su doc](../../services/reading.service.md)) |
| [kana-input.component.ts](../../../src/app/components/kana-input/kana-input.component.ts) | Campo que convierte romaji en kana mientras se escribe |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `get(id)` ([su doc](../lessons/lesson.service.md)) |

La ruta lleva `data: immersive` (sin barra de pestañas). Los tipos `ConversationMode` y `ConversationLineResult` están en [lesson.interface.ts](../../../src/app/interfaces/lesson.interface.ts).

### Qué hace el usuario

- **✕ (Salir)** y **Terminar**: `location.back()`.
- **Interruptores** 日本語 / Romaji / Español: qué textos se ven en las burbujas. En el juego de rol aparece además **Ocultar mis frases** (activo por defecto): las líneas del usuario enseñan solo el español hasta que las responde.
- **Fase intro**: la situación, los dos personajes y las instrucciones.
  - **Escuchar conversación**: lee todas las líneas una tras otra.
  - **Ser B** / **Ser A**: empieza el juego de rol con ese personaje.
- **Fase escuchar**: **Detener** / **Repetir** y **Practicar** (juego de rol como B). Tocar una burbuja la vuelve a leer.
- **Fase juego de rol**, en su turno:
  - «Di en japonés: *español*» y **Pista**: enseña la línea en japonés y un botón para oír el modelo.
  - **Hablar** (micrófono) o **Escribir** (campo de kana + **Comprobar**, o Enter).
  - **Saltar esta frase**: cuenta como 0.
  - Tras un intento flojo: la nota, lo que se escuchó o escribió y el modelo, con **Reintentar** o **Seguir**.
  - Tras una línea calificada: **Escuchar el modelo y continuar**.
  - Durante su turno solo puede tocar burbujas **anteriores** para oírlas.
  - Si no es su turno: «*Nombre* está hablando…».
- **Fase final**: precisión media, **Cambiar de papel**, **Otra vez** y **Terminar**.
- **Micrófono**: sin permiso o sin reconocimiento de voz, enseña un aviso y pasa a «Escribir». Si el navegador no tiene reconocimiento de voz, la pestaña Hablar dice que se compare con la pista.

### Reglas

**Voces**: `who: 'A'` voz femenina (`voice: 0`), `who: 'B'` voz masculina (`voice: 1`). Las burbujas de B van a la derecha.

**Nota de una línea** (`score`, de 0 a 1, de `readingSVC.bestMatch`):

| Nota | Texto | Sonido | XP |
|---|---|---|---|
| ≥ `PERFECT_SCORE` (**0.9**) | ¡Perfecto! | ok | 6 |
| ≥ `GOOD_SCORE` (**0.75**) | ¡Muy bien! | ok | 6 |
| ≥ `MID_SCORE` (**0.5**) | Casi | tap | 3 |
| < 0.5 | A practicar | bad | 1 |

**Reintentos**: un intento por debajo de `GOOD_SCORE` no se guarda; se enseña la corrección y se deja repetir. Al **tercer** intento flojo (`MAX_WEAK_RETRIES` = **2** reintentos) se guarda tal cual. **Seguir** guarda el intento flojo en ese momento y da **1 XP**. Saltar guarda 0 sin reintentos.

**Final**: **10 XP** (`FINISH_XP`) y una sesión más en las estadísticas. La precisión media es la media de las notas guardadas, en %.

**Pausas**: **350 ms** entre líneas al escuchar (`LISTEN_PAUSE_MS`) y **250 ms** en el juego de rol (`ROLE_PAUSE_MS`).

### Datos guardados

A través de [`ProgressService`](../../services/progress.service.md): `addXp` (`nihongo:stats` y `nihongo:activity`) y `finishSession` (`nihongo:stats`). Las líneas de conversación **no** cuentan en Leitner ni en el acierto de la lección.

---

## Recorrido del código paso a paso

Todo empieza en [conversation-player.component.ts](../../../src/app/views/conversations/views/conversation-player/conversation-player.component.ts). Los nombres se pueden buscar tal cual.

### 1. Arranque

1. **Ruta**: `id` (lección) y `cid` (conversación) llegan como `input` por `withComponentInputBinding`.
2. **`constructor`**:
   - Un `effect` que lee `id` y `cid` y llama a **`loadConversation`** en `untracked`.
   - `readingSVC.ensure()` sin esperar: construye la tabla kanji → kana de todo el vocabulario para que la primera respuesta no tenga que esperarla.
3. **Plantilla**: «Cargando…» hasta que `conversation()` tiene valor.

### 2. Carga de la conversación

**`loadConversation(id, cid)`**: `lessonSVC.get(id)`, busca la conversación con ese `cid` (si no existe, la primera de la lección) y pone `mode = 'intro'`.

Los `computed` que salen de ella:

- **`lines`**: las líneas.
- **`names`**: el `name` de la primera línea de A y de B (o la letra). **`speakerName(who)`** lo lee.
- **`visibleLines`**: en `role` y `done`, solo hasta `step`; en el resto, todas.
- **`userTurn`**: la línea de `step` si es del usuario y aún no tiene resultado; si no, `null`.
- **`averageScore`**: media de `results`, en %.

### 3. Escuchar

1. **`playAll()`**: `mode = 'listen'`, `run = ++runId` y recorre las líneas: `scrollTo(i)`, `await speakLine(i)`, pausa. Antes de cada línea comprueba `isAlive` y que `run` siga siendo el `runId` vigente.
2. **`speakLine(index)`**: marca `playing` (la burbuja se resalta), `speechSVC.speak(jp, { voice })` y, al acabar, limpia `playing` si sigue siendo esa línea.
3. **`stop()`**: `runId++` (corta el bucle), `stopSpeaking` y limpia `playing`.
4. **`tapLine(index)`**: `runId++` y lee esa línea. En el turno del usuario ignora su línea y las siguientes.
5. **`scrollTo(index)`**: `scrollIntoView` de la burbuja `[data-i]` tras `SCROLL_DELAY_MS` (50 ms), para que la burbuja nueva ya esté en el DOM.

**`runId`** es el mecanismo de cancelación de todo el audio: cada reproducción nueva lo sube, y los bucles que comprueban un número viejo se detienen solos.

### 4. Juego de rol

1. **`startRole(role)`**: `stop()`, guarda el personaje, vacía `results`, `step = 0`, `mode = 'role'` y **`advance()`**.
2. **`advance()`**:
   1. Limpia el turno: `weakAttempts = 0`, `feedback`, `showHint`, `micMessage`, `typedText`.
   2. Bucle mientras siga vigente: si no hay línea, **`finish()`**. Si la línea es del usuario y no tiene resultado, **sale y espera**. Si no, la lee, pausa, y pasa a la siguiente (o `finish()` si era la última).
3. **Responder hablando** — **`speakAnswer()`**: `speechSVC.listen().result` → `transcripts`. Sin transcripciones, «No te escuché…». Con ellas, `readingSVC.bestMatch(transcripts, [línea])` → **`grade(score, texto, 'voz')`**. Un error de permiso o de soporte enseña su aviso y cambia `answerMode` a `type`.
4. **Responder escribiendo** — **`typeAnswer()`**: lee el texto ya convertido a kana con `kanaInput.read()` (o `typedText`), y `bestMatch([texto], [línea])` → **`grade(score, texto, 'texto')`**.
5. **`skipLine()`** → `grade(0, '', 'saltada')`.
6. **`grade(score, heard, method)`**:
   - Intento flojo con reintentos libres: `feedback` + sonido `bad` y nada más (el turno sigue abierto).
   - Si no: guarda en `results[step]`, pone `feedback`, suena y suma XP según la [tabla](#reglas). Con el resultado guardado, `userTurn` pasa a `null` y el panel enseña «Escuchar el modelo y continuar».
7. **`accept()`** (botón **Seguir** tras un intento flojo): guarda `feedback` en `results` y suma 1 XP.
8. **`retry()`**: limpia `feedback`, el mensaje del micro y el campo de kana.
9. **`continueAfter()`**: lee la línea modelo y, si quedan, `step + 1` y **`advance()`**; si no, **`finish()`**.
10. **`listenModel()`** (botón de la pista): lee la línea del turno.

### 5. Final

**`finish()`**: `mode = 'done'`, `step` a la última línea (se ve el chat entero), sonido `done`, `addXp(FINISH_XP)` y `finishSession()`.

### 6. Salida

**`ngOnDestroy`**: `isAlive = false` (cualquier bucle de `playAll` o `advance` que siga esperando un audio se detiene en su siguiente comprobación) y `stopSpeaking()`.

### Estilos

[conversation-player.component.scss](../../../src/app/views/conversations/views/conversation-player/conversation-player.component.scss), por bloques:

- **Estructura**: `.wrap` ocupa todo el alto (`100dvh`) y el `.panel` va `sticky` abajo con el área segura del móvil (`--safe-b`).
- **Intro**: `.who.a` y `.who.b` con los colores de cada voz.
- **Chat**: `.msg.right` para B; `.msg.playing` resalta la línea que suena; `.mine` las del usuario.
- **Notas**: `.score` y `.fb` con `.good` (≥ 0.75) y `.mid` (≥ 0.5). Los umbrales de color están repetidos en la plantilla.
- **Micrófono**: `.mic.on` con la animación `pulse` mientras escucha.
