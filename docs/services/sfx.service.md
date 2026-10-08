# `SfxService`

Efectos de sonido y vibración de la app. No hay archivos de audio: cada sonido se sintetiza al momento con Web Audio (osciladores con una envolvente corta). Respeta los ajustes **Sonido** y **Vibración** del usuario (`sound` y `vibration` en `ProgressService.settings`, clave `nihongo:settings`). No guarda nada.

Lo usan las prácticas y juegos (`app-question-runner`, `app-flashcards`, `app-match-game`, `app-speed-game`), el trazo de kana, las conversaciones, la hoja de examen de nivel y la [casa de Musubi](../views/pet-house/pet-house.md), que es la única que usa `pat`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [sfx.service.ts](../../src/app/services/sfx.service.ts) | `play`, `pat` y la síntesis (`note`) |
| [progress.service.ts](../../src/app/services/progress.service.ts) | `settings()`: `sound` y `vibration` ([su doc](progress.service.md)) |

### Sonidos

| `kind` | Cuándo se usa | Cómo suena | Vibración (`VIBRATION_PATTERNS`, ms) |
|---|---|---|---|
| `ok` | Respuesta correcta | «Ding-ding» de campanita: 988 Hz y 1319 Hz (con un armónico suave a 2638 Hz) | 15 |
| `bad` | Respuesta incorrecta | «Bonk» grave que baja: 330 → 247 Hz y 196 → 165 Hz, onda triangular. Se nota pero no castiga | 40, 40, 40 |
| `combo` | Racha de aciertos, compra, gran combo de caricias | Arpegio rápido hacia arriba: 784, 988, 1175, 1568 Hz cada 60 ms | 15, 30, 15 |
| `done` | Final de una práctica, juego o evolución | Do-mi-sol en triangular cada 110 ms y luego el acorde con el do agudo | 20, 40, 20, 40, 60 |
| `tap` | Toque pequeño | Un clic de 50 ms a 1200 Hz | 5 |

Los patrones de vibración alternan vibrar y pausa.

**`pat(step)`**: una nota de 220 ms de `PAT_SCALE` (pentatónica de do: 523, 587, 659, 784, 880, 1047, 1175, 1319 Hz). `step` 0 es la primera; cada caricia seguida sube un escalón y a partir de la octava se queda en la última. `pat` no vibra.

### Reglas

- Sin `sound`, no suena nada; sin `vibration`, no vibra. Son independientes: `play` puede vibrar en silencio.
- Solo vibra si el navegador tiene `navigator.vibrate` (iOS Safari no la tiene).
- El `AudioContext` se crea con el **primer** sonido, no al arrancar: los navegadores no dejan iniciar audio sin un gesto del usuario, y el primer sonido siempre llega tras un toque.
- Cualquier error de audio o vibración se ignora: la app sigue, en silencio.

---

## Recorrido paso a paso

### 1. `play(kind)`

1. Lee `settings()`.
2. **Vibración**: con `vibration` y `navigator.vibrate`, vibra con el patrón del `kind` dentro de un `try` (algunos navegadores lanzan error si no hubo gesto).
3. **Sonido**: sin `sound` termina. Si no, programa las notas del `kind` con **`note`** ([tabla](#sonidos)).

### 2. `note(frequency, startAt, duration, type, peak = 0.08, glideTo?)`

1. Crea `audioContext` si no existe (`??=`).
2. Si está `suspended` (pasa en móviles al volver de segundo plano), lo reanuda.
3. Crea un oscilador del `type` (`sine` o `triangle`) a `frequency`, que empieza `startAt` segundos después de ahora. Con `glideTo`, desliza el tono hasta esa frecuencia durante la nota.
4. Envolvente de volumen: de 0,0001 a `peak` en 12 ms y vuelta a 0,0001 al final de `duration`. Se usa 0,0001 y no 0 porque `exponentialRampToValueAtTime` no admite 0.
5. Conecta oscilador → ganancia → altavoz, lo arranca y lo para 30 ms después del final.

No hay limpieza: cada oscilador se libera solo al parar, y el `AudioContext` vive mientras viva la app.

## Métodos

#### `play(kind)`

- **Qué hace**: vibra y suena el efecto `kind` (`'ok' | 'bad' | 'done' | 'tap' | 'combo'`), según los ajustes.
- **Quién lo llama**: los componentes de práctica y juego, el trazo de kana, las conversaciones, el examen de nivel y la casa de Musubi.

#### `pat(step)`

- **Qué hace**: una nota de caricia, más aguda cuanto mayor es `step`.
- **Quién lo llama**: la casa de Musubi en cada caricia del combo (`step` = número de caricia − 1).
