# Práctica de vocabulario fácil (`/vocabulario/practica`)

Ronda de vocabulario con solo las palabras de las lecciones y tipos elegidos en [Vocabulario fácil](vocab.md). Es inmersiva y la pintan `app-flashcards`, `app-match-game` o `app-question-runner` según la forma de practicar.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [vocab-practice.component.ts](../../../src/app/views/vocab/views/vocab-practice/vocab-practice.component.ts) | Lee la query, filtra y arma la ronda. |
| [vocab-practice.component.html](../../../src/app/views/vocab/views/vocab-practice/vocab-practice.component.html) | Tarjetas, parejas o preguntas; aviso si no hay palabras. |
| [vocab-practice.component.scss](../../../src/app/views/vocab/views/vocab-practice/vocab-practice.component.scss) | Solo el botón del aviso. |

### Qué hace el usuario

- Practica con la forma elegida. **Otra vez** al final arma una ronda nueva con la misma selección.
- Si la combinación no tiene palabras (por ejemplo, Verbos en la lección 1), ve «No hay palabras con esas lecciones y tipos» y **Cambiar la selección** vuelve a `/vocabulario`.

### Reglas

- Se eligen `count` palabras con `prioritize`: primero las que toca repasar, las flojas y las nuevas.
- **Escribir** usa solo palabras sin marcadores como ～ si quedan al menos `MIN_PLAIN_WORDS` (**4**).
- Las opciones falsas salen de las palabras de los tipos elegidos cuando hay al menos `MIN_DISTRACTOR_WORDS` (**8**); si no, de todo el vocabulario de las lecciones. Así no aparece «Suiza» entre verbos.
- **Todo mezclado** usa `MIXED_MODES`: significado, al japonés, escucha y escribir.
- Las respuestas cuentan para el repaso espaciado (`track` de cada palabra), pero no se guardan por lección: no hay `lessonId`.

### Datos guardados

Lo que guardan el runner, las tarjetas y las parejas (dominio de cada palabra, XP, racha).

---

## Recorrido del código paso a paso

### 1. Arranque

`lessons`, `types`, `mode` y `count` llegan de la query por `withComponentInputBinding`. **`drill`** valida `mode` contra `VOCAB_DRILLS` (por defecto `meaning`). Un `effect` llama a `build()` dentro de `untracked` cuando cambia la query.

### 2. Armado (`build`)

1. Lee la query: ids de lección, tipos (o `DEFAULT_VOCAB_TYPES`) y cantidad (o 20).
2. Carga las lecciones con `lessonSVC.getMany` y filtra con `filterByTypes`. Sin palabras, `isEmpty` enseña el aviso.
3. Elige con `prioritize` y arma: `cards` para tarjetas, `pairs` (forma principal ↔ `shortEs`) para parejas, o `vocabQuestions(picked, modes, count, distractorPool, true)` para el resto.
