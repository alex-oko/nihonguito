import { Injectable } from '@angular/core';
import { DiaryEntry } from '../interfaces/diary.interface';
import { GuideSentence } from '../interfaces/grammar-guide.interface';
import { persisted } from '../utils/storage.utils';
import { todayKey } from '../utils/text.utils';

/** Frases que se guardan como máximo (las más viejas se descartan) */
const MAX_ENTRIES = 300;

/** Frases propias de «Mi diario», guardadas en nihongo:diary (la más nueva primero) */
@Injectable({
    providedIn: 'root'
})
export class DiaryService {
    // --- Estados con Signals ---
    readonly entries = persisted<DiaryEntry[]>('diary', [], false);

    // ------------------------------- Frases ------------------------------------------------------------- //
    /** Guarda una frase nueva al principio del diario */
    add(promptId: string, sentence: GuideSentence): void {
        const entry: DiaryEntry = { id: Date.now().toString(36), date: todayKey(), promptId, sentence };
        this.entries.update((entries) => [entry, ...entries].slice(0, MAX_ENTRIES));
    }

    /** Borra una frase del diario */
    remove(id: string): void {
        this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
    }
    // ------------------------------- Frases ------------------------------------------------------------- //
}
