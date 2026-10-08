# `ReadinessService`

Puente entre el progreso guardado, los cálculos puros de preparación y la creación de una hoja de nivel.

## Introducción

### Estado

| Signal | Contenido |
|---|---|
| `loaded` | Mapa privado de lecciones ya cargadas. |
| `busy` | Indica que se está generando una hoja. |
| `kanaShare` | Proporción de kana básicos en caja `KNOWN_BOX = 2` o superior. |

### Reglas

- `ensure()` ignora la lección 0 y no vuelve a pedir ids ya cargados.
- `for()` devuelve `null` hasta que estén todas las lecciones del preset.
- Una hoja sin entregar se retoma si coincide; si no coincide, se envía al catálogo para decidir.

---

## Recorrido paso a paso

### 1. Cargar lecciones

`ensure(ids)` elimina duplicados, pide solo las ausentes con `LessonService.getMany()` y actualiza una copia del mapa.

### 2. Calcular preparación

`for(preset)` reúne dominio, habilidades, pruebas y mejores exámenes; después llama a `readiness()`.

### 3. Iniciar una hoja

`start(preset)` protege un borrador pendiente, activa `busy`, llama a `LevelExamService.create()` y navega a `/examen/nivel/hoja`.

## Métodos

#### `ensure(ids)`

- **Qué hace**: garantiza que las lecciones necesarias estén en memoria.

#### `for(preset)`

- **Devuelve**: `Readiness` o `null` si aún falta contenido.

#### `start(preset)`

- **Qué hace**: retoma o crea el examen y abre su hoja.
