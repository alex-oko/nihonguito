# Práctica de kanji (`/kanji/practica`)

Ronda de preguntas de kanji. Es inmersiva y la pinta `app-question-runner`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kanji-practice.component.ts](../../../src/app/views/kanji/views/kanji-practice/kanji-practice.component.ts) | Lee la query y arma la ronda. |
| [kanji-practice.component.html](../../../src/app/views/kanji/views/kanji-practice/kanji-practice.component.html) | Solo `<app-question-runner>`. |
| [kanji-practice.component.scss](../../../src/app/views/kanji/views/kanji-practice/kanji-practice.component.scss) | Sin estilos propios. |

### Reglas

- `?mode=meaning|reverse|words|mixed` (sin query o desconocido: `meaning`; `trace` tiene su propia pantalla), `?scope=upto|all`, `?count=` (por defecto `DEFAULT_COUNT` = **10**).
- Se eligen los kanji con `prioritizeKanji`: primero los que toca repasar, los flojos y los nuevos.
- Las preguntas de kanji usan `forceKanji`: el runner enseña el kanji aunque el usuario lea en kana.
- Las respuestas van al dominio `j:<kanji>` (y `w:<id>` en «Lee la palabra»).

---

## Recorrido del código paso a paso

`drill` valida `mode`; un `effect` llama a **`build()`** (en `untracked`) cuando cambia la query. `build` carga las lecciones, cruza con `kanjiWithLessons`, aplica `kanjiInScope`, elige con `prioritizeKanji` y genera con `kanjiQuestions(picked, drill, count, all)`.
