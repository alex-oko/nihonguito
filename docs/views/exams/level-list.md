# Lista de exámenes de nivel (`/examen/nivel`)

Catálogo de parciales, finales y un examen personalizado con el formato de la clase.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [level-list.component.ts](../../../src/app/views/exams/views/level-list/level-list.component.ts) | Agrupa presets, recomienda uno y controla la creación. |
| [level-list.component.html](../../../src/app/views/exams/views/level-list/level-list.component.html) | Pinta tarjetas, selector personalizado y confirmación. |
| [level-list.component.scss](../../../src/app/views/exams/views/level-list/level-list.component.scss) | Presenta niveles, notas y modal. |

### Qué hace el usuario

- Abre uno de los exámenes fijos de `LEVEL_PRESETS`.
- Retoma una hoja sin entregar.
- Elige lecciones —y la lección 0 para kana— para crear un examen personalizado.
- Confirma antes de sustituir otro borrador pendiente.

### Reglas

- `recommended` es el preset que contiene la última lección abierta.
- Nivel 1 cubre lecciones 1–3; después cada nivel cubre cuatro lecciones.
- Un personalizado sin lecciones usa la lección 1.

### Datos guardados

Lee `nihongo:levelDraft`, `nihongo:levelBest` y el último `nihongo:levelCustom` mediante `LevelExamService`.

---

## Recorrido del código paso a paso

### 1. Preparar el catálogo

`levels` agrupa `LEVEL_PRESETS` por nivel. `label()` y `sections()` construyen el resumen visible.

### 2. Abrir un preset

`open(preset)` retoma la misma hoja, pide confirmación si existe otra o delega en `start()`.

### 3. Examen personalizado

`openCustom()` separa kana de las lecciones, calcula el nivel y crea un `LevelPreset` con id `custom`.

### 4. Crear y navegar

`start()` activa `busy`, llama a `levelExamSVC.create()` y navega a `/examen/nivel/hoja`.

### Estilos

El SCSS distingue recomendación, mejor nota, borrador activo y bloque personalizado.
