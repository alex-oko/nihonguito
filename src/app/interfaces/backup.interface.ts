// Tipos de las copias de seguridad del progreso (archivo .json y copias automáticas en el dispositivo)

/** Contenido de una copia: todas las claves nihongo:* con su JSON tal cual */
export interface BackupFile {
    /** Siempre 'nihonguito': sirve para rechazar archivos que no son una copia de la app */
    app: string;
    version: number;
    /** Fecha y hora de la copia (ISO) */
    createdAt: string;
    data: Record<string, string>;
}

/** Copia automática guardada en IndexedDB */
export interface Snapshot extends BackupFile {
    id: string;
    /** XP total en el momento de la copia, para reconocerla en la lista */
    xp: number;
}

/** Lo que se guarda en nihongo:backupMeta */
export interface BackupMeta {
    /** Último día en que se guardó una copia en archivo (YYYY-MM-DD) */
    lastExport: string | null;
    /** Hasta qué día no se vuelve a recordar guardar la copia («Más tarde») */
    snoozedUntil: string | null;
    /** El usuario dijo «Empezar de cero» en la oferta de restaurar */
    isRestoreOfferDismissed: boolean;
}

/** Resultado de leer un archivo de copia */
export type RestoreResult = { ok: true } | { ok: false; error: string };
