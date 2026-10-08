# Documentación de Nihonguito

Índice de la arquitectura, las pantallas y las piezas reutilizables. Cada documento empieza por el comportamiento visible y después sigue la ejecución del código.

Para mantener el mismo formato, consulta [Cómo escribir un doc](writing-guide.md).

## Núcleo

| Documento | Contenido |
|---|---|
| [Shell de la app](core/app-shell.md) | Arranque, rutas, navegación, temas y precarga. |
| [Estilos y temas](core/styles-and-themes.md) | Parciales SCSS, variables y atributos de tema/escritura. |
| [Almacenamiento local](core/local-storage.md) | Helpers y claves `nihongo:*`. |
| [Datos de lecciones](core/lesson-data.md) | Modelo y recorrido `content/` → `public/data/` → servicios. |

## Vistas

| Documento | Contenido |
|---|---|
| [Inicio](views/home/home.md) | Barrio, siguiente paso y habilidades. |
| [Perfil](views/profile/profile.md) | Ajustes, estadísticas, instalación y datos. |
| [Kana](views/kana/kana.md) | Hub de kana. |
| [Tabla de kana](views/kana/kana-chart.md) | Tabla y filtros. |
| [Práctica de kana](views/kana/kana-practice.md) | Rondas de reconocimiento. |
| [Memorama de kana](views/kana/kana-match.md) | Juego de parejas. |
| [Trazo de kana](views/kana/kana-trace.md) | Copia y autoevaluación. |
| [Laboratorio de katakana](views/kana/katakana-lab.md) | Plan de estudio y nombres. |
| [Números y tiempo](views/time/time.md) | Tablas, marcas de aprendizaje y práctica. |
| [Lecciones](views/lessons/lessons.md) | Lista, estados y exámenes. |
| [Detalle de lección](views/lessons/lesson-detail.md) | Pestañas, navegación y progreso. |
| [Práctica de lección](views/lessons/lesson-practice.md) | Modos y sesión guiada. |
| [Servicio de lecciones](views/lessons/lesson.service.md) | Índice, caché, carga y apéndice. |
| [Utils de contenido](views/lessons/lesson-content-utils.md) | Frases, palabras y prioridad. |
| [Conversaciones](views/conversations/conversations.md) | Lista de diálogos. |
| [Reproductor de conversación](views/conversations/conversation-player.md) | Escucha, roles y pronunciación. |
| [Practicar](views/practice/practice.md) | Hub y sesión guiada. |
| [Repaso](views/practice/review.md) | Cola Leitner y refuerzo. |
| [Verbos](views/verbs/verbs.md) | Reglas, lista y configuración. |
| [Práctica de verbos](views/verbs/verb-practice.md) | Ronda de conjugación. |
| [Anfitrión de juegos](views/game-host/game-host.md) | Selección y ejecución de juegos. |
| [Exámenes](views/exams/exams.md) | Hub de simulacros y nivel. |
| [Creador de examen](views/exams/exam-builder.md) | Lecciones, secciones, cantidad y modo. |
| [Ejecución del examen](views/exams/exam-run.md) | Runner, historial y repetición. |
| [ExamService](views/exams/exam.service.md) | Generación del examen personalizado. |
| [Lista de nivel](views/exams/level-list.md) | Presets y examen personalizado. |
| [Hoja de nivel](views/exams/level-sheet.md) | Respuesta, entrega y corrección. |
| [LevelExamService](views/exams/level-exam.service.md) | Generación, puntuación y persistencia. |
| [Utils de nivel](views/exams/level-utils.md) | Presets, números y español flexible. |
| [Casa de Musubi](views/pet-house/pet-house.md) | Necesidades, comida, tienda, juego y evolución. |
| [PetService](views/pet-house/pet.service.md) | Estado, tiempo, recompensas y catálogo. |

## Componentes

| Documento | Contenido |
|---|---|
| [Iconos](components/icon.md) | API y catálogo de trazos. |
| [Texto japonés](components/jp.md) | Kana, furigana y kanji. |
| [Botón de voz](components/speak-button.md) | Reproducción normal y lenta. |
| [Musubi](components/musubi.md) | Mascota, estados, etapas y ropa. |
| [Entrada kana](components/kana-input.md) | Enlace con `wanakana`. |
| [Selector de lecciones](components/lesson-picker.md) | Selección individual y atajos. |
| [Motor de preguntas](components/question-runner.md) | Corrección, XP, sonidos y resultados. |
| [Pantalla de resultado](components/result-screen.md) | Resumen y acciones finales. |
| [Tarjetas](components/flashcards.md) | Volteo, gesto y dominio. |
| [Memorama](components/match-game.md) | Parejas, rondas y recompensa. |
| [Juego de velocidad](components/speed-game.md) | Tiempo, penalizaciones y puntuación. |
| [Reloj de juego](components/game-timer.md) | Pulso y salida por tiempo. |
| [Casilla de examen](components/exam-slot.md) | Escritura, navegación y corrección. |
| [Preparación para examen](components/exam-readiness.md) | Regla de 50 puntos y prioridades. |

## Servicios

| Documento | Contenido |
|---|---|
| [ProgressService](services/progress.service.md) | Ajustes, XP, racha, Leitner, habilidades y migraciones. |
| [SpeechService](services/speech.service.md) | Audio grabado, voz del dispositivo y reconocimiento. |
| [FuriganaService](services/furigana.service.md) | Diccionario y segmentación de lecturas. |
| [ReadingService](services/reading.service.md) | Normalización y comparación de voz. |
| [SfxService](services/sfx.service.md) | Efectos sonoros sintetizados. |
| [UpdateService](services/update.service.md) | Detección e instalación de versiones PWA. |
| [ReadinessService](services/readiness.service.md) | Carga y preparación de exámenes de nivel. |

## Utils

| Documento | Contenido |
|---|---|
| [Texto](utils/text.utils.md) | Normalización, similitud, barajado y tokens. |
| [Clave de audio](utils/audio-key.utils.md) | Nombre estable de cada MP3. |
| [Kana](utils/kana.utils.md) | Tablas, consultas y nombre en katakana. |
| [Preguntas](utils/questions.utils.md) | Generadores por modalidad. |
| [Sesión guiada](utils/guided-session.utils.md) | Rotación de gramática y armado de pasos. |
| [Habilidades](utils/skills.utils.md) | Clasificación y estadísticas. |
| [Intereses](utils/interests.utils.md) | Etiquetas, filtro y ponderación. |
| [Tablero](utils/dashboard.utils.md) | Tonos, puntos débiles y preparación. |
