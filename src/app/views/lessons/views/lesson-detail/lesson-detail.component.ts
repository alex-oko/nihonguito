import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../../../services/lesson.service';
import { LessonTab, Word, WordType, WordTypeFilter, Lesson } from '../../../../interfaces/lesson.interface';
import { MASTERED_BOX, ProgressService, SCRIPT_OPTIONS } from '../../../../services/progress.service';
import { Settings } from '../../../../interfaces/progress.interface';
import { SpeechService } from '../../../../services/speech.service';
import { wordMain, wordReading } from '../../../../utils/questions.utils';
import { grammarKeys, nextGrammar } from '../../../../utils/guided-session.utils';
import { forYou, interestLabel } from '../../../../utils/interests.utils';
import { romaji, shortEs } from '../../../../utils/text.utils';
import { Skill } from '../../../../interfaces/skill.interface';
import { SKILLS } from '../../../../utils/skills.utils';
import { KNOWN_BOX, tone } from '../../../../utils/dashboard.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { SpeakButtonComponent } from '../../../../components/speak-button/speak-button.component';
import { JpComponent } from '../../../../components/jp/jp.component';

/** Filtros de la pestaña «Palabras»; solo se enseñan los que tienen alguna palabra en la lección */
const TYPE_FILTERS: WordTypeFilter[] = [
    { id: 'all', label: 'Todas', types: [] },
    { id: 'noun', label: 'Sustantivos', types: ['noun', 'pron'] },
    { id: 'verb', label: 'Verbos', types: ['verb'] },
    { id: 'adj', label: 'Adjetivos', types: ['i-adj', 'na-adj'] },
    { id: 'expr', label: 'Expresiones', types: ['expr', 'adv', 'other', 'counter'] },
    { id: 'name', label: 'Nombres', types: ['name'] },
];
/** Acierto por debajo del cual el ejercicio de la habilidad más floja se marca para reforzar */
const WEAK_MODE_PCT = 60;
/** Acierto por debajo del cual el informe considera floja a una habilidad */
const WEAK_SKILL_PCT = 80;
/** Palabras que se enseñan en «Se te escapan» */
const HARD_WORDS_SHOWN = 4;
/** Palabras nuevas por sesión guiada (las mismas que pide lesson-practice) */
const GUIDED_WORDS = 5;

