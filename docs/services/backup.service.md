# BackupService

Copias de seguridad del progreso. Como la app no tiene servidor y todo vive en `localStorage`, combina tres capas:

1. **Copias automáticas en el dispositivo** (IndexedDB): al terminar cada práctica y al salir de la app. Protegen de un «Borrar todo» por error o de un fallo, pero no de cambiar de teléfono ni de borrar los datos del sitio.
2. **Copia en archivo** (`.json`): con un toque se comparte (Drive, WhatsApp, correo…) o se descarga. Es la que sobrevive a un teléfono nuevo. El navegador exige un toque del usuario para guardar o compartir un archivo, por eso Inicio lo **recuerda** cada 7 días.
3. **Restaurar**: desde un archivo (Perfil, o la oferta de Inicio en un dispositivo sin progreso) o desde una copia automática (Perfil).

La cuarta capa, la **copia automática en la nube** (Firebase con Google), vive en [CloudSyncService](cloud-sync.service.md): usa `buildFile` y `applyBackup` de este servicio.

Además pide al navegador almacenamiento persistente (`navigator.storage.persist()`), para que no borre los datos por falta de espacio. En una app instalada suele concederse solo.

## Introducción

### Piezas

| Archivo | Qué hace |
|---|---|
| [backup.service.ts](../../src/app/services/backup.service.ts) | Todo lo anterior. |
| [backup.interface.ts](../../src/app/interfaces/backup.interface.ts) | `BackupFile`, `Snapshot`, `BackupMeta`, `RestoreResult`. |
| [storage.utils.ts](../../src/app/utils/storage.utils.ts) | `readAll` (todas las claves `nihongo:*` con su JSON) y `writeAll` (las sustituye). |

Lo crea `AppComponent` al arrancar (lo inyecta), así las copias automáticas funcionan en cualquier pantalla.

### Formato de la copia

```json
{ "app": "nihonguito", "version": 1, "createdAt": "2026-10-17T12:30:00.000Z", "data": { "settings": "{…}", "mastery": "{…}", … } }
```

`data` lleva cada clave sin el prefijo y su texto JSON tal cual. Un archivo sin `app: 'nihonguito'` se rechaza («Ese archivo no es una copia de Nihonguito»).

### Reglas

- **Copia automática**: cuando sube `stats.sessions` (cada `finishSession`), tras `SNAPSHOT_DELAY_MS` (**800 ms**, para que los signals ya hayan escrito en `localStorage`), y al pasar la app a segundo plano (`visibilitychange` → `hidden`). Solo si hay progreso y la última tiene más de `SNAPSHOT_MIN_MINUTES` (**30**). Se guardan las `MAX_SNAPSHOTS` (**7**) más nuevas.
- **Recordatorio** (`needsExport`): con al menos `MIN_XP_TO_REMIND` (**30**) XP, si nunca se guardó en archivo o hace `EXPORT_REMINDER_DAYS` (**7**) días o más, y no está pospuesto. «Más tarde» lo calla `SNOOZE_DAYS` (**2**) días.
- **Oferta de restaurar** (`shouldOfferRestore`): no hay progreso (sin XP, sin sesiones, sin dominio) y el usuario no dijo «Empezar de cero».
- **Antes de restaurar o borrar todo** se hace una copia automática de lo actual, para poder deshacer.
- Restaurar recarga la app: los signals persistidos siguen en memoria y sus effects volverían a escribir lo de antes.

### Datos guardados

- `nihongo:backupMeta` (`BackupMeta`): `lastExport`, `snoozedUntil`, `isRestoreOfferDismissed`.
- IndexedDB `nihonguito-backups`, almacén `snapshots` (clave `id`): las copias automáticas. No es `localStorage`, así que «Borrar todo mi progreso» no las borra.

## Métodos

| Método | Qué hace |
|---|---|
| `exportFile()` | Crea `nihonguito-copia-YYYY-MM-DD.json`. Con `navigator.canShare({ files })` abre «Compartir»; si no, lo descarga. Cancelar «Compartir» devuelve false y no cuenta como copia. Marca `lastExport` = hoy. |
| `restoreFromFile(file)` | Valida y restaura (`applyBackup`); devuelve `{ ok: false, error }` si no sirve. |
| `restoreSnapshot(id)` | Restaura una copia automática. |
| `snapshotNow()` | Guarda una copia automática ya y borra las que sobran. |
| `snoozeReminder()` / `dismissRestoreOffer()` | «Más tarde» y «Empezar de cero». |

Estado público: `meta`, `snapshots` (resumen sin datos, la más nueva primero), `isPersisted`, `hasProgress`, `daysSinceExport`, `needsExport`, `shouldOfferRestore`.
