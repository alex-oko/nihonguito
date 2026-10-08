import { ExamSectionInfo } from '../interfaces/exam.interface';

/** Secciones del examen personalizado, en el orden en que salen en el creador */
export const EXAM_SECTIONS: ExamSectionInfo[] = [
    { id: 'vocab', label: 'Vocabulario', desc: 'Significado en ambas direcciones', icon: 'eye' },
    { id: 'listen', label: 'Escucha', desc: 'Entender palabras y frases de oído', icon: 'headphones' },
    { id: 'write', label: 'Escritura', desc: 'Escribir palabras en kana', icon: 'keyboard' },
    { id: 'sentences', label: 'Frases', desc: 'Ordenar y entender oraciones', icon: 'list' },
    { id: 'particles', label: 'Partículas', desc: 'は, が, を, に, で, へ…', icon: 'target' },
    { id: 'speak', label: 'Pronunciación', desc: 'Leer en voz alta (micrófono)', icon: 'mic' },
    { id: 'verbs', label: 'Verbos', desc: 'Formas て, ない, た, diccionario', icon: 'bolt' },
    { id: 'hiragana', label: 'Hiragana', desc: 'Lectura de los símbolos', icon: 'sparkles' },
    { id: 'katakana', label: 'Katakana', desc: 'Lectura de los símbolos', icon: 'sparkles' },
];

/** Agrupa números consecutivos en rangos: [1,2,3,5,7,8] → "1–3, 5, 7–8" */
export function compactRanges(ids: number[]): string {
    const sorted = [...ids].sort((a, b) => a - b);
    const parts: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
        parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : `${sorted[i]}`);
        i = j;
    }
    return parts.join(', ');
}
