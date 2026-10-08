# Nihonguito · Aprende japonés

Aplicación web instalable (PWA) hecha con Angular 20 para estudiar japonés desde el teléfono o el computador. El contenido son 25 lecciones originales sobre la vida diaria (en `content/`, con su guía de estilo en `content/GUIA.md`) e incluye Kana, vocabulario, gramática, conversación, tiempo, verbos, juegos y exámenes.

La aplicación funciona como invitado, guarda el progreso en el dispositivo y puede utilizar gran parte del contenido sin conexión después de instalarse.

## Estado actual

- Aplicación funcional y responsive.
- PWA con manifiesto, iconos y service worker de Angular.
- Progreso local mediante `localStorage`.
- 3896 grabaciones japonesas incluidas para uso sin conexión.
- Cuatro temas de color: Base, Sol, Violeta y Carmesí.
- Inicio de sesión con Google y sincronización en la nube: **planeados, todavía no implementados**.

## Funcionalidades de aprendizaje

### Kana

- Tablas de hiragana y katakana: básicos, dakuten/handakuten, combinaciones y sonidos extranjeros.
- Reproducción de pronunciación al tocar cada carácter.
- Selección de filas para crear prácticas personalizadas.
- Ejercicios de lectura, significado, escucha, escritura, parejas, trazo y contrarreloj.
- Laboratorio de katakana con caracteres fáciles de confundir, reglas de `ー`, `ッ`, vocales pequeñas y palabras reales.

### Lecciones

- 26 bloques de contenido, desde la lección 0 hasta la 25.
- Vocabulario, gramática, frases modelo, preguntas, respuestas y notas culturales.
- Prácticas de tarjetas, traducción, escucha, escritura en Kana, pronunciación, partículas, ordenar frases y prueba final.
- Entrada en romaji con conversión automática a japonés.
- Opciones de visualización: solo Kana, Kanji con furigana o Kanji.

### Números y tiempo

Módulo dedicado, similar a Kana, para aprender y practicar:

- Números y cantidades.
- Días de la semana.
- Meses y días del mes.
- Cómo expresar fechas.
- Horas y expresiones temporales.
- Periodos y duraciones.

### Conversaciones y pronunciación

- Conversaciones reproducidas con dos voces.
- Posibilidad de responder hablando mediante reconocimiento de voz o escribiendo.
- Comparación de la respuesta con la frase esperada.
- Velocidad de voz configurable.
- Grabaciones generadas con voces de VOICEVOX (`No.7 アナウンス` y `青山龍星`) y respaldo mediante la voz japonesa disponible en el dispositivo.
- Lecturas verificadas: `node tools/check-readings.mjs` (furigana) y `node tools/build-audio.mjs --check-readings` (pronunciación de VOICEVOX, con el motor abierto).

### Verbos

- Explicación de los tres grupos verbales.
- Diccionario de 157 verbos.
- Práctica de las formas `て`, `ない`, `た` y diccionario.

### Repaso y progreso

- Repaso espaciado para priorizar palabras difíciles.
- XP, nivel, racha diaria y meta de estudio.
- Dominio independiente de hiragana y katakana.
- Estadísticas de aciertos, palabras aprendidas y actividad semanal.
- Historial de exámenes.

## Juegos y evaluaciones

### Juegos

- Memorama y asociación de elementos.
- Tarjetas y preguntas rápidas.
- Carreras contrarreloj con temporizador.
- Penalización temporal por respuestas incorrectas y registro de récords.

### Examen configurable

Permite elegir:

- Lecciones incluidas.
- Vocabulario, escucha, escritura, frases, partículas y otras secciones.
- Cantidad de preguntas.
- Modo de examen real, sin correcciones hasta el final.

### Examen de nivel

- Exámenes parciales y finales organizados por nivel.
- Hoja de estilo académico de 50 puntos.
- Preguntas diferentes en cada intento.
- Evaluación recomendada según el avance del estudiante.
- Corrección final y mejores resultados guardados.
- Generador de examen personalizado por lecciones.
- Interfaz propia de centro de evaluación, responsive y adaptada a todos los temas.

## Temas visuales

La plantilla se selecciona desde **Perfil → Plantilla visual**.

### Base

Usa la paleta original:

- `#F9F5EB`
- `#EA5455`
- `#F07B3F`
- `#2D4059`
- `#002B5B`

### Sol, Violeta y Carmesí

Paletas alternativas (amarillo y azul, morado y verde, rojo y naranja) que solo cambian los colores de la interfaz.

## Instalación en el teléfono

La aplicación ya está preparada como PWA. Para que el navegador permita instalarla y usar correctamente el service worker, debe publicarse mediante **HTTPS**. `localhost` es la excepción permitida para desarrollo.

1. Genera la versión de producción:

   ```bash
   npm run build
   ```

2. Publica `dist/nihongo-app/browser` en un alojamiento HTTPS, por ejemplo Firebase Hosting, Netlify, Vercel o GitHub Pages.

