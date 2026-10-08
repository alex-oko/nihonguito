# Selector de lecciones (`app-lesson-picker`)

Selector reutilizable para elegir las lecciones que alimentan un examen personalizado. Expone la selección como un `model`, por lo que el componente padre puede enlazarla con `[(selected)]`.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [lesson-picker.component.ts](../../src/app/components/lesson-picker/lesson-picker.component.ts) | Carga el índice y mantiene la selección ordenada. |
| [lesson-picker.component.html](../../src/app/components/lesson-picker/lesson-picker.component.html) | Pinta atajos y la cuadrícula de lecciones. |
| [lesson-picker.component.scss](../../src/app/components/lesson-picker/lesson-picker.component.scss) | Distribuye los chips y botones numéricos. |

### Qué hace el usuario

- Toca un número para añadir o quitar una lección.
- Usa **Hasta la lección N** para elegir de la 1 a la última lección abierta.
- Usa **Todas** para incluir también la lección 0, que representa kana en el examen de nivel personalizado.
- Usa **Ninguna** para vaciar la selección.

### Reglas

- `selected` siempre queda ordenado de menor a mayor.
- `all()` usa todos los ids del índice, incluida la lección 0.
- `upTo()` excluye la lección 0 y llega hasta `progressSVC.lastLesson().id`.

### Datos guardados

El componente no escribe `localStorage`. Lee la última lección a través de `ProgressService`; el padre decide si persiste la selección.

---

## Recorrido del código paso a paso

### 1. Arranque

El `constructor` llama a `lessonSVC.loadIndex()`. La plantilla reacciona cuando `lessonSVC.index` recibe los metadatos.

### 2. Selección rápida

`all()` copia todos los ids. `upTo()` filtra el índice por el progreso actual. El botón Ninguna escribe `[]` directamente en `selected`.

### 3. Selección individual

`toggle(id)` quita un id existente o añade uno nuevo y ordena el resultado. La clase `on` muestra qué botones están activos.

### Estilos

El SCSS usa la cuadrícula global y añade el aspecto compacto de los botones numéricos.
