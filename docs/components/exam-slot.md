# Casilla de examen (`app-exam-slot`)

Campo reutilizable de la hoja de nivel. En modo respuesta enlaza opcionalmente `wanakana`; en modo corrección muestra lo escrito, la solución y la nota.

## Introducción

### API

| Nombre | Tipo | Uso |
|---|---|---|
| `slot` | `Slot` | Configuración, entrada y respuesta esperada. |
| `value` | `string` | Valor guardado por la hoja. |
| `script` | `'hira' \| 'kata'` | Escritura para casillas `mixed`. |
| `result` | `SlotResult \| null` | Activa la vista corregida. |
| `valueChange` | output | Notifica cada cambio al padre. |

### Reglas

- `hira`, `kata` y `mixed` enlazan `wanakana`; `es`, `pick` y `order` no.
- `flush()` convierte la `n` final al perder foco.
- Enter busca el siguiente `.blank` de la hoja.

---

## Recorrido del código paso a paso

### 1. Enlace del campo

El `effect` observa el elemento y el modo. `rebind()` desmonta el enlace anterior antes de aplicar uno nuevo, evitando duplicar listeners.

### 2. Escritura

`sync()` emite el valor real del input. `flush()` fuerza la conversión pendiente y vuelve a emitir.

### 3. Corrección

Con `result`, la plantilla reemplaza el input por la respuesta dada, `✓` o la solución esperada y una nota opcional.

### 4. Salida

`ngOnDestroy()` llama al desmontaje de `wanakana`.

### Estilos

El SCSS define tamaños de hueco y colores para nota completa, media y cero.
