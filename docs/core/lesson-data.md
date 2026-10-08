# Datos de lecciones

Describe el recorrido de una lección desde los archivos originales de `content/` hasta los servicios y vistas de la aplicación.

## Fuentes

| Pieza | Qué contiene |
|---|---|
| [GUIA.md](../../content/GUIA.md) | Formato editorial, personajes, lugares, intereses y reglas de japonés. |
| `content/lessons/NN.json` | Fuente de verdad de cada lección. |
| `content/appendix.json` | Verbos y tablas complementarias. |
| [lesson.interface.ts](../../src/app/interfaces/lesson.interface.ts) | Contratos TypeScript de todo el dominio. |

## Modelo

`Lesson` reúne `vocab`, `grammar`, `sentences`, `qa`, `conversations` y `extraVocab`. `LessonMeta` es la fila ligera del índice. Los ids de `Word` son estables porque el progreso se guarda como `w:<id>`.

Las frases pueden llevar `interests`; las conversaciones tienen personajes y líneas; `VerbEntry` conserva las formas `masu`, `te`, `nai`, `ta` y `dict`.

## Flujo de generación

1. Se editan los JSON dentro de `content/`, respetando [GUIA.md](../../content/GUIA.md).
2. `npm run data` ejecuta [build-data.mjs](../../tools/build-data.mjs) y [build-furigana.mjs](../../tools/build-furigana.mjs).
3. `build-data.mjs` copia las lecciones a `public/data/lessons/`, copia el apéndice y genera `public/data/index.json` con los metadatos.
4. `build-furigana.mjs` reconstruye el diccionario de lecturas usado por `FuriganaService`.
5. `LessonService.loadIndex()`, `get(id)` y `appendix()` cargan esos archivos por `fetch` y conservan las promesas en caché.

## Reglas de compatibilidad

- No se cambian ids de vocabulario ya publicados: romperían las cajas de Leitner guardadas.
- Un fallo de red no queda fijado en la caché de `LessonService`; la siguiente llamada puede reintentar.
- Después de cambiar textos japoneses se regeneran datos, furigana y, cuando corresponda, audio.

## Consumidores

- Lecciones y práctica usan el contenido completo.
- Conversaciones usan `Conversation` y `ConversationLine`.
- Verbos cargan `Appendix.verbs`.
- Exámenes combinan vocabulario, frases, diálogos y verbos de las lecciones elegidas.
