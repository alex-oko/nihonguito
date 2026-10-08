# Verbos (`/verbos`)

Centro de consulta y práctica de conjugaciones. Reúne reglas, una lista filtrable y el formulario que abre una ronda de ejercicios.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [verbs.component.ts](../../../src/app/views/verbs/verbs.component.ts) | Carga el apéndice, filtra verbos y arma la navegación. |
| [verbs.component.html](../../../src/app/views/verbs/verbs.component.html) | Pinta las pestañas Reglas, Lista y Practicar. |
| [verbs.component.scss](../../../src/app/views/verbs/verbs.component.scss) | Estilos de reglas, formas y lista. |
| [questions.utils.ts](../../../src/app/utils/questions.utils.ts) | Define etiquetas y genera preguntas de conjugación. |

### Qué hace el usuario

- Consulta cómo se forman `て`, `た`, `ない` y diccionario en los tres grupos.
- Filtra la lista por grupo y reproduce cada verbo con `app-speak`.
- Elige una o varias formas, limita por grupo y pulsa **Empezar**.

### Reglas

- Grupo `0` significa todos los grupos.
- La práctica arranca con la forma `te` seleccionada.
- El botón Empezar queda desactivado si no hay formas elegidas.

### Datos guardados

No guarda preferencias. Los verbos vienen del apéndice cargado por `LessonService`.

---

## Recorrido del código paso a paso

### 1. Arranque

El `constructor` pide `lessonSVC.appendix()` y guarda `appendix.verbs` en el signal `verbs`.

### 2. Reglas

La pestaña `rules` muestra los tres grupos y `teRules`, incluida la excepción `いきます → いって`.

### 3. Lista

`filtered` aplica `group`; con `0` devuelve la lista completa. Cada fila muestra forma ます, traducción y las cuatro conjugaciones.

### 4. Configurar la práctica

`toggleForm(form)` añade o quita una forma. `practice()` navega a `/verbos/practica` con `forms` y `group` en la query.

### Estilos

El SCSS separa las reglas, los chips y la lista, manteniendo el vocabulario visual global de tarjetas.
