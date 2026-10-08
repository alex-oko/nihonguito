# `PetService`

Guarda y calcula todo lo de Musubi como mascota: sus tres necesidades (panza, alegría, energía), los granos de arroz, la ropa y los objetos, la etapa de crecimiento y el ánimo. Es amable a propósito: **nunca enferma ni muere**, ninguna necesidad baja de `FLOOR` (**10**) y un día sin entrar solo le da hambre o hace que te extrañe.

Lo usan la [casa de Musubi](pet-house.md) (todo), [`app-musubi`](../../components/musubi.md) (etapa y ropa por defecto), Inicio (tarjeta de la casa: `status`, `needsYou`, `baseMood`, `fresh`, las barras) y las prácticas (`reward` desde `app-question-runner`; `app-result-screen` enseña los granos). No pinta nada ni reproduce sonidos.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [pet.service.ts](../../../src/app/services/pet.service.ts) | Estado, constantes (`ITEMS`, `STAGES`, `TOPPINGS`, `FLOOR`, granos), logros, ánimo y acciones |
| [pet.interface.ts](../../../src/app/interfaces/pet.interface.ts) | `PetState`, `Topping`, `Stage`, `PetItem`, `Metric`, `PetMood` (y los tipos de la casa) |
| [storage.utils.ts](../../../src/app/utils/storage.utils.ts) | `persisted`: el signal que se guarda solo en `localStorage` |
| [progress.service.ts](../../../src/app/services/progress.service.ts) | XP, rachas, `lessonBest`, `mastery` ([su doc](../../services/progress.service.md)) |
| [level-exam.service.ts](../../../src/app/services/level-exam.service.ts) | `best()`: nota de cada examen de nivel |

### Estado

| Signal | Qué guarda | Persistencia |
|---|---|---|
| `state` | `PetState`: `food`, `joy`, `energy`, `grains`, `asleep`, `tick`, `wearing`, `owned`, `seen`, `stageSeen`, `petDay`, `petN` | `nihongo:pet` (con `persisted`, que mezcla lo guardado con los valores por defecto) |
| `reaction` | Una reacción corta (`eat`, `happy`…) o `null` | No |

Valores de una partida nueva: panza **60**, alegría **70**, energía **80**, **20** granos, despierto, sin ropa ni objetos.

| Campo | Para qué |
|---|---|
| `tick` | Última vez que se pusieron al día las necesidades (ms) |
| `wearing` | Ropa puesta, una por zona |
| `owned` | Lo comprado con granos |
| `seen` | Desbloqueos ya enseñados (para marcar «Nuevo») |
| `stageSeen` | Última etapa ya celebrada |
| `petDay` / `petN` | Día y número de caricias de ese día |

### Reglas

**Necesidades**: siempre enteras entre **10** (`FLOOR`) y **100** (`clampNeed`).

**Deriva con el tiempo real** (`update`), por hora pasada desde `tick`:

| Necesidad | Despierto de día | Despierto de noche | Dormido |
|---|---|---|---|
| Panza | −2 | −2 | −2 |
| Alegría | −1,5 | −1,5 | −1,5 |
| Energía | −2,5 | −4 | +10 |

- Noche = de **21:00 a 7:00** (`isNightTime`).
- Se cuentan como mucho **72 horas** (`MAX_DRIFT_HOURS`): a partir de ahí todo ya está en el piso.
- Menos de **0,05 h** (3 minutos) no cambia nada, para no reescribir `localStorage` en cada visita.
- Si estaba dormido y ya es de día, se despierta solo.

**Granos**:

| De dónde | Cuántos | Además |
|---|---|---|
| Práctica terminada (`reward`) | `GRAINS_PER_CORRECT` (**5**) por acierto + `GRAINS_FOR_FINISHING` (**5**) | Alegría +5 |
| Juego de 5 palabras (`played`) | **2** por acierto | Alegría +6 +5 por acierto; energía −8 |

**Caricias** (`pet`): +2 de alegría (más `bonus`) solo las **20** primeras del día (`PETS_PER_DAY`). Acariciar ayuda, pero no sustituye a practicar.

**Dormir** (`toggleSleep`): no se duerme si es de día y tiene más de **60** de energía. Al despertarlo a mano gana +10 de energía de noche y +30 de día.

**Comer** (`feed`), en este orden de comprobación:

1. Dormido → «むにゃむにゃ…».
2. Comida bloqueada (`canEat`) → cuántas lecciones faltan.
3. Panza ≥ **95** → «おなか いっぱい！».
4. Sin granos suficientes → «おなか すいた…».
5. Si no: resta el precio, suma la panza de la comida y +5 de alegría.

**Ánimo de fondo** (`baseMood`), el primero que se cumpla:

