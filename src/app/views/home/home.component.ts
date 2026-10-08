import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { Lesson, LessonMeta, Word } from '../../interfaces/lesson.interface';
import { ProgressService } from '../../services/progress.service';
import { SpeechService } from '../../services/speech.service';
import { ReadinessService } from '../../services/readiness.service';
import { wordMain, wordReading } from '../../utils/questions.utils';
import { romaji, shortEs, todayKey } from '../../utils/text.utils';
import { knownWords, skillRows, tone, upcomingExams, weakestSkill } from '../../utils/dashboard.utils';
import { Tone } from '../../interfaces/dashboard.interface';
import { AltStep, HardWord, HomeDay, House, NextStep } from '../../interfaces/home.interface';
import { skillIcon } from '../../utils/skills.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { SpeakButtonComponent } from '../../components/speak-button/speak-button.component';
import { JpComponent } from '../../components/jp/jp.component';
import { MusubiComponent } from '../../components/musubi/musubi.component';
import { MusubiSayComponent } from '../../components/musubi-say/musubi-say.component';
import { PetService } from '../../services/pet.service';
import { ExamReadinessComponent } from '../../components/exam-readiness/exam-readiness.component';
import { UpdateService } from '../../services/update.service';

/** Inicial de cada día de la semana (getDay: 0 = domingo) para la tira de 14 días */
const DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
/** Kanji del día de la semana (getDay: 0 = domingo) */
const WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土'];
/** Lectura en kana del día de la semana (getDay: 0 = domingo) */
const WEEKDAY_KANA = ['にちようび', 'げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび', 'どようび'];
/** Texto de estado de cada tono en «Tus habilidades» */
const SKILL_STATUS: Record<Tone, string> = { ok: 'Fuerte', mid: 'Mejorable', bad: 'Refuerza', none: 'Sin probar' };
/** Días que enseña la tira de farolillos */
const HISTORY_DAYS = 14;
/** Casas que se ven a la vez en el barrio */
const VISIBLE_HOUSES = 4;
/** Ventanas por casa (3 columnas × 2 filas) */
const WINDOWS_PER_HOUSE = 6;
/** Por debajo de este % de aciertos, la habilidad más floja pasa a ser el siguiente paso */
const WEAK_SKILL_PCT = 60;
/** Con estas palabras pendientes o más, el siguiente paso es el repaso */
const REVIEW_DUE_MIN = 10;
/** Parte de las palabras de la lección que hay que conocer para proponer la prueba */
const TEST_KNOWN_SHARE = 0.6;
/** % en la prueba de la lección a partir del cual la lección cuenta como dominada */
const LESSON_MASTERED_PCT = 80;

