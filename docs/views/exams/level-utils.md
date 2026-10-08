# Utils del examen de nivel (`level.utils.ts`)

Reúne presets, nombres, lecturas de números, preguntas extra y comparación flexible de respuestas españolas.

## Constantes

| Constante | Para qué |
|---|---|
| `LEVEL_PRESETS` | Parcial y final por nivel: N1 usa L1 y L2–3; después avanza de dos en dos hasta L25. |
| `KIND_JP` / `KIND_ES` | Nombres del parcial y final. |
| `BONUS_QUESTIONS` | Preguntas libres habilitadas desde una lección concreta. |
| `QUESTION_WORDS` | Interrogativos, de los más largos a los más cortos. |

---

## Funciones

#### `lessonsLabel(lessons, kana = false)`

- **Devuelve**: un subtítulo como `ひらがな・カタカナ・Lección 1`.

#### `numberToKana(value)`

- **Qué hace**: lee números hasta 99 999 999 y respeta cambios como `さんびゃく`, `ろっぴゃく`, `さんぜん` y `はっせん`.

#### `numberAlternatives(value)`

- **Qué hace**: añade `し`, `しち` o `く` como alternativa para 4, 7 y 9 por debajo de 20.

#### `examNumbers(count)`

- **Qué hace**: genera números distintos mezclando unidades, decenas, centenas, millares, años y cifras grandes.

#### `gradeSpanish(input, gloss)`

- **Cómo**: normaliza, quita artículos y separa traducciones. Da `1` por igualdad, inclusión o similitud de al menos 80 %; da `0.5` desde 65 %; en los demás casos da `0`.

## Presets

`LEVEL_PRESETS` contiene 13 exámenes fijos: desde `n1-chukan` hasta `n7-kimatsu`. Solo `n1-chukan` incluye las tablas de kana.