| Condición | Ánimo |
|---|---|
| Dormido | `sleep` |
| Panza < 30 | `hungry` |
| Alegría < 30 | `sad` |
| Energía < 30, o de noche con energía < 60 | `sleepy` |
| Panza ≥ 70 y alegría ≥ 70 | `happy` |
| Resto | `idle` |

`mood` = `reaction() ?? baseMood()`.

**Logros** (`metric`):

| `Metric` | Valor |
|---|---|
| `streak` | `bestStreak`: el máximo entre la mejor racha guardada y la actual |
| `mastered` | Lecciones con test de lección ≥ **80%** (`lessonBest`) |
| `words` | Palabras (`w:<id>` en `mastery`) en la caja `KNOWN_BOX` (**2**) o más |
| `xp` | XP total |
| `exam` | 1 si algún examen de nivel tiene ≥ **70%**; si no, 0 |

### Constantes

**`TOPPINGS`** (despensa):

| `id` | Japonés | Español | Granos | Lecciones dominadas | Panza |
|---|---|---|---|---|---|
| `shio` | しお | sal | 5 | 0 | +15 |
| `ume` | うめぼし | ciruela encurtida | 10 | 1 | +25 |
| `sake` | さけ | salmón | 15 | 2 | +35 |
| `tuna` | ツナマヨ | atún con mayo | 20 | 3 | +45 |

**`STAGES`** (crecimiento por XP total):

| Índice | `name` | `ja` | XP | `look` |
|---|---|---|---|---|
| 0 | Granito | こめ | 0 | Una bolita de arroz chiquita |
| 1 | Onigiri | おにぎり | 300 | Más grande y con ajonjolí |
| 2 | Con alga | のりまき | 1300 | Estrena su alga con に |
| 3 | Bentō | べんとう | 3000 | Vive en su caja bentō |

**`ITEMS`** (ropa y casa):

| `id` | Tipo | Zona | Nombre | Cómo se consigue |
|---|---|---|---|---|
| `hoja` | ropa | head | Hojita | Dominar 1 lección |
| `lazo` | ropa | head | Moño | 40 granos |
| `hachimaki` | ropa | head | Hachimaki | 7 días de racha |
| `lentes` | ropa | face | Lentes | 50 palabras |
| `pajarita` | ropa | neck | Corbatín | 60 granos |
| `bufanda` | ropa | neck | Bufanda | Dominar 2 lecciones |
| `sombrero` | ropa | head | Sombrero de paja | 30 días de racha |
| `gorro` | ropa | head | Birrete | Aprobar un examen de nivel |
| `corona` | ropa | head | Corona | 5000 XP |
| `alfombra` | casa | | Alfombra | 50 granos |
| `cojin` | casa | | Cojín | 30 granos |
| `cuadro` | casa | | Cuadro del Fuji | 100 palabras |
| `lantern` | casa | | Farol | 7 días de racha |
| `plant` | casa | | Planta | Dominar 2 lecciones |
| `furin` | casa | | Campanita de viento | 14 días de racha |
| `pecera` | casa | | Pecera | 100 granos |
| `daruma` | casa | | Daruma | 2000 XP |
| `kotatsu` | casa | | Kotatsu | Dominar 5 lecciones |
| `trophy` | casa | | Trofeo | Aprobar un examen de nivel |

Los objetos de casa llevan además `vb`: el recorte del dibujo de la habitación para su miniatura. El orden importa: la habitación pinta los objetos en el orden de `ITEMS`, así la alfombra y el cojín quedan debajo de lo demás.

| Constante | Valor | Para qué |
|---|---|---|
| `FLOOR` | 10 | Mínimo de cada necesidad |
| `GRAINS_PER_CORRECT` | 5 | Granos por acierto en una práctica |
| `GRAINS_FOR_FINISHING` | 5 | Granos por terminarla |
| `PETS_PER_DAY` | 20 | Caricias diarias que suben la alegría |
| `MAX_DRIFT_HOURS` | 72 | Tope de horas que se descuentan de golpe |
| `METRIC_TEXT` | | Texto de cada logro para `how` |

> Los `id` de `ITEMS` y `TOPPINGS` se guardan en `owned`, `wearing` y `seen`: no se cambian (por eso conviven ids en español e inglés, como `lantern` o `trophy`).

---

## Recorrido paso a paso

### 1. Arranque

El servicio es `providedIn: 'root'` y se crea con el primer componente que lo inyecta.

1. `persisted('pet', …)` lee `nihongo:pet`.
2. **Migración**: las partidas viejas guardaban `wearing` como un texto (una sola prenda). Si no es un array, lo convierte en `[prenda]` o en `[]`.
3. **`update()`** pone las necesidades al día.

### 2. Paso del tiempo

