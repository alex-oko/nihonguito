# Utils del tablero (`dashboard.utils.ts`)

Cálculos puros compartidos por Inicio, Lecciones y Exámenes: tonos, precisión por habilidad y preparación para un examen de nivel.

## Conceptos

- **Caja conocida**: una palabra cuenta como sabida desde `KNOWN_BOX = 2`.
- **Aprobado**: `PASS_POINTS = 35` sobre 50.
- **Listo**: `READY_POINTS = 40` y ninguna comprobación roja.
- **Intento real**: pesa `0.6`; la estimación de práctica aporta el `0.4` restante.

## Constantes

| Constante | Valor | Para qué |
|---|---:|---|
| `KNOWN_BOX` | 2 | Umbral de vocabulario conocido. |
| `PASS_POINTS` | 35 | Nota mínima de aprobación. |
| `READY_POINTS` | 40 | Nota con margen. |
| `LESSON_TEST_WEIGHT` | 1.5 | Peso de la prueba final; vocabulario, ejercicios y kana pesan 1. |

---

## Funciones

#### `tone(pct, okFrom = 80, midFrom = 60)`

- **Qué hace**: devuelve `ok`, `mid`, `bad` o `none`.

#### `skillRows(stats)`

- **Qué hace**: suma aciertos y respuestas por habilidad entre lecciones.
- **Devuelve**: filas ordenadas de mejor a peor; las no practicadas quedan al final.

#### `weakestSkill(stats, minAnswers = 4)`

- **Qué hace**: devuelve la habilidad más floja cuando tiene al menos cuatro respuestas.

#### `knownWords(lesson, mastery)`

- **Qué hace**: cuenta vocabulario en caja 2 o superior.

#### `readiness(preset, input)`

- **Cómo**:
  1. Añade kana si el preset lo exige.
  2. Por lección añade vocabulario, precisión de ejercicios y prueba final.
  3. Calcula la media ponderada; un intento real mezcla 60 % intento y 40 % estimación.
  4. Convierte el porcentaje a puntos sobre 50 y calcula la ganancia posible de cada mejora.
  5. Produce veredicto y un consejo con las dos comprobaciones más bajas.
- **Devuelve**: `Readiness` con hasta cinco comprobaciones visibles.

#### `upcomingExams(lastLesson)`

- **Qué hace**: devuelve el preset que cubre la lección actual y el siguiente, si existe.
