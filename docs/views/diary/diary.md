# Mi diario (`/diario`)

Cada día propone un tema sobre la vida del alumno («¿Qué hiciste hoy?», «¿Qué te gusta?»…) con un molde de huecos. Se eligen palabras (o se escribe una propia), la frase se arma por colores como en [Gramática fácil](../grammar/grammar.md) y se guarda. Las frases guardadas se practican en [Practicar mis frases](diary-practice.md). Los temas viven en [diary.utils](../../utils/diary.utils.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [diary.component.ts](../../../src/app/views/diary/diary.component.ts) | Tema actual, palabras elegidas, palabra propia y guardado. |
| [diary.component.html](../../../src/app/views/diary/diary.component.html) | Tema, huecos, frase armada y frases guardadas. |
| [diary.component.scss](../../../src/app/views/diary/diary.component.scss) | Huecos con el color de su papel, opciones y lista. |
| [diary.utils.ts](../../../src/app/utils/diary.utils.ts) | Temas, palabras y armado de la frase ([su doc](../../utils/diary.utils.md)). |
| [diary.service.ts](../../../src/app/services/diary.service.ts) | Frases guardadas ([su doc](../../services/diary.service.md)). |

Se entra desde **Practicar** (tarjeta «Mi diario»).

### Qué hace el usuario

- Ve el tema del día con su molde y un consejo. **Otro tema** pasa al siguiente y vacía los huecos.
- En cada hueco (con su pregunta, la partícula que se pega «＋で» y si es opcional) toca una palabra; tocarla otra vez la quita. Las palabras de sus intereses salen primero.
- **Otra…** abre un campo `app-kana-input` (romaji → hiragana) para usar una palabra propia; se confirma con **Usar** o Enter.
- **Tu frase** se arma al vuelo con `app-sentence-blocks` (colores, audio, romaji) y debajo «Palabra por palabra».
- **Guardar en mi diario** (activo cuando los huecos obligatorios están llenos) la guarda, vacía los huecos y enseña «¡Guardada en tu diario!» durante `SAVED_NOTICE_MS` (**2,5 s**).
- **Mis frases** lista lo guardado (la más nueva primero, con fecha y audio); la papelera borra una. Con `MIN_ENTRIES_TO_PRACTICE` (**2**) o más aparece **Practicar mis frases**.

### Reglas

- El tema del día sale de `promptOfDay()` (cambia cada día y da la vuelta a los 8 temas).
- Una palabra propia tiene como significado su romaji (no se sabe qué significa), así la práctica la enseña así.
- Un hueco vacío opcional simplemente no aparece en la frase.

### Datos guardados

- `nihongo:diary` a través de `DiaryService`.

---

## Recorrido del código paso a paso

1. **Arranque**: `promptIndex = promptOfDay()`, `chosen` vacío.
2. **Valores derivados**: **`slotOptions`** ordena las palabras de cada hueco con `sortByInterest`; **`sentence`** = `buildDiarySentence(slots, chosen)`; **`isComplete`** = `isDiaryComplete(slots, chosen)`.
3. **Huecos**: **`choose(slot, option)`** pone o quita la palabra; **`useCustom()`** lee el campo (`read()` también convierte una «n» final en ん) y la guarda con `isCustom` y `es` = romaji.
4. **`save()`**: `diarySVC.add(prompt.id, sentence)`, vacía `chosen` y enseña el aviso.
