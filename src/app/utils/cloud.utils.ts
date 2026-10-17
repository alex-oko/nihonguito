/**
 * Configuración de la copia en la nube (Firebase: inicio de sesión con Google y un documento de Firestore por
 * usuario). Los datos de FIREBASE_CONFIG no son secretos: los ve cualquier navegador que abra la app; lo que
 * protege las copias son las reglas de Firestore (cada usuario solo lee y escribe la suya).
 */

/** Configuración del proyecto de Firebase (Consola → Configuración del proyecto → Tus apps → app web). Vacía = nube apagada */
export const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDI8TBo-Pn2mH95wCIUdH_SiW84ljd8XQk',
    authDomain: 'nihonguito.firebaseapp.com',
    projectId: 'nihonguito',
    storageBucket: 'nihonguito.firebasestorage.app',
    messagingSenderId: '761782696788',
    appId: '1:761782696788:web:dc8046d5a498cf190726c1',
};

/** Colección de Firestore con una copia por usuario (el id del documento es su uid) */
export const CLOUD_COLLECTION = 'backups';

/** Minutos mínimos entre dos subidas automáticas */
export const CLOUD_UPLOAD_MIN_MINUTES = 2;

/** Tamaño máximo de la copia que cabe en un documento de Firestore (el límite es 1 MiB; se deja margen) */
export const CLOUD_MAX_BYTES = 900_000;

/** Indica si la nube está configurada (hay proyecto de Firebase) */
export const isCloudConfigured = (): boolean => !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
