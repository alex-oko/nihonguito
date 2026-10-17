# Trazo de kanji (`/kanji/trazar`)

Copia cada kanji con el dedo sobre una guía tenue, luego de memoria, y compáralo. Es la versión para kanji del [trazo de kana](../kana/kana-trace.md), con el lienzo en el componente [trace-pad](../../components/trace-pad.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [kanji-trace.component.ts](../../../src/app/views/kanji/views/kanji-trace/kanji-trace.component.ts) | Lista de kanji, pasos y puntuación. |
| [kanji-trace.component.html](../../../src/app/views/kanji/views/kanji-trace/kanji-trace.component.html) | Significado, lecturas, paso, lienzo, truco y botones. |
| [kanji-trace.component.scss](../../../src/app/views/kanji/views/kanji-trace/kanji-trace.component.scss) | Cabecera y acciones. |

### Qué hace el usuario

1. **Copia** sobre la guía (dice cuántos trazos tiene) → **Siguiente paso**.
2. **De memoria**, sin guía → **Comprobar**.
3. La guía reaparece resaltada para comparar: **Repetir** (vuelve a copiar) o **¡Bien!** (siguiente).
- **Borrar** limpia el lienzo; **X** vuelve atrás.

### Reglas

- `?chars=日月` traza esos kanji en ese orden; sin `chars`, `?scope=` y `?count=` (por defecto **10**) eligen con `prioritizeKanji`.
- Cada «¡Bien!» suma `XP_PER_KANJI` (**3**). Al terminar cierra la sesión (`finishSession`) y vuelve atrás.
- Es autoevaluación: no toca el dominio de Leitner, igual que el trazo de kana.

---

## Recorrido del código paso a paso

Un `effect` llama a **`build()`** al cambiar la query. **`guide`** traduce el paso a la guía del lienzo (`show`, `hide`, `reveal`). **`toMemory()`** y **`rate(isCorrect)`** borran el lienzo con `pad().clear()` y avanzan.
