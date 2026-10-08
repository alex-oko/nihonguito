/**
 * Lectura y escritura en localStorage. Todo el progreso de la app vive aquí, con las claves
 * bajo el prefijo `nihongo:`. Ningún fallo del almacenamiento (lleno, bloqueado, JSON corrupto)
 * llega a la app: se lee el valor por defecto o no se guarda.
 */
import { effect, signal, WritableSignal } from '@angular/core';

/** Prefijo de todas las claves de la app en localStorage (clearAll borra solo estas) */
const PREFIX = 'nihongo:';

// ------------------------------- Leer ------------------------------------------------------------- //
/** Lee un objeto y lo mezcla sobre `fallback`, así los campos nuevos de una versión posterior toman su valor por defecto */
export function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

/** Lee un valor tal cual (arrays, números, null), sin mezclar con `fallback` */
export function loadRaw<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}
// ------------------------------- Leer ------------------------------------------------------------- //

// ------------------------------- Escribir ------------------------------------------------------------- //
/** Guarda un valor como JSON */
export function save(key: string, value: unknown): void {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        /* almacenamiento lleno o no disponible */
    }
}

/** Crea un signal que se guarda solo en localStorage cada vez que cambia. Debe crearse en un contexto de inyección */
export function persisted<T>(key: string, fallback: T, merge = true): WritableSignal<T> {
    // Los objetos se mezclan con el valor por defecto; arrays y primitivos (o merge = false) se leen tal cual
    const state = signal<T>(merge && isPlainObject(fallback) ? load(key, fallback) : loadRaw(key, fallback));
    effect(() => save(key, state()));
    return state;
}

/** Borra todas las claves nihongo:* (no toca las de otras apps del mismo origen) */
export function clearAll(): void {
    try {
        Object.keys(localStorage)
            .filter((storageKey) => storageKey.startsWith(PREFIX))
            .forEach((storageKey) => localStorage.removeItem(storageKey));
    } catch {
        /* se ignora */
    }
}
// ------------------------------- Escribir ------------------------------------------------------------- //

// ------------------------------- Auxiliares ------------------------------------------------------------- //
/** Indica si el valor es un objeto normal (no null ni array) */
function isPlainObject(value: unknown): boolean {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
// ------------------------------- Auxiliares ------------------------------------------------------------- //
