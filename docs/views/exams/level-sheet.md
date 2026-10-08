# Hoja del examen de nivel (`/examen/nivel/hoja`)

Hoja interactiva de 50 puntos que imita los exámenes de clase y conserva el borrador mientras se responde.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [level-sheet.component.ts](../../../src/app/views/exams/views/level-sheet/level-sheet.component.ts) | Coordina casillas, bancos, fichas, entrega y repetición. |
| [level-sheet.component.html](../../../src/app/views/exams/views/level-sheet/level-sheet.component.html) | Pinta cada tipo de sección y su corrección. |
| [level-sheet.component.scss](../../../src/app/views/exams/views/level-sheet/level-sheet.component.scss) | Da aspecto de hoja y adapta los controles al móvil. |
| [exam-slot.md](../../components/exam-slot.md) | Campo reutilizable y su corrección. |

### Qué hace el usuario

- Escribe respuestas, elige kana de un banco o ordena fichas.
- Cambia entre escritura hiragana y katakana cuando una casilla es `mixed`.
- Entrega; si hay casillas vacías debe confirmar con un segundo toque.
- Tras corregir, puede marcar **Mi respuesta vale** en respuestas españolas o difusas.
- Genera otra hoja o vuelve al catálogo.

### Reglas

- `elapsed` se congela con `submittedAt`.
- Se muestran dos estrellas desde 90 % y una desde 80 %.
- Las secciones extra no cuentan en `blankCount` ni en los 50 puntos base.

### Datos guardados

Cada cambio llama a `LevelExamService.setAnswer()` y actualiza `nihongo:levelDraft`.

---

## Recorrido del código paso a paso

### 1. Arranque

Sin `draft`, el `constructor` vuelve a `/examen/nivel`. Los computed derivan examen, corrección, tiempo, blancos y nota final.

### 2. Responder

`set()` escribe una casilla. `openPick()` y `choose()` recorren huecos de kana. `tapToken()`, `untap()` y `savePicks()` conservan el orden por índices para no confundir fichas repetidas.

### 3. Entregar

`submit()` exige confirmación si `blanks()` es mayor que cero. Después llama a `levelExamSVC.submit()` y reproduce el sonido de final.

### 4. Corregir y salir

`result()`, `earned()` y `sectionPoints()` alimentan las marcas visuales. La repetición crea otra hoja del mismo preset; `exit()` vuelve al catálogo.

### Estilos

El SCSS contiene la maquetación tipo papel, tablas de kana, diálogos, fichas ordenables y estados correcto/medio/incorrecto.
