# Practicar mis frases (`/diario/practica`)

Ronda con las frases que el alumno guardó en [Mi diario](diary.md): repasar lo que uno mismo dijo es de lo que más se recuerda. Es inmersiva y la pinta `app-question-runner`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [diary-practice.component.ts](../../../src/app/views/diary/views/diary-practice/diary-practice.component.ts) | Arma la ronda con `diaryQuestions`. |
| [diary-practice.component.html](../../../src/app/views/diary/views/diary-practice/diary-practice.component.html) | Solo `<app-question-runner>`. |
| [diary-practice.component.scss](../../../src/app/views/diary/views/diary-practice/diary-practice.component.scss) | Sin estilos propios. |

### Reglas

- Hasta `QUESTIONS_PER_ROUND` (**10**) frases al azar del diario.
- Se turnan **Arma la frase** (con la pista «palabra por palabra» y los órdenes alternativos válidos) y **Dilo en voz alta** (ver [questions.utils](../../utils/questions.utils.md#gramática-fácil)).
- **Otra vez** arma otra ronda.

---

## Recorrido del código paso a paso

El constructor llama a **`build()`**, que pasa las frases de `diarySVC.entries()` a `diaryQuestions(sentences, 10)`.