**`update(now = Date.now())`**:

1. Horas desde `tick`, entre 0 (por si el reloj del sistema retrocedió) y 72.
2. Con menos de 0,05 h devuelve el mismo estado (el signal no cambia).
3. Aplica la [tabla de deriva](#reglas). El ritmo de energía usa si **ahora** es de noche para todo el intervalo, no hora a hora.
4. Si dormía y `now` es de día, `asleep = false`.
5. Recorta con `clampNeed` y guarda `tick = now`.

Lo llaman el constructor, `reward` y la casa (al entrar y cada minuto).

### 3. Lo ganado

- **`unlocked`**: ids de `ITEMS` con `goal` cumplido, más `food:<id>` por cada comida con `need > 0` ya desbloqueada. El prefijo `food:` evita chocar con los ids de objetos.
- **`has(id)`**: en `unlocked` o en `owned`.
- **`fresh`**: `unlocked` que no están en `seen`. Inicio enseña el aviso «Nuevo»; la casa los marca.
- **`stageIndex`**: la última etapa de `STAGES` cuyo `xp` ya se alcanzó.

### 4. Ánimo

- **`baseMood`** según la [tabla](#reglas).
- **`react(mood, durationMs = 1400)`**: pone `reaction` y la borra a los `durationMs`. Una reacción nueva cancela la anterior.
- **`status`** (Inicio), en orden: dormido, algo nuevo, panza < 40, alegría < 40, panza y alegría ≥ 70, y si no «Tiene un poquito de hambre».
- **`needsYou`**: panza < 40 o algo nuevo. Inicio resalta la tarjeta.

### 5. Escrituras

Todas son `state.update` con un objeto nuevo (el signal guarda solo en `localStorage`).

## Métodos

### Logros

#### `metric(metric)`

- **Qué hace**: devuelve el valor actual de una `Metric` ([tabla](#reglas)).
- **Quién lo llama**: `unlocked` y `how`.

#### `has(id)`

- **Devuelve**: si el objeto está ganado o comprado.
- **Quién lo llama**: la casa (fichas, habitación) y `buy`.

#### `how(item)`

- **Qué hace**: texto de cómo conseguirlo, con lo que lleva.
- **Devuelve**: `"40 granos"` si se compra; `"7 días de racha · 3/7"` si es un logro; sin contador para `exam` («Aprobar un examen de nivel»).
- **Quién lo llama**: la casa, en las fichas bloqueadas y en la burbuja.

#### `markStage()` / `markSeen()`

- **Qué hace**: guarda `stageSeen = stageIndex()` / añade todo `unlocked` a `seen`.
- **Quién lo llama**: la casa, al cerrar la celebración y al entrar.

### Ánimo y tiempo

#### `react(mood, durationMs = 1400)`

- **Qué hace**: reacción temporal encima de `baseMood`.
- **Quién lo llama**: la casa en cada acción.

#### `update(now = Date.now())`

- Ver [paso 2](#2-paso-del-tiempo).

#### `isNight()`

- **Devuelve**: si ahora son entre las 21:00 y las 7:00.

### Cuidados

#### `reward(correct)`

- **Qué hace**: pone el tiempo al día y suma `correct × 5 + 5` granos y +5 de alegría.
- **Devuelve**: los granos dados.
- **Quién lo llama**: `app-question-runner` al terminar una práctica con al menos una respuesta.

#### `canEat(topping)`

- **Devuelve**: `mastered() >= topping.need`.

#### `feed(topping)`

- **Qué hace**: ver [reglas](#reglas).
- **Devuelve**: `{ ok, ja, es }`. Con `ok`, `es` lleva la frase y la traducción de la comida: «¡Me encanta el salmón! (さけ = salmón)».

#### `pet(bonus = 0)`

- **Qué hace**: suma una caricia del día; las 20 primeras dan +2 (+`bonus`) de alegría. Al cambiar de día el contador vuelve a 0.
- **Quién lo llama**: la casa, con `bonus = 6` en la sexta caricia del combo.

#### `played(correct)`

- **Qué hace**: aplica el resultado del juego de 5 palabras.
- **Devuelve**: los granos (`correct × 2`).

#### `toggleSleep()`

- **Devuelve**: `false` (y no cambia nada) si está despierto, es de día y tiene más de 60 de energía; si no, cambia `asleep` y devuelve `true`.

### Ropa y tienda

#### `wear(id)`

- **Qué hace**: si la lleva, se la quita; si no, se la pone quitando la que hubiera en la misma zona (`slot`).

#### `buy(item)`

- **Qué hace**: resta `cost` y añade el id a `owned`.
- **Devuelve**: `false` si no tiene precio, ya lo tiene o no alcanzan los granos.
