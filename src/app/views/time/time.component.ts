import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ProgressService } from '../../services/progress.service';
import { persisted } from '../../utils/storage.utils';
import { SpeakButtonComponent } from '../../components/speak-button/speak-button.component';
import { TimeEntry, TopicId, TimeTopic } from '../../interfaces/time.interface';

/** Temas con sus expresiones, en el orden de las pestañas */
const TOPICS: TimeTopic[] = [
    {
        id: 'numbers',
        glyph: '数',
        name: 'Números',
        intro: 'Construye cifras combinando unidades: 二十一 = 21, 百三 = 103.',
        entries: [
            { jp: '零 / ゼロ', reading: 'れい / ゼロ', es: '0' },
            { jp: '一', reading: 'いち', es: '1' },
            { jp: '二', reading: 'に', es: '2' },
            { jp: '三', reading: 'さん', es: '3' },
            { jp: '四', reading: 'よん / し', es: '4' },
            { jp: '五', reading: 'ご', es: '5' },
            { jp: '六', reading: 'ろく', es: '6' },
            { jp: '七', reading: 'なな / しち', es: '7' },
            { jp: '八', reading: 'はち', es: '8' },
            { jp: '九', reading: 'きゅう / く', es: '9' },
            { jp: '十', reading: 'じゅう', es: '10' },
            { jp: '百', reading: 'ひゃく', es: '100', note: '300 さんびゃく · 600 ろっぴゃく · 800 はっぴゃく' },
            { jp: '千', reading: 'せん', es: '1.000', note: '3.000 さんぜん · 8.000 はっせん' },
            { jp: '万', reading: 'まん', es: '10.000' },
        ],
    },
    {
        id: 'week',
        glyph: '曜',
        name: 'Días',
        intro: '曜日 (ようび) significa “día de la semana”.',
        entries: [
            { jp: '月曜日', reading: 'げつようび', es: 'lunes' },
            { jp: '火曜日', reading: 'かようび', es: 'martes' },
            { jp: '水曜日', reading: 'すいようび', es: 'miércoles' },
            { jp: '木曜日', reading: 'もくようび', es: 'jueves' },
            { jp: '金曜日', reading: 'きんようび', es: 'viernes' },
            { jp: '土曜日', reading: 'どようび', es: 'sábado' },
            { jp: '日曜日', reading: 'にちようび', es: 'domingo' },
        ],
    },
    {
        id: 'months',
        glyph: '月',
        name: 'Meses',
        intro: 'Añade 月 (がつ) al número. Abril, julio y septiembre usan し, しち y く.',
        entries: [
            { jp: '一月', reading: 'いちがつ', es: 'enero' },
            { jp: '二月', reading: 'にがつ', es: 'febrero' },
            { jp: '三月', reading: 'さんがつ', es: 'marzo' },
            { jp: '四月', reading: 'しがつ', es: 'abril' },
            { jp: '五月', reading: 'ごがつ', es: 'mayo' },
            { jp: '六月', reading: 'ろくがつ', es: 'junio' },
            { jp: '七月', reading: 'しちがつ', es: 'julio' },
            { jp: '八月', reading: 'はちがつ', es: 'agosto' },
            { jp: '九月', reading: 'くがつ', es: 'septiembre' },
            { jp: '十月', reading: 'じゅうがつ', es: 'octubre' },
            { jp: '十一月', reading: 'じゅういちがつ', es: 'noviembre' },
            { jp: '十二月', reading: 'じゅうにがつ', es: 'diciembre' },
        ],
    },
    {
        id: 'dates',
        glyph: '日',
        name: 'Fechas',
        intro: 'Orden japonés: 2026年9月27日 = año, mes, día.',
        entries: [
            { jp: '一日', reading: 'ついたち', es: 'día 1' },
            { jp: '二日', reading: 'ふつか', es: 'día 2' },
            { jp: '三日', reading: 'みっか', es: 'día 3' },
            { jp: '四日', reading: 'よっか', es: 'día 4' },
            { jp: '五日', reading: 'いつか', es: 'día 5' },
            { jp: '六日', reading: 'むいか', es: 'día 6' },
            { jp: '七日', reading: 'なのか', es: 'día 7' },
            { jp: '八日', reading: 'ようか', es: 'día 8' },
            { jp: '九日', reading: 'ここのか', es: 'día 9' },
            { jp: '十日', reading: 'とおか', es: 'día 10' },
            { jp: '十四日', reading: 'じゅうよっか', es: 'día 14' },
            { jp: '二十日', reading: 'はつか', es: 'día 20' },
            { jp: '二十四日', reading: 'にじゅうよっか', es: 'día 24' },
            { jp: '何日', reading: 'なんにち', es: '¿qué día?' },
        ],
    },
    {
        id: 'clock',
        glyph: '時',
        name: 'Horas y expresiones',
        intro: '時 (じ) marca la hora; 分 (ふん／ぷん), los minutos.',
        entries: [
            { jp: '今', reading: 'いま', es: 'ahora' },
            { jp: '今日', reading: 'きょう', es: 'hoy' },
            { jp: '昨日', reading: 'きのう', es: 'ayer' },
            { jp: '明日', reading: 'あした', es: 'mañana' },
            { jp: '毎日', reading: 'まいにち', es: 'todos los días' },
            { jp: '朝', reading: 'あさ', es: 'mañana (parte del día)' },
            { jp: '昼', reading: 'ひる', es: 'mediodía/tarde' },
            { jp: '夜', reading: 'よる', es: 'noche' },
            { jp: '午前', reading: 'ごぜん', es: 'a. m.' },
            { jp: '午後', reading: 'ごご', es: 'p. m.' },
            { jp: '何時', reading: 'なんじ', es: '¿qué hora?' },
            { jp: '七時半', reading: 'しちじはん', es: '7:30' },
        ],
    },
    {
        id: 'duration',
        glyph: '間',
        name: 'Duraciones',
        intro: '間 (かん) enfatiza una duración. から y まで marcan desde y hasta.',
        entries: [
            { jp: '一時間', reading: 'いちじかん', es: 'una hora' },
            { jp: '二日間', reading: 'ふつかかん', es: 'dos días' },
            { jp: '三週間', reading: 'さんしゅうかん', es: 'tres semanas' },
            { jp: '四か月', reading: 'よんかげつ', es: 'cuatro meses' },
            { jp: '五年間', reading: 'ごねんかん', es: 'cinco años' },
            { jp: '九時から五時まで', reading: 'くじからごじまで', es: 'de 9 a 5' },
            { jp: '三十分ぐらい', reading: 'さんじゅっぷんぐらい', es: 'unos 30 minutos' },
            { jp: 'どのくらい', reading: 'どのくらい', es: '¿cuánto tiempo?' },
        ],
    },
];

