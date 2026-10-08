# Icono (`app-icon`)

Pinta un icono de línea en SVG (24×24, trazo redondeado) a partir de su nombre. Hereda el color del texto (`currentColor`), así que se tiñe con `color` desde el padre. Es el único set de iconos de la app: no hay fuentes de iconos ni imágenes.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [icon.component.ts](../../src/app/components/icon/icon.component.ts) | `PATHS` (trazo de cada icono), inputs y `pathData` |
| [icon.component.html](../../src/app/components/icon/icon.component.html) | El `<svg>` con un solo `<path>` |
| [icon.component.scss](../../src/app/components/icon/icon.component.scss) | `:host` en `inline-flex` con `line-height: 0` |

### Uso

```html
<app-icon name="play" />
<app-icon name="volume" [size]="26" />
<app-icon name="star" [fill]="true" [stroke]="1.5" />
```

| Input | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `name` | `string` (obligatorio) | | Clave de `PATHS` |
| `size` | `number` | `20` | Ancho y alto en px |
| `stroke` | `number` | `2` | Grosor del trazo |
| `fill` | `boolean` | `false` | Rellena la figura con `currentColor` (estrella, corazón llenos) |

### Reglas

- Un **nombre que no existe** pinta un SVG vacío, sin error ni aviso. Si un icono «no sale», revisa el nombre.
- Cada icono es **un solo `path`**: varias figuras van en el mismo `d` con varios `M`.
- El SVG lleva `aria-hidden="true"`: el texto accesible lo pone el botón o enlace que lo contiene (`aria-label`).
- Los iconos no usan kanji como dibujo (ni para las pestañas).

### Iconos disponibles

| Nombre | Dibujo |
|---|---|
| `volume` | Altavoz con ondas |
| `mic` | Micrófono |
| `check` | Marca de correcto |
| `x` | Cruz |
| `back` | Flecha (chevron) a la izquierda |
| `chevron` | Chevron a la derecha |
| `flame` | Llama (racha) |
| `star` | Estrella |
| `refresh` | Flechas en círculo |
| `play` | Triángulo de reproducir |
| `stop` | Cuadrado de parar |
| `eye` | Ojo |
| `shuffle` | Flechas cruzadas (barajar) |
| `clock` | Reloj |
| `trophy` | Trofeo |
| `chat` | Bocadillo de diálogo |
| `pencil` | Lápiz |
| `sparkles` | Destello con estrella pequeña |
| `trash` | Papelera |
| `sliders` | Controles deslizantes |
| `target` | Diana |
| `layers` | Capas apiladas |
| `bulb` | Bombilla |
| `headphones` | Auriculares |
| `keyboard` | Teclado |
| `grid` | Cuadrícula de 4 |
| `bolt` | Rayo |
| `list` | Lista con viñetas |
| `skip` | Saltar (triángulo y barra) |
| `lang` | Idiomas (A / 文) |
| `home` | Casa |
| `kana` | Cuadro con trazos de kana |
| `book` | Libro |
| `dumbbell` | Pesa (pestaña Practicar) |
| `clipboard` | Portapapeles con marca |
| `user` | Persona |
| `swap` | Flechas en sentidos opuestos |
| `cards` | Tarjetas apiladas |
| `puzzle` | Pieza de puzle |
| `sort` | Líneas de ordenar con flecha |
| `link` | Eslabones |
| `flask` | Matraz |
| `copy` | Copiar (dos hojas) |
| `brush` | Pincel |
| `read` | Libro abierto |
| `search` | Lupa |
| `verb` | Líneas con flecha (verbos) |
| `plus` | Más |
| `palette` | Paleta de pintor |
| `download` | Descargar |
| `info` | Información (i en círculo) |
| `heart` | Corazón |
| `plane` | Avión de papel |
| `bowl` | Cuenco humeante |
| `briefcase` | Maletín |
| `cap` | Birrete |
| `tv` | Televisor |
| `gamepad` | Mando de consola |
| `run` | Persona corriendo |
| `music` | Notas musicales |
| `lock` | Candado |
| `rice` | Onigiri (Musubi) |
| `moon` | Luna |
| `hand` | Mano |
| `band` | Cinta para la cabeza |
| `scarf` | Bufanda |
| `calendar` | Calendario |

Para añadir uno: una entrada nueva en `PATHS` con el trazo pensado para un `viewBox` de 24×24 y línea de 2 px. No cambies los trazos existentes: se usan en toda la app.

---

## Recorrido del código paso a paso

En [icon.component.ts](../../src/app/components/icon/icon.component.ts):

1. **`pathData`** (`computed`): `PATHS[name()]`, o `''` si no existe.
2. **Plantilla**: un `<svg>` con `width` y `height` = `size()`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width` = `stroke()` y extremos redondeados. Dentro, un `<path>` con `d` = `pathData()` y `fill` = `currentColor` si `fill()`, si no `none`.

No inyecta nada ni tiene estado.

### Estilos

[icon.component.scss](../../src/app/components/icon/icon.component.scss): `:host` en `inline-flex` y `line-height: 0`, para que no quede el hueco de una línea de texto debajo del SVG y el icono se alinee con el texto de un botón.
