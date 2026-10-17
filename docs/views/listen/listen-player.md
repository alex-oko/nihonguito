# Reproductor de Escuchar (`/escuchar/reproducir`)

Reproduce solo, uno tras otro, los audios elegidos en [Escuchar](listen.md): el japonés (grabado o con la voz del dispositivo), una pausa para pensar y la traducción en español (voz del dispositivo). Es inmersivo, mantiene la pantalla encendida y responde a los botones de los audífonos y de la pantalla de bloqueo.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [listen-player.component.ts](../../../src/app/views/listen/views/listen-player/listen-player.component.ts) | Secuencia, pausa, saltos, pantalla encendida y Media Session. |
| [listen-player.component.html](../../../src/app/views/listen/views/listen-player/listen-player.component.html) | Progreso, texto que suena y controles grandes. |
| [listen-player.component.scss](../../../src/app/views/listen/views/listen-player/listen-player.component.scss) | Pantalla completa en tres zonas. |

### Qué hace el usuario

- Al entrar empieza a sonar solo (se llega tocando «Empezar», así que el navegador ya permite el audio).
- **Reproducir / pausar** (botón grande), **anterior** y **siguiente**. Al reanudar, el elemento actual vuelve a empezar.
- **X** para y vuelve a `/escuchar`.
- Con audífonos o desde la pantalla de bloqueo: play, pausa, siguiente y anterior (Media Session). La pantalla de bloqueo enseña la frase y su traducción.
- Si el elemento no tiene grabación y el dispositivo no tiene voz japonesa (`isSilent`), un aviso explica que el japonés no suena.

### Reglas

- **Japonés → español**: japonés (`repeat` veces, con `REPEAT_GAP_MS` = **700 ms** entre ellas), pausa (`PAUSE_MS`: **1,5 / 3 / 5 s**), español, silencio `GAP_MS` (**1,2 s**). La traducción aparece en pantalla cuando suena.
- **Español → japonés**: al revés; el japonés se esconde («？») hasta que suena, para no soplar la respuesta.
- **Solo japonés**: japonés y silencio.
- En pausa se ven el japonés y la traducción.
- Velocidad lenta: japonés a `SLOW_RATE` (**0,6**) y español a `SLOW_SPANISH_RATE` (**0,85**); normal: el `rate` de los ajustes y 1.
- El español se lee limpio con `spokenEs` (sin paréntesis ni ～).
- Con «Repetir al terminar», la lista se rearma (otro orden si está mezclada) y vuelve a empezar.
- **Pantalla encendida**: `navigator.wakeLock` mientras suena; se vuelve a pedir al volver a la app (`visibilitychange`) y se suelta al pausar o salir. Sin soporte, la pantalla se apaga como siempre (y el navegador puede cortar el audio).
- No da XP ni toca el repaso espaciado: es repaso pasivo.

### Datos guardados

Solo lee `nihongo:listenConfig`.

---

## Recorrido del código paso a paso

### 1. Arranque

`config` sale de `listenConfig`. El constructor escucha `visibilitychange`, conecta la Media Session (`setupMediaSession`) y llama a **`load()`**: carga las lecciones, arma `items` con `buildListenItems` y llama a `play(0)`.

### 2. Secuencia

**`play(fromIndex)`** toma un `runId` nuevo y recorre los elementos con **`playItem(item, runId)`**, que sigue las reglas de arriba y pone `phase` (`first`, `think`, `second`, `gap`). Cada `await` comprueba que el `runId` siga siendo el actual: al pausar o saltar se incrementa `runId` y la secuencia vieja se detiene sola. **`wait(ms, runId)`** es la pausa cancelable.

### 3. Controles

- **`toggle()`**: pausa, o reanuda desde el actual (desde 0 si terminó).
- **`pause()`**: incrementa `runId`, `stopSpeaking()` y suelta la pantalla.
- **`jump(step)`**: pausa, cambia de elemento y, si sonaba, sigue sonando desde ahí.

### 4. Salida

`ngOnDestroy` corta el audio, suelta la pantalla, quita el listener y limpia la Media Session.
