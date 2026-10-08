# Contrarreloj (`app-speed-game`)

Juego de velocidad: 60 segundos para acertar todas las preguntas de opción múltiple posibles. Cada error resta 3 segundos. Guarda un récord por tipo de contrarreloj (hiragana, katakana o vocabulario).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [speed-game.component.ts](../../src/app/components/speed-game/speed-game.component.ts) | Reloj, marcador, racha, penalización, XP y récord |
| [speed-game.component.html](../../src/app/components/speed-game/speed-game.component.html) | Pantallas de inicio, partida y final, y el reloj |
| [speed-game.component.scss](../../src/app/components/speed-game/speed-game.component.scss) | Enunciado con parpadeo verde/rojo y opciones en dos columnas |
| [game-timer.component.ts](../../src/app/components/game-timer/game-timer.component.ts) | La barra de cuenta atrás ([su doc](game-timer.md)) |
| [storage.utils.ts](../../src/app/utils/storage.utils.ts) | `loadRaw` / `save` del récord |

Solo lo usa [`game-host`](../views/game-host/game-host.md) (`/juego/contrarreloj`).

### API

| Nombre | Tipo | Para qué |
|---|---|---|
| `questions` | `input.required<ChoiceQuestion[]>` | Las preguntas; si se acaban antes que el tiempo, vuelven a empezar |
| `title` | `input` (`'Contrarreloj'`) | Cabecera y pantalla de inicio |
| `storageKey` | `input` (`'speed'`) | Clave del récord: `nihongo:best:<storageKey>` |
| `again` | `output<void>` | «Otra vez»: el padre puede regenerar las preguntas |

### Qué hace el usuario

- **Empezar**: arranca el reloj.
- **Tocar una opción**: verde y siguiente a los 180 ms (`NEXT_AFTER_OK_MS`), o rojo con sacudida, −3 s y siguiente a los 450 ms (`NEXT_AFTER_MISS_MS`). Mientras dura el parpadeo no admite más toques (`isLocked`).
- **Otra vez** (pantalla final): emite `again` **y** vuelve a empezar en el acto. En el contrarreloj de vocabulario, el host regenera las preguntas de forma asíncrona, así que la lista cambia ya empezada la partida.
- **X** / **Terminar**: vuelve atrás.

### Reglas

| Regla | Valor | Constante |
|---|---|---|
| Duración | 60 s | `DURATION_SECONDS` |
| Penalización por error | 3 s | `MISS_PENALTY_MS` |
| Refresco del tiempo restante | 100 ms | `TICK_MS` |
| XP al terminar | 2 por acierto | `XP_PER_CORRECT` |
| Racha visible (🔥) | desde 3 aciertos seguidos | (en la plantilla) |

- **Récord**: se guarda si la puntuación supera al anterior. «¡Nuevo récord!» (新記録) solo con más de 0 aciertos.
- **Dominio**: cada respuesta con `track` llama a `recordAnswer` (`k:<kana>` o `w:<id>`).

### Datos guardados

- `nihongo:best:<storageKey>` (directo con `save`): el récord. El host usa `speed-hiragana`, `speed-katakana` y `speed-vocab`.
- A través de [`ProgressService`](../services/progress.service.md): `nihongo:mastery`, `nihongo:stats`, `nihongo:answerLog` en cada respuesta; `nihongo:activity` y `nihongo:stats` al terminar.

---

## Recorrido del código paso a paso

Todo está en [speed-game.component.ts](../../src/app/components/speed-game/speed-game.component.ts); los nombres son buscables.

### 1. Arranque

El `effect` del `constructor` lee `storageKey()` y carga el récord en `bestScore` con `loadRaw('best:<clave>', 0)`. `gameState` empieza en `'ready'`.

### 2. Partida

**`start()`** (público): limpia el intervalo anterior, `gameState = 'play'`, fija `endsAt` = ahora + 60 s, pone a cero marcador, errores, racha e índice, y arranca **`tick`** cada 100 ms.

**`tick()`**: `remainingMs = endsAt − ahora` (mínimo 0). A cero, **`end`**. El reloj se calcula contra `endsAt` y no restando 100 ms en cada tick: así no se desvía si el navegador retrasa los intervalos.

**`current`**: `questions()[index % length]`.

### 3. Responder

**`answer(choice)`**:

1. Bloquea (`isLocked`) y registra el dominio.
2. Acierto: suma marcador y racha, suena `ok`. Fallo: suma error, racha a 0, adelanta `endsAt` 3 s y llama a **`tick`** al momento, para que si la penalización agota el tiempo la partida acabe ya y no en el siguiente intervalo; suena `bad`.
3. Parpadeo (`flashResult`) y, pasado el retardo, siguiente pregunta, desbloquea y, si el tiempo llegó a 0 entretanto, `end`.

### 4. Final

**`end()`** (solo si estaba en juego): para el intervalo, `remainingMs = 0`, `gameState = 'over'`, `addXp(score × 2)`, `finishSession`, guarda el récord si lo superó y suena `done`.

### 5. Salida

**`ngOnDestroy`**: para el intervalo.

### Estilos

[speed-game.component.scss](../../src/app/components/speed-game/speed-game.component.scss): `.flash-ok` / `.flash-bad` tiñen el enunciado (el rojo con `shake`); `.p.big` y `.c.big` usan `--font-hand` para los kana grandes; la línea bajo la cabecera mezcla `--signal` con transparente.

El reloj se pinta con `app-game-timer` en modo `countdown`: `anchor = endsAt()`, `running` solo en juego y `frozenMs = remainingMs()` para que antes de empezar muestre 1:00 y al acabar 0:00.
