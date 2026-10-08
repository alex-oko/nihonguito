# Botón de altavoz (`app-speak`)

Botón redondo con el icono `volume` que pronuncia un texto japonés con `SpeechService`: el audio pregrabado de la app si existe para ese texto, y si no la voz japonesa del sistema. Se usa al lado de palabras, frases y kana en toda la app.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [speak-button.component.ts](../../src/app/components/speak-button/speak-button.component.ts) | Inputs y `say()` |
| [speak-button.component.html](../../src/app/components/speak-button/speak-button.component.html) | El `<button>` con `app-icon`, solo si `speechSVC.canSpeak` |
| [speak-button.component.scss](../../src/app/components/speak-button/speak-button.component.scss) | Círculo de 36 px (56 px con `big`) y efecto al pulsar |
| [speech.service.ts](../../src/app/services/speech.service.ts) | `canSpeak` y `speak(text, opts)` |

El selector es `app-speak` (no `app-speak-button`), aunque el archivo se llame `speak-button`.

### Uso

```html
<app-speak [text]="word.reading" />
<app-speak [text]="sentence.jp" [big]="true" />
<app-speak [text]="entry.reading" [slow]="true" />
```

| Input | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `text` | `string` (obligatorio) | | Lo que se pronuncia. También va en el `aria-label` («Escuchar …») |
| `big` | `boolean` | `false` | Botón de 56 px con icono de 26 px (si no, 36 px con icono de 18) |
| `slow` | `boolean` | `false` | Pronuncia a `rate` **0.6** (`SLOW_RATE`). Sin `slow`, la velocidad es la de los ajustes (`settings().rate`). En el audio grabado el servicio la convierte en `playbackRate` (`rate / BASE_RATE`, entre 0.5 y 1.5) |

### Reglas

- **Sin forma de hablar** (`canSpeak` en `false`: ni `speechSynthesis` ni `Audio`, p. ej. fuera del navegador): el botón no se pinta.
- **El clic no se propaga** (`stopPropagation`): el altavoz suele ir dentro de una tarjeta u opción clicable, y tocarlo no debe elegir esa opción ni voltear la tarjeta.

---

## Recorrido del código paso a paso

En [speak-button.component.ts](../../src/app/components/speak-button/speak-button.component.ts):

1. **Plantilla**: `@if (speechSVC.canSpeak)` → `<button type="button" class="speak">` con `[class.big]` y `<app-icon name="volume">`.
2. **`say(event)`** (clic): corta la propagación y llama a `speechSVC.speak(text(), slow() ? { rate: 0.6 } : {})` sin esperar la promesa. La voz (A o B) y el resto de opciones las decide el servicio.

No guarda estado ni limpia nada al salir: cortar el audio en curso es cosa de quien lo necesite (`speechSVC.stopSpeaking()`, p. ej. el runner al cerrar).

### Estilos

[speak-button.component.scss](../../src/app/components/speak-button/speak-button.component.scss):

- `.speak`: círculo de 36 px con borde `--line`, fondo `--surface`, `flex: none` para que no se encoja en una fila.
- `.speak:active`: se encoge a 0.9 y toma el color de acento.
- `.big`: 56 × 56 px.
