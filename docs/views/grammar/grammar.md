# Gramática fácil (`/gramatica`)

Explica las partículas y el orden de la frase con palabras sencillas, sin tecnicismos. Está pensada para quien ya sabe verbos y vocabulario pero no sabe cómo unirlos ni qué va en un hueco de «completa la frase». Todo el contenido vive en [grammar-guide.utils.ts](../../utils/grammar-guide.utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [grammar.component.ts](../../../src/app/views/grammar/grammar.component.ts) | Pestaña abierta, tarjeta desplegada, ejemplo resuelto elegido y frases de los intereses del usuario. |
| [grammar.component.html](../../../src/app/views/grammar/grammar.component.html) | Las cuatro pestañas: Básico, Partículas, Frases y Practicar. |
| [grammar.component.scss](../../../src/app/views/grammar/grammar.component.scss) | Tarjetas desplegables, leyenda, resumen rápido, pasos y moldes. |
| [grammar-guide.utils.ts](../../../src/app/utils/grammar-guide.utils.ts) | Todo el texto y las frases partidas en trozos ([su doc](../../utils/grammar-guide.utils.md)). |
| [sentence-blocks](../../components/sentence-blocks.md) | Pinta cada frase en trozos de colores según su papel. |
| [_roles.scss](../../../src/styles/_roles.scss) | Color de cada papel (`[data-role]`) y `.role-dot`. |

Se entra desde **Practicar** (tarjeta «Gramática fácil», arriba) y desde la pestaña **Gramática** de cada lección (atajo «¿Te pierdes al armar frases?»).

### Qué hace el usuario

- **Básico**: una leyenda con los 8 colores (un papel cada uno: tema, quién con が, cuándo, dónde, otro detalle, qué, cómo/cuánto y acción) y 10 tarjetas desplegables con las piezas de una frase (partícula, verbo, sustantivo, adjetivos い y な, adverbio, sujeto, tema, objeto y cuándo). Cada una trae ejemplos con el nombre del papel bajo cada trozo.
- **Partículas**:
  - Un resumen rápido en 3 grupos: «Las de cada frase», «Las que añaden un matiz» y «Las que unen o cierran frases» (pregunta → partícula).
  - 18 fichas desplegables: は, が, を, に, で, へ, と, も, の, から・まで, か, や, より, ぐらい, だけ, でも, が・けど («pero») y ね・よ. Cada una trae «Responde a…», explicación, ejemplos, un «Ojo» con el error típico, sus **otros usos** si los tiene (に para qué, を salir o bajarse y por dónde pasas, から porque, か «o») y, si hay, «Con tus temas» (frases de los intereses del usuario que usan esa partícula).
  - Abajo, las 7 confusiones más comunes con un ejemplo de cada lado (に/で, は/が, を/が, に/へ, と/や, ぐらい/ごろ y から desde/porque).
- **Frases**: las 5 reglas de oro, el molde general con un trozo de cada papel, el método «paso a paso: del español al japonés» con 3 ejemplos resueltos, cómo resolver «completa la frase», 10 moldes desplegables y «Frases para ti».
- **Practicar**: 4 tipos de ejercicio que abren [/gramatica/practica](grammar-practice.md).
- Tocar una tarjeta desplegable la abre y cierra la que estuviera abierta. El altavoz de cada frase la lee entera.

### Reglas

- **Frases para ti**: con intereses elegidos en Perfil salen todas las frases de esos temas (6 o 7 por tema); sin intereses, solo las primeras `SAMPLE_WITHOUT_INTERESTS` (**6**) y un enlace a Perfil.
- El romaji bajo cada frase aparece solo si está activado en Perfil (`settings.romaji`).

### Datos guardados

- `nihongo:grammarTab`: la última pestaña abierta (`persisted` sin mezcla), para volver a ella al salir de una práctica.
- Lee `settings.interests` y `settings.romaji` a través de `ProgressService`.

---

## Recorrido del código paso a paso

### 1. Arranque

No carga nada: todo el contenido son constantes de `grammar-guide.utils.ts`. `tab` sale de `persisted('grammarTab', 'basics', false)`.

### 2. Valores derivados

- **`interests`** e **`interestNames`**: los intereses del usuario y sus nombres en minúscula para los textos.
- **`forYou`**: `interestSentences(interests)` (todas las frases si no hay intereses), recortadas a 6 si no eligió ninguno.
- **`particleForYou`**: un `Map` de `guide.id` → `interestSentencesFor(guide, interests)`, para no recalcularlo en cada pintado de la plantilla.
- **`worked`**: el ejemplo resuelto elegido con los chips «Ejemplo 1/2/3».

### 3. Interacciones

- **`setTab(tab)`**: cambia de pestaña, cierra lo desplegado y sube al principio.
- **`toggle(id)`**: abre o cierra una tarjeta (concepto, partícula o molde, todos por su `id`); solo una abierta a la vez.
- **`practice(drill)`**: navega a `/gramatica/practica?mode=<drill>`.

### Estilos

El color de cada trozo y punto sale de `data-role`, que pone `--role` y `--role-soft` (ver [Estilos y temas](../../core/styles-and-themes.md)). Las tarjetas desplegables usan `.fold`, `.fold-head` y `.fold-body`; el chevrón gira 90° con `.open`.
