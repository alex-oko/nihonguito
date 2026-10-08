# `LevelExamService`

Genera, persiste y corrige las hojas de nivel de 50 puntos. También alimenta el repaso, concede XP y conserva la mejor nota.

## Introducción

### Estado

| Signal | Clave | Contenido |
|---|---|---|
| `draft` | `nihongo:levelDraft` | Hoja, respuestas, excepciones y tiempos. |
| `best` | `nihongo:levelBest` | Mejor porcentaje por `presetId`. |
| `results` | derivado | Corrección de una hoja ya entregada. |

### Formatos de 50 puntos

| Examen | Reparto |
|---|---|
| N1 parcial | Hiragana 10 + katakana 10 + vocabulario 10 + partículas 7 + respuestas 9 + números 4. |
| N1 final | Vocabulario 10 + partículas 10 + diálogos 10 + ordenar 10 + números 8 + nombre 2. |
| N2+ | Vocabulario 20, o vocabulario 10 + verbos 10 desde L14; partículas 10 + interrogativos 10 + ordenar 10; además 2 extra. |

### Reglas de corrección

- `exact` acepta la respuesta directa o pasada a kana; mezclar hiragana y katakana vale 0.5.
- `particle` detecta errores fonéticos `わ/は`, `お/を` y `え/へ`.
- `fuzzy` da 1 desde 85 % y 0.5 desde 60 %.
- `es` delega en `gradeSpanish`.
- `free-kata` exige al menos dos caracteres katakana; `free-jp`, tres caracteres japoneses.
- Cada ítem se redondea hacia abajo al medio punto. **Mi respuesta vale** concede sus puntos completos.

---

## Recorrido paso a paso

### 1. Crear

`create(preset)` carga lecturas, lecciones elegidas y anteriores. Después arma solo las secciones que tienen ítems, suma el total sin extras y guarda un `Draft` vacío.

### 2. Responder

`setAnswer()` actualiza una casilla y persiste. `toggleOverride()` cambia la autoevaluación de un ítem corregido. `discard()` elimina el borrador.

### 3. Corregir

`checkSlot()` puntúa una casilla. `grade()` promedia casillas por ítem, calcula secciones y separa `score` de `bonus`.

### 4. Entregar

`submit()` fija `submittedAt`, registra cada palabra en Leitner, concede 2 XP por punto, termina la sesión, añade el historial y llama a `saveBest()`.

### 5. Consultar

`blankCount()` ignora la sección extra. `lastCustom()` recupera el último preset personalizado guardado en `nihongo:levelCustom`.

## Métodos públicos

`setAnswer`, `toggleOverride`, `discard`, `lastCustom`, `create`, `checkSlot`, `grade`, `submit` y `blankCount` forman la API usada por la lista y la hoja.
