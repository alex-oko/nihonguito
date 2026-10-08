# Preparación para examen (`app-exam-readiness`)

Resumen reutilizable que convierte una estimación `Readiness` en una regla de 0 a 50, un veredicto y una lista de prioridades.

## Introducción

### API

| Nombre | Tipo | Uso |
|---|---|---|
| `readiness` | `Readiness` | Estimación y comprobaciones del examen. |
| `eyebrow` | `string` | Texto pequeño de cabecera. |
| `showStart` | `boolean` | Decide si aparece el botón final. |
| `start` | output de `LevelPreset` | Solicita iniciar el examen. |

### Reglas

- La escala usa 50 puntos: `PASS_POINTS = 35` y `READY_POINTS = 40`.
- `todo` muestra como máximo cuatro comprobaciones; prioriza las que más puntos pueden aportar y deja las verdes al final.
- `sentence` distingue sin datos, suspenso, aprobado justo y preparación con margen.

---

## Recorrido del código paso a paso

### 1. Pintar la estimación

`pct` transforma los puntos en porcentaje de la regla. La plantilla sitúa el marcador del usuario y las marcas de 35 y 40.

### 2. Explicar el resultado

`sentence` compara la nota con los dos umbrales. El badge usa `verdict`: `ready`, `close`, `notyet` o `nodata`.

### 3. Recomendar acciones

`todo` ordena `checks`. `icon()` y `link()` llevan a kana, vocabulario, práctica o prueba de lección según `kind`.

### 4. Empezar

Si `showStart` es verdadero, el botón emite `current.preset` por `start`.

### Estilos

El SCSS dibuja la regla, los veredictos, las zonas de color y la lista de mejoras.
