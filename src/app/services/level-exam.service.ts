import { computed, inject, Injectable, signal } from '@angular/core';
import { isKatakana, toHiragana } from 'wanakana';
import { HIRAGANA_LOOKALIKES, KANA_ROWS, KATAKANA_LOOKALIKES } from '../utils/kana.utils';
import { Script } from '../interfaces/kana.interface';
import { LessonService } from './lesson.service';
import { VerbEntry } from '../interfaces/lesson.interface';
import { lessonSentences, prioritize, studyWords } from '../utils/lesson-content.utils';
import { Lesson, Sentence, Word } from '../interfaces/lesson.interface';
import { ProgressService } from './progress.service';
import { cleanForm, isPlainWord, knownStems, splitParticle, wordReading } from '../utils/questions.utils';
import { ReadingService } from './reading.service';
import { loadRaw, save } from '../utils/storage.utils';
import { shortEs, shuffle, tokens } from '../utils/text.utils';
import { BONUS_QUESTIONS, examNumbers, gradeSpanish, KIND_JP, lessonsLabel, numberAlternatives, QUESTION_WORDS } from '../utils/level.utils';
import { LevelPreset } from '../interfaces/level-exam.interface';
import { Slot, Seg, ExamItem, GridCell, LevelExamSection, LevelExam, SlotResult, Draft } from '../interfaces/level-exam.interface';

/** Espacios y signos que no cuentan al comparar respuestas japonesas */
const PUNCTUATION = /[\s　。、．，,.!！?？・「」『』（）()〜~\-…]/g;
/** Signo de fin de frase que se quita del texto esperado (la hoja ya pone el 。) */
const SENTENCE_END = /[。？！?!]$/;
/** Parejas katakana ↔ hiragana casi iguales (trampas de la otra tabla en el banco de formas) */
const CROSS_TWINS: Record<string, string> = { カ: 'か', キ: 'き', ヘ: 'へ', モ: 'も', リ: 'り', ヤ: 'や', セ: 'せ', ニ: 'に', ハ: 'は' };
/** Huecos de cada tabla de kana */
const KANA_BLANKS = 20;
/** Máximo de trampas parecidas en el banco */
const MAX_BANK_TRAPS = 8;
/** Fichas de más que lleva siempre el banco (trampas + relleno), para que el último hueco no salga por descarte */
const MIN_BANK_EXTRAS = 6;
/** Largo máximo de pregunta y respuesta en los pares de diálogo (las largas no caben en la línea de la hoja) */
const MAX_QA_LENGTH = 34;
/** Partículas que suenan a otra letra: un error típico que merece nota */
const PARTICLE_SOUNDS: Record<string, string> = { は: 'わ', を: 'お', へ: 'え' };

/** Quita espacios y signos de un texto */
const stripPunctuation = (text: string) => (text ?? '').replace(PUNCTUATION, '');

