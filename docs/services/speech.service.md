# `SpeechService`

La voz de la app: pronuncia texto japonés y escucha al usuario. Para hablar usa primero el **audio pregrabado** que trae la app (mp3 generados con VOICEVOX) y, si un texto no tiene grabación, la **voz del dispositivo** (Web Speech API). Para escuchar usa el reconocimiento de voz del navegador en `ja-JP`.

No compara lo que dijo el usuario con la respuesta (eso es [`ReadingService.bestMatch`](reading.service.md#bestmatchcandidates-targets)) ni toca los efectos de sonido (eso es `SfxService`).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [speech.service.ts](../../src/app/services/speech.service.ts) | El servicio |
| [speech.interface.ts](../../src/app/interfaces/speech.interface.ts) | `ListenResult`, `Listening` y `Voice` |
| [audio-key.utils.ts](../../src/app/utils/audio-key.utils.ts) | `audioKey` (nombre del mp3) y `cleanSpeech` (limpieza del texto) ([su doc](../utils/audio-key.utils.md)) |
| [progress.service.ts](../../src/app/services/progress.service.ts) | De ahí sale la velocidad por defecto, `settings().rate` |
| `public/audio/<clave>.mp3` y `public/audio/manifest.json` | Las grabaciones y su lista; los genera `tools/build-audio.mjs` |

### Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `BASE_RATE` | `0.9` | Velocidad a la que se hicieron las grabaciones (igual al `rate` por defecto) |
| `MIN_PLAYBACK_RATE` | `0.5` | `playbackRate` mínimo del mp3 |
| `MAX_PLAYBACK_RATE` | `1.5` | `playbackRate` máximo del mp3 |
| `SECOND_SPEAKER_PITCH` | `1.25` | Tono del hablante B cuando no hay segunda voz japonesa |

### Estado

| Miembro | Qué guarda | Quién lo escribe | Quién lo lee |
|---|---|---|---|
| `canSpeak` (constante) | Hay síntesis de voz o elemento `<audio>` | — | `SpeakButtonComponent` (si no, no se pinta), `ProfileComponent` |
| `canListen` (constante) | El navegador tiene `SpeechRecognition` o `webkitSpeechRecognition` | — | `QuestionRunnerComponent` y `ConversationPlayerComponent` (micrófono) |
| `speaking` | Está sonando algo | `playRecording`, `speakTts`, `stopSpeaking` | `ConversationPlayerComponent` |
| `listening` | El micrófono está abierto | `listen` | `QuestionRunnerComponent`, `ConversationPlayerComponent` |
| `hasJapaneseVoice` | El dispositivo tiene alguna voz `ja` | el constructor (`refreshVoices`) | `ProfileComponent` (aviso de instalar voz) |
| `hasRecordings` | `manifest.json` trae al menos una clave | `loadManifest` | `ProfileComponent` |
| `recordingKeys` | Las claves del manifiesto | `loadManifest` | `ProfileComponent` (tamaño aproximado y descarga para usar sin conexión) |
| `credits` | Créditos de las voces (`VOICEVOX:No.7`…) | `loadManifest` | `ProfileComponent` |

Privados: `voices` (voces japonesas del sistema), `recorded` (`Set` de claves con mp3), `audio` (un único `HTMLAudioElement` reutilizado) y `finishAudio` (cierra la grabación en curso).

No guarda nada en `localStorage`.

### Reglas

- **Grabación antes que voz del sistema.** Si existe el mp3 del texto, se usa. Si el mp3 falla al cargar o al reproducir, se cae a la voz del sistema sin que el usuario lo note.
- **Dos voces**: `voice: 0` (o nada) es el hablante A, voz `a`; `voice: 1` es el hablante B, voz `b`. Si el texto no tiene grabación con la voz pedida, se usa la de la otra voz antes que la del sistema.
- **Velocidad**: `options.rate` o, si no viene, `settings().rate`. En las grabaciones se aplica como `playbackRate = rate / BASE_RATE`, entre 0.5 y 1.5. Con el ajuste por defecto (0.9) el mp3 suena a 1×; `rate: 0.6` (botón lento) lo pone a 0.67×.
- **Voz del sistema**: `lang = 'ja-JP'`, texto pasado por `cleanSpeech`. Con dos o más voces japonesas, B usa la segunda. Con una sola o ninguna, B sube el tono a 1.25 para que se distinga.
- **Una cosa a la vez**: `speak` y `listen` llaman antes a `stopSpeaking`.
- **Sin voz japonesa todavía**: si `getVoices()` aún devuelve la lista vacía (algunos navegadores la cargan tarde), `hasJapaneseVoice` sigue en `true` para no mostrar un aviso falso; se recalcula con `voiceschanged`.

---

## Recorrido paso a paso

Los nombres son buscables en [speech.service.ts](../../src/app/services/speech.service.ts).

### 1. Arranque

1. `constructor` lanza `loadManifest()` sin esperar.
2. `loadManifest` hace `fetch('audio/manifest.json')` (`{ keys, credits }`), llena `recorded` y los signals `recordingKeys`, `credits` y `hasRecordings`. Si falla (sin conexión y sin caché), no hay grabaciones y todo va por la voz del sistema.
3. Si hay síntesis de voz, `refreshVoices` guarda las voces cuyo `lang` empieza por `ja` y actualiza `hasJapaneseVoice`. Se repite en cada `voiceschanged`.

### 2. Hablar

`speak(text, options)`:

1. Texto vacío → termina.
2. `stopSpeaking()` corta lo anterior.
3. `recordingFor(text, options.voice)` busca la clave: `audioKey(text, 'a' | 'b')` de la voz pedida y, si no está en `recorded`, la de la otra voz.
4. Con clave → `playRecording(key, rate, fallback)`:
   1. Pone `audio.src = audio/<clave>.mp3` y el `playbackRate`.
   2. `speaking = true` y `play()`.
   3. Termina con `onended` (resuelve), con `onerror` o con el rechazo de `play()` (llama al `fallback`, que es `speakTts`), o con `stopSpeaking` (`finishAudio`, resuelve). Una bandera `isSettled` hace que solo cuente el primero de esos caminos.
5. Sin clave → `speakTts(text, options)`: `speechSynthesis.cancel()`, crea el `SpeechSynthesisUtterance` (ver [reglas](#reglas)) y resuelve en `onend` u `onerror`.

La promesa de `speak` se resuelve cuando termina de sonar (o se corta). `ConversationPlayerComponent` la usa para encadenar las líneas de un diálogo.

### 3. Cortar

`stopSpeaking()` cancela la síntesis, pausa el `<audio>`, llama a `finishAudio` (que resuelve la promesa pendiente de `playRecording`) y pone `speaking = false`. Lo llaman las vistas al salir o al pasar de pregunta.

### 4. Escuchar

`listen()`:

1. Si no hay `SpeechRecognition` ni `webkitSpeechRecognition`, devuelve un `result` rechazado con `'unsupported'`.
2. `stopSpeaking()` para que el micrófono no oiga a la propia app.
3. Configura el reconocimiento: `ja-JP`, sin resultados parciales, hasta **5 alternativas**, una sola frase.
4. `result` es una promesa que:
   - se resuelve con **todas** las alternativas de todos los resultados en `onresult`;
   - se rechaza con el código del navegador (`no-speech`, `not-allowed`…) en `onerror`;
   - se resuelve con `transcripts: []` si llega `onend` sin nada de lo anterior.
5. `listening = true` y `start()`. Si `start()` lanza, `listening` vuelve a `false`.
6. Devuelve `{ result, stop }`.

Quien llama (`QuestionRunnerComponent.listen`, `ConversationPlayerComponent.speakAnswer`) espera `result` y pasa las transcripciones a `ReadingService.bestMatch`.

---

## Métodos

### Hablar

#### `speak(text, options)`

- **Qué hace**: pronuncia `text`.
- **Cómo**: ver el [paso 2](#2-hablar). `options` = `{ rate?, voice?: 0 | 1, pitch? }`.
- **Devuelve**: `Promise<void>` que se resuelve al terminar o cortar.
- **Quién lo llama**: `SpeakButtonComponent` (`rate: 0.6` en modo lento), `QuestionRunnerComponent` (en las preguntas de escuchar `rate × 0.92`), `ConversationPlayerComponent` (`voice` 0 o 1 según el hablante), `FlashcardsComponent`, `MatchGameComponent`, `HomeComponent`, `PetHouseComponent`, `ProfileComponent` (prueba de voz), `LessonDetailComponent` y las vistas de kana (`KanaChartComponent`, `KanaTraceComponent`, `KatakanaLabComponent`).

#### `stopSpeaking()`

- **Qué hace**: corta lo que suene.
- **Cómo**: ver el [paso 3](#3-cortar).
- **Quién lo llama**: `speak`, `listen`, `QuestionRunnerComponent`, `ConversationPlayerComponent`, `FlashcardsComponent` y `MatchGameComponent`.

### Escuchar

#### `listen()`

- **Qué hace**: abre el micrófono para una frase en japonés.
- **Cómo**: ver el [paso 4](#4-escuchar).
- **Devuelve**: `Listening` = `{ result: Promise<ListenResult>, stop }`, con `ListenResult` = `{ transcripts: string[] }`.
- **Quién lo llama**: `QuestionRunnerComponent` (preguntas de hablar) y `ConversationPlayerComponent` (responder en voz alta).
