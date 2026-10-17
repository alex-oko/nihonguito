# Vocabulario fácil (`/vocabulario`)

Creador de prácticas de vocabulario, parecido al [creador de examen](../exams/exam-builder.md): se eligen lecciones, tipos de palabra, forma de practicar y cantidad, y en la práctica solo salen palabras de esa selección. Las opciones viven en [vocab-builder.utils](../../utils/vocab-builder.utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [vocab.component.ts](../../../src/app/views/vocab/vocab.component.ts) | Selección, carga del vocabulario de las lecciones elegidas, filtro y arranque. |
| [vocab.component.html](../../../src/app/views/vocab/vocab.component.html) | Los 4 pasos, el resumen, la lista de palabras y **Empezar**. |
| [vocab.component.scss](../../../src/app/views/vocab/vocab.component.scss) | Opciones de práctica con radio, resumen y lista. |
| [vocab-builder.utils.ts](../../../src/app/utils/vocab-builder.utils.ts) | Filtros por tipo, formas de practicar y cantidades ([su doc](../../utils/vocab-builder.utils.md)). |
| [lesson-picker](../../components/lesson-picker.md) | Cuadrícula de lecciones con atajos. |

Se entra desde **Practicar** (tarjeta «Vocabulario fácil», debajo de «Gramática fácil»).

### Qué hace el usuario

1. **Lecciones**: las marca en `app-lesson-picker` («Hasta la lección N», «Todas», «Ninguna»).
2. **Tipo de palabras**: chips de selección múltiple (Sustantivos, Verbos, Adjetivos, Expresiones, Nombres), cada uno con cuántas palabras tiene en las lecciones elegidas.
3. **Cómo practicar**: una opción de `VOCAB_DRILLS` (Tarjetas, ¿Qué significa?, Al japonés, Escucha, Escribir, Parejas, Todo mezclado).
4. **Cuántas palabras**: 10, 20 o 30.
- El resumen dice cuántas palabras entran. **Ver las palabras** despliega la lista (forma principal, lectura, significado, lección y altavoz) de `LIST_PAGE` (**40**) en 40 con **Ver más**.
- **Empezar** queda desactivado sin palabras (sin lecciones o sin tipos con palabras) y abre [la práctica](vocab-practice.md).

### Reglas

- La primera vez se marcan las lecciones de la 1 a la última abierta y los tipos `DEFAULT_VOCAB_TYPES` (todos menos Nombres).
- Forma por defecto: «¿Qué significa?»; cantidad por defecto: 20.

### Datos guardados

- `nihongo:vocabConfig` (`VocabConfig`: `{ lessons, types, mode, count }`) con `loadRaw` / `save`: se escribe al pulsar **Empezar** y el formulario arranca con ella.

---

## Recorrido del código paso a paso

### 1. Arranque

Los signals del formulario salen de `vocabConfig` o de los valores por defecto. Sin lecciones guardadas, se eligen de la 1 a `lastLesson`. Un `effect` llama a **`loadWords(lessonsSel())`** cada vez que cambia la selección de lecciones.

### 2. Carga

**`loadWords`** pide `lessonSVC.getMany(ids)` y guarda todo el vocabulario en `lessonWords`. `currentLoadId` descarta la respuesta de una carga vieja si el usuario cambió la selección mientras tanto.

### 3. Valores derivados

- **`chosen`**: `filterByTypes(lessonWords, typesSel)`, las palabras que entran.
- **`typeCounts`**: palabras por tipo para el número de cada chip.
- **`canStart`**: no está cargando y `chosen` no está vacío.
- **`visibleWords`**: la página visible de la lista.

### 4. Empezar

**`start()`** guarda `vocabConfig` y navega a `/vocabulario/practica?lessons=1,2&types=noun,verb&mode=meaning&count=20`.
