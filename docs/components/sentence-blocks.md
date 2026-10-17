# Frase por trozos (`app-sentence-blocks`)

Pinta una frase de «Gramática fácil» partida en trozos, cada uno con el color de su papel (tema, lugar, cuándo…) y la partícula resaltada. Debajo, el romaji (si está activado) y la traducción; a la derecha, el altavoz.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [sentence-blocks.component.ts](../../src/app/components/sentence-blocks/sentence-blocks.component.ts) | Inputs, texto completo y romaji. |
| [sentence-blocks.component.html](../../src/app/components/sentence-blocks/sentence-blocks.component.html) | Un `<span data-role>` por trozo y `app-speak`. |
| [sentence-blocks.component.scss](../../src/app/components/sentence-blocks/sentence-blocks.component.scss) | Fondo suave y borde inferior del color del papel. |
| [_roles.scss](../../src/styles/_roles.scss) | Colores globales de cada `data-role`. |

### Uso

```html
<app-sentence-blocks [sentence]="example" />
<app-sentence-blocks [sentence]="template" [showRoles]="true" />
<app-sentence-blocks [sentence]="worked().result" [showRoles]="true" [hideEs]="true" />
```

| Input | Qué hace |
|---|---|
| `sentence` (obligatorio) | `GuideSentence`: trozos `{ word, particle?, role }` y `es`. |
| `showRoles` | Escribe bajo cada trozo el nombre de su papel (`ROLE_INFO[role].label`). |
| `hideEs` | Oculta la traducción, para cuando la frase ya está explicada al lado. |

---

## Recorrido del código paso a paso

1. **`text`**: `sentenceText(sentence)`, los trozos unidos con espacios y 。 al final. Es lo que lee el altavoz.
2. **`romajiText`**: `romaji(text)` solo si `settings.romaji` está activado; si no, vacío y no se pinta.
3. La plantilla pone `data-role` en cada trozo; el color (`--role`) y su fondo (`--role-soft`, 14 % del color sobre `--surface`) salen de `_roles.scss`, así siguen al tema activo.
