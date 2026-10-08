# Cómo escribir un doc

Un doc tiene que permitir que alguien que nunca abrió el código entienda **qué hace** la pieza y **siga su ejecución** de principio a fin sin perderse.

Dónde va cada doc está en el [README](README.md). Esta guía cubre cómo se escribe.

## Principios

- **Primero el qué, después el cómo.** La primera mitad describe la pieza desde fuera (archivos, lo que hace el usuario, las reglas). La segunda sigue el código.
- **El recorrido sigue la ejecución, no el archivo.** Se narra en el orden en que pasan las cosas (arranque → carga → pantalla → interacciones → salida), aunque en el archivo estén en otro orden.
- **Cada función se explica donde se llama.** Si un paso llama a un util o a un servicio, el paso dice qué hace esa llamada ahí mismo, sin mandar al lector a otro sitio.
- **Nombres buscables, nunca números de línea.** Los métodos, signals y constantes van en **negrita** o en `código`, tal cual están escritos, para que un `Ctrl+F` los encuentre.
- **Números concretos.** «15 preguntas», «caja 4 de Leitner», «5 granos por acierto», nunca «un umbral». Si la regla tiene una constante, se nombra la constante y su valor.
- **El porqué de lo que no es obvio.** Cuando algo parece raro, se explica qué fallaba sin eso. Es lo que evita que alguien lo «limpie» y reintroduzca el bug.
- **Frases cortas, en español.** Una idea por viñeta. Mejor una lista numerada que un párrafo largo cuando hay orden.

## Doc de vista o componente

Archivo: `views/<vista>/<vista>.md` (o `components/<componente>.md`).

```markdown
# <Nombre de la vista> (`/ruta`)

Una o dos frases: qué muestra y para qué sirve. Enlace al doc de utils si lo hay.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [x.component.ts](../../../src/app/views/…) | … |
| [x.component.html](../../../src/app/views/…) | … |
| [x.component.scss](../../../src/app/views/…) | … |
| [x.utils.ts](../../../src/app/utils/…) | Cálculos puros ([su doc](…)) |

### Qué hace el usuario

Una viñeta por control: botones, toques, teclado, voz.
Para cada uno: qué cambia en pantalla y los casos borde (sin progreso, lección bloqueada…).

### Reglas

Las reglas del aprendizaje, con sus números (cajas de Leitner, XP, granos, puntos).

### Datos guardados

Qué claves de `localStorage` lee o escribe (a través de qué servicio).

---

## Recorrido del código paso a paso

Una frase: dónde empieza cada paso y que los nombres son buscables.

### 1. Arranque
Plantilla → `constructor` (cada `effect`: qué lee y qué dispara) → ciclo de vida.

### 2. Carga de datos
Qué se pide (lecciones, apéndice, furigana), qué se transforma al llegar.

### 3…N. Un paso por bloque de comportamiento
La cadena de `computed` (en orden de dependencia), cada panel, cada interacción.

### N+1. Salida
`ngOnDestroy` / `DestroyRef`: qué se limpia (timers, audio, reconocimiento de voz).

### Estilos
Cómo está ordenado el SCSS y qué tiene de especial.
```

## Doc de utils (funciones puras)

Archivo: `utils/<tema>.utils.md`, o junto a la vista si solo la usa ella (`views/<vista>/<vista>-utils.md`).

```markdown
# Utils de <tema> (`<tema>.utils.ts`)

Qué reúne el archivo y por qué está separado.

## Conceptos

Glosario: cada término (caja de Leitner, kana, dakuten, furigana…).

## Constantes

| Constante | Valor | Para qué |
|---|---|---|

---

## Funciones

Agrupadas por tema, una ficha por función:

#### `nombre(parámetros)`

- **Qué hace**: en una frase.
- **Cómo**: el algoritmo, en pasos numerados si tiene varios.
- **Devuelve**: si no es obvio.
- **Quién la llama**: el componente / servicio, y para qué.
- **Ejemplo**: con datos reales (entrada → salida).
```

## Doc de servicio

Archivo: `services/<nombre>.service.md`, o en la carpeta de la vista si es de su dominio (`views/pet-house/pet.service.md`).

```markdown
# `NombreService`

Qué datos o qué responsabilidad tiene, quién lo usa y qué no hace.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|

### Estado

Signals que guarda: qué contienen, en qué clave de `localStorage` se persisten, quién los escribe y quién los lee.

### Reglas

Normalizaciones, migraciones de datos viejos, límites.

---

## Recorrido paso a paso

Un paso por flujo (lectura, escritura, migración…).

## Métodos

Una ficha por método público, agrupados por tema:

#### `metodo(parámetros)`

- **Qué hace**:
- **Cómo**:
- **Devuelve**:
- **Quién lo llama**:
```

## Sub-vistas

Una vista con pantallas hijas (`kana`, `lessons`, `exams`, `practice`, `verbs`, `conversations`) tiene **un doc por pantalla** más uno de la vista principal, todos en la carpeta de la vista: `views/kana/kana.md` (el hub: rutas, qué enlaza) + `views/kana/kana-chart.md` + …

## Enlaces

- Relativos al propio doc. Desde `docs/views/<vista>/` el código está en `../../../src/…`; desde `docs/components/` o `docs/services/`, en `../../src/…`.
- Si enlazas a una sección, usa el ancla del título (`kana-chart.md#recorrido-del-código-paso-a-paso`).

## Antes de dar el doc por terminado

- [ ] Cada nombre citado existe en el código (búscalo).
- [ ] Ningún número de línea.
- [ ] Los enlaces resuelven.
- [ ] El doc está en la tabla del [README](README.md).