@Component({
    selector: 'app-home',
    imports: [RouterLink, IconComponent, SpeakButtonComponent, JpComponent, MusubiComponent, MusubiSayComponent, ExamReadinessComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
    // --- Inyección de dependencias ---
    protected progressSVC = inject(ProgressService);
    protected readinessSVC = inject(ReadinessService);
    protected petSVC = inject(PetService);
    protected updateSVC = inject(UpdateService);
    private lessonSVC = inject(LessonService);
    private speechSVC = inject(SpeechService);

    // --- Estados UI con Signals ---
    protected wordOfTheDay = signal<Word | null>(null);
    private lessonIndex = signal<LessonMeta[]>([]);
    // Lecciones cargadas para Inicio: alrededor de la actual y las que tienen palabras falladas
    private loadedLessons = signal<Map<number, Lesson>>(new Map());
    // Frase de Musubi que se está mostrando (crece en cada toque)
    private lineIndex = signal(0);

    // --- Valores derivados (computed) ---
    protected name = computed(() => this.progressSVC.settings().name.trim());
    protected goal = computed(() => this.progressSVC.settings().dailyGoal);
    protected goalPct = computed(() => Math.min(100, (this.progressSVC.todayXp() / this.goal()) * 100));
    protected lastLesson = computed(() => this.progressSVC.lastLesson().id);
    protected showRomaji = computed(() => this.progressSVC.settings().romaji);

    /** Fecha de hoy en japonés: 日 · にちようび · 9月27日 */
    protected today = computed(() => {
        const now = new Date();
        const spanishDate = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
        return {
            kanji: WEEKDAY_KANJI[now.getDay()],
            kana: WEEKDAY_KANA[now.getDay()],
            es: spanishDate.charAt(0).toUpperCase() + spanishDate.slice(1),
            jpDate: `${now.getMonth() + 1}月${now.getDate()}日`,
        };
    });

    /** Saludo según la hora: antes de las 11, antes de las 18, o de noche */
    protected greeting = computed(() => {
        const hour = new Date().getHours();
        if (hour < 11) return 'おはよう';
        if (hour < 18) return 'こんにちは';
        return 'こんばんは';
    });

    protected goalMessage = computed(() => {
        const xp = this.progressSVC.todayXp();
        if (xp === 0) return 'Haz una práctica corta para empezar tu racha.';
        if (xp < this.goal()) return `Te faltan ${this.goal() - xp} XP para tu meta de hoy.`;
        return '¡Meta cumplida! お疲れさま。';
    });

    /** Palabras (claves w:) cuyo repaso toca hoy o antes */
    protected dueCount = computed(() => {
        const today = todayKey();
        return Object.entries(this.progressSVC.mastery()).filter(([key, entry]) => key.startsWith('w:') && entry.due <= today).length;
    });

    /** Lo que dice Musubi: primero sobre ti, después consejos cortos; al tocarlo pasa a la siguiente */
    private lines = computed(() => {
        const name = this.name();
        const greetingHtml = `<b class="jp">${this.greeting()}${name ? '、' + escapeHtml(name) : ''}！</b>`;
        const lines: string[] = [];
        const hardest = this.hardWords()[0];
        const streak = this.progressSVC.currentStreak();
        if (hardest) lines.push(`${greetingHtml} Se te escapa <b class="jp">${escapeHtml(this.mainText(hardest.word))}</b>. Si lo repasamos hoy, se enciende otra ventana del barrio.`);
        else lines.push(`${greetingHtml} Cada palabra que dominas enciende una ventana del barrio.`);
        if (streak > 1) lines.push(`Llevas ${streak} días seguidos. <b class="jp">いいね！</b> Hoy basta con 5 minutos.`);
        else lines.push('Volver cada día cuenta más que estudiar mucho un solo día.');
        lines.push('¿Sabías que <b class="jp">おむすび</b> viene de <b class="jp">むすぶ</b>, "unir"? Como tú y el japonés.');
        lines.push(`Toca la fecha de arriba para oír cómo se dice hoy en japonés: <b class="jp">${this.today().jpDate}</b>.`);
        return lines;
    });
    protected line = computed(() => this.lines()[this.lineIndex() % this.lines().length]);
    protected musubiMood = computed(() => (this.progressSVC.todayXp() >= this.goal() ? 'happy' : 'idle'));

    /** Las 4 casas del barrio: la lección anterior a la actual y las siguientes */
    protected houses = computed<House[]>(() => {
        const lessonIds = this.lessonIndex()
            .map((lesson) => lesson.id)
            .filter((id) => id >= 1);
        const lastLessonId = this.lastLesson();
        const currentIndex = Math.max(0, lessonIds.indexOf(lastLessonId));
        // Empieza una antes de la actual, sin pasarse del final (siempre se ven 4 si existen)
        const firstIndex = Math.max(0, Math.min(currentIndex - 1, lessonIds.length - VISIBLE_HOUSES));
        const mastery = this.progressSVC.mastery();
        return lessonIds.slice(firstIndex, firstIndex + VISIBLE_HOUSES).map((id, position) => {
            const lesson = this.loadedLessons().get(id);
            const knownShare = lesson?.vocab.length ? knownWords(lesson, mastery) / lesson.vocab.length : 0;
            return { id, x: 16 + position * 92, lit: Math.round(knownShare * WINDOWS_PER_HOUSE), started: id <= lastLessonId || knownShare > 0 };
        });
    });

    /** Siguiente paso recomendado, por prioridad: habilidad floja, repaso, prueba de la lección, sesión guiada */
    protected nextStep = computed<NextStep>(() => {
        const lessonId = this.lastLesson();
        const lesson = this.loadedLessons().get(lessonId);
        const weak = weakestSkill(this.progressSVC.lessonSkills()[lessonId]);
        const due = this.dueCount();
        const best = this.progressSVC.lessonBest()[lessonId];
        const chips = this.hardWords()
            .filter((hardWord) => hardWord.lesson === lessonId)
            .slice(0, 3)
            .map((hardWord) => this.mainText(hardWord.word));

        // 1. Una habilidad de la lección actual por debajo del 60%
        if (weak && weak.pct! < WEAK_SKILL_PCT) {
            return {
                kind: 'skill',
                icon: 'target',
                eyebrow: 'REFORZAR · ~5 MIN',
                title: `Lección ${lessonId} · Refuerza ${weak.label.toLowerCase()}`,
                body: `Aciertas ${weak.pct}% en ${weak.label} (${weak.total} respuestas). Es lo que más te baja la nota de esta lección.`,
                chips,
                link: ['/lecciones', lessonId, 'practica', weak.skill],
                cta: `Practicar ${weak.label}`,
            };
        }
        // 2. Muchas palabras esperando repaso
        if (due >= REVIEW_DUE_MIN) {
            return {
                kind: 'review',
                icon: 'refresh',
                eyebrow: 'REPASO · ~5 MIN',
                title: `${due} palabras esperan repaso`,
                body: 'Si las repasas hoy, pasan a la siguiente caja y no se te olvidan.',
                chips: [],
                link: ['/repaso'],
                cta: 'Repasar ahora',
            };
        }
        // 3. Ya conoce buena parte del vocabulario pero no ha aprobado la prueba
        if (lesson && lesson.vocab.length && knownWords(lesson, this.progressSVC.mastery()) / lesson.vocab.length >= TEST_KNOWN_SHARE && (best ?? 0) < LESSON_MASTERED_PCT) {
            return {
                kind: 'test',
                icon: 'trophy',
                eyebrow: 'COMPRUÉBALO · ~8 MIN',
                title: `Lección ${lessonId} · Prueba de la lección`,
                body:
                    best === undefined
                        ? 'Ya dominas buena parte de las palabras. Mide si la lección está lista.'
                        : `Tu mejor resultado es ${best}%. Con 80% la das por dominada.`,
                chips,
                link: ['/lecciones', lessonId, 'practica', 'test'],
                cta: 'Hacer la prueba',
            };
        }
        // 4. Sesión guiada: de la lección siguiente si la actual ya está dominada
        const nextId = (best ?? 0) >= LESSON_MASTERED_PCT ? this.nextLessonId(lessonId) : null;
        const targetId = nextId ?? lessonId;
        const title = this.lessonIndex().find((meta) => meta.id === targetId)?.title;
        return {
            kind: 'guided',
            icon: 'book',
            eyebrow: 'SESIÓN GUIADA · ~6 MIN',
            title: `Lección ${targetId}${title ? ' · ' + title : ''}`,
            body: nextId
                ? `Dominaste la lección ${lessonId}. Empieza la siguiente con palabras, gramática y frases.`
                : 'Palabras nuevas, un punto de gramática y frases completas, paso a paso.',
            chips: nextId ? [] : chips,
            link: ['/lecciones', targetId, 'practica', 'guided'],
            cta: nextId ? 'Empezar la lección' : 'Continuar',
        };
    });

    /** Dos alternativas al siguiente paso: nunca del mismo tipo, y el repaso solo si hay algo pendiente */
    protected altSteps = computed<AltStep[]>(() => {
        const step = this.nextStep();
        const lessonId = this.lastLesson();
        const due = this.dueCount();
        const allSteps: AltStep[] = [
            { kind: 'review', icon: 'refresh', color: 'gold', title: 'Repaso de palabras', sub: `${due} ${due === 1 ? 'lista' : 'listas'} · ~4 min`, link: ['/repaso'] },
            { kind: 'guided', icon: 'book', color: 'ok', title: 'Sesión guiada', sub: `Lección ${lessonId} · ~6 min`, link: ['/lecciones', lessonId, 'practica', 'guided'] },
            { kind: 'convo', icon: 'mic', color: 'indigo', title: 'Conversación', sub: 'Escucha y responde', link: ['/conversaciones'] },
        ];
        return allSteps.filter((alt) => alt.kind !== step.kind && (alt.kind !== 'review' || due > 0)).slice(0, 2);
    });

    /** Preparación para el próximo examen de nivel (null hasta que cargan sus lecciones) */
    protected exam = computed(() => this.readinessSVC.for(upcomingExams(this.lastLesson())[0]));

    /** Tira de los últimos 14 días: XP de cada día, si cumplió la meta, total y días cumplidos */
    protected days = computed(() => {
        const activity = this.progressSVC.activity();
        const goal = this.goal();
        const list: HomeDay[] = Array.from({ length: HISTORY_DAYS }, (_, dayIndex) => {
            const date = new Date();
            date.setDate(date.getDate() - (HISTORY_DAYS - 1 - dayIndex));
            const xp = activity[todayKey(date)] ?? 0;
            const isToday = dayIndex === HISTORY_DAYS - 1;
            return {
                key: todayKey(date),
                xp,
                today: isToday,
                state: xp >= goal ? 'on' : xp >= goal / 2 ? 'half' : 'off',
                label: isToday ? 'hoy' : DAY_INITIALS[date.getDay()],
                title: `${date.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })}: ${xp} XP`,
            };
        });
        return { list, total: list.reduce((sum, day) => sum + day.xp, 0), met: list.filter((day) => day.state === 'on').length };
    });

    /** Todas las habilidades, la peor primero; las que no se han practicado, al final */
    protected skills = computed(() => {
        const rows = skillRows(Object.values(this.progressSVC.lessonSkills()))
            .map((row) => {
                const rowTone = tone(row.pct);
                const color = rowTone === 'ok' ? 'ok' : rowTone === 'mid' ? 'gold' : rowTone === 'bad' ? 'bad' : 'indigo';
                return { ...row, tone: rowTone, status: SKILL_STATUS[rowTone], icon: skillIcon(row.skill), color };
            })
            // Las no practicadas (pct null) cuentan como 101 para quedar detrás de un 100%
            .sort((first, second) => (first.pct ?? 101) - (second.pct ?? 101));
        return { rows, practiced: rows.some((row) => row.pct !== null) };
    });

    /** Palabras de cualquier lección con peor proporción de fallos (máximo 4) */
    protected hardWords = computed<HardWord[]>(() => {
        const lessons = this.loadedLessons();
        return Object.entries(this.progressSVC.mastery())
            .filter(([key, entry]) => key.startsWith('w:') && entry.wrong > 0)
            .sort(([, first], [, second]) => second.wrong / second.seen - first.wrong / first.seen || second.wrong - first.wrong)
            // Se toman 6 y se dejan 4: alguna puede no encontrarse si su lección no está cargada
            .slice(0, 6)
            .flatMap(([key, entry]) => {
                const lesson = lessonOfWord(key);
                const word = lessons.get(lesson)?.vocab.find((vocab) => `w:${vocab.id}` === key);
                return word ? [{ word, lesson, wrong: entry.wrong, es: shortEs(word.es) }] : [];
            })
            .slice(0, 4);
    });

    // Bombillas de la guirnalda del barrio: [x, y] dentro del viewBox 390×110
    protected bulbs = [
        [50, 51],
        [105, 54],
        [160, 48],
        [245, 44],
        [300, 47],
        [355, 48],
    ];
    // 6 ventanas por casa, 3 columnas × 2 filas: [x, y] relativas a la casa
    protected windows = [
        [12, 82],
        [28.5, 82],
        [45, 82],
        [12, 96],
        [28.5, 96],
        [45, 96],
    ];

    constructor() {
        void this.load();
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Carga el índice, las lecciones que necesita Inicio y elige la palabra del día */
    private async load(): Promise<void> {
        // 1. Índice de lecciones y preparación del próximo examen
        const lessonIndex = await this.lessonSVC.loadIndex();
        this.lessonIndex.set(lessonIndex);
        const lastLessonId = this.lastLesson();
        const [exam] = upcomingExams(lastLessonId);
        void this.readinessSVC.ensure(exam.lessons);

        // 2. Lecciones del barrio (anterior, actual y dos siguientes) y las de las palabras falladas
        const missedLessons = Object.entries(this.progressSVC.mastery())
            .filter(([key, entry]) => key.startsWith('w:') && entry.wrong > 0)
            .map(([key]) => lessonOfWord(key));
        const wantedIds = new Set([lastLessonId - 1, lastLessonId, lastLessonId + 1, lastLessonId + 2, ...missedLessons]);
        const ids = lessonIndex.map((meta) => meta.id).filter((id) => id >= 1 && wantedIds.has(id));
        const lessons = await this.lessonSVC.getMany(ids);
        this.loadedLessons.set(new Map(lessons.map((lesson) => [lesson.id, lesson])));

        // 3. Palabra del día: fija para cada fecha (hash del día), entre las lecciones hasta la actual
        const upToId = Math.max(1, lastLessonId);
        const pool = lessonIndex.filter((meta) => meta.id >= 1 && meta.id <= upToId).map((meta) => meta.id);
        const seed = [...todayKey()].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
        const lesson = await this.lessonSVC.get(pool[seed % pool.length] ?? 1);
        const words = lesson.vocab.filter((word) => word.type !== 'name' && wordReading(word));
        if (words.length) this.wordOfTheDay.set(words[seed % words.length]);
    }

    /** Devuelve el id de la lección que sigue a la dada en el índice, o null si es la última */
    private nextLessonId(id: number): number | null {
        const ids = this.lessonIndex().map((meta) => meta.id);
        const position = ids.indexOf(id);
        return position >= 0 && position < ids.length - 1 ? ids[position + 1] : null;
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Musubi y voz ------------------------------------------------------------- //
    /** Pasa a la siguiente frase de Musubi */
    protected nextLine(): void {
        this.lineIndex.update((index) => index + 1);
    }

    /** Lee en voz alta la fecha de hoy en japonés */
    protected sayToday(): void {
        void this.speechSVC.speak(`きょうは ${this.today().jpDate} ${this.today().kana}です。`);
    }

    /** Lee en voz alta un texto */
    protected say(text: string): void {
        void this.speechSVC.speak(text);
    }
    // ------------------------------- Musubi y voz ------------------------------------------------------------- //

    // ------------------------------- Texto de palabras ------------------------------------------------------------- //
    /** Devuelve la forma principal de la palabra (con kanji si los tiene) */
    protected mainText(word: Word): string {
        return wordMain(word, true);
    }

    /** Devuelve la lectura en kana de la palabra */
    protected readingText(word: Word): string {
        return wordReading(word);
    }

    /** Devuelve el texto en romaji */
    protected toRomaji(text: string): string {
        return romaji(text);
    }
    // ------------------------------- Texto de palabras ------------------------------------------------------------- //
}

/** Devuelve el número de lección de una clave de palabra: `w:L01-003` → 1 */
function lessonOfWord(key: string): number {
    return Number(/^w:L(\d+)/.exec(key)?.[1] ?? -1);
}

/** Escapa el texto para meterlo en el HTML de las frases de Musubi (el nombre lo escribe el usuario) */
function escapeHtml(text: string): string {
    return text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);
}
