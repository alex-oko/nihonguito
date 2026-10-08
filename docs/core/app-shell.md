# Shell de la app (`main.ts`, `app.config.ts`, `app.routes.ts`, `AppComponent`)

El esqueleto que rodea a todas las vistas: arranca Angular sin zone.js, registra el router y el service worker, carga las lecturas de los kanji antes de pintar nada y monta `AppComponent`, que pone la vista de la ruta actual, la barra de pestañas de abajo y el tema de color en el `<html>`.

Los colores de cada tema y las variables CSS están en [styles-and-themes.md](styles-and-themes.md). El botón de actualizar la app está en [update.service.md](../services/update.service.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [main.ts](../../src/main.ts) | `bootstrapApplication(AppComponent, appConfig)` |
| [app.config.ts](../../src/app/app.config.ts) | Providers globales: errores, zoneless, furigana, router, service worker |
| [app.routes.ts](../../src/app/app.routes.ts) | Todas las rutas, con `loadComponent` y `data: IMMERSIVE` en las de pantalla completa |
| [app.component.ts](../../src/app/app.component.ts) | Modo inmersivo, scroll arriba, precarga de lecturas, `data-theme` / `data-script` y `theme-color` |
| [app.component.html](../../src/app/app.component.html) | `<router-outlet />` y la barra de pestañas (`.nav`) |
| [app.component.scss](../../src/app/app.component.scss) | Estilo de la barra de pestañas |
| [index.html](../../src/index.html) | `<meta name="theme-color">` (dos, claro y oscuro) y el script que guarda `window.__installPrompt` |
| [furigana.service.ts](../../src/app/services/furigana.service.ts) | `load()`: lee `data/furigana.json` antes del primer render |
| [reading.service.ts](../../src/app/services/reading.service.ts) | `ensure()`: diccionario kanji → kana de todo el vocabulario |
| [progress.service.ts](../../src/app/services/progress.service.ts) | `settings()`: de aquí salen `theme` y `script` ([su doc](../services/progress.service.md)) |

### Qué ve el usuario

- **Barra de pestañas** fija abajo con 6 iconos: Inicio, Kana, Lecciones, Practicar, Exámenes y Perfil. La pestaña de la sección actual se marca con fondo de color.
  - Inicio (`/`) solo se marca en `/` exacto (`routerLinkActiveOptions: { exact: true }`); las demás se marcan también en sus rutas hijas (`/kana/hiragana` marca Kana).
- **Rutas inmersivas** (prácticas, juegos, exámenes, repaso): la barra desaparece para que la pantalla entera sea del ejercicio.
- **Cada navegación** sube el scroll arriba del todo.
- **Tema y escritura**: lo que se elige en Perfil se aplica al momento a toda la app, y la barra del sistema del móvil toma el color de fondo del tema.

### Reglas

- Todas las vistas se cargan en diferido (`loadComponent`): el primer arranque solo descarga el shell y la vista de entrada.
- `withComponentInputBinding()`: los parámetros de ruta (`:id`, `:mode`, `:script`, `:game`, `:cid`) llegan a la vista como `input()` con el mismo nombre.
- `withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })`: los enlaces con `fragment` (como `/perfil#intereses` desde Inicio) bajan hasta el ancla.
- El service worker solo se registra fuera de modo desarrollo (`enabled: !isDevMode()`), con `registerWhenStable:30000` (cuando la app queda estable o a los 30 s).
- Cualquier URL desconocida (`**`) vuelve a Inicio.

### Rutas

`IMMERSIVE` es `{ immersive: true }`. En la tabla, «sí» quiere decir que la ruta lo lleva en `data` y oculta la barra de pestañas.

| Ruta | Componente | Inmersiva |
|---|---|---|
| `''` | `HomeComponent` ([doc](../views/home/home.md)) | no |
| `kana` | `KanaComponent` | no |
| `tiempo` | `TimeComponent` | no |
| `kana/lab` | `KatakanaLabComponent` | no |
| `kana/:script` | `KanaChartComponent` | no |
| `kana/:script/practica/:mode` | `KanaPracticeComponent` | sí |
| `kana/:script/memorama` | `KanaMatchComponent` | sí |
| `kana/:script/trazar` | `KanaTraceComponent` | sí |
| `lecciones` | `LessonsComponent` | no |
| `lecciones/:id` | `LessonDetailComponent` | no |
| `lecciones/:id/practica/:mode` | `LessonPracticeComponent` | sí |
| `lecciones/:id/conversacion/:cid` | `ConversationPlayerComponent` | sí |
| `practicar` | `PracticeComponent` | no |
| `juego/:game` | `GameHostComponent` | sí |
| `musubi` | `PetHouseComponent` | no |
| `examenes` | `ExamsComponent` | no |
| `examen` | `ExamBuilderComponent` | no |
| `examen/nivel` | `LevelListComponent` | no |
| `examen/nivel/hoja` | `LevelSheetComponent` | sí |
| `examen/prueba` | `ExamRunComponent` | sí |
| `repaso` | `ReviewComponent` | sí |
| `verbos` | `VerbsComponent` | no |
| `verbos/practica` | `VerbPracticeComponent` | sí |
| `conversaciones` | `ConversationsComponent` | no |
| `perfil` | `ProfileComponent` ([doc](../views/profile/profile.md)) | no |
| `**` | redirige a `''` | — |

Las sub-vistas viven dentro de la carpeta de su vista: `views/kana/views/kana-chart/`, `views/lessons/views/lesson-practice/`, `views/exams/views/level-sheet/`… La conversación de una lección (`lecciones/:id/conversacion/:cid`) es de `views/conversations/views/conversation-player/`.

> `kana/lab` va **antes** de `kana/:script` en el array. El router prueba las rutas en orden: si fuera después, `lab` se tomaría como un `:script`.

---

## Recorrido del código paso a paso

Empieza en [main.ts](../../src/main.ts) y sigue en [app.config.ts](../../src/app/app.config.ts) y [app.component.ts](../../src/app/app.component.ts). Los nombres son buscables en esos archivos.

### 1. Arranque

1. **`main.ts`** llama a `bootstrapApplication(AppComponent, appConfig)`. Un error de arranque solo se escribe en consola.
2. **`appConfig.providers`**, en este orden:
   1. `provideBrowserGlobalErrorListeners()`: los errores no capturados del navegador llegan al `ErrorHandler` de Angular.
   2. `provideZonelessChangeDetection()`: no hay zone.js. La pantalla se actualiza por signals, eventos de plantilla y `async` de Angular; un `setTimeout` que solo cambia un campo normal no repinta nada.
   3. `provideAppInitializer(() => inject(FuriganaService).load())`: Angular **espera** a que termine antes de pintar la primera vista. `load()` descarga `data/furigana.json` y registra el lector de kanji con `setKanjiReader`. Si falla (sin conexión y sin caché) no rompe el arranque: los kanji se ven tal cual. Por eso el modo «Solo kana» funciona desde el primer render, sin saltos de kanji a kana.
   4. `provideRouter(routes, …)` ([reglas](#reglas)).
   5. `provideServiceWorker('ngsw-worker.js', …)`.

### 2. Constructor de `AppComponent`

1. **Navegación**: se suscribe a `router.events` filtrando `NavigationEnd` y llama a **`onNavigationEnd`** ([paso 3](#3-modo-inmersivo-y-scroll)).
2. **Precarga de lecturas**: `setTimeout` de **`READING_PRELOAD_DELAY_MS`** (1200 ms) y luego `readingSVC.ensure()`. `ensure` carga **todas** las lecciones para armar el diccionario kanji → kana que usan las prácticas al comparar respuestas escritas o dictadas. Se retrasa para no competir con la descarga de la primera vista; `ensure` guarda la promesa, así que si una práctica lo pide antes, no se carga dos veces.
3. **`effect`** de apariencia: lee `progressSVC.settings()` y llama a **`applyAppearance(theme, script)`** cada vez que cambian ([paso 4](#4-tema-y-escritura)).

No hay `ngOnInit` ni `ngOnDestroy`: el shell vive mientras vive la app.

### 3. Modo inmersivo y scroll

**`onNavigationEnd()`**:

1. Baja por `route.snapshot.firstChild` hasta la ruta más profunda. El `data` de una ruta hija no aparece en el snapshot raíz, así que hay que llegar hasta la última.
2. `immersive.set(!!snapshot.data['immersive'])`. La plantilla solo pinta `<nav class="nav">` con `@if (!immersive())`.
3. `window.scrollTo({ top: 0 })`.

### 4. Tema y escritura

**`applyAppearance(theme, script)`**:

1. `data-script` en `<html>` con el valor tal cual (`kana`, `furigana` o `kanji`). El CSS global lo usa para dar más interlineado a `.jp` con furigana ([styles-and-themes.md](styles-and-themes.md#2-data-theme-y-data-script)).
2. `data-theme` con el tema si está en **`THEME_COLORS`**; si no, `base`. Protege de un valor viejo o corrupto en `nihongo:settings` (los ids `eva00/01/02` de antes de la v1.3 ya los migra `ProgressService` a `sol/violeta/carmesi`).
3. Copia el color del tema a **todas** las `<meta name="theme-color">`. `index.html` trae dos (una con `media` claro y otra oscuro); si solo se cambiara una, el navegador usaría la otra según el modo del sistema.

| Tema | `THEME_COLORS` |
|---|---|
| `base` | `#f9f5eb` |
| `sol` | `#fff7d1` |
| `violeta` | `#100b1a` |
| `carmesi` | `#190d0d` |

Son el `--bg` de cada tema. Si cambias un fondo en [_themes.scss](../../src/styles/_themes.scss), cámbialo también aquí.

> Hasta que se ejecuta el `effect`, el `<html>` no tiene `data-theme` y se ve el tema base (`:root`). Con un tema oscuro guardado puede notarse un parpadeo claro en el primer instante del arranque.

### 5. Barra de pestañas

[app.component.html](../../src/app/app.component.html) recorre **`tabs`** (`path`, `icon`, `label`) con un `<a>` por pestaña: `routerLink`, `routerLinkActive="on"` y `<app-icon [size]="21">` dentro de `.g`.

### Estilos

[app.component.scss](../../src/app/app.component.scss):

- `.nav`: `position: fixed` abajo, alto `var(--nav-h)` + `var(--safe-b)` (área segura del iPhone), fondo `--panel` al 94% con `backdrop-filter: blur(14px)` y borde superior `--signal`.
- `.tab`: columna icono + texto, máximo 110 px de ancho; inactiva al 56% de `--panel-ink`.
- `.g` (fondo del icono) y `.l` (texto, 0.66 rem).
- `.tab.on`: texto `--panel-ink` y el icono sobre `--signal`.

Las vistas reservan el hueco de la barra con el `padding-bottom` de `.page` (ver [_layout.scss](../../src/styles/_layout.scss)); `.page.full` lo quita en las pantallas sin barra.
