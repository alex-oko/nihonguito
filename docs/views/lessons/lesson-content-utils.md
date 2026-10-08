# Utils de contenido de lección (`lesson-content.utils.ts`)

Tres funciones puras que sacan de una lección **qué practicar**: todas sus frases, las palabras que valen para un ejercicio y en qué orden preguntarlas. Están separadas de la vista porque las usan también los exámenes, los juegos y la sesión guiada.

Archivo: [lesson-content.utils.ts](../../../src/app/utils/lesson-content.utils.ts).

## Conceptos

- **Caja de Leitner**: cada palabra tiene una caja en `nihongo:mastery` (clave `w:<id>`). Acertar la sube, fallar la baja; cuanto más alta, más días hasta el próximo repaso (`due`). Ver [progress.service.md](../../services/progress.service.md).
- **Palabra plana**: la que se puede escribir o decir tal cual, sin marcadores como `～` o `-` y con 14 caracteres o menos (`isPlainWord`, en [questions.utils.ts](../../../src/app/utils/questions.utils.ts)).
- **Nombre propio**: palabra con `type: 'name'` (Lucía, Tokio…).

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `MIN_STUDY_WORDS` | 4 | Mínimo de palabras para que un ejercicio tenga opciones suficientes; por debajo, `studyWords` no filtra |

---

## Funciones

### Frases

#### `lessonSentences(lesson)`

- **Qué hace**: devuelve todas las frases japonesas con traducción de la lección, sin repetidas.
- **Cómo**:
  1. Junta, en este orden: `patterns`, cada pregunta y cada respuesta de `examples`, los ejemplos de `grammar`, todas las líneas de las conversaciones y `phrases`.
  2. Quita las que no tienen `jp` o `es`.
  3. Quita repetidas por `jp` (se queda la primera): una frase del diálogo suele estar también en las frases útiles.
- **Quién la llama**: [lesson-practice](lesson-practice.md) (modos de frases y prueba), `ExamService`, `LevelExamService`, el anfitrión de juegos y `modelSentences` (cuando la lección tiene pocas frases modelo).
- **Ejemplo**: una lección con 4 `patterns`, 8 `examples` y 2 conversaciones de 9 líneas da unas 4 + 16 + 18 frases, menos las repetidas.

### Palabras

#### `studyWords(words, mode?)`

- **Qué hace**: devuelve las palabras que vale la pena practicar.
- **Cómo**:
  1. Quita los nombres propios.
  2. En `write` y `speak`, se queda con las palabras planas, si hay al menos `MIN_STUDY_WORDS`.
  3. Si quedan menos de `MIN_STUDY_WORDS`, devuelve la lista original entera.
- **Quién la llama**: lesson-practice, exámenes y juegos.
- **Ejemplo**: el vocabulario de la lección 1 sin sus nombres propios; en `write`, además, sin `～さん`.

#### `prioritize(words, progress, count)`

- **Qué hace**: elige `count` palabras, primero las que más conviene practicar.
- **Cómo**: baraja las palabras y les da una puntuación; ordena de mayor a menor y corta:
  - Palabra nueva (sin entrada en `mastery`): `1 + azar(0–1)`.
  - Palabra vista: `2` si toca repasarla hoy o está atrasada (`due <= hoy`), más `(5 - caja) × 0.5`, más `azar(0–1)`.
- **Devuelve**: las `count` primeras (o todas si hay menos).
- **Quién la llama**: lesson-practice (todas las rondas), `ExamService`, `LevelExamService` y juegos. Recibe el `ProgressService` como parámetro para seguir siendo una función sin inyección.
- **Ejemplo**: una palabra en caja 1 que toca hoy saca entre 4 y 5; una nueva, entre 1 y 2; una en caja 5 que no toca, entre 0 y 1.
