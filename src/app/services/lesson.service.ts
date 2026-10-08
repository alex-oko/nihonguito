import { Injectable, signal } from '@angular/core';
import { Appendix, Lesson, LessonMeta, Word } from '../interfaces/lesson.interface';

/** Ruta del índice de lecciones (lo genera tools/build-data.mjs) */
const INDEX_URL = 'data/lessons/index.json';
/** Ruta del apéndice (gramática general, tablas y verbos) */
const APPENDIX_URL = 'data/appendix.json';

@Injectable({
    providedIn: 'root'
})
export class LessonService {
    // --- Estados UI con Signals ---
    /** Índice de lecciones; vacío hasta que termina `loadIndex()` */
    readonly index = signal<LessonMeta[]>([]);

    // Promesas cacheadas: cada archivo se pide una sola vez aunque lo pidan varias vistas a la vez
    private cache = new Map<number, Promise<Lesson>>();
    private indexPromise?: Promise<LessonMeta[]>;
    private appendixPromise?: Promise<Appendix>;

    // ------------------------------- Lecciones ------------------------------------------------------------- //
    /** Carga el índice de lecciones y lo deja en el signal `index` */
    loadIndex(): Promise<LessonMeta[]> {
        this.indexPromise ??= fetch(INDEX_URL)
            .then((response) => response.json() as Promise<LessonMeta[]>)
            .then((lessonIndex) => {
                this.index.set(lessonIndex);
                return lessonIndex;
            });
        return this.indexPromise;
    }

    /** Devuelve una lección completa por su id (data/lessons/NN.json) */
    get(id: number): Promise<Lesson> {
        let lessonPromise = this.cache.get(id);
        if (!lessonPromise) {
            lessonPromise = fetch(`data/lessons/${String(id).padStart(2, '0')}.json`).then((response) => {
                if (!response.ok) throw new Error('not found');
                return response.json() as Promise<Lesson>;
            });
            // Si falla se saca de la caché para que el siguiente intento vuelva a pedirla
            lessonPromise.catch(() => this.cache.delete(id));
            this.cache.set(id, lessonPromise);
        }
        return lessonPromise;
    }

    /** Devuelve varias lecciones en paralelo, en el mismo orden que los ids */
    async getMany(ids: number[]): Promise<Lesson[]> {
        return Promise.all(ids.map((id) => this.get(id)));
    }

    /** Devuelve todas las lecciones del índice */
    async allLessons(): Promise<Lesson[]> {
        const lessonIndex = await this.loadIndex();
        return this.getMany(lessonIndex.map((meta) => meta.id));
    }

    /** Devuelve el vocabulario de todas las lecciones en una sola lista */
    async allWords(): Promise<Word[]> {
        return (await this.allLessons()).flatMap((lesson) => lesson.vocab);
    }
    // ------------------------------- Lecciones ------------------------------------------------------------- //

    // ------------------------------- Apéndice ------------------------------------------------------------- //
    /** Carga el apéndice (gramática general, tablas y verbos) */
    appendix(): Promise<Appendix> {
        this.appendixPromise ??= fetch(APPENDIX_URL).then((response) => response.json() as Promise<Appendix>);
        return this.appendixPromise;
    }
    // ------------------------------- Apéndice ------------------------------------------------------------- //
}
