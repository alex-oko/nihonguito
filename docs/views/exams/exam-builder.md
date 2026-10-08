# Creador de exámenes (`/examen`)

Formulario para armar un examen personalizado: qué lecciones, qué secciones, cuántas preguntas y si es en modo examen real. Al empezar, [`ExamService`](exam.service.md) genera las preguntas y [exam-run](exam-run.md) las corre con el motor de preguntas. También enlaza al [examen de nivel](level-list.md) y enseña el historial.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [exam-builder.component.ts](../../../src/app/views/exams/views/exam-builder/exam-builder.component.ts) | Estado del formulario, configuración guardada, arranque del examen |
| [exam-builder.component.html](../../../src/app/views/exams/views/exam-builder/exam-builder.component.html) | Enlace al examen de nivel, los tres pasos, modo examen real, botón y historial |
| [exam-builder.component.scss](../../../src/app/views/exams/views/exam-builder/exam-builder.component.scss) | Tarjeta del examen de nivel (`.level`, `.paper`), tarjetas de sección (`.sec`, `.sec.on`, `.check`) |
| [exam.utils.ts](../../../src/app/utils/exam.utils.ts) | `EXAM_SECTIONS`: las 9 secciones con su nombre, descripción e icono |
| [exam.service.ts](../../../src/app/services/exam.service.ts) | `build(config)`: arma el examen ([su doc](exam.service.md)) |
| [exam.interface.ts](../../../src/app/interfaces/exam.interface.ts) | `ExamConfig`, `ExamSection`, `ExamSectionInfo` |
| [lesson-picker.component.ts](../../../src/app/components/lesson-picker/lesson-picker.component.ts) | Selector de lecciones (`[(selected)]`) |

### Qué hace el usuario

- **Examen de nivel** (tarjeta 期末): va a `/examen/nivel`.
- **1 · Lecciones**: `app-lesson-picker` con enlace doble a `lessonsSel`.
- **2 · Secciones**: una tarjeta por sección de `EXAM_SECTIONS`; tocarla la marca o desmarca (`toggle`).
- **3 · Preguntas**: chips **10**, **20**, **30**, **50** (`QUESTION_COUNTS`).
- **Modo examen real**: interruptor (`strict`). Se pasa a `app-question-runner` como `[exam]`: sin corrección hasta el final ni segundas oportunidades.
- **Empezar examen**: desactivado sin lecciones o sin secciones (`canStart`), con el aviso «Elige al menos una lección y una sección.». Mientras se arma dice «Preparando…».
- **Historial**: los últimos **8** exámenes (`HISTORY_SIZE`) con `aciertos/total`. La insignia va en verde (`.ok`) desde el 70 % y en acento (`.accent`) por debajo del 50 %.

### Reglas

- **Valores por defecto** (sin configuración guardada): secciones `vocab`, `listen`, `sentences`, `particles` (`DEFAULT_SECTIONS`), **20** preguntas, modo examen real activado, y lecciones de la 1 a la que se estudia (`progressSVC.lastLesson().id`, mínimo 1).
- La configuración se guarda al pulsar **Empezar**, no al cambiar cada control.

### Datos guardados

- `nihongo:examConfig`: la última `ExamConfig` (lecciones, secciones, número de preguntas, modo estricto). Se lee al construir la vista (`loadRaw`) y se escribe en `start` (`save`).
- Lee `nihongo:exams` para el historial (vía [`ProgressService`](../../services/progress.service.md)).

---

## Recorrido del código paso a paso

Empieza en [exam-builder.component.ts](../../../src/app/views/exams/views/exam-builder/exam-builder.component.ts). Los nombres son buscables.

### 1. Arranque

1. **Campos**: `saved = loadRaw('examConfig', {})`. Cada signal del formulario arranca con su valor guardado o el de por defecto: `lessonsSel`, `sectionsSel`, `count`, `strict`.
2. **`constructor`**: si `lessonsSel` está vacío, lo llena con `[1, 2, …, lastLesson]`.

### 2. Formulario

- **`toggle(id)`**: quita la sección si estaba, la añade al final si no. El orden de `sectionsSel` es el orden en que se reparten las preguntas en [`build`](exam.service.md#buildconfig).
- **`canStart`**: al menos una lección y una sección.
- **`history`**: `progressSVC.exams().slice(0, 8)`.

### 3. Empezar

**`start()`**:

1. Arma `ExamConfig` con los cuatro signals y la guarda en `nihongo:examConfig`.
2. `building = true`.
3. `examSVC.build(config)`: carga las lecciones, genera las preguntas y deja el examen en `examSVC.current` ([paso a paso](exam.service.md#recorrido-paso-a-paso)).
4. Navega a `/examen/prueba`.
5. `building = false` en el `finally`, también si algo falla.

### 4. Salida

Nada que limpiar.

### Estilos

[exam-builder.component.scss](../../../src/app/views/exams/views/exam-builder/exam-builder.component.scss): la tarjeta del examen de nivel imita una hoja (`.paper` con 期末), las secciones van en rejilla (`.sections`) y la sección marcada (`.sec.on`) rellena su casilla (`.check`). `.strict` es la fila del interruptor y `.go` el botón principal.
