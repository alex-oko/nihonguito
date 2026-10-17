# CloudSyncService

Copia automática en la nube con **Firebase**: el usuario entra con Google una vez y desde entonces el progreso se sube solo; en un dispositivo nuevo, al entrar se recupera solo. Complementa a [BackupService](backup.service.md) (copias en el dispositivo y en archivo).

¿Por qué Firebase y no Google Drive? Sin servidor, Google solo da a la app permisos de Drive de 1 hora, y renovarlos abre una ventana que el navegador bloquea si no la abre un toque del usuario. Firebase Authentication guarda la sesión en el dispositivo y la renueva sola durante meses.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [cloud-sync.service.ts](../../src/app/services/cloud-sync.service.ts) | Conexión, primera sincronización, subidas automáticas y recuperar. |
| [cloud.utils.ts](../../src/app/utils/cloud.utils.ts) | `FIREBASE_CONFIG` (vacía = nube apagada), colección y límites. |
| [backup.interface.ts](../../src/app/interfaces/backup.interface.ts) | `CloudUser`, `CloudBackup`, `CloudMeta`, `CloudStatus`. |

Lo crea `AppComponent` al arrancar. Firebase (`firebase/app`, `firebase/auth` y `firebase/firestore/lite`) se carga **en diferido** (`import()`) solo cuando hace falta: quien no usa la nube no lo descarga.

### Configurar Firebase (una vez)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto** (plan Spark, gratis y sin tarjeta).
2. **Authentication** → Comenzar → Método de acceso → **Google** → Habilitar.
3. **Authentication → Configuración → Dominios autorizados**: `localhost` ya está; añadir el dominio donde se publica la app.
4. **Firestore Database** → Crear base de datos → modo de producción → **Reglas**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /backups/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

5. **Configuración del proyecto → Tus apps → Web** (`</>`): registrar la app y copiar `firebaseConfig` en `FIREBASE_CONFIG`. Estos datos no son secretos; lo que protege cada copia son las reglas del paso 4.

### Datos

- Firestore: colección `backups`, un documento por usuario (id = `uid`): `{ file, updatedAt, xp }`. `file` es el [BackupFile](backup.service.md#formato-de-la-copia) entero como texto (un documento admite hasta 1 MiB; por encima de `CLOUD_MAX_BYTES`, **900 000**, no sube y avisa).
- `nihongo:cloudMeta` (`CloudMeta`): `isLinked` (este dispositivo inició sesión: al abrir se reconecta solo) y `lastSync`.

### Reglas

- **Al abrir la app** con `isLinked`: recupera la sesión (`reconnect`). Si el dispositivo está sin progreso (datos borrados), recupera la copia de la nube sola.
- **Subida automática**: al terminar cada práctica (`stats.sessions` sube; tras `UPLOAD_DELAY_MS`, **1,5 s**) y al pasar la app a segundo plano. Como mucho una cada `CLOUD_UPLOAD_MIN_MINUTES` (**2**) y solo si el contenido cambió (se compara sin `createdAt`).
- **Primera sincronización** al entrar (`firstSync`): sin copia en la nube → sube la local; sin progreso local → recupera la de la nube (dispositivo nuevo); con las dos → `confirm` para elegir cuál se queda.
- **Recuperar** guarda antes una copia automática de lo actual (`backupSVC.applyBackup`) y recarga.
- Entrar usa una ventana de Google (`signInWithPopup`); si el navegador la bloquea o no la soporta (algunas apps instaladas en iPhone), usa la redirección (`signInWithRedirect`) y `reconnect` termina al volver.
- Con la nube conectada, Inicio no recuerda guardar la copia en archivo.

## Métodos

| Método | Qué hace |
|---|---|
| `signIn()` | Entra con Google (desde un toque) y hace la primera sincronización. Cerrar la ventana no es un error. |
| `signOut()` | Cierra la sesión en este dispositivo (la copia de la nube se queda). |
| `uploadNow()` | Sube ya (si cambió). |
| `restoreFromCloud(ask)` | Recupera la copia de la nube (con `confirm` si `ask` y hay progreso). |

Estado público: `meta`, `user`, `status` (`off`, `connecting`, `syncing`, `ok`, `error`), `error` (mensaje entendible: reglas, dominio no autorizado, sin conexión) e `isConfigured`.
