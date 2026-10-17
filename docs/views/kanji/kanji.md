# Kanji (`/kanji`)

Los 100 kanji básicos (nivel N5) agrupados por la lección donde aparecen por primera vez en el vocabulario. Cada uno abre una ficha con su significado, lecturas, trazos, un truco para recordarlo y las palabras de las lecciones que lo usan. Desde aquí se practica ([preguntas](kanji-practice.md) o [trazo](kanji-trace.md)). Los datos viven en [kanji.utils](../../utils/kanji.utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kanji.component.ts](../../../src/app/views/kanji/kanji.component.ts) | Carga las lecciones, cruza los kanji con el vocabulario, colorea por dominio y abre la práctica. |
| [kanji.component.html](../../../src/app/views/kanji/kanji.component.html) | Explicación de lecturas, progreso, práctica, cuadrícula por lección y ficha. |
| [kanji.component.scss](../../../src/app/views/kanji/kanji.component.scss) | Cuadrícula, colores por caja de Leitner y ficha. |
| [kanji.utils.ts](../../../src/app/utils/kanji.utils.ts) | Los 100 kanji y el cruce con las lecciones ([su doc](../../utils/kanji.utils.md)). |

Se entra desde **Kana** (tarjeta «Kanji», con el icono 字).

### Qué hace el usuario

- Lee «¿Cómo se lee un kanji?»: la lectura japonesa (kun) cuando va solo o con hiragana, la china (on) casi siempre cuando se junta con otro kanji.
- Ve cuántos domina («Dominas N de 100»: caja de Leitner `KNOWN_BOX` o más).
- **Practicar**: alcance («Hasta la lección N» o «Los 100»), tipo (¿Qué significa?, Al kanji, Lee la palabra, Trazar, Todo mezclado) y cantidad (10 o 20). **Empezar** abre `/kanji/practica` o, con Trazar, `/kanji/trazar`.
- Toca un kanji de la cuadrícula: se abre la ficha (hoja inferior) con lecturas, truco, palabras de las lecciones (siempre con kanji, aunque el usuario lea en kana) con audio, y **Practicar el trazo** de ese kanji.
- El borde de cada ficha se colorea según su caja: dorado (empezando), verde (lo sabe), verde relleno (dominado).

### Reglas

- «Hasta la lección N» usa la última lección abierta (mínimo la 1). Los kanji que ningún vocabulario usa todavía (los números del 二 al 十, 西 y 南) solo entran con «Los 100».

### Datos guardados

Lee `nihongo:mastery` (claves `j:<kanji>`, ver [almacenamiento local](../../core/local-storage.md)).

---

## Recorrido del código paso a paso

1. **Arranque**: `lessonSVC.allLessons()` → `kanjiWithLessons(lessons)` en `kanji`.
2. **Derivados**: `groups` (`groupByLesson`), `boxes` (caja de cada kanji en `mastery`), `knownCount`, `practicePool` (`kanjiInScope(kanji, scope, lastLesson)`).
3. **Ficha**: `open` guarda el kanji abierto; el fondo la cierra. `readingOf` limpia la lectura con `cleanForm`.
4. **`practice()`** navega con `mode`, `scope` y `count` en la query; **`traceOne(char)`** abre el trazo de un solo kanji (`?chars=学`).
