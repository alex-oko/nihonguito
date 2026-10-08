# `UpdateService`

Expone la versión de la app y su fecha de compilación, y permite buscar e instalar a mano una versión nueva a través del service worker de Angular (`SwUpdate`). Lo usan [Perfil](../views/profile/profile.md) (tarjeta «Versión de la app») e [Inicio](../views/home/home.md) (la línea de versión del pie).

No descarga nada por su cuenta: la descarga de versiones nuevas la hace el service worker (`ngsw-worker.js`), y este servicio solo pregunta, avisa y activa. No guarda nada en `localStorage`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [update.service.ts](../../src/app/services/update.service.ts) | `version`, `built`, `state`, `check()`, `install()` |
| [update.interface.ts](../../src/app/interfaces/update.interface.ts) | `UpdateState` |
| [version.utils.ts](../../src/app/utils/version.utils.ts) | `APP_VERSION` y `APP_BUILT`. **Generado**: no se edita a mano |
| [write-version.mjs](../../tools/write-version.mjs) | Escribe `version.utils.ts` desde `package.json` y la hora actual |
| [app.config.ts](../../src/app/app.config.ts) | `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), … })` ([app-shell.md](../core/app-shell.md)) |
| [ngsw-config.json](../../ngsw-config.json) | Qué cachea el service worker y cómo |

### Estado

| Campo | Qué es |
|---|---|
| `version` | `APP_VERSION`, la `version` de `package.json` (por ejemplo `1.4.0`) |
| `built` | `APP_BUILT`, fecha y hora local de la compilación, `AAAA-MM-DD HH:mm` |
| `state` | `signal<UpdateState>`. Empieza en `idle` si hay service worker y en `unavailable` si no |

### Estados

| `UpdateState` | Cuándo | Botón de Perfil | Texto debajo |
|---|---|---|---|
| `idle` | Al arrancar, sin comprobar aún | «Buscar actualización» | — |
| `checking` | Mientras `checkForUpdate()` | «Buscando…» (deshabilitado) | — |
| `latest` | No hay versión nueva | «Buscar actualización» | «Ya tienes la última versión.» |
| `ready` | Hay una versión nueva descargada | «Instalar nueva versión» (color `accent`) + badge «Nueva» | «Hay una versión nueva descargada…» |
| `installing` | Mientras `activateUpdate()` | «Actualizando…» (deshabilitado) | — |
| `error` | Falló la comprobación | «Buscar actualización» | «No se pudo comprobar…» |
| `unavailable` | Sin service worker (`ng serve` o navegador sin soporte) | «Buscar actualización» | «Modo desarrollo: el botón solo recarga la página.» |

En Inicio, `ready` añade «· nueva versión disponible» a la línea de versión.

### Reglas

- La versión sale de `package.json`. Para publicar una versión nueva se sube `version` ahí; `npm run build` y `npm start` ejecutan antes `tools/write-version.mjs` (`prebuild` / `prestart`).
- Con el service worker activo, Angular también busca versiones nuevas por su cuenta (al abrir la app). Por eso `state` puede pasar a `ready` sin que nadie pulse el botón.

---

## Recorrido paso a paso

### 1. Versión en el build

`tools/write-version.mjs`:

1. Lee `package.json`.
2. Arma la fecha local `AAAA-MM-DD HH:mm`.
3. Escribe `src/app/utils/version.utils.ts` con un comentario de «no editar», `APP_VERSION` y `APP_BUILT`, cada una con su JSDoc y sangría de 4.
4. Imprime `version X (fecha)` en consola.

### 2. Arranque del servicio

**`constructor`** (la primera vez que alguien inyecta el servicio: Inicio o Perfil):

1. Sin service worker (`swUpdate.isEnabled` es `false`), sale. `state` se queda en `unavailable`.
2. Con service worker, se suscribe a `swUpdate.versionUpdates` y pone `ready` cuando llega `VERSION_READY` (el service worker terminó de descargar una versión nueva).

La suscripción no se cancela: el servicio es `providedIn: 'root'` y vive tanto como la app.

### 3. Buscar actualización

**`check()`** (botón de Perfil):

1. Sin service worker, `location.reload()` y fin: en desarrollo, recargar es lo único que trae código nuevo.
2. Con `ready`, no vuelve a buscar: llama a **`install()`**.
3. `checking` → `await swUpdate.checkForUpdate()` → `ready` si encontró una (ya descargada) o `latest` si no.
4. Si lanza error (sin conexión, por ejemplo), `error`.

### 4. Instalar

**`install()`**:

1. `installing`.
2. `await swUpdate.activateUpdate()`.
3. `location.reload()` en un `finally`: recarga **aunque falle** la activación, para que la app nunca se quede en «Actualizando…». Tras la recarga se carga la versión activa.

## Métodos

#### `check()`

- **Qué hace**: busca una versión nueva o, si ya hay una lista, la instala.
- **Cómo**: ver [paso 3](#3-buscar-actualización).
- **Devuelve**: `Promise<void>`; el resultado queda en `state`.
- **Quién lo llama**: el botón de la tarjeta «Versión de la app» de Perfil.

#### `install()`

- **Qué hace**: activa la versión descargada y recarga la página.
- **Cómo**: ver [paso 4](#4-instalar).
- **Devuelve**: `Promise<void>` (en la práctica la página se recarga antes de usarlo).
- **Quién lo llama**: `check()` cuando el estado es `ready`.
