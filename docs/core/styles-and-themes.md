# Estilos globales y temas (`src/styles.scss`, `src/styles/`)

Los estilos que comparten todas las vistas: variables de color y tipografía, los cuatro temas (base, sol, violeta y carmesí), el reset, la maquetación de página, tarjetas, botones, chips, barras, interruptores, animaciones y hojas inferiores. Cada vista y cada componente añaden encima su propio `.scss`.

El tema y la escritura se aplican desde `AppComponent` ([app-shell.md](app-shell.md#4-tema-y-escritura)); se eligen en [Perfil](../views/profile/profile.md).

## Introducción

### Piezas

`src/styles.scss` es la única entrada que declara `angular.json`. Solo tiene un `@use` por parcial, con un comentario de qué trae cada uno. **El orden de los `@use` es el orden de las reglas en el CSS final**: a igual especificidad gana la que va después, así que no lo cambies sin mirar qué se pisa.

| Orden | Parcial | Qué trae |
|---|---|---|
| 1 | [_themes.scss](../../src/styles/_themes.scss) | Variables en `:root` (tema base) y un bloque `:root[data-theme='…']` por tema |
| 2 | [_base.scss](../../src/styles/_base.scss) | `box-sizing`, fondo y tipografía de `html, body`, `app-root { display: block }`, reset de `button`, `a`, `h1–h3`, `p` |
| 3 | [_utilities.scss](../../src/styles/_utilities.scss) | `.jp`, `.hand`, `.muted`, `.small`, `.center` |
| 4 | [_furigana.scss](../../src/styles/_furigana.scss) | `ruby`, `rt` y el interlineado de `html[data-script='furigana'] .jp` |
| 5 | [_layout.scss](../../src/styles/_layout.scss) | `.page`, `.page.full`, `.topbar`, `.hero-title`, `.section-title`, `.stack`, `.row`, `.spacer`, `.grid-2`, `.grid-3` |
| 6 | [_surfaces.scss](../../src/styles/_surfaces.scss) | `.card` (y `a.card` / `button.card` clicables), `.card.tile`, `.list`, `.list-item` |
| 7 | [_buttons.scss](../../src/styles/_buttons.scss) | `.btn` y variantes (`block`, `accent`, `ok`, `bad`, `ghost`, `soft`, `sm`), `.icon-btn`, `.chip` / `.chips` / `.chips.scroll`, `.badge` |
| 8 | [_tabs.scss](../../src/styles/_tabs.scss) | Pestañas segmentadas dentro de una vista (`.tabs button.on`) |
| 9 | [_progress.scss](../../src/styles/_progress.scss) | `.bar > i` (barra de progreso) y `.bar.ok` |
| 10 | [_forms.scss](../../src/styles/_forms.scss) | `.switch` (checkbox como interruptor) e `input[type='range']` |
| 11 | [_animations.scss](../../src/styles/_animations.scss) | `@keyframes fade-up`, `pop`, `shake`, `slide-up` y las clases `.pop`, `.shake` |
| 12 | [_overlays.scss](../../src/styles/_overlays.scss) | Estado vacío (`.empty`, `.empty .glyph`) y hojas inferiores (`.sheet-backdrop`, `.sheet`, `.sheet .grab`) |
| 13 | [_motion.scss](../../src/styles/_motion.scss) | `prefers-reduced-motion`: animaciones y transiciones a 0.01 ms |

Los parciales no exportan variables ni mixins de Sass: solo emiten CSS. Los colores se comparten con variables CSS (`var(--accent)`), no con variables Sass, para que el tema se pueda cambiar en vivo.

### Qué ve el usuario

- En **Perfil → Ajustes** elige una de las 4 plantillas visuales. Toda la app cambia al momento, incluida la barra del sistema del móvil (`theme-color`).
- En **Perfil → Escritura japonesa** elige solo kana, kanji con furigana o kanji. Con furigana las líneas japonesas se separan más para que quepan las lecturas.
- Si el sistema pide **menos movimiento**, las animaciones y transiciones casi desaparecen.

### Reglas

- El tema base no tiene bloque `data-theme`: son las variables de `:root`. `data-theme='base'` no coincide con ningún selector y por eso se ve el base.
- `sol` es claro (`color-scheme: light`, heredado de `:root`); `violeta` y `carmesi` son oscuros y declaran `color-scheme: dark` (scrollbars y controles nativos oscuros).
- Cada tema redefine **los colores y `--shadow`**. Fuentes, radios, `--nav-h` y áreas seguras son los mismos en todos.

---

## Variables CSS

### Colores (cambian con el tema)

| Variable | Para qué | Base |
|---|---|---|
| `--bg` | Fondo de la página (y `theme-color`) | `#f9f5eb` |
| `--surface` / `--surface-2` | Tarjetas / fondos secundarios (barras vacías, `.btn.soft`) | `#fffdf8` / `#f1e9db` |
| `--ink` / `--ink-2` | Texto principal / secundario | `#17263b` / `#2d4059` |
| `--muted` | Texto gris (`.muted`, títulos de sección) | `#6e7784` |
| `--line` | Bordes y separadores | `#dfd7c9` |
| `--accent`, `--accent-soft`, `--accent-ink` | Color principal (botón `accent`, barras), su fondo suave y el texto sobre él | `#ea5455`, `#fbe3df`, `#ffffff` |
| `--signal`, `--signal-ink` | Segundo color (borde derecho del botón `accent`, pestaña activa, chip activo) | `#f07b3f`, `#24160e` |
| `--panel`, `--panel-ink`, `--panel-line` | Superficies oscuras: barra de pestañas, chip activo | `#002b5b`, `#ffffff`, `#2d4059` |
| `--ok`, `--ok-soft` | Correcto / dominado | `#318866`, `#e1f1e8` |
| `--bad`, `--bad-soft` | Error | `#d94045`, `#fbe1e2` |
| `--gold`, `--gold-soft` | Pendiente / a medias | `#d68c20`, `#faedd0` |
| `--indigo`, `--indigo-soft` | Neutro / sin datos | `#315a8b`, `#e0e8f2` |
| `--shadow` | Sombra de tarjetas | dos sombras muy suaves |

### Fijas (iguales en todos los temas)

| Variable | Valor |
|---|---|
| `--font` | `'Noto Sans JP'`, después fuentes del sistema |
| `--font-jp` | `'Noto Sans JP'`, `'Hiragino Sans'`, `'Yu Gothic'`, `'Meiryo'` |
| `--font-hand` | `'Klee One'` (letra a mano, clase `.hand`) |
| `--r-sm` / `--r-md` / `--r-lg` | 10 / 14 / 20 px |
| `--nav-h` | 64 px (alto de la barra de pestañas) |
| `--safe-b` / `--safe-t` | `env(safe-area-inset-bottom/top, 0px)` |

Las fuentes se cargan desde Google Fonts en [index.html](../../src/index.html).

### Temas

| Tema (`data-theme`) | Estilo | `--bg` | `--accent` | `--signal` | `--panel` |
|---|---|---|---|---|---|
| (ninguno) / `base` | Claro, paleta original | `#f9f5eb` | `#ea5455` | `#f07b3f` | `#002b5b` |
| `sol` | Claro, amarillo y azul | `#fff7d1` | `#e5ad12` | `#f28c28` | `#173b67` |
| `violeta` | Oscuro, morado y verde | `#100b1a` | `#9a5bd0` | `#a6d632` | `#261637` |
| `carmesi` | Oscuro, rojo y naranja | `#190d0d` | `#e13b35` | `#f08035` | `#4c1117` |

Para añadir un tema hacen falta tres cambios: un bloque en `_themes.scss`, su color en `THEME_COLORS` de [app.component.ts](../../src/app/app.component.ts) y su tarjeta en `themes` de [profile.component.ts](../../src/app/views/profile/profile.component.ts) (más el tipo `Theme` de `progress.interface.ts`).

---

## Recorrido paso a paso

### 1. De `settings` al `<html>`

1. El usuario toca una plantilla en Perfil → `updateSetting('theme', id)` guarda en `nihongo:settings`.
2. El `effect` de `AppComponent` llama a `applyAppearance`, que pone `data-theme` y `data-script` en `<html>` y cambia las `<meta name="theme-color">`.
3. Los selectores `:root[data-theme='…']` redefinen las variables y todo lo que usa `var(--…)` se repinta sin recargar.

### 2. `data-theme` y `data-script`

- **`data-theme`**: lo leen solo los bloques de [_themes.scss](../../src/styles/_themes.scss).
- **`data-script`**: lo lee [_furigana.scss](../../src/styles/_furigana.scss). Con `furigana`, `.jp` pasa a `line-height: 2` para dejar sitio a la lectura encima de cada línea. Qué texto se muestra (kana, kanji, `<ruby>`) lo decide `JpComponent` con `FuriganaService`, no el CSS.

### 3. Fondo y página

- `html, body` llevan `--bg` más un degradado radial de `--accent` al 8% en la esquina superior izquierda, con `background-attachment: fixed`.
- `.page` centra el contenido (máximo 560 px), suma `--safe-t` arriba y deja abajo `--nav-h` + 32 px + `--safe-b` para que la barra de pestañas no tape el final. `.page.full` deja solo 24 px + `--safe-b` (pantallas inmersivas).
- `.page` entra con `fade-up` en modo `backwards`, **no** `both`: un `transform` que se quedara puesto tras la animación haría que los `position: fixed` de dentro (las `.sheet`) se posicionaran respecto a la página y no a la pantalla.

### 4. Movimiento reducido

[_motion.scss](../../src/styles/_motion.scss) va el último para ganar a todo: con `prefers-reduced-motion: reduce`, `animation-duration` y `transition-duration` pasan a 0.01 ms con `!important` en todos los elementos y pseudo-elementos. Se usa 0.01 ms y no `none` para que los eventos `animationend` / `transitionend` sigan llegando.

### Cómo comprobar que un cambio no altera el CSS

Al mover reglas entre parciales, compila antes y después y compara:

```bash
npx sass --no-source-map --style=compressed src/styles.scss antes.css
# … cambios …
npx sass --no-source-map --style=compressed src/styles.scss despues.css
cmp antes.css despues.css
```

Con `--style=compressed` los comentarios desaparecen, así que solo cuenta el orden y el contenido de las reglas.
