# Perfil (`/perfil`)

La pantalla de la persona y de los ajustes: nombre, nivel, racha, palabras aprendidas, aciertos, XP de la semana y kana dominados; intereses; plantilla visual, escritura japonesa, romaji, voz, sonido, vibración y meta diaria; audio sin conexión, instalación de la PWA, versión de la app y borrar todo el progreso.

Los ajustes se guardan en `nihongo:settings` a través de [`ProgressService`](../../services/progress.service.md). La versión y el botón de actualizar son de [`UpdateService`](../../services/update.service.md). Cómo se aplican tema y escritura a la app: [styles-and-themes.md](../../core/styles-and-themes.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [profile.component.ts](../../../src/app/views/profile/profile.component.ts) | Estadísticas (`computed`), cambio de ajustes, descarga de audios, instalación |
| [profile.component.html](../../../src/app/views/profile/profile.component.html) | Cabecera, cifras, semana, kana, intereses, ajustes, audio, instalar, versión, datos |
| [profile.component.scss](../../../src/app/views/profile/profile.component.scss) | Intereses, plantillas visuales con vista previa, cabecera, semana, lista de ajustes, avisos |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | `settings`, `stats`, `mastery`, `activity`, `level`, `currentStreak`, `resetAll`, `MASTERED_BOX`, `SCRIPT_OPTIONS` |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | `speak`, `recordingKeys`, `hasRecordings`, `canSpeak`, `hasJapaneseVoice`, `credits` ([su doc](../../services/speech.service.md)) |
| [update.service.ts](../../../src/app/services/update.service.ts) | `version`, `built`, `state`, `check` |
| [interests.utils.ts](../../../src/app/utils/interests.utils.ts) | `INTERESTS`: id, etiqueta e icono de cada interés |
| [index.html](../../../src/index.html) | Guarda en `window.__installPrompt` el evento de instalación si llega antes de abrir Perfil |

### Qué hace el usuario

- **Nombre**: se guarda al salir del campo (`change`, no en cada tecla). Inicio lo usa en el saludo de Musubi.
- **Intereses**: cada botón marca o desmarca un interés (`toggleInterest`). Inicio enlaza aquí con `#intereses` cuando no hay ninguno.
- **Plantilla visual**: 4 tarjetas (Base, Sol, Violeta, Carmesí) con vista previa de colores; la elegida lleva un ✓. Cambia toda la app al momento.
- **Mostrar romaji**: interruptor.
- **Escritura japonesa**: chips de `SCRIPT_OPTIONS` (Solo kana, Kanji + furigana, Kanji) y una frase de muestra (`私は 会社員です。`) que cambia con la opción.
- **Velocidad de la voz**: slider de 0.5 a 1.3 en pasos de 0.1; el altavoz lee una frase de prueba (`testVoice`) con esa velocidad.
- **Sonidos** (interruptor maestro) y **Vibración**.
- **Meta diaria**: 20, 50, 100 o 200 XP.
- **Audio sin conexión** (solo si la app trae audios grabados): descarga todos. Durante la descarga, barra y «Descargando N de M…»; al final, «¡Listo!…». Si no hay audios grabados y el dispositivo no tiene voz japonesa, sale en su lugar un aviso con los pasos para instalarla en Android e iPhone.
- **Instalar app**: el botón solo aparece si el navegador ofreció la instalación (Chrome en Android, escritorio). Las instrucciones de Android e iPhone se ven siempre.
- **Versión de la app**: versión, fecha de compilación y el botón de buscar / instalar actualización ([update.service.md](../../services/update.service.md)).
- **Borrar todo mi progreso**: pide confirmación con `confirm` y, si se acepta, borra todo y recarga.

### Reglas

- **Palabras** aprendidas (`wordsLearned`): claves `w:` en la caja de Leitner **2** o más.
- **Aciertos** (`accuracy`): `correct / answered` de `nihongo:stats`, redondeado; 0 sin respuestas.
- **Kana dominados** (`kanaMastered`): claves `k:` de **un solo carácter** con caja ≥ `MASTERED_BOX` (**4**). Se separan por rango Unicode: hiragana `U+3041–U+3096`, katakana `U+30A1–U+30FA`. Cada contador tiene tope **`BASIC_KANA_COUNT`** (46), porque el rango también incluye kana pequeños y con dakuten.
- **Semana** (`week`): 7 barras. La altura es el XP del día sobre el mayor entre la meta diaria y el mejor día de la semana; así un día que pasa la meta llena su barra y los demás se ven en proporción.
- **Tamaño de los audios** (`audioMb`): número de grabaciones × **`AUDIO_CLIP_KB`** (6 KB) en MB, mínimo 1.
- **Descarga de audios**: **`AUDIO_DOWNLOAD_WORKERS`** (6) descargas a la vez.

### Datos guardados

| Clave | Qué escribe Perfil |
|---|---|
| `nihongo:settings` | `name`, `interests`, `theme`, `romaji`, `script`, `rate`, `sound`, `vibration`, `dailyGoal` |
| todas las `nihongo:*` | `resetAll` las borra |

Lee además `nihongo:stats`, `nihongo:mastery` y `nihongo:activity`. Los audios descargados no van a `localStorage`: los guarda la caché del service worker.

---

## Recorrido del código paso a paso

Cada paso empieza en [profile.component.ts](../../../src/app/views/profile/profile.component.ts). Los nombres son buscables en el archivo.

### 1. Arranque

1. **Campos**: `settings` es el mismo signal que `progressSVC.settings` (un atajo para la plantilla). `themes`, `goals`, `interests` y `scriptOptions` son las opciones fijas de los controles.
2. **`constructor`**:
   1. Si `index.html` ya guardó el evento en `window.__installPrompt`, lo pasa a `installPrompt`. Hace falta porque `beforeinstallprompt` suele llegar al cargar la página, mucho antes de que el usuario abra Perfil.
   2. Escucha `beforeinstallprompt` por si llega después: `preventDefault()` (que el navegador no muestre su propio aviso) y lo guarda.

### 2. Estadísticas

Todas son `computed` sobre `ProgressService` y se recalculan solas: `accuracy`, `wordsLearned`, `kanaMastered`, `week` y `audioMb` ([reglas](#reglas)). La cabecera usa además `progressSVC.level()` y `stats().xp`; las cifras, `currentStreak()`.

### 3. Ajustes

- **`updateSetting(key, value)`**: `progressSVC.settings.update` con el campo nuevo. `nihongo:settings` se escribe solo (signal persistido) y el `effect` de `AppComponent` aplica tema y escritura.
- **`toggleInterest(id)`**: añade o quita el id de `interests`.
- **`testVoice()`**: `speechSVC.speak('こんにちは。いっしょに にほんごを べんきょうしましょう。')` (usa la velocidad guardada).

### 4. Audio sin conexión

**`downloadAudio()`**:

1. Copia `speechSVC.recordingKeys()` en una cola y pone `audioDownload` a `{ done: 0, total }`.
2. Lanza 6 `worker` que sacan claves de la misma cola y hacen `fetch('audio/<clave>.mp3')`. No guardan nada a mano: el service worker cachea los MP3 al pedirlos (grupo `audio` de `ngsw-config.json`, con `installMode: lazy`).
3. Cada audio, bien o mal, suma `done`. Un fallo se ignora: se reintenta en la próxima descarga.

En desarrollo (sin service worker) las peticiones se hacen pero no quedan guardadas.

### 5. Instalación

**`install()`**: llama a `prompt()` del evento guardado, espera `userChoice` y vacía `installPrompt` (el evento solo sirve una vez, acepte o no), con lo que el botón desaparece.

### 6. Versión

La tarjeta lee `updateSVC.version`, `updateSVC.built` y `updateSVC.state()`, y el botón llama a `updateSVC.check()`. Los textos por estado están en [update.service.md](../../services/update.service.md#estados).

### 7. Borrar progreso

**`reset()`**: `confirm(…)`; si se acepta, `progressSVC.resetAll()` borra todas las claves `nihongo:` y recarga la página. La recarga es necesaria porque los signals persistidos siguen en memoria y volverían a escribir los datos viejos.

### 8. Salida

No hay `ngOnDestroy`. El listener de `beforeinstallprompt` no se quita al salir (ver [gotchas](#gotchas)).

### Estilos

[profile.component.scss](../../../src/app/views/profile/profile.component.scss) está agrupado con banners `/* ---- … ---- */`: intereses (rejilla de 4 columnas, 3 por debajo de 360 px), tarjeta de versión, plantillas visuales (`.theme-card` con `--preview-bg`, `--preview-a/b/c` en línea desde la plantilla, tres franjas inclinadas y la marca ✓), cabecera y semana (`.col i` con la altura en %), kana dominados, lista de ajustes y avisos. Las reglas no siguen el orden de la pantalla: se agruparon sin moverlas para no cambiar la cascada.

---

## Gotchas

1. **Listener sin quitar**: cada vez que se abre Perfil se añade otro `beforeinstallprompt` a `window` y ninguno se quita. Hoy no rompe nada (el evento llega como mucho una vez por carga), pero guarda una referencia al componente destruido.
2. **`initial`** (inicial del nombre) es un `computed` que la plantilla ya no usa, igual que `.avatar` en el SCSS.
3. **`kanaMastered`** cuenta por rango Unicode, no por la lista de kana básicos: si un kana pequeño o con dakuten llega a la caja 4 cuenta igual; el tope de 46 evita pasar del total.
