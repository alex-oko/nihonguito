# `ExamService`

Arma el examen personalizado de `/examen` y mantiene sus preguntas en memoria hasta que `/examen/prueba` las consume.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [exam.service.ts](../../../src/app/services/exam.service.ts) | Carga contenido, reparte cupos y genera preguntas. |
| [exam.interface.ts](../../../src/app/interfaces/exam.interface.ts) | Define `ExamConfig` y las secciones disponibles. |
| [exam.utils.ts](../../../src/app/utils/exam.utils.ts) | Contiene `EXAM_SECTIONS` y `compactRanges`. |

### Estado

`current` guarda título, preguntas, modo estricto y configuración. No se persiste: una recarga obliga a volver al creador.

### Reglas

- `MIN_LESSON_VERBS = 4`: con menos verbos en las lecciones elegidas se usa el apéndice completo.
- `MAX_SPEAK_SENTENCE_LENGTH = 24`: las frases más largas no entran en pronunciación.
- `MIN_PRIORITIZED_WORDS = 8`: cada sección prepara un grupo mínimo de palabras débiles o nuevas.
- El resto al dividir `count` entre secciones se reparte, de una en una, entre las primeras.

---

## Recorrido paso a paso

### 1. Cargar el material

`build(config)` carga las lecciones elegidas y las anteriores a la más alta. Estas últimas permiten calcular `knownStems`, necesario para crear frases justas.

### 2. Preparar verbos

Si se eligió `verbs`, filtra el apéndice por las palabras y lecciones seleccionadas. Con menos de cuatro coincidencias conserva todo el apéndice.

### 3. Repartir preguntas

Cada `ExamSection` llama al generador adecuado: `vocabQuestions`, `sentenceQuestions`, `verbQuestions` o `kanaQuestions`. Escucha y pronunciación reparten su cupo entre palabras y frases.

### 4. Publicar

`compactRanges` produce títulos como `Lecciones 1–3, 5`. Las preguntas se barajan y el resultado queda en `current`.

## Métodos

#### `build(config)`

- **Qué hace**: arma un examen completo.
- **Devuelve**: una promesa que termina cuando `current` está listo.
- **Quién lo llama**: `ExamBuilderComponent` y `ExamRunComponent`.