@Component({
    selector: 'app-lesson-detail',
    imports: [RouterLink, IconComponent, SpeakButtonComponent, JpComponent],
    templateUrl: './lesson-detail.component.html',
    styleUrl: './lesson-detail.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LessonDetailComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private speechSVC = inject(SpeechService);

    // --- Inputs y outputs ---
    // Llega de la ruta lecciones/:id (withComponentInputBinding)
    readonly id = input.required<string>();

    // --- Estados UI con Signals ---
    protected lesson = signal<Lesson | null>(null);
    protected hasError = signal(false);
    protected tab = signal<LessonTab>('practice');
    protected typeFilter = signal('all');
    /** Claves de las frases con la traducción a la vista ('p0', 'e3', 'y1'…) */
    protected revealed = signal(new Set<string>());
    /** Tema abierto en la pestaña «Extra» (el primero empieza abierto) */
    protected openTopic = signal<number | null>(0);

    // --- Valores derivados (computed) ---
    protected lessonId = computed(() => Number(this.id()));
    protected typeFilters = computed(() =>
        TYPE_FILTERS.filter((filter) => filter.id === 'all' || this.lesson()?.vocab.some((word) => filter.types.includes(word.type as WordType))),
    );
    protected words = computed(() => {
        const lesson = this.lesson();
        if (!lesson) return [];
        const activeFilter = TYPE_FILTERS.find((filter) => filter.id === this.typeFilter());
        return !activeFilter || activeFilter.id === 'all' ? lesson.vocab : lesson.vocab.filter((word) => activeFilter.types.includes(word.type as WordType));
    });
    /** Palabras de la lección en la caja `KNOWN_BOX` o más (la barra de la cabecera) */
    protected learned = computed(() => {
        const lesson = this.lesson();
        if (!lesson || !lesson.vocab.length) return 0;
        const mastery = this.progressSVC.mastery();
        return lesson.vocab.filter((word) => (mastery[`w:${word.id}`]?.box ?? -1) >= KNOWN_BOX).length;
    });
    protected script = computed(() => this.progressSVC.settings().script);
    protected showRomaji = computed(() => this.progressSVC.settings().romaji);
    protected hasSentences = computed(() => {
        const lesson = this.lesson();
        return !!lesson && lesson.patterns.length + lesson.examples.length + lesson.conversations.length > 0;
    });

    /** «Extra» solo dice poco: una línea cuenta qué hay dentro */
    protected tabHint = computed(() => (this.tab() === 'extra' ? 'Palabras extra y Japón en la vida real.' : null));

    /** Lo que cubrirá la próxima sesión guiada */
    protected plan = computed(() => {
        const lesson = this.lesson();
        if (!lesson) return null;
        // Nombre corto de cada punto: su fragmento en japonés o, si no tiene, el título hasta « — »
        const grammar = nextGrammar(lesson).map((index) => grammarKeys(lesson.grammar[index])[0] ?? lesson.grammar[index].title.split(' — ')[0]);
        return { words: Math.min(GUIDED_WORDS, lesson.vocab.length), grammar, sentences: this.hasSentences() };
    });

    /** Los pasos de la sesión guiada, dibujados como piedras de un camino */
    protected steps = computed(() => {
        const guidedPlan = this.plan();
        if (!guidedPlan) return [];
        const stones: { icon: string; label: string }[] = [];
        if (guidedPlan.words) stones.push({ icon: 'cards', label: `${guidedPlan.words} palabras` });
        if (guidedPlan.grammar.length) stones.push({ icon: 'bulb', label: 'Gramática' });
        if (guidedPlan.sentences) stones.push({ icon: 'chat', label: 'Frases' });
        stones.push({ icon: 'star', label: 'Repaso' });
        return stones;
    });

    /** Acierto por habilidad, mejor prueba final y palabras más falladas; null hasta que se practica algo */
    protected report = computed(() => {
        const lesson = this.lesson();
        if (!lesson) return null;

        // 1. Acierto por habilidad (sin ordenar ni partículas si la lección no tiene frases)
        const stats = this.progressSVC.lessonSkills()[lesson.id] ?? {};
        const bestRaw = this.progressSVC.lessonBest()[lesson.id];
        const best = bestRaw === undefined ? null : bestRaw;
        const sentences = this.hasSentences();
        const skills = SKILLS.filter((skill) => sentences || (skill.id !== 'order' && skill.id !== 'particles')).map((skill) => {
            const stat = stats[skill.id];
            return { ...skill, pct: stat?.total ? Math.round((stat.correct / stat.total) * 100) : null };
        });

        // 2. Palabras más falladas: primero por proporción de fallos, luego por número de fallos
        const mastery = this.progressSVC.mastery();
        const hard = lesson.vocab
            .map((word) => ({ word, entry: mastery[`w:${word.id}`] }))
            .filter((scored) => scored.entry && scored.entry.wrong > 0)
            .sort((a, b) => b.entry.wrong / b.entry.seen - a.entry.wrong / a.entry.seen || b.entry.wrong - a.entry.wrong)
            .slice(0, HARD_WORDS_SHOWN)
            .map((scored) => ({ ...scored.word, es: shortEs(scored.word.es) }));

        // 3. Sin nada practicado no hay informe; si no, la habilidad más floja (si baja de WEAK_SKILL_PCT)
        const practiced = skills.filter((skill) => skill.pct !== null);
        if (!practiced.length && best === null && !hard.length) return null;
        const worst = [...practiced].sort((a, b) => a.pct! - b.pct!)[0];
        return { best, skills, hard, weak: worst && worst.pct! < WEAK_SKILL_PCT ? worst : null };
    });

    /** El ejercicio a reforzar: la habilidad más floja cuando baja del 60% */
    protected weakMode = computed(() => {
        const weak = this.report()?.weak;
        return weak && weak.pct! < WEAK_MODE_PCT ? weak.id : null;
    });

    protected hasInterests = computed(() => (this.progressSVC.settings().interests ?? []).length > 0);
    protected forYouList = computed(() => {
        const lesson = this.lesson();
        return lesson ? forYou(lesson, this.progressSVC.settings().interests ?? []) : [];
    });

    protected sentenceModes = computed(() => {
        const hasSentences = this.hasSentences();
        const hasGrammar = !!this.lesson()?.grammar.length;
        return [
            { id: 'grammar', icon: 'bulb', label: 'Gramática', show: hasGrammar, note: 'explicada' },
            { id: 'sentences', icon: 'chat', label: 'Frases', show: hasSentences },
            { id: 'order', icon: 'sort', label: 'Ordenar', show: hasSentences },
            { id: 'particles', icon: 'link', label: 'Partículas', show: hasSentences },
        ].filter((exerciseMode) => exerciseMode.show);
    });

    /** Lección anterior del índice, o null en la primera */
    protected prev = computed(() => {
        const lessonIndex = this.lessonSVC.index();
        const position = lessonIndex.findIndex((meta) => meta.id === this.lessonId());
        return position > 0 ? lessonIndex[position - 1].id : null;
    });
    /** Lección siguiente del índice, o null en la última */
    protected next = computed(() => {
        const lessonIndex = this.lessonSVC.index();
        const position = lessonIndex.findIndex((meta) => meta.id === this.lessonId());
        return position >= 0 && position < lessonIndex.length - 1 ? lessonIndex[position + 1].id : null;
    });

    // Opciones fijas de la plantilla
    protected scripts = SCRIPT_OPTIONS;
    protected masteredBox = MASTERED_BOX;
    protected tabs: { id: LessonTab; label: string; icon: string }[] = [
        { id: 'practice', label: 'Ejercicios', icon: 'dumbbell' },
        { id: 'vocab', label: 'Palabras', icon: 'cards' },
        { id: 'grammar', label: 'Gramática', icon: 'bulb' },
        { id: 'phrases', label: 'Frases', icon: 'chat' },
        { id: 'extra', label: 'Extra', icon: 'plus' },
    ];
    protected vocabModes = [
        { id: 'learn', icon: 'cards', label: 'Tarjetas', note: 'conocer', color: 'accent' },
        { id: 'meaning', icon: 'eye', label: 'Significado', color: 'ok' },
        { id: 'reverse', icon: 'swap', label: 'Al japonés', color: 'gold' },
        { id: 'listen', icon: 'headphones', label: 'Escucha', color: 'bad' },
        { id: 'write', icon: 'pencil', label: 'Escribir', color: 'indigo' },
        { id: 'speak', icon: 'mic', label: 'Pronunciar', color: 'indigo' },
        { id: 'match', icon: 'puzzle', label: 'Parejas', note: 'juego', color: 'signal' },
    ];

    constructor() {
        // Recarga al cambiar de lección con las flechas; untracked para que lo que lee loadLesson no vuelva a disparar el effect
        effect(() => {
            const id = this.lessonId();
            untracked(() => void this.loadLesson(id));
        });
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga la lección, vuelve a la pestaña de ejercicios y la marca como la última abierta */
    private async loadLesson(id: number): Promise<void> {
        this.lesson.set(null);
        this.hasError.set(false);
        this.tab.set('practice');
        this.typeFilter.set('all');
        try {
            this.lesson.set(await this.lessonSVC.get(id));
            // La lección 0 (kana) no cuenta como «la lección en la que vas»
            if (id >= 1) this.progressSVC.lastLesson.set({ id });
            // El índice hace falta para las flechas de anterior y siguiente
            void this.lessonSVC.loadIndex();
        } catch {
            this.hasError.set(true);
        }
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Ejercicios ------------------------------------------------------------- //
    /** Devuelve el acierto que se enseña en cada ejercicio, sacado de las notas guardadas de esta lección */
    protected modeStat(exerciseMode: { id: string; note?: string }): { text: string; tone: string } {
        if (exerciseMode.note) return { text: exerciseMode.note, tone: 'note' };
        const stat = this.progressSVC.lessonSkills()[this.lessonId()]?.[exerciseMode.id as Skill];
        if (!stat?.total) return { text: 'sin probar', tone: 'none' };
        const pct = Math.round((stat.correct / stat.total) * 100);
        return { text: `${pct}%`, tone: tone(pct) };
    }

    /** Devuelve el tono (ok, mid, bad) de un porcentaje */
    protected toneOf(pct: number | null) {
        return tone(pct);
    }
    // ------------------------------- Ejercicios ------------------------------------------------------------- //

    // ------------------------------- Palabras y frases ------------------------------------------------------------- //
    /** Devuelve la forma principal de una palabra (con kanji si los tiene) */
    protected mainForm(word: Word): string {
        return wordMain(word, true);
    }

    /** Devuelve la lectura en kana de una palabra */
    protected readingOf(word: Word): string {
        return wordReading(word);
    }

    /** Devuelve el romaji de un texto en kana */
    protected toRomaji(text: string): string {
        return romaji(text);
    }

    /** Devuelve la caja de Leitner de una palabra (colorea el punto de la lista) */
    protected masteryBox(word: Word): number {
        return this.progressSVC.box(`w:${word.id}`);
    }

    /** Devuelve el nombre en español de un interés */
    protected tagLabel(tag?: string): string {
        return tag ? interestLabel(tag) : '';
    }

    /** Lee un texto en voz alta */
    protected say(text: string): void {
        void this.speechSVC.speak(text);
    }

    /** Enseña u oculta la traducción de una frase */
    protected toggleReveal(key: string): void {
        this.revealed.update((revealedKeys) => {
            // Set nuevo: el signal solo avisa si cambia la referencia
            const updatedKeys = new Set(revealedKeys);
            if (updatedKeys.has(key)) updatedKeys.delete(key);
            else updatedKeys.add(key);
            return updatedKeys;
        });
    }
    // ------------------------------- Palabras y frases ------------------------------------------------------------- //

    // ------------------------------- Ajustes de escritura ------------------------------------------------------------- //
    /** Cambia la escritura (kanji, kana…) en los ajustes del usuario */
    protected setScript(script: Settings['script']): void {
        this.progressSVC.settings.update((settings) => ({ ...settings, script }));
    }

    /** Activa o desactiva el romaji en los ajustes del usuario */
    protected toggleRomaji(): void {
        this.progressSVC.settings.update((settings) => ({ ...settings, romaji: !settings.romaji }));
    }
    // ------------------------------- Ajustes de escritura ------------------------------------------------------------- //
}
