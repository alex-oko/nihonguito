# Práctica de verbos (`/verbos/practica`)

Pantalla de una ronda de conjugación. Convierte la query elegida en `/verbos` en preguntas para el motor común.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [verb-practice.component.ts](../../../src/app/views/verbs/views/verb-practice/verb-practice.component.ts) | Lee la query, filtra verbos y genera la ronda. |
| [verb-practice.component.html](../../../src/app/views/verbs/views/verb-practice/verb-practice.component.html) | Delega la sesión a `app-question-runner`. |
| [verb-practice.component.scss](../../../src/app/views/verbs/views/verb-practice/verb-practice.component.scss) | Declara que usa los estilos globales. |

### Qué hace el usuario

- Responde 12 preguntas de conjugación.
- Pulsa **Otra vez** para generar una ronda nueva con la misma configuración.

### Reglas

- `QUESTIONS_PER_ROUND` vale `12`.
- `forms` usa `te` cuando la query está vacía.
- `group = 0` incluye todos los verbos; `1`, `2` o `3` filtran el apéndice.

### Datos guardados

El componente no guarda datos directamente. `QuestionRunnerComponent` registra XP, dominio y estadísticas mediante `ProgressService`.

---

## Recorrido del código paso a paso

### 1. Arranque y cambios de query

El `effect` lee `forms()` y `group()`. Después llama a `build()` dentro de `untracked`, para que las lecturas internas no conviertan el efecto en un ciclo.

### 2. Armar la ronda

`build()` carga `appendix.verbs`, filtra por grupo y transforma la lista de formas separada por comas. `verbQuestions` devuelve 12 preguntas.

### 3. Ejecutar y repetir

La plantilla pasa `questions()` a `app-question-runner`. El output `again` vuelve a llamar a `build()`.

### Estilos

No necesita estilos propios: el runner ocupa toda la pantalla.