3. Abre la URL desde el teléfono:

   - **Android — Chrome:** usa el botón de instalación de Perfil o selecciona menú ⋮ → **Instalar aplicación**.
   - **iPhone — Safari:** Compartir → **Añadir a pantalla de inicio**.

El botón interno solo se muestra cuando el navegador emite `beforeinstallprompt`. En iOS se muestran instrucciones porque ese evento no está disponible.

## Persistencia y futura cuenta de Google

Actualmente todo el progreso se guarda con el prefijo `nihongo:` en `localStorage`. La aplicación no requiere cuenta y los datos permanecen en ese navegador.

La evolución recomendada es mantener el modo invitado y añadir una cuenta opcional para:

- Respaldar el progreso.
- Sincronizar teléfono y computador.
- Recuperar XP, racha, dominio, resultados y ajustes al cambiar de dispositivo.
- Combinar el progreso local con la nube durante el primer inicio de sesión.

Una implementación sencilla puede utilizar Firebase Authentication con Google y un documento de Firestore por usuario. No deben solicitarse permisos de Drive, contactos u otros servicios: nombre, correo y foto son suficientes.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

La aplicación estará disponible en <http://localhost:4200>.

Otros comandos:

```bash
npm run build       # compilación de producción
npm run preview     # sirve dist/nihongo-app/browser en el puerto 8080
npm run data        # reconstruye las lecciones y el diccionario de furigana
npm run furigana    # reconstruye únicamente el diccionario de furigana
npm run icons       # regenera los iconos de la PWA
npm run audio       # reconstruye las grabaciones japonesas
npm test            # pruebas de Angular
```

Para una compilación rápida sin optimización:

```bash
npx ng build --configuration development
```

## Estructura principal

La estructura sigue la de scarab2-frontend: componentes reutilizables, vistas por pantalla, servicios, interfaces y utils. Las reglas de código (sangría, orden de una clase, comentarios en español, nombres) están en [CLAUDE.md](CLAUDE.md) y la documentación de cada pieza en [docs/](docs/README.md).

```text
src/
  main.ts                  arranque (AppComponent + app.config)
  styles.scss              entrada de estilos globales (solo @use de src/styles/)
  styles/                  parciales: temas, base, maquetación, botones, formularios, animaciones…
  app/
    app.component.*        shell: <router-outlet> + barra de pestañas, tema y theme-color
    app.config.ts          providers: router, zoneless, service worker y carga de furigana
    app.routes.ts          rutas con loadComponent (lazy) y data.immersive
    components/            piezas reutilizables (icon, jp, musubi, question-runner, juegos…)
    views/                 una carpeta por pantalla con ruta propia
      home/                inicio: barrio de Musubi, siguiente paso, habilidades
      kana/                tablas y views/ (chart, práctica, memorama, trazo, laboratorio)
      time/                números, fechas y expresiones de tiempo
      lessons/             lista y views/ (detalle y prácticas por lección)
      practice/            hub de práctica y views/review (repaso)
      conversations/       lista y views/conversation-player
      verbs/               teoría y views/verb-practice
      game-host/           anfitrión de juegos
      exams/               hub y views/ (exam-builder, exam-run, level-list, level-sheet)
      pet-house/           casa de Musubi
      profile/             temas, intereses, audio, instalación, versión y datos
    services/              estado y datos (progreso, lecciones, voz, mascota, actualizaciones…)
    interfaces/            tipos por dominio (*.interface.ts)
    utils/                 funciones puras y constantes (*.utils.ts); version.utils.ts es generado

docs/                      un .md por vista, componente, servicio y util (índice en docs/README.md)
CLAUDE.md                  guía del proyecto y estilo de código

public/
  audio/                   pronunciaciones japonesas y manifiesto
  data/                    lecciones y diccionarios generados
  icons/                   iconos PWA
  manifest.webmanifest     metadatos de instalación

content/
  lessons/NN.json          lecciones originales (fuente de verdad)
  appendix.json            tablas de referencia y verbos
  GUIA.md                  guía de estilo, personajes e intereses

tools/
  build-data.mjs           copia content/ a public/data
  validate-content.mjs     revisa las lecciones contra GUIA.md
  build-audio.mjs          generación de pronunciaciones
  build-furigana.mjs       lecturas de los kanji (data/furigana.json)
  check-readings.mjs       compara cada frase de furigana.json con sus palabras
  make-icons.mjs           generación de iconos
  write-version.mjs        escribe src/app/utils/version.utils.ts antes de cada build
  serve-dist.mjs           servidor local para el build
```

## Funcionamiento offline

`ngsw-config.json` define los grupos de caché:

- Aplicación y archivos principales: precarga.
- Datos de lecciones y manifiesto de voz: precarga.
- Pronunciaciones MP3: carga bajo demanda.
- Imágenes, iconos y fuentes: caché de recursos.

El service worker se habilita en la compilación de producción. Para probarlo correctamente, utiliza el build de producción servido mediante HTTPS o `localhost`, preferiblemente en una ventana privada para evitar versiones antiguas en caché.
