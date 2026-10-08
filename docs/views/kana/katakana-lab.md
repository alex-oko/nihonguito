# Laboratorio de katakana (`/kana/lab`)

Página de apoyo para el katakana: un plan de práctica en 6 pasos que enlaza a las pantallas que ya existen, las parejas que más se confunden (con audio), las reglas propias del katakana y un juego para ver tu nombre en katakana. Los datos y `nameToKatakana` están en [kana.utils.ts](../../../src/app/utils/kana.utils.ts) ([su doc](../../utils/kana.utils.md)). Forma parte del [hub de kana](kana.md).

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [katakana-lab.component.ts](../../../src/app/views/kana/views/katakana-lab/katakana-lab.component.ts) | Pasos del plan, nombre escrito y su versión en katakana |
| [katakana-lab.component.html](../../../src/app/views/kana/views/katakana-lab/katakana-lab.component.html) | Introducción, plan, parejas, reglas y «Tu nombre en katakana» |
| [katakana-lab.component.scss](../../../src/app/views/kana/views/katakana-lab/katakana-lab.component.scss) | Estilos por sección |
| [kana.utils.ts](../../../src/app/utils/kana.utils.ts) | `KATAKANA_LOOKALIKES`, `KATAKANA_RULES`, `nameToKatakana` |
| [speech.service.ts](../../../src/app/services/speech.service.ts) | Pronunciar un símbolo de las parejas |

Componentes que usa: `app-icon` y `app-speak` (audio de ejemplos y del nombre). Se llega desde el [hub](kana.md) y desde el botón **Laboratorio** de la [tabla de katakana](kana-chart.md).

### Qué hace el usuario

- **Plan de práctica** (6 tarjetas numeradas), cada una abre una pantalla:

  | Paso | Abre |
  |---|---|
  | Aprende por filas | `/kana/katakana` ([tabla](kana-chart.md)) |
  | Entrena los parecidos | `/kana/katakana/practica/lookalikes` ([práctica](kana-practice.md)) |
  | Lee palabras reales | `/kana/katakana/practica/loanwords` |
  | Traza de memoria | `/kana/katakana/trazar?rows=a,k,s,t,n` ([trazar](kana-trace.md)) |
  | Repasa tus difíciles | `/kana/katakana/practica/weak` |
  | Contrarreloj | `/juego/contrarreloj?kana=katakana` |

- **Parejas que se confunden**: tocar un símbolo lo pronuncia. Debajo, el truco para distinguirlos.
- **Reglas del katakana**: 5 tarjetas con explicación y ejemplos con audio.
- **Tu nombre en katakana**: al escribir, aparece debajo la adaptación en katakana, con audio y el aviso de que es una aproximación. Con el campo vacío (o solo espacios) no sale nada.

### Reglas

- La conversión del nombre es un juego aproximado, no una transcripción oficial: ver [`nameToKatakana`](../../utils/kana.utils.md#nametokatakananame) para las reglas (l → r, v → b, vocal tras cada consonante suelta…).
- El nombre no se guarda.

### Datos guardados

Ninguno.

---

## Recorrido del código paso a paso

Todo está en [katakana-lab.component.ts](../../../src/app/views/kana/views/katakana-lab/katakana-lab.component.ts); los nombres son buscables.

### 1. Arranque

1. La ruta `/kana/lab` carga `KatakanaLabComponent`. Va antes que `/kana/:script` en [app.routes.ts](../../../src/app/app.routes.ts) para que `lab` no se lea como silabario.
2. Campos fijos: **`lookalikes`** = `KATAKANA_LOOKALIKES`, **`rules`** = `KATAKANA_RULES`, **`steps`** = el plan (título, descripción, `link` y `query` opcional).
3. La plantilla pinta cada paso con `[routerLink]="step.link"` y `[queryParams]="step.query ?? {}"`.

### 2. Parejas

Cada símbolo es un botón que llama a **`say(char)`** → `speechSVC.speak(char)`.

### 3. Tu nombre en katakana

1. El `<input>` hace `name.set(valor)` en cada `input`.
2. **`kata`** (`computed`): si `name().trim()` no está vacío, `nameToKatakana(name().trim())`; si no, `''`.
3. Con `kata()` la plantilla pinta el resultado, un `app-speak` grande y el aviso.

### 4. Salida

Nada que limpiar.

### Estilos

[katakana-lab.component.scss](../../../src/app/views/kana/views/katakana-lab/katakana-lab.component.scss), por secciones: introducción (`.intro` con fondo de acento), plan (`.step`, `.n` = número en círculo), parejas (`.lc`, botones de 60 px), reglas (`.body`, `.ex`) y el campo del nombre (`.field`, `.result`, `.big` con `word-break: break-all` para nombres largos).