/** Formatea puntos: entero sin decimales, si no con uno ("0.5") */
function formatPoints(points: number): string {
    return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

/** Redondea hacia abajo al medio punto (el 1e-9 evita que 0.4999… por coma flotante baje a 0) */
const roundDownToHalf = (points: number) => Math.floor(points * 2 + 1e-9) / 2;

/** Contador para ids únicos de exámenes, ítems y casillas */
let idCounter = 0;
/** Devuelve un id nuevo con el prefijo dado ("v12", "s13"…) */
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

/** Genera, guarda y corrige el examen de nivel de 50 puntos (hoja en /examen/nivel/hoja) */
@Injectable({
    providedIn: 'root'
})
export class LevelExamService {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private readingSVC = inject(ReadingService);

    // --- Estados UI con Signals ---
    /** Hoja en curso o la última entregada (nihongo:levelDraft) */
    readonly draft = signal<Draft | null>(loadRaw<Draft | null>('levelDraft', null));
    /** Mejor porcentaje por id de examen (nihongo:levelBest) */
    readonly best = signal<Record<string, number>>(loadRaw<Record<string, number>>('levelBest', {}));

    // --- Valores derivados (computed) ---
    /** Corrección de la hoja; null mientras no se haya entregado */
    readonly results = computed(() => {
        const draft = this.draft();
        return draft?.submittedAt ? this.grade(draft) : null;
    });

    // ------------------------------- Hoja en curso ------------------------------------------------------------- //
    /** Guarda la hoja en localStorage */
    private persist(): void {
        save('levelDraft', this.draft());
    }

    /** Guarda la respuesta de una casilla (no hace nada con la hoja ya entregada) */
    setAnswer(slot: string, value: string): void {
        const draft = this.draft();
        if (!draft || draft.submittedAt) return;
        this.draft.set({ ...draft, answers: { ...draft.answers, [slot]: value } });
        this.persist();
    }

    /** Marca o desmarca «Mi respuesta vale» en un ítem y recalcula la mejor nota */
    toggleOverride(item: string): void {
        const draft = this.draft();
        if (!draft) return;
        this.draft.set({ ...draft, overrides: { ...draft.overrides, [item]: !draft.overrides[item] } });
        this.persist();
        this.saveBest();
    }

    /** Descarta la hoja actual */
    discard(): void {
        this.draft.set(null);
        this.persist();
    }
    // ------------------------------- Hoja en curso ------------------------------------------------------------- //

    // ------------------------------- Generación ------------------------------------------------------------- //
    /** Devuelve el último examen personalizado creado (nihongo:levelCustom) */
    lastCustom(): LevelPreset | null {
        return loadRaw<LevelPreset | null>('levelCustom', null);
    }

    /** Genera una hoja nueva para el examen dado y la deja como borrador (sustituye a la anterior) */
    async create(preset: LevelPreset): Promise<void> {
        // 1. Los personalizados se recuerdan para «Nuevo examen» y para precargar el selector
        if (preset.id === 'custom') save('levelCustom', preset);

        // 2. Cargar las lecciones del examen y todas las anteriores (las frases viejas rellenan si faltan)
        await Promise.all([this.lessonSVC.loadIndex(), this.readingSVC.ensure()]);
        const selectedLessons = await this.lessonSVC.getMany(preset.lessons);
        const maxLesson = Math.max(...preset.lessons);
        const lessonsUpTo = await this.lessonSVC.getMany(
            this.lessonSVC.index().filter((lesson) => lesson.id >= 1 && lesson.id <= maxLesson).map((lesson) => lesson.id),
        );
        const olderLessons = lessonsUpTo.filter((lesson) => !preset.lessons.includes(lesson.id));
        const known = knownStems(lessonsUpTo.flatMap((lesson) => lesson.vocab));
        const words = studyWords(selectedLessons.flatMap((lesson) => lesson.vocab)).filter((word) => word.type !== 'name' && wordReading(word));
        const sentences = selectedLessons.flatMap(lessonSentences);
        const olderSentences = olderLessons.flatMap(lessonSentences);
        const qaPairs = this.qaPairs(selectedLessons);
        const olderQaPairs = this.qaPairs(olderLessons);

        // 3. Secciones según el formato de la clase (solo se añaden las que tienen ítems)
        const sections: LevelExamSection[] = [];
        const add = (section: LevelExamSection | null) => section && section.items.length && sections.push(section);

        if (preset.kana) {
            // Nivel 1 parcial: 10 + 10 + 10 + 7 + 9 + 4 = 50
            add(this.kanaSection('hiragana'));
            add(this.kanaSection('katakana'));
            add(this.vocabSection(words, 10, 'Escriba el vocabulario correcto'));
            add(this.particleSection(sentences, olderSentences, known, 7, 1, 'Escriba la partícula en el espacio correspondiente'));
            add(this.answerSection(qaPairs, olderQaPairs, 3, 3));
            add(this.numberSection(8, 0.5));
        } else if (maxLesson <= 3) {
            // Nivel 1 final: 10 + 10 + 10 + 10 + 8 + 2 = 50
            add(this.vocabSection(words, 10, 'Escriba el vocabulario correcto'));
            add(this.particleSection(sentences, olderSentences, known, 10, 1, 'Escriba la partícula en el espacio correspondiente'));
            add(this.dialogSection(qaPairs, olderQaPairs, 5, 2));
            add(this.orderSection(sentences, olderSentences, known, 5, 2, 'Ordene la frase correctamente'));
            add(this.numberSection(8, 1));
            add(this.nameSection());
        } else {
            // Nivel 2+: 20 (o 10 + 10 de verbos desde la L14) + 10 + 10 + 10 = 50, más 2 extra
            const verbs = maxLesson >= 14 ? await this.verbSection(preset.lessons, maxLesson) : null;
            add(this.vocabSection(words, verbs ? 10 : 20, 'Escriban el vocabulario'));
            add(this.particleSection(sentences, olderSentences, known, 10, 1, 'Poner la partícula'));
            add(this.interrogativeSection(qaPairs, olderQaPairs, 5, 2));
            add(verbs);
            add(this.orderSection(sentences, olderSentences, known, 5, 2, 'Ordenar la frase correctamente'));
            add(this.bonusSection(maxLesson));
        }

        // 4. Total sin la sección extra (es lo que sale como «/50»)
        const total = sections
            .filter((section) => !section.bonus)
            .reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0);
        const exam: LevelExam = {
            id: nextId('exam'),
            presetId: preset.id,
            title: preset.title ?? `日本語教室 Nivel ${preset.level} ${KIND_JP[preset.kind]}`,
            subtitle: `(${lessonsLabel(preset.lessons, preset.kana)})`,
            sections,
            total,
            createdAt: Date.now(),
        };
        this.draft.set({ exam, answers: {}, overrides: {}, startedAt: Date.now() });
        this.persist();
    }

    /** Devuelve pares pregunta/respuesta de los ejemplos y de las conversaciones (A pregunta, B responde) */
    private qaPairs(lessons: Lesson[]): { q: string; a: string }[] {
        const pairs: { q: string; a: string }[] = [];
        for (const lesson of lessons) {
            lesson.examples.forEach((example) => example.qjp && example.ajp && pairs.push({ q: example.qjp.trim(), a: example.ajp.trim() }));
            for (const conversation of lesson.conversations) {
                for (let i = 0; i + 1 < conversation.lines.length; i++) {
                    const question = conversation.lines[i].jp.trim();
                    // Una línea que acaba en か seguida de otra persona cuenta como pregunta y respuesta
                    if (/か[。？?]$/.test(question) && conversation.lines[i + 1].who !== conversation.lines[i].who) {
                        pairs.push({ q: question, a: conversation.lines[i + 1].jp.trim() });
                    }
                }
            }
        }
        const seen = new Set<string>();
        return pairs.filter((pair) => pair.q.length <= MAX_QA_LENGTH && pair.a.length <= MAX_QA_LENGTH && !seen.has(pair.q) && (seen.add(pair.q), true));
    }

    /** Arma la tabla de kana básicos con 20 huecos de 0.5 puntos que se rellenan desde un banco de formas */
    private kanaSection(script: Script): LevelExamSection {
        const basicRows = KANA_ROWS[script].filter((row) => row.group === 'basic');
        const cells = basicRows.flatMap((row) => row.cells).filter((cell) => !!cell);
        const blanks = new Set(shuffle(cells.map((cell) => cell!.char)).slice(0, KANA_BLANKS));
        const items: ExamItem[] = [];
        // Columnas de derecha a izquierda como la tabla en papel: あ か さ … わ ん
        const grid: GridCell[][] = basicRows.map((row) =>
            row.cells.map((cell) => {
                if (!cell) return { char: null };
                if (!blanks.has(cell.char)) return { char: cell.char };
                // Sin romaji: se elige la forma de un banco (evalúa reconocimiento, no el orden de la tabla)
                const item: ExamItem = {
                    id: nextId('k'),
                    points: 0.5,
                    hint: cell.romaji[0],
                    slots: [{ id: nextId('s'), input: 'pick', check: 'exact', expected: cell.char, size: 'xs' }],
                };
                items.push(item);
                return { char: cell.char, item: item.id };
            }),
        );
        return {
            type: script === 'hiragana' ? 'kana-h' : 'kana-k',
            heading: `Escriba el ${script} correcto en el espacio correspondiente`,
            scheme: `(0.5×${items.length})`,
            help: 'Toca una casilla vacía y elige su forma. Hay símbolos de más que se parecen: fíjate bien en los trazos.',
            items,
            grid,
            bank: this.kanaBank([...blanks], script, cells.map((cell) => cell!.char)),
        };
    }

    /** Devuelve el banco de formas: las que faltan más trampas parecidas (de la misma tabla y algunas de la otra) */
    private kanaBank(missing: string[], script: Script, all: string[]): string[] {
        const groups = script === 'katakana' ? KATAKANA_LOOKALIKES : HIRAGANA_LOOKALIKES;
        const twins = script === 'katakana' ? CROSS_TWINS : Object.fromEntries(Object.entries(CROSS_TWINS).map(([katakana, hiragana]) => [hiragana, katakana]));
        const traps = new Set<string>();
        for (const char of missing) {
            groups
                .filter((group) => group.chars.includes(char))
                .forEach((group) =>
                    group.chars.forEach((other) => other !== char && all.includes(other) && !missing.includes(other) && traps.add(other)),
                );
            if (twins[char]) traps.add(twins[char]);
        }
        const extraTraps = shuffle([...traps]).slice(0, MAX_BANK_TRAPS);
        // Siempre unas fichas de más, para que el último hueco no se resuelva por descarte
        const filler = shuffle(all.filter((char) => !missing.includes(char) && !traps.has(char))).slice(0, Math.max(0, MIN_BANK_EXTRAS - extraTraps.length));
        return shuffle([...missing, ...extraTraps, ...filler]);
    }

    /** Arma la sección de vocabulario: la mitad de japonés a español y la otra de español a japonés, 1 punto cada una */
    private vocabSection(words: Word[], count: number, heading: string): LevelExamSection {
        const pool = prioritize(words, this.progressSVC, words.length);
        const toSpanish = pool.filter((word) => wordReading(word).length <= 10).slice(0, Math.ceil(count / 2));
        const toJapanese = pool
            .filter((word) => !toSpanish.includes(word) && isPlainWord(word) && wordReading(word).length <= 9)
            .slice(0, count - toSpanish.length);
        const items: ExamItem[] = [
            ...toSpanish.map<ExamItem>((word) => ({
                id: nextId('v'),
                points: 1,
                prompt: wordReading(word),
                promptJp: true,
                word: word.id,
                slots: [{ id: nextId('s'), input: 'es', check: 'es', expected: word.es, size: 'lg' }],
            })),
            ...toJapanese.map<ExamItem>((word) => {
                const form = cleanForm(word.kana);
                return {
                    id: nextId('v'),
                    points: 1,
                    prompt: shortEs(word.es),
                    word: word.id,
                    slots: [
                        {
                            id: nextId('s'),
                            input: 'mixed',
                            check: 'exact',
                            expected: form.main,
                            // También vale con kanji
                            alts: [...form.alts, cleanForm(word.kanji).main].filter(Boolean),
                            size: 'lg',
                        },
                    ],
                };
            }),
        ];
        return {
            type: 'vocab',
            heading,
            scheme: `(1×${items.length})`,
            help: 'Primera parte: escribe el significado en español. Segunda parte: escríbelo en japonés (usa ア para katakana).',
            items,
        };
    }

    /** Parte una frase en trozos y deja en blanco cada partícula que detecta; null si no tiene ninguna */
    private blankParticles(sentence: Sentence, known: Set<string>): { segs: Seg[]; answers: string[] } | null {
        const sentenceTokens = tokens(sentence.jp);
        const segs: Seg[] = [];
        const answers: string[] = [];
        sentenceTokens.forEach((token, index) => {
            const trailing = token.match(/[、。？！]+$/)?.[0] ?? '';
            const core = trailing ? token.slice(0, -trailing.length) : token;
            const split = splitParticle(core, known);
            const separator = index < sentenceTokens.length - 1 ? ' ' : '';
            if (split) {
                segs.push(split.stem, { slot: answers.length }, trailing + separator);
                answers.push(split.particle);
            } else {
                segs.push(token + separator);
            }
        });
        return answers.length ? { segs, answers } : null;
    }

    /** Arma la sección de partículas: frases de hasta 30 caracteres con 1–4 huecos, primero de las lecciones del examen */
    private particleSection(
        sentences: Sentence[],
        older: Sentence[],
        known: Set<string>,
        count: number,
        points: number,
        heading: string,
    ): LevelExamSection {
        const pick = (list: Sentence[]) =>
            shuffle(list)
                .filter((sentence) => sentence.jp.length <= 30)
                .map((sentence) => this.blankParticles(sentence, known))
                .filter((blanked): blanked is NonNullable<typeof blanked> => !!blanked && blanked.answers.length <= 4)
                // Mejor frases con 2–3 huecos, como en los exámenes de clase
                .sort((a, b) => Math.abs(2.5 - a.answers.length) - Math.abs(2.5 - b.answers.length));
        const chosen = [...pick(sentences), ...pick(older)].slice(0, count);
        const items = chosen.map<ExamItem>((blanked) => ({
            id: nextId('p'),
            points,
            segs: blanked.segs,
            slots: blanked.answers.map((answer) => ({
                id: nextId('s'),
                input: 'hira' as const,
                check: 'particle' as const,
                expected: answer,
                size: 'xs' as const,
            })),
        }));
        return {
            type: 'particles',
            heading,
            scheme: `(${points}×${items.length})`,
            help: 'Recuerda: は se escribe «ha», を «wo» y へ «he».',
            items,
        };
    }

    /** Arma «はい、（…）»: completar la respuesta (Nivel 1, lección 1) */
    private answerSection(qaPairs: { q: string; a: string }[], older: typeof qaPairs, count: number, points: number): LevelExamSection {
        const pool = [...shuffle(qaPairs), ...shuffle(older)].filter((pair) => /^(はい|いいえ)、/.test(pair.a) && pair.a.length >= 6);
        const items = pool.slice(0, count).map<ExamItem>((pair) => {
            const [head, ...rest] = pair.a.split('、');
            const body = rest.join('、').replace(SENTENCE_END, '');
            return {
                id: nextId('a'),
                points,
                lines: [
                    { who: '', segs: [pair.q] },
                    { who: '', segs: [head + '、', { slot: 0 }, '。'] },
                ],
                slots: [{ id: nextId('s'), input: 'mixed', check: 'fuzzy', expected: body, size: 'lg' }],
            };
        });
        return {
            type: 'answer',
            heading: 'Escriba la palabra adecuada en el espacio correspondiente',
            scheme: `(${points}×${items.length})`,
            help: 'Completa la respuesta con una frase completa.',
            items,
        };
    }

    /** Arma «A: 〜は（…）。 B: respuesta»: escribir el resto de la pregunta (Nivel 1, lecciones 2–3) */
    private dialogSection(qaPairs: { q: string; a: string }[], older: typeof qaPairs, count: number, points: number): LevelExamSection {
        // 1. Primero las preguntas con palabra interrogativa; después cualquiera
        const hasQuestionWord = (pair: { q: string }) => QUESTION_WORDS.some((word) => pair.q.includes(word));
        const pool = [...shuffle(qaPairs.filter(hasQuestionWord)), ...shuffle(older.filter(hasQuestionWord)), ...shuffle(qaPairs)];
        const seen = new Set<string>();
        const items: ExamItem[] = [];
        for (const pair of pool) {
            if (items.length >= count || seen.has(pair.q)) continue;
            seen.add(pair.q);
            // 2. Se enseña hasta el tema (〜は) y se oculta lo demás; sin tema se oculta toda la pregunta
            const questionTokens = tokens(pair.q);
            const topicIndex = questionTokens.findIndex((token) => /は$/.test(token));
            const hasTopic = topicIndex >= 0 && topicIndex < questionTokens.length - 1;
            const shown = hasTopic ? questionTokens.slice(0, topicIndex + 1).join(' ') + ' ' : '';
            const hidden = (hasTopic ? questionTokens.slice(topicIndex + 1) : questionTokens).join(' ').replace(SENTENCE_END, '');
            // 3. Más de 14 caracteres ocultos es demasiado para un hueco
            if (stripPunctuation(hidden).length > 14) continue;
            items.push({
                id: nextId('d'),
                points,
                lines: [
                    { who: 'A', segs: [shown, { slot: 0 }, '。'] },
                    { who: 'B', segs: [pair.a] },
                ],
                slots: [{ id: nextId('s'), input: 'mixed', check: 'fuzzy', expected: hidden, size: 'lg' }],
            });
        }
        return {
            type: 'dialog',
            heading: 'Escriba la palabra adecuada en el espacio correspondiente',
            scheme: `(${points}×${items.length})`,
            help: 'Lee la respuesta de B y escribe la pregunta que falta.',
            items,
        };
    }

    /** Arma «A: 【 】へ いきましたか。»: poner la palabra interrogativa (Nivel 2+) */
    private interrogativeSection(qaPairs: { q: string; a: string }[], older: typeof qaPairs, count: number, points: number): LevelExamSection {
        const items: ExamItem[] = [];
        const seen = new Set<string>();
        for (const pair of [...shuffle(qaPairs), ...shuffle(older)]) {
            if (items.length >= count || seen.has(pair.q)) continue;
            // 1. Buscar el primer token que empieza por una palabra interrogativa
            const questionTokens = tokens(pair.q);
            let match: { index: number; word: string } | null = null;
            questionTokens.forEach((token, index) => {
                if (match) return;
                const word = QUESTION_WORDS.find((questionWord) => token.startsWith(questionWord));
                if (word) match = { index, word };
            });
            if (!match) continue;
            // El cast hace falta porque TS no ve la asignación dentro del forEach
            const { index, word } = match as { index: number; word: string };
            seen.add(pair.q);
            // 2. Lo que va antes y después del hueco (lo que sigue a la palabra en el mismo token, p. ej. なんじに → に)
            const before = questionTokens.slice(0, index).join(' ');
            const after = questionTokens[index].slice(word.length) + (index < questionTokens.length - 1 ? ' ' + questionTokens.slice(index + 1).join(' ') : '');
            // なに y なん se aceptan una por otra
            const alts = word === 'なに' ? ['なん'] : word === 'なん' ? ['なに'] : [];
            items.push({
                id: nextId('i'),
                points,
                lines: [
                    { who: 'A', segs: [before ? before + ' ' : '', { slot: 0 }, after] },
                    { who: 'B', segs: [pair.a] },
                ],
                slots: [{ id: nextId('s'), input: 'hira', check: 'exact', expected: word, alts, size: 'sm' }],
            });
        }
        return {
            type: 'interrogative',
            heading: 'Completar la pregunta con el interrogativo adecuado',
            scheme: `(${points}×${items.length})`,
            help: 'どこ, なに, だれ, いつ, いくら…',
            items,
        };
    }

    /** Arma la sección de ordenar: frases de 4 a 8 fichas (las partículas van sueltas) barajadas */
    private orderSection(sentences: Sentence[], older: Sentence[], known: Set<string>, count: number, points: number, heading: string): LevelExamSection {
        const buildTokens = (sentence: Sentence) => {
            const sentenceTokens = tokens(sentence.jp.replace(/[。？！?!]$/, '')).flatMap((token) => {
                const clean = token.replace(/、$/, '');
                const split = splitParticle(clean, known);
                return split ? [split.stem, split.particle] : [clean];
            });
            return sentenceTokens.length >= 4 && sentenceTokens.length <= 8 ? sentenceTokens : null;
        };
        const items: ExamItem[] = [];
        const seen = new Set<string>();
        for (const sentence of [...shuffle(sentences), ...shuffle(older)]) {
            if (items.length >= count || seen.has(sentence.jp)) continue;
            const sentenceTokens = buildTokens(sentence);
            if (!sentenceTokens) continue;
            seen.add(sentence.jp);
            // Hasta 5 intentos para que el orden barajado no sea el correcto
            let shuffled = shuffle(sentenceTokens);
            for (let attempt = 0; attempt < 5 && shuffled.join() === sentenceTokens.join(); attempt++) shuffled = shuffle(sentenceTokens);
            items.push({
                id: nextId('o'),
                points,
                hint: sentence.es,
                slots: [{ id: nextId('s'), input: 'order', check: 'order', expected: sentence.jp, tokens: shuffled }],
            });
        }
        return {
            type: 'order',
            heading,
            scheme: `(${points}×${items.length})`,
            help: 'Toca las palabras en el orden correcto.',
            items,
        };
    }

    /** Arma la sección de números: escribir en hiragana cifras como las de clase (ver examNumbers) */
    private numberSection(count: number, points: number): LevelExamSection {
        const items = examNumbers(count).map<ExamItem>((value) => {
            const [main, ...alts] = numberAlternatives(value);
            return {
                id: nextId('n'),
                points,
                prompt: value.toLocaleString('en-US'),
                slots: [{ id: nextId('s'), input: 'hira', check: 'exact', expected: main, alts, size: 'lg' }],
            };
        });
        return {
            type: 'numbers',
            heading: 'Escriba los números adecuados con Hiragana en el espacio correspondiente',
            scheme: `(${formatPoints(points)}×${items.length})`,
            items,
        };
    }

    /** Arma la sección de verbos (desde la L14): 10 verbos, rotando las formas ya vistas; null si no hay verbos */
    private async verbSection(lessons: number[], maxLesson: number): Promise<LevelExamSection | null> {
        const { verbs } = await this.lessonSVC.appendix();
        // 1. Formas según la lección más alta: て (14), ない (17), diccionario (18), た (19)
        const forms: (keyof VerbEntry & ('te' | 'nai' | 'dict' | 'ta'))[] = [];
        if (maxLesson >= 14) forms.push('te');
        if (maxLesson >= 17) forms.push('nai');
        if (maxLesson >= 18) forms.push('dict');
        if (maxLesson >= 19) forms.push('ta');
        const formLabel = { te: 'forma て', nai: 'forma ない', dict: 'forma diccionario', ta: 'forma た' };
        // 2. Verbos de las lecciones del examen (con 6 o más) y después los vistos hasta la más alta
        const inRange = verbs.filter((verb) => verb.lesson != null && lessons.includes(verb.lesson));
        const seenUpTo = verbs.filter((verb) => (verb.lesson ?? 99) <= maxLesson);
        const pool = shuffle(inRange.length >= 6 ? [...inRange, ...shuffle(seenUpTo)] : seenUpTo);
        const unique = [...new Map(pool.map((verb) => [verb.masu, verb])).values()].slice(0, 10);
        const items = unique.map<ExamItem>((verb, index) => {
            const form = forms[index % forms.length];
            return {
                id: nextId('vb'),
                points: 1,
                prompt: verb.masu,
                promptJp: true,
                hint: formLabel[form],
                slots: [{ id: nextId('s'), input: 'hira', check: 'exact', expected: verb[form], size: 'md' }],
            };
        });
        return items.length
            ? { type: 'verbs', heading: 'Escriba la forma del verbo', scheme: `(1×${items.length})`, items }
            : null;
    }

    /** Arma la sección «tu nombre en katakana» (2 puntos, Nivel 1 final) */
    private nameSection(): LevelExamSection {
        return {
            type: 'name',
            heading: 'Escriba su nombre en japonés',
            scheme: '(2)',
            help: 'Los nombres extranjeros se escriben en katakana.',
            items: [{ id: nextId('nm'), points: 2, slots: [{ id: nextId('s'), input: 'kata', check: 'free-kata', expected: '', size: 'lg' }] }],
        };
    }

    /** Arma 2 preguntas libres de puntos extra, preferiblemente de las últimas 3 lecciones */
    private bonusSection(maxLesson: number): LevelExamSection {
        const pool = BONUS_QUESTIONS.filter((bonus) => bonus.from <= maxLesson);
        const recent = pool.filter((bonus) => bonus.from >= maxLesson - 3);
        const chosen = shuffle(recent.length >= 2 ? recent : pool).slice(0, 2);
        return {
            type: 'bonus',
            heading: 'Responde a las siguientes preguntas para conseguir puntos extra',
            scheme: '(+1×2)',
            bonus: true,
            items: chosen.map((bonus) => ({
                id: nextId('b'),
                points: 1,
                prompt: bonus.q,
                promptJp: true,
                model: bonus.model,
                slots: [{ id: nextId('s'), input: 'mixed', check: 'free-jp', expected: '', size: 'lg' }],
            })),
        };
    }
    // ------------------------------- Generación ------------------------------------------------------------- //

    // ------------------------------- Corrección ------------------------------------------------------------- //
    /** Corrige una casilla según su tipo de comprobación: 1, 0.5 o 0, con nota opcional */
    checkSlot(slot: Slot, raw: string | undefined): SlotResult {
        const value = (raw ?? '').trim();
        if (!value) return { score: 0 };
        const targets = [slot.expected, ...(slot.alts ?? [])].filter(Boolean);
        switch (slot.check) {
            case 'particle': {
                if (stripPunctuation(value) === slot.expected) return { score: 1 };
                // わ por は, お por を, え por へ: se avisa de cómo se escribe
                return {
                    score: 0,
                    note: PARTICLE_SOUNDS[slot.expected] === stripPunctuation(value) ? `La partícula se escribe ${slot.expected}` : undefined,
                };
            }
            case 'exact': {
                // 1. Igual tal cual o pasado a kana (acepta romaji)
                const given = stripPunctuation(value);
                const givenForms = [given, stripPunctuation(this.readingSVC.toKana(value))];
                if (targets.some((target) => givenForms.includes(stripPunctuation(target)))) return { score: 1 };
                // 2. Igual solo si se ignora hiragana/katakana: medio punto y se dice en qué se escribe
                const loose = (text: string) => toHiragana(stripPunctuation(text), { passRomaji: true });
                if (targets.some((target) => givenForms.some((form) => loose(form) === loose(target)))) {
                    const isKatakanaWord = isKatakana(stripPunctuation(slot.expected).replace(/ー/g, ''));
                    return { score: 0.5, note: isKatakanaWord ? 'Se escribe en katakana' : 'Se escribe en hiragana' };
                }
                return { score: 0 };
            }
            case 'fuzzy': {
                const { score } = this.readingSVC.bestMatch([value], targets);
                if (score >= 0.85) return { score: 1 };
                if (score >= 0.6) return { score: 0.5, note: 'Casi: revisa la corrección' };
                return { score: 0 };
            }
            case 'es':
                return { score: gradeSpanish(value, slot.expected) };
            case 'free-kata': {
                const katakana = value.replace(/[・ー\s]/g, '');
                return katakana.length >= 2 && isKatakana(katakana) ? { score: 1 } : { score: 0, note: 'Escríbelo en katakana' };
            }
            case 'free-jp': {
                // Pregunta libre: vale con 3 o más caracteres japoneses (kana o kanji)
                const japaneseChars = (value.match(/[぀-ヿ一-龯]/g) ?? []).length;
                return { score: japaneseChars >= 3 ? 1 : 0 };
            }
            case 'order':
                return { score: stripPunctuation(value) === stripPunctuation(slot.expected) ? 1 : 0 };
        }
    }

    /** Corrige la hoja entera: nota por casilla, por ítem y por sección, puntos y puntos extra */
    grade(draft: Draft) {
        const perSlot: Record<string, SlotResult> = {};
        const perItem: Record<string, number> = {};
        const perSection: number[] = [];
        let score = 0;
        let bonus = 0;
        for (const section of draft.exam.sections) {
            let sectionScore = 0;
            for (const item of section.items) {
                const slotResults = item.slots.map((slot) => (perSlot[slot.id] = this.checkSlot(slot, draft.answers[slot.id])));
                const average = slotResults.reduce((sum, result) => sum + result.score, 0) / slotResults.length;
                // «Mi respuesta vale» da los puntos enteros; si no, la media redondeada abajo al medio punto
                const points = draft.overrides[item.id] ? item.points : roundDownToHalf(item.points * average);
                perItem[item.id] = points;
                sectionScore += points;
            }
            perSection.push(sectionScore);
            if (section.bonus) bonus += sectionScore;
            else score += sectionScore;
        }
        return { perSlot, perItem, perSection, score, bonus, total: draft.exam.total };
    }

    /** Entrega la hoja: la corrige, alimenta el repaso, suma XP y guarda el historial y la mejor nota */
    submit(): void {
        const draft = this.draft();
        if (!draft || draft.submittedAt) return;
        // 1. Marcar como entregada
        const submitted: Draft = { ...draft, submittedAt: Date.now() };
        this.draft.set(submitted);
        this.persist();
        const result = this.grade(submitted);
        // 2. El vocabulario alimenta el repaso espaciado (acierto = todos los puntos del ítem)
        for (const section of submitted.exam.sections) {
            for (const item of section.items) {
                if (item.word) this.progressSVC.recordAnswer(`w:${item.word}`, result.perItem[item.id] >= item.points);
            }
        }
        // 3. XP (2 por punto), sesión e historial
        this.progressSVC.addXp(Math.round((result.score + result.bonus) * 2));
        this.progressSVC.finishSession();
        this.progressSVC.saveExam({
            date: new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            title: `${submitted.exam.title} ${submitted.exam.subtitle}`,
            score: Math.round((result.score + result.bonus) * 10) / 10,
            total: result.total,
        });
        // 4. Mejor nota
        this.saveBest();
    }

    /** Guarda la mejor nota (en %, con extra, tope 100) del examen entregado */
    private saveBest(): void {
        const draft = this.draft();
        if (!draft?.submittedAt) return;
        const result = this.grade(draft);
        const percent = Math.round(((result.score + result.bonus) / result.total) * 100);
        this.best.update((best) => ({ ...best, [draft.exam.presetId]: Math.max(best[draft.exam.presetId] ?? 0, Math.min(100, percent)) }));
        save('levelBest', this.best());
    }

    /** Cuenta las casillas en blanco (sin la sección extra) */
    blankCount(draft: Draft): number {
        return draft.exam.sections
            .filter((section) => !section.bonus)
            .flatMap((section) => section.items.flatMap((item) => item.slots))
            .filter((slot) => !(draft.answers[slot.id] ?? '').trim()).length;
    }
    // ------------------------------- Corrección ------------------------------------------------------------- //
}
