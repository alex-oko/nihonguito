# Conversaciones (`/conversaciones`)

Lista de todos los diálogos de todas las lecciones, agrupados por lección. Cada uno abre el [reproductor de conversaciones](conversation-player.md), donde se escucha y luego se interpreta a un personaje. Se entra desde Practicar.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [conversations.component.ts](../../../src/app/views/conversations/conversations.component.ts) | Carga todas las lecciones |
| [conversations.component.html](../../../src/app/views/conversations/conversations.component.html) | Barra superior, texto de introducción y una lista por lección |
| [conversations.component.scss](../../../src/app/views/conversations/conversations.component.scss) | Margen de la intro y título de cada fila |
| [lesson.service.ts](../../../src/app/services/lesson.service.ts) | `allLessons()` ([su doc](../lessons/lesson.service.md)) |

| Ruta | Pantalla | Doc |
|---|---|---|
| `/conversaciones` | Esta lista | este doc |
| `/lecciones/:id/conversacion/:cid` | Reproductor | [conversation-player.md](conversation-player.md) |

El reproductor cuelga de `/lecciones/…` porque también se abre desde la [ficha de la lección](../lessons/lesson-detail.md); su código vive en `views/conversations/views/conversation-player/`.

### Qué hace el usuario

- **Volver**: a `/practicar`.
- **Tocar una conversación**: abre `/lecciones/<lección>/conversacion/<id>`.
- Mientras cargan las lecciones: «Cargando…».
- Las lecciones sin conversaciones (la 0, por ejemplo) no salen.

### Reglas

Ninguna propia: el orden es el del índice de lecciones y, dentro de cada una, el del JSON.

### Datos guardados

Ninguno.

---

## Recorrido del código paso a paso

Todo está en [conversations.component.ts](../../../src/app/views/conversations/conversations.component.ts).

### 1. Arranque y carga

1. **`constructor`**: `lessonSVC.allLessons()` y, al llegar, `lessons.set(…)`. Hacen falta las lecciones completas porque el índice (`LessonMeta`) solo trae cuántas conversaciones hay, no sus títulos.
2. **Plantilla**: `@for` sobre `lessons()`; por cada lección con conversaciones, un título «Lección N · título» y una fila por conversación con `title` y, si la hay, `situation`.

La primera visita descarga las 26 lecciones; después quedan en la caché de `LessonService` para el resto de la sesión.

### 2. Salida

Nada que limpiar.

### Estilos

[conversations.component.scss](../../../src/app/views/conversations/conversations.component.scss): margen bajo la intro, `.grow` para que el texto ocupe el ancho y `.t` en negrita. La lista usa las clases globales `.card.list` y `.list-item`.
