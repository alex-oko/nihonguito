import { inject, Injectable } from '@angular/core';
import { LessonService } from './lesson.service';
import { cleanForm } from '../utils/questions.utils';
import { FuriganaService } from './furigana.service';
import { normJp, similarity } from '../utils/text.utils';

/** Un carácter kanji (rango CJK común, sin los signos 々 〆) */
const KANJI = /[一-龯]/;

/**
 * Pasa palabras en kanji a kana con el vocabulario de todas las lecciones, para poder
 * comparar respuestas escritas en kana (o reconocidas por voz en kanji).
 */
@Injectable({
    providedIn: 'root'
})
export class ReadingService {
    // --- Inyección de Dependencias ---
    private lessonSVC = inject(LessonService);
    private furiganaSVC = inject(FuriganaService);

    // Pares [kanji, kana] del vocabulario, del kanji más largo al más corto
    private pairs: [string, string][] = [];
    // Carga en curso o terminada: ensure() la comparte para no recorrer las lecciones dos veces
    private loading?: Promise<void>;

    // ------------------------------- Carga ------------------------------------------------------------- //
    /** Construye una sola vez la tabla kanji → kana con el vocabulario de todas las lecciones */
    ensure(): Promise<void> {
        this.loading ??= this.lessonSVC
            .allWords()
            .then((words) => {
                const readings = new Map<string, string>();
                for (const word of words) {
                    const kanjiForm = cleanForm(word.kanji);
                    const kanaForm = cleanForm(word.kana);
                    if (!kanjiForm.main || !kanaForm.main) continue;
                    const kanji = kanjiForm.main.replace(/\s+/g, '');
                    const kana = kanaForm.main.replace(/\s+/g, '');
                    if (KANJI.test(kanji) && !readings.has(kanji)) readings.set(kanji, kana);
                    // Raíz del verbo: de 食べます → たべます también se guarda 食べ → たべ (forma て, etc.)
                    if (kanji.endsWith('ます') && kana.endsWith('ます')) {
                        const kanjiStem = kanji.slice(0, -2);
                        const kanaStem = kana.slice(0, -2);
                        if (KANJI.test(kanjiStem) && !readings.has(kanjiStem)) readings.set(kanjiStem, kanaStem);
                    }
                }
                // El más largo primero, para que 日本語 se reemplace antes que 日本
                this.pairs = [...readings.entries()].sort((first, second) => second[0].length - first[0].length);
            })
            .catch(() => undefined);
        return this.loading;
    }
    // ------------------------------- Carga ------------------------------------------------------------- //

    // ------------------------------- Comparación ------------------------------------------------------------- //
    /** Devuelve el texto en kana y sin espacios */
    toKana(text: string): string {
        // Primero las lecturas precisas (furigana generado) y después los reemplazos del vocabulario
        let result = this.furiganaSVC.kana(text).replace(/\s+/g, '');
        for (const [kanji, kana] of this.pairs) {
            if (result.includes(kanji)) result = result.split(kanji).join(kana);
        }
        return result;
    }

    /** Devuelve la mejor similitud (0..1) entre cualquier candidato y cualquier objetivo, comparando la forma original y la de kana */
    bestMatch(candidates: string[], targets: string[]): { score: number; text: string } {
        let best = { score: 0, text: candidates[0] ?? '' };
        const targetForms = targets.flatMap((target) => [normJp(target), normJp(this.toKana(target))]);
        for (const candidate of candidates) {
            for (const candidateForm of [normJp(candidate), normJp(this.toKana(candidate))]) {
                for (const targetForm of targetForms) {
                    const score = similarity(candidateForm, targetForm);
                    if (score > best.score) best = { score, text: candidate };
                }
            }
        }
        return best;
    }
    // ------------------------------- Comparación ------------------------------------------------------------- //
}
