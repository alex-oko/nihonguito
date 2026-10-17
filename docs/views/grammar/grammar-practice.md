# Práctica de gramática fácil (`/gramatica/practica`)

Ronda de 12 ejercicios sobre partículas y orden de la frase. Es inmersiva (sin barra de pestañas) y la pinta entera `app-question-runner`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [grammar-practice.component.ts](../../../src/app/views/grammar/views/grammar-practice/grammar-practice.component.ts) | Lee `?mode=` y arma la ronda. |
| [grammar-practice.component.html](../../../src/app/views/grammar/views/grammar-practice/grammar-practice.component.html) | Solo `<app-question-runner>`. |
| [grammar-practice.component.scss](../../../src/app/views/grammar/views/grammar-practice/grammar-practice.component.scss) | Sin estilos propios. |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | `grammarQuestions` ([su doc](../../utils/questions.utils.md#gramática-fácil)). |

### Qué hace el usuario

- `?mode=particles`: **¿Qué partícula va?** Elige la partícula del hueco; al corregir se explica por qué va esa.
- `?mode=roles`: **¿Qué papel cumple lo marcado?** Un trozo va entre 【】 y se elige su papel (tema, cuándo, dónde…).
- `?mode=build`: **Arma la frase.** Ordena los trozos a partir del español. Se aceptan los otros órdenes válidos (el medio de la frase se puede mover); si falla, se enseña el papel de cada trozo en orden.
- `?mode=mixed` (o sin `mode`, o uno desconocido): los tres turnándose.
- **Otra vez** en la pantalla final arma una ronda nueva.

### Reglas

- `QUESTIONS_PER_ROUND` = **12**.
- Las frases de los intereses del usuario salen el doble (`GRAMMAR_INTEREST_WEIGHT` = **2**) y las de los temas que no eligió no salen.
- Las de «¿Qué partícula va?» cuentan como habilidad «Partículas» porque su etiqueta dice «partícula» (`skillOf`), pero no se guardan por lección: el runner no recibe `lessonId`.

### Datos guardados

Lo mismo que cualquier ronda del runner (XP, racha, registro de respuestas). Lee `settings.interests`.

---

## Recorrido del código paso a paso

### 1. Arranque

`mode` llega de la query por `withComponentInputBinding`. **`drill`** lo valida contra `GRAMMAR_DRILLS` y cae en `'mixed'` si no existe; **`title`** es la etiqueta de ese ejercicio. Un `effect` lee `drill()` y llama a `build()` dentro de `untracked`, para que cambiar los ajustes no rearme la ronda a mitad.

### 2. Armado

**`build()`** llama a `grammarQuestions(drill, interests, 12)` y guarda el resultado en `questions`. El runner reinicia la sesión con cada lista nueva.
