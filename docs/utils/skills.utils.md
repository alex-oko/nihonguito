# Utils de habilidades (`skills.utils.ts`)

[skills.utils.ts](../../src/app/utils/skills.utils.ts) reúne las **7 habilidades** que entrena una pregunta (significado, al japonés, escucha, escribir, pronunciar, ordenar, partículas): su etiqueta e icono, cómo se deduce la habilidad de una pregunta y el desglose de aciertos de una sesión. Los generadores de preguntas no etiquetan la habilidad: se deduce de la forma de la pregunta, así que añadir un generador no obliga a tocar este archivo (salvo que la deducción falle, ver `skillOf`).

Tipos en [skill.interface.ts](../../src/app/interfaces/skill.interface.ts): `Skill` (el id) y `SkillScore` (`skill`, `correct`, `total`, `pct`).

## Conceptos

- **Habilidad** (`Skill`): qué entrena una pregunta. Las preguntas `note` (tarjetas) no entrenan ninguna.
- **Desglose** (`SkillScore[]`): aciertos y % por habilidad de una sesión. Se guarda por lección en `nihongo:lessonSkills` y alimenta los puntos débiles de [Practicar](../views/practice/practice.md#2-puntos-débiles) y del inicio.

## Constantes

| Constante | Valor | Para qué |
|---|---|---|
| `SKILLS` | `meaning` Significado `eye` · `reverse` Al japonés `swap` · `listen` Escucha `headphones` · `write` Escribir `pencil` · `speak` Pronunciar `mic` · `order` Ordenar `sort` · `particles` Partículas `link` | Etiqueta e icono de [`app-icon`](../components/icon.md) de cada habilidad, en este orden |

---

## Funciones

### Etiquetas e iconos

#### `skillLabel(skill)`

- **Qué hace**: la etiqueta en español; si el id no existe, el propio id.
- **Quién la llama**: la pantalla de resultado y `dashboard.utils` (que la re-exporta).
- **Ejemplo**: `skillLabel('reverse')` → `'Al japonés'`.

#### `skillIcon(skill)`

- **Qué hace**: el nombre del icono; si el id no existe, `'target'`.
- **Quién la llama**: el inicio y `app-exam-readiness`.
- **Ejemplo**: `skillIcon('listen')` → `'headphones'`.

### Desglose por habilidad

#### `skillOf(question)`

- **Qué hace**: deduce la habilidad por la forma de la pregunta.
- **Cómo**:
  - `note` → `null`; `order` → `order`; `speak` → `speak`; `type` → `write`.
  - `choice`: con `audioOnly` → `listen`; si la etiqueta contiene «partícula» → `particles`; si las opciones son japonesas (`choiceStyle` `jp` o `jp-big`) → `reverse`; si no → `meaning`.
- **Ejemplo**: «Completa con la partícula» (`choice`, opciones `jp`) → `particles`; «¿Cómo se lee?» de kana (opciones en romaji) → `meaning`.
- **Ojo**:
  - Depende del **texto** de la etiqueta: si se cambia «Completa con la partícula», esas preguntas pasan a contar como `reverse`.
  - Los huecos de gramática de la sesión guiada («Completa la frase», opciones en japonés) cuentan como `reverse`, igual que «Encuentra «ka»» de kana.

#### `skillBreakdown(records)`

- **Qué hace**: el desglose de una sesión.
- **Cómo**: agrupa las respuestas por `skillOf` (saltando las tarjetas), cuenta aciertos y total, y calcula el % redondeado.
- **Devuelve**: `SkillScore[]` de peor a mejor; a igual %, primero la que tiene más respuestas.
- **Quién la llama**: `app-question-runner` (lo guarda con `saveLessonSkills` si la sesión es de una lección) y `app-result-screen` (lo pinta).
- **Ejemplo**: 3 respuestas de significado (2 bien) y 2 de escucha (2 bien) → `[{ skill: 'meaning', correct: 2, total: 3, pct: 67 }, { skill: 'listen', correct: 2, total: 2, pct: 100 }]`.