/** Preguntas de cada vuelta del quiz */
const QUIZ_LENGTH = 8;
/** Opciones incorrectas que acompañan a la correcta */
const WRONG_CHOICES = 3;
/** XP por cada acierto */
const XP_PER_ANSWER = 2;

@Component({
    selector: 'app-time-hub',
    imports: [SpeakButtonComponent],
    templateUrl: './time.component.html',
    styleUrl: './time.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);

    // --- Estados UI con Signals ---
    protected topicId = signal<TopicId>('numbers');
    /** true mientras se hace el quiz del tema; false en la lista de estudio */
    protected quiz = signal(false);
    protected quizItems = signal<TimeEntry[]>([]);
    protected quizIndex = signal(0);
    protected score = signal(0);
    /** Opción que tocó el usuario en la pregunta actual; null mientras no ha respondido */
    protected feedback = signal<string | null>(null);
    /** Expresiones marcadas como repasadas, con clave `<tema>:<jp>` (se guarda en `nihongo:time-seen`) */
    protected seen = persisted<Record<string, boolean>>('time-seen', {});

    // --- Valores derivados (computed) ---
    protected topic = computed(() => TOPICS.find((topic) => topic.id === this.topicId())!);
    /** Pregunta actual; null cuando ya se respondieron todas (pantalla de resultado) */
    protected current = computed(() => this.quizItems()[this.quizIndex()] ?? null);
    protected masteredCount = computed(() => this.topic().entries.filter((entry) => this.isSeen(entry)).length);
    /** La respuesta correcta y tres significados de otras expresiones del mismo tema, barajados */
    protected choices = computed(() => {
        const question = this.current();
        if (!question) return [];
        const wrongPool = this.topic().entries
            .filter((entry) => entry.es !== question.es)
            .map((entry) => entry.es)
            .sort(() => Math.random() - 0.5)
            .slice(0, WRONG_CHOICES);
        return [question.es, ...wrongPool].sort(() => Math.random() - 0.5);
    });

    // Datos fijos que pinta la plantilla
    protected topics = TOPICS;

    // ------------------------------- Estudio ------------------------------------------------------------- //
    /** Cambia de tema y vuelve a la lista de estudio */
    protected choose(id: TopicId): void {
        this.topicId.set(id);
        this.quiz.set(false);
    }

    /** Indica si la expresión está marcada como repasada en el tema actual */
    protected isSeen(entry: TimeEntry): boolean {
        return !!this.seen()[`${this.topicId()}:${entry.jp}`];
    }

    /** Marca o desmarca una expresión como repasada */
    protected toggleSeen(entry: TimeEntry): void {
        const key = `${this.topicId()}:${entry.jp}`;
        this.seen.update((seenMap) => ({ ...seenMap, [key]: !seenMap[key] }));
    }
    // ------------------------------- Estudio ------------------------------------------------------------- //

    // ------------------------------- Quiz ------------------------------------------------------------- //
    /** Empieza un quiz con ocho expresiones del tema al azar */
    protected startQuiz(): void {
        this.quizItems.set([...this.topic().entries].sort(() => Math.random() - 0.5).slice(0, QUIZ_LENGTH));
        this.quizIndex.set(0);
        this.score.set(0);
        this.feedback.set(null);
        this.quiz.set(true);
    }

    /** Registra la respuesta; si acierta suma punto, marca la expresión como repasada y da XP */
    protected answer(value: string): void {
        const question = this.current();
        // Solo cuenta el primer toque de cada pregunta
        if (!question || this.feedback()) return;
        this.feedback.set(value);
        if (value === question.es) {
            this.score.update((score) => score + 1);
            this.seen.update((seenMap) => ({ ...seenMap, [`${this.topicId()}:${question.jp}`]: true }));
            this.progressSVC.addXp(XP_PER_ANSWER);
        }
    }

    /** Pasa a la siguiente pregunta (tras la última, current queda en null y se ve el resultado) */
    protected next(): void {
        this.quizIndex.update((index) => index + 1);
        this.feedback.set(null);
    }
    // ------------------------------- Quiz ------------------------------------------------------------- //
}
