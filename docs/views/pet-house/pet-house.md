# Casa de Musubi (`/musubi`)

La habitación donde vive Musubi: se ven sus tres necesidades, se le da de comer con los granos ganados practicando, se le acaricia, se le acuesta, se juega con él a un juego de 5 palabras y se le compra o pone ropa y muebles. También celebra cuando crece de etapa. Todo el estado y las reglas están en [`PetService`](pet.service.md); el dibujo de Musubi es [`app-musubi`](../../components/musubi.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [pet-house.component.ts](../../../src/app/views/pet-house/pet-house.component.ts) | Reloj, saludo, evolución, comida, caricias, ropa y casa, juego |
| [pet-house.component.html](../../../src/app/views/pet-house/pet-house.component.html) | Cabecera, habitación en SVG, barras, acciones, despensa, crecimiento, ropa, casa, celebración y hoja del juego |
| [pet-house.component.scss](../../../src/app/views/pet-house/pet-house.component.scss) | Estilos por bloques ([estilos](#estilos)) |
| [pet.service.ts](../../../src/app/services/pet.service.ts) | Estado y reglas de la mascota ([su doc](pet.service.md)) |
| [pet.interface.ts](../../../src/app/interfaces/pet.interface.ts) | `PetItem`, `Topping`, `PetGameState`, `PetGameRound`, `PetPop`, `PetEvolution` |
| [musubi.component.ts](../../../src/app/components/musubi/musubi.component.ts) | El dibujo de Musubi ([su doc](../../components/musubi.md)) |
| [sfx.service.ts](../../../src/app/services/sfx.service.ts) | Sonidos y vibración ([su doc](../../services/sfx.service.md)) |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | Voz del juego ([su doc](../../services/speech.service.md)) |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | Lecciones para sacar las palabras del juego |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) / [text.utils.ts](../../../src/app/utils/text.utils.ts) | `wordReading`, `romaji`, `shortEs`, `shuffle` |

Se entra desde la tarjeta «Casa de Musubi» de Inicio (`routerLink="/musubi"`); la ruta no tiene guard. La flecha de la cabecera vuelve a `/`.

### Qué hace el usuario

- **Tocar o frotar a Musubi** (o el botón **Mimar**): una caricia. Salen corazones, suena una nota y Musubi rebota. Las caricias seguidas hacen combo ([reglas](#reglas)). La pista «Tócalo o acarícialo con el dedo» desaparece tras la primera.
- **Comer**: le da la mejor comida que se puede pagar. Si no alcanza para ninguna, le ofrece sal y Musubi dice qué falta. Desactivado mientras duerme.
- **Jugar**: abre el [juego de 5 palabras](#7-juego-de-5-palabras). Con energía < 20 Musubi dice que está cansado. Desactivado mientras duerme.
- **Dormir / Despertar**: de día y con energía > 60 se niega («まだ ねむくない！»).
- **Despensa**: cada comida es un botón. Bloqueada, enseña «Domina N lecciones»; si no, su precio.
- **Ropa** (una prenda por zona) y **Casa**: tocar una ficha la explica, la compra o se la pone / quita ([paso 6](#6-ropa-y-casa)). Las ganadas desde la última visita llevan «Nuevo».
- **Celebración de crecimiento**: al entrar con una etapa nueva; botón «¡Qué bien!».

Todo lo que pasa lo comenta Musubi en la burbuja, en japonés y en español.

### Reglas

Las de necesidades, granos, comida y sueño están en [`PetService`](pet.service.md#reglas). Las propias de la vista:

**Combo de caricias** (`patAt`): se reinicia tras **1,8 s** sin caricias (`COMBO_RESET_MS`). Frotando cuenta como mucho una caricia cada **260 ms** (`RUB_INTERVAL_MS`).

| Caricia | Corazones | Cara | Frase |
|---|---|---|---|
| 1 | 1 | `happy` | Una de `FIRST_PAT_LINES`; con panza < 30 o energía < 30, una de hambre o sueño |
| 2 | 1 | `happy` | |
| 3 (`LOVE_PAT`) | 2 | `love` | Una de `LOVE_LINES` |
| 4–5 | 2 | `love` | |
| 6 (`BIG_PAT`) | 9 (con estrellas) | `love` + voltereta | «だいすき！», sonido `combo`, +6 de alegría extra |
| 7–8 | 2 | `love` | |
| 9+ (`TICKLE_PAT`) | 2 | `laugh` | En la 9: «くすぐったい！ やめて〜» |

Dormido, las caricias cuentan (alegría, corazones) pero no cambian la cara; la primera dice «Sigue dormido, pero sonríe».

**Juego de 5 palabras**: 5 rondas (`GAME_ROUNDS`), 4 opciones. Solo palabras ya practicadas (con entrada `w:<id>` en `mastery`) de las lecciones hasta la última abierta; si son menos de **8** (`MIN_SEEN_WORDS`), todas las de esas lecciones. Sin nombres propios. Hacen falta al menos 4 palabras. Granos: 2 por acierto (`played`).

**Cielo de la ventana** (`skyColor`, según la hora):

| Hora | Color |
|---|---|
| 0–7 y 20–24 | Noche `#25285a` (y luna) |
| 7–9 | Amanecer `#f6c39a` |
| 9–17 | Día `#bfe3ff` |
| 17–20 | Atardecer `#f3a77a` |

El sol (`showSun`) se ve de 7:00 a 20:00. De 21:00 a 7:00 (`isNight`) la habitación se oscurece al 40 %; dormido, al 60 %.

**Tamaño de Musubi** en la habitación: `96 + 12 × etapa` px.

### Datos guardados

Todo a través de `PetService` en `nihongo:pet` (necesidades, granos, ropa, objetos, `seen`, `stageSeen`, caricias del día). La vista no lee ni escribe `localStorage` directamente.

---

## Recorrido del código paso a paso

Cada paso empieza en [pet-house.component.ts](../../../src/app/views/pet-house/pet-house.component.ts); los nombres son buscables.

### 1. Arranque

No hay `constructor` ni `effect`. **`ngOnInit`**:

1. **`petSVC.update()`** pone las necesidades al día y **`greet()`** elige la primera frase:
   - Dormido → «むにゃむにゃ…».
   - Algo nuevo (`fresh`) → «みて みて！».
   - Panza < 40 → pide comida diciendo cuántos granos hay.
   - Alegría < 40 → «さびしかった…».
   - Si no: saludo según la hora (おはよう antes de las 11, こんにちは antes de las 18, こんばんは después) y el XP de hoy (`todayXp`).
2. Copia **`fresh()`** a **`newIds`** (las fichas «Nuevo» de esta visita) y luego **`markSeen()`**. El orden importa: marcarlo primero dejaría `newIds` vacío.
3. **Evolución**: si `stageIndex()` es mayor que `stageSeen`, abre la celebración (`evolution` con `done: false`, Musubi con la etapa vieja y cara `wow`). A los **1,8 s** (`EVOLUTION_REVEAL_MS`) pasa a `done: true`, enseña la etapa nueva y suena `done`. Si la etapa es menor (bajó el XP), solo corrige `stageSeen` con `markStage()`.
4. Un `setInterval` de **60 s** (`CLOCK_INTERVAL_MS`) refresca `now` (reloj, cielo, noche) y llama a `petSVC.update()`: las necesidades siguen al reloj real con la casa abierta.
5. **`loadWords()`** en segundo plano ([paso 7](#7-juego-de-5-palabras)).

### 2. Cabecera y habitación

- **`clockText`**: «Lunes · 08:05» (`WEEK_DAYS`).
- **`currentStage`**: nombre y `ja` de la etapa, arriba a la derecha.
- La habitación es un SVG de 360 × 270: pared, ventana con `skyColor()` y sol o luna, estantería, suelo y, encima, **`roomItems`** (los objetos de casa que tiene, en el orden de `ITEMS`).
- Cada objeto se dibuja con la plantilla `#deco` (un `@switch` por id). La misma plantilla pinta las miniaturas de la sección Casa, recortadas con el `viewBox` de `item.vb`.
- La capa `shade` va encima de todo: transparente de día, oscura de noche (`isNight()` y despierto) o durmiendo.

### 3. Necesidades

**`meters`** devuelve las tres barras (Panza, Alegría, Energía) con su valor y una frase en cuatro tramos: < 25, < 50, < 80 y el resto. Por ejemplo, panza: «Con mucha hambre», «Tiene hambre», «Le vendría bien comer», «Lleno y feliz».

### 4. Comida y sueño

**`feedBest()`** recorre `TOPPINGS` de la más cara a la más barata y elige la primera que esté desbloqueada y se pueda pagar; si ninguna, la sal (`TOPPINGS[0]`), para que `feed` diga qué falta.

**`feed(topping)`**:

1. **`petSVC.feed`** decide ([reglas del servicio](pet.service.md#reglas)).
2. Si no pudo comer: pone su frase y cara `hungry` (o `happy` si es que está lleno: estar lleno no es malo).
3. Si comió: el nombre de la comida entra volando (`eating`, animación `food-in`), cara `eat` y sonido `tap`. A los **1000 ms** (`EATING_MS`) dice su frase, cara `happy` y sonido `ok`.

**`toggleSleep()`** llama a `petSVC.toggleSleep()`. Si se niega, «まだ ねむくない！»; si no, buenas noches o buenos días según lo que estaba.

### 5. Caricias

En el `div.pet`:

- **`onPointerDown`**: activa `isRubbing`, captura el puntero (para seguir frotando aunque el dedo se salga un poco) y acaricia en ese punto.
- **`onPointerMove`**: con `isRubbing`, una caricia cada 260 ms como mucho.
- **`onPointerUp`** (también en `pointercancel` y `pointerleave`): desactiva `isRubbing`.
- **`onPet()`** (botón Mimar): acaricia en el centro de Musubi, al 35 % de su alto (la cabeza).

**`patAt(clientX, clientY)`**:

1. Suma la caricia a `comboCount` y reinicia el temporizador del combo (1,8 s). `hasPatted` oculta la pista.
2. **`petSVC.pet(6 o 0)`**, **`spawnPops`**, **`sfxSVC.pat(número − 1)`** (cada caricia una nota más aguda) y **`bounce`**.
3. Frase y cara según la [tabla del combo](#reglas).

**`spawnPops(x, y, count)`**: crea `PetPop` relativos a la habitación. Uno solo sale 10 px encima del dedo; varios se reparten (±45 px en horizontal, ±20 en vertical) y, en la ráfaga de 9, uno de cada tres es estrella. Cada uno tiene un `driftX` al azar que el CSS usa como `--dx`. Se borran a los **1150 ms** (`POP_LIFETIME_MS`), algo más que su animación de 1,1 s.

**`bounce(isBig)`**: con la Web Animations API sobre `#squish`. Normal: aplastar y recuperar en 300 ms. Combo grande: salto con voltereta de 360° en 800 ms. Nada con `prefers-reduced-motion`.

### 6. Ropa y casa

**`countOwned(list)`** da el «N de M» de cada título. Cada ficha marca `got` (la tiene), `on` (puesta) y `buy` (se compra y aún no la tiene); la miniatura de ropa es Musubi en etapa 2 con solo esa prenda.

**`tapItem(item)`**:

1. **No lo tiene**:
   - Sin precio (es un logro): explica cómo se gana con `petSVC.how(item)`.
   - Con precio: **`petSVC.buy`**. Si no alcanza, lo dice con cara `sad`. Si lo compra, suena `combo`; un objeto de casa se agradece y termina aquí; la ropa sigue al paso 3 y se pone directamente.
2. **Objeto de casa que ya tiene**: solo lo comenta («Me encanta mi …»).
3. **Ropa**: **`petSVC.wear`** se la pone (quitando la de su zona) o se la quita, y lo comenta. **`isWearing`** dice cuál de las dos pasó.

### 7. Juego de 5 palabras

**`loadWords()`** (al entrar):

1. Lecciones de la 1 a `lastLesson().id` (`lessonSVC.loadIndex` + `getMany`).
2. Su vocabulario con lectura (`wordReading`), sin `type: 'name'`.
3. **`wordPool`**: las que tienen entrada en `mastery`; si son menos de 8, todas.

**`openGame()`**: con energía < 20 se niega con cara `sleepy`; con menos de 4 palabras no hace nada. Si no, baraja `wordPool`, toma 5 y arma cada `PetGameRound`: lectura (`japanese`), `romaji`, la respuesta (`shortEs` del significado) y 3 distractores de otros significados distintos. Abre `game` y lee la primera palabra en voz alta (**`say`** → `speechSVC.speak`).

**`pickAnswer(option)`**:

1. Ignora toques si ya hay respuesta elegida (`pickedAnswer`).
2. Marca verde o rojo y suena `ok` o `bad`.
3. A los **650 ms** (`ANSWER_DELAY_MS`) guarda el resultado y pasa a la siguiente ronda (leyéndola en voz alta). Al terminar, **`petSVC.played(aciertos)`** da los granos, suena `done` y Musubi comenta: con 4 o más aciertos «たのしい！», si no «もう いっかい？».

**`closeGame()`** (botón o tocar fuera de la hoja): cierra; si la partida había terminado, cara `happy`.

### 8. Celebración de crecimiento

La abre `ngOnInit` ([paso 1](#1-arranque)). **`closeEvolve()`**: `markStage()`, cierra, «みて！ おおきく なった！» y cara `happy`. Si el usuario sale de la vista antes de cerrarla, `stageSeen` no se guarda y la celebración se repite en la siguiente visita.

### 9. Salida

**`ngOnDestroy`** para el reloj (`clockTimer`) y el temporizador del combo. Los demás `setTimeout` (comida, juego, corazones, evolución) no se cancelan: si alguno queda pendiente, se ejecuta después de salir (por ejemplo, el último `pickAnswer` aún da los granos).

### Estilos

[pet-house.component.scss](../../../src/app/views/pet-house/pet-house.component.scss), por bloques `/* ---- … ---- */`:

- **Habitación**: colores de pared, suelo y madera como variables CSS (`--wall`, `--floor`…), con otra paleta para los temas `violeta` y `carmesi` (`:host-context`). La sombra (`shade`) se anima con `opacity`.
- **Musubi, caricias y corazones**: `pop-up` sube cada corazón y lo desvía con `--dx`.
- **Comida que entra volando**: `food-in`, 1 s, igual que `EATING_MS`.
- **Barras de necesidades** y **botones de acción**: el color de cada uno sale de `data-m` / `data-a`.
- **Crecimiento**, **ropa y casa**, **celebración** (animaciones `charge` y `burst`, sin movimiento con `prefers-reduced-motion`) y **hoja del juego**.
