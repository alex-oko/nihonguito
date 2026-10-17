# Escuchar (`/escuchar`)

Formulario del modo escuchar: repasar de oído palabras, frases y diálogos sin tocar el teléfono (en el transporte, caminando, cocinando). Al pulsar **Empezar a escuchar** abre el [reproductor](listen-player.md). Las opciones y el armado de la lista viven en [listen.utils](../../utils/listen.utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [listen.component.ts](../../../src/app/views/listen/listen.component.ts) | Configuración, carga de lecciones, conteo de audios y arranque. |
| [listen.component.html](../../../src/app/views/listen/listen.component.html) | Lecciones, qué escuchar, cómo, ajustes y resumen. |
| [listen.component.scss](../../../src/app/views/listen/listen.component.scss) | Opciones con radio, ajustes y aviso de voz. |
| [listen.utils.ts](../../../src/app/utils/listen.utils.ts) | Opciones, pausas y `buildListenItems` ([su doc](../../utils/listen.utils.md)). |

Se entra desde **Practicar** (tarjeta «Escuchar», debajo del repaso).

### Qué hace el usuario

1. **Lecciones**: `app-lesson-picker`.
2. **Qué escuchar**: Palabras, Frases y/o Diálogos (selección múltiple).
3. **Cómo**: Japonés → español, Español → japonés o Solo japonés.
4. **Ajustes**: velocidad (Normal / Lenta), cuántas veces suena el japonés (1 o 2), pausa para pensar (Corta, Normal o Larga; no sale en «Solo japonés»), orden (Mezclado / En orden), cuántos (20, 30, 50 o Todos) y «Repetir al terminar».
- El resumen dice cuántos audios hay y cuántos minutos dura más o menos (`estimateMinutes`).
- Si el modo usa español y el dispositivo no tiene voz `es` (`speechSVC.hasSpanishVoice`), avisa de que solo sonará el japonés y de dónde instalarla.

### Reglas

- Primera vez: `DEFAULT_LISTEN_CONFIG` (palabras y frases, japonés → español, 1 vez, pausa normal, mezclado, 30) y lecciones de la 1 a la última abierta.
- **Empezar a escuchar** se desactiva si no hay audios.

### Datos guardados

- `nihongo:listenConfig` (`ListenConfig`) con `loadRaw` / `save`: se escribe al empezar; el formulario y el reproductor la leen.

---

## Recorrido del código paso a paso

1. **Arranque**: `config` = valores por defecto + lo guardado. Un `effect` llama a **`loadLessons(config().lessons)`** cuando cambian las lecciones; `currentLoadId` descarta respuestas viejas.
2. **Conteo**: **`available`** arma la lista completa sin barajar (`buildListenItems` con `count: 0`) y **`total`** la recorta a `count`. **`minutes`** estima la duración.
3. **Formulario**: **`update(change)`** cambia una parte de la configuración; **`toggleContent`** marca o desmarca un tipo de contenido.
4. **`start()`**: guarda `listenConfig` y navega a `/escuchar/reproducir`.
