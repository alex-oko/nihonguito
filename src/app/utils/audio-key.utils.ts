/**
 * Cómo un texto japonés se convierte en el nombre de su audio pregrabado
 * (public/audio/<clave>.mp3). Lo comparten la app (SpeechService) y tools/build-audio.mjs,
 * que importa este archivo con esbuild: si la clave cambia aquí, cambia en los dos lados y
 * hay que regenerar los audios. Sin dependencias de Angular para que esbuild lo empaquete solo.
 */
import { Voice } from '../interfaces/speech.interface';

// ------------------------------- Limpieza ------------------------------------------------------------- //
/** Limpia el texto separado por espacios para hablarlo: quita espacios, los ～ de huecos y los corchetes (deja su contenido) */
export function cleanSpeech(text: string): string {
    return text
        .replace(/[～〜]/g, '')
        .replace(/[［\[]([^\]］]*)[\]］]/g, '$1')
        .replace(/\s+/g, '')
        .trim();
}
// ------------------------------- Limpieza ------------------------------------------------------------- //

// ------------------------------- Clave del audio ------------------------------------------------------------- //
/** Hash cyrb53 → texto corto en base 36 (estable entre la app y el script de build) */
function cyrb53(text: string, seed = 0): string {
    let hash1 = 0xdeadbeef ^ seed;
    let hash2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        hash1 = Math.imul(hash1 ^ charCode, 2654435761);
        hash2 = Math.imul(hash2 ^ charCode, 1597334677);
    }
    hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
    hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
    // 53 bits: los 21 bajos de hash2 por encima de los 32 de hash1, el máximo entero exacto de JavaScript
    return (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(36);
}

/** Devuelve la clave del audio: la voz ('a' o 'b') seguida del hash del texto limpio */
export function audioKey(text: string, voice: Voice = 'a'): string {
    return `${voice}${cyrb53(cleanSpeech(text))}`;
}
// ------------------------------- Clave del audio ------------------------------------------------------------- //
