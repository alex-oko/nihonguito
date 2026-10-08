import { Injectable, signal } from '@angular/core';
import { setKanjiReader } from '../utils/text.utils';
import { Seg } from '../interfaces/furigana.interface';

/** Un carácter kanji (CJK unificado más 々 〆 ヵ ヶ, que se leen como kanji) */
const KANJI = /[一-鿿々〆ヵヶ]/;

/** Un tramo seguido de kanji, para leerlos juntos (今日 se lee きょう, no いま+ひ) */
const KANJI_RUN = /[一-鿿々〆ヵヶ]+/g;

/**
 * Lecturas de todos los kanji de la app (las genera tools/build-furigana.mjs).
 * Sirve para mostrar el texto solo en kana, o con el kanji y su furigana encima.
 */
@Injectable({
    providedIn: 'root'
})
export class FuriganaService {
    // Textos completos ya segmentados (t) y lectura de cada tramo de kanji (d) de furigana.json
    private texts: Record<string, Seg[]> = {};
    private runs: Record<string, string> = {};
    // Textos que no venían en furigana.json y se segmentaron aquí, para no repetir el trabajo
    private cache = new Map<string, Seg[]>();

    // --- Estados con Signals ---
    readonly ready = signal(false);

    // ------------------------------- Carga ------------------------------------------------------------- //
    /** Descarga data/furigana.json y registra el lector de kanji para romaji() */
    async load(): Promise<void> {
        try {
            const data = (await fetch('data/furigana.json').then((response) => response.json())) as {
                t: Record<string, Seg[]>;
                d: Record<string, string>;
            };
            this.texts = data.t;
            this.runs = data.d;
            setKanjiReader((text) => this.kana(text));
        } catch {
            /* sin conexión y sin caché: los kanji se muestran tal cual */
        }
        // Se marca listo también si falla, para que la app no espere algo que no va a llegar
        this.ready.set(true);
    }
    // ------------------------------- Carga ------------------------------------------------------------- //

    // ------------------------------- Lecturas ------------------------------------------------------------- //
    /** Indica si el texto tiene algún kanji */
    hasKanji(text: string): boolean {
        return KANJI.test(text);
    }

    /** Parte un texto en segmentos: texto suelto o pares [kanji, lectura] */
    segs(text: string): Seg[] {
        if (!text || !KANJI.test(text)) return [text];

        // 1. Texto ya conocido (de furigana.json o segmentado antes)
        const known = this.texts[text] ?? this.cache.get(text);
        if (known) return known;

        // 2. Texto nuevo: copia lo que no es kanji y lee cada tramo de kanji
        const segments: Seg[] = [];
        let lastIndex = 0;
        for (const match of text.matchAll(KANJI_RUN)) {
            const run = match[0];
            const runIndex = match.index ?? 0;
            if (runIndex > lastIndex) segments.push(text.slice(lastIndex, runIndex));
            segments.push(...this.readRun(run));
            lastIndex = runIndex + run.length;
        }
        if (lastIndex < text.length) segments.push(text.slice(lastIndex));

        // 3. Guardar para la próxima vez
        this.cache.set(text, segments);
        return segments;
    }

    /** Lee un tramo de kanji, partiéndolo en trozos conocidos si hace falta (el más largo primero) */
    private readRun(run: string): Seg[] {
        if (this.runs[run]) return [[run, this.runs[run]]];
        const segments: Seg[] = [];
        let position = 0;
        while (position < run.length) {
            let isFound = false;
            for (let length = run.length - position; length > 0; length--) {
                const piece = run.slice(position, position + length);
                if (this.runs[piece]) {
                    segments.push([piece, this.runs[piece]]);
                    position += length;
                    isFound = true;
                    break;
                }
            }
            // Kanji sin lectura conocida: se deja tal cual
            if (!isFound) {
                segments.push(run[position]);
                position++;
            }
        }
        return segments;
    }

    /** Devuelve el texto entero en kana */
    kana(text: string): string {
        return this.segs(text)
            .map((segment) => (Array.isArray(segment) ? segment[1] : segment))
            .join('');
    }
    // ------------------------------- Lecturas ------------------------------------------------------------- //
}
