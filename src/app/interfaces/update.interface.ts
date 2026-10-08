/**
 * Estado del botón «Buscar actualización» del perfil.
 * - idle: aún no se ha comprobado nada
 * - checking: preguntando al service worker si hay versión nueva
 * - latest: ya es la última versión
 * - ready: hay una versión nueva descargada, falta activarla
 * - installing: activando la versión nueva (después se recarga)
 * - error: no se pudo comprobar (normalmente sin conexión)
 * - unavailable: no hay service worker (ng serve o navegador sin soporte)
 */
export type UpdateState = 'idle' | 'checking' | 'latest' | 'ready' | 'installing' | 'error' | 'unavailable';
