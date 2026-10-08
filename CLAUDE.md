# Nihonguito: guía del proyecto

PWA en Angular 20 (standalone, zoneless, signals) para estudiar japonés. Todo el progreso vive en `localStorage` con el prefijo `nihongo:`. La documentación de cada pieza está en [docs/](docs/README.md).

## Estructura

```text
src/
  main.ts                    arranque (AppComponent + app.config)
  styles.scss                entrada de estilos globales (solo @use de src/styles/)
  styles/                    parciales globales: temas, base, botones, utilidades…
  app/
    app.component.*          shell: <router-outlet> + barra de pestañas
    app.config.ts            providers (router, service worker, furigana)
    app.routes.ts            rutas con loadComponent (lazy)
    components/<nombre>/     piezas reutilizables (<nombre>.component.ts/.html/.scss)
    views/<vista>/           una carpeta por pantalla con ruta propia
      views/<sub-vista>/     pantallas hijas de esa vista (como scarab2: views/rotation/views/product)
    services/                <nombre>.service.ts (estado y datos, providedIn: 'root')
    interfaces/              <dominio>.interface.ts (solo tipos)
    utils/                   <tema>.utils.ts (funciones puras y constantes)
docs/                        un .md por vista, componente, servicio y util
content/                     lecciones originales (fuente de verdad, ver content/GUIA.md)
tools/                       scripts de datos, audio, iconos y versión
```

- Un componente = una carpeta con **tres archivos**: `.ts`, `.html` y `.scss`. Si no tiene estilos propios, el `.scss` lleva un comentario de una línea que lo dice.
- Clases con sufijo: `HomeComponent`, `ProgressService`. Selectores `app-…`.
- Tipos en `interfaces/`, nunca dentro de componentes o servicios.

## Estilo de código

El modelo es `navbar.component.ts` y `panorama.component.ts` de scarab2-frontend.

### Formato

- Sangría de **4 espacios** en `.ts`, `.html` y `.scss`. Comillas simples en TypeScript.
- Decorador en este orden: `selector`, `imports`, `templateUrl`, `styleUrl`, `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`.

### Orden dentro de una clase

```ts
export class PanoramaComponent implements AfterViewInit, OnDestroy {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);
    private router = inject(Router);

    // --- Inputs y outputs ---
    lessonId = input.required<number>();
    finished = output<void>();

    // --- Estados UI con Signals ---
    showModal = signal<boolean>(false);
    loadingProgress = signal<number>(0);

    // --- Valores derivados (computed) ---
    totalSelected = computed(() => …);

    // Campos normales agrupados con un comentario corto de para qué sirven
    private currentLoadId = 0;

    constructor() { … }

    ngOnInit() { … }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga las lecciones y prepara la lista */
    async loadLessons(): Promise<void> { … }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //
}
```

- Servicios propios inyectados con sufijo **`SVC`**: `progressSVC`, `lessonSVC`, `speechSVC`. Los de Angular con su nombre natural: `router`, `route`, `location`, `destroyRef`.
- Los métodos se agrupan por tema entre dos **banners iguales** (`// ----- Tema ----- //`), uno al abrir y otro al cerrar el bloque.

### Comentarios (en español)

- Cada método lleva arriba un JSDoc de una línea en tercera persona: `/** Dibuja la capa de fincas en el mapa */`, `/** Devuelve … */`.
- Las constantes de módulo van en `UPPER_SNAKE_CASE`, cada una con su `/** … */` que dice para qué es.
- Dentro de un método largo, pasos numerados: `// 1. Mostrar preloader`, `// 2. Obtener los datos…`.
- Se comenta **el porqué** de lo que no es obvio (un `untracked`, un `setTimeout(0)`, un umbral). Lo obvio no se comenta.
- En HTML, una línea `<!-- Sección -->` antes de cada bloque grande.

### Nombres

- Código en inglés, `camelCase`, palabras completas: `lesson`, `word`, `answer`, `index`. Nada de `l`, `w`, `x`, `m` (salvo `i`/`j` en un `for` clásico).
- Booleanos con `is`/`has`/`show`/`can`: `isLoading`, `showProgressModal`.
- Los nombres públicos de servicios y utils son una API: no se renombran sin actualizar a todos los que los usan.

## Reglas que no se rompen

- Las claves de `localStorage` (`nihongo:*`) y los `id` de vocabulario guardan el progreso del usuario: no se cambian.
- `src/app/utils/version.utils.ts` lo genera `tools/write-version.mjs` antes de cada build.
- Después de tocar textos de lecciones: ver los comandos de lecturas y audio en el README.

## Verificar

```bash
npx ngc -p tsconfig.app.json --noEmit
npx ng build --configuration development
```

El primero revisa TypeScript y plantillas sin escribir nada (sirve con varias personas editando a la vez).
