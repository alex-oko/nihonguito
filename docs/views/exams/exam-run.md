# Ejecución del examen personalizado (`/examen/prueba`)

Pantalla que entrega a `app-question-runner` el examen armado en memoria por `ExamService`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [exam-run.component.ts](../../../src/app/views/exams/views/exam-run/exam-run.component.ts) | Protege la ruta, guarda el resultado y repite el examen. |
| [exam-run.component.html](../../../src/app/views/exams/views/exam-run/exam-run.component.html) | Pasa preguntas y modo estricto al runner. |
| [exam-run.component.scss](../../../src/app/views/exams/views/exam-run/exam-run.component.scss) | Usa los estilos globales del runner. |

### Qué hace el usuario

- Responde el examen configurado en `/examen`.
- Al terminar, guarda el intento en el historial.
- Pulsa **Otra vez** para obtener preguntas nuevas con la misma configuración.

### Reglas

- Recargar la ruta pierde `examSVC.current`; el `constructor` vuelve al creador con `replaceUrl`.
- El resultado cuenta aciertos completos sobre el número real de preguntas generadas.

### Datos guardados

`saved(result)` llama a `progressSVC.saveExam()` y añade fecha, título, aciertos y total a `nihongo:exams`.

---

## Recorrido del código paso a paso

### 1. Entrada

El `constructor` comprueba `examSVC.current()`. Sin examen armado navega a `/examen`.

### 2. Sesión

La plantilla pasa `questions`, `title` y `strict` a `QuestionRunnerComponent`.

### 3. Resultado y repetición

`saved()` registra el intento. `again()` recupera `current.config` y vuelve a ejecutar `examSVC.build(config)`.

### Estilos

El componente no añade presentación: el runner controla la pantalla.
