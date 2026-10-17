/**
 * Temas de «Mi diario» (/diario): cada día una pregunta sobre la vida del alumno con un molde de huecos
 * y palabras para elegir (también se puede escribir una propia). Todo en japonés básico de las primeras lecciones.
 */
import { DiaryOption, DiaryPrompt, DiarySlot } from '../interfaces/diary.interface';
import { GuideSentence, SentenceBlock } from '../interfaces/grammar-guide.interface';
import { blockText } from './grammar-guide.utils';

/** Milisegundos de un día, para elegir el tema según la fecha */
const MS_PER_DAY = 86_400_000;

// ------------------------------- Palabras compartidas ------------------------------------------------------------- //
/** Lugares donde se hace algo */
const PLACES: DiaryOption[] = [
    { jp: 'うち', es: 'casa' },
    { jp: 'がっこう', es: 'la escuela', tag: 'estudios' },
    { jp: 'かいしゃ', es: 'la oficina', tag: 'trabajo' },
    { jp: 'カフェ', es: 'la cafetería', tag: 'comida' },
    { jp: 'としょかん', es: 'la biblioteca', tag: 'estudios' },
    { jp: 'こうえん', es: 'el parque', tag: 'deporte' },
    { jp: 'デパート', es: 'la tienda departamental' },
    { jp: 'レストラン', es: 'el restaurante', tag: 'comida' },
    { jp: 'ジム', es: 'el gimnasio', tag: 'deporte' },
    { jp: 'カラオケ', es: 'el karaoke', tag: 'musica' },
];

/** Personas con quien se hace algo */
const PEOPLE: DiaryOption[] = [
    { jp: 'ともだち', es: 'un amigo' },
    { jp: 'かぞく', es: 'mi familia' },
    { jp: 'せんせい', es: 'el profesor', tag: 'estudios' },
    { jp: 'どうりょう', es: 'un compañero de trabajo', tag: 'trabajo' },
];

/** Cosas que reciben una acción (comer, ver, hacer…) */
const THINGS: DiaryOption[] = [
    { jp: 'ごはん', es: 'comida' },
    { jp: 'ラーメン', es: 'ramen', tag: 'comida' },
    { jp: 'すし', es: 'sushi', tag: 'comida' },
    { jp: 'コーヒー', es: 'café', tag: 'comida' },
    { jp: 'にほんご', es: 'japonés', tag: 'estudios' },
    { jp: 'しゅくだい', es: 'la tarea', tag: 'estudios' },
    { jp: 'しごと', es: 'trabajo', tag: 'trabajo' },
    { jp: 'アニメ', es: 'anime', tag: 'anime' },
    { jp: 'まんが', es: 'manga', tag: 'anime' },
    { jp: 'ゲーム', es: 'videojuegos', tag: 'videojuegos' },
    { jp: 'サッカー', es: 'fútbol', tag: 'deporte' },
    { jp: 'テニス', es: 'tenis', tag: 'deporte' },
    { jp: 'おんがく', es: 'música', tag: 'musica' },
    { jp: 'えいが', es: 'una película' },
    { jp: 'ほん', es: 'un libro' },
];

/** Cosas que gustan o se quieren */
const LIKES: DiaryOption[] = [
    { jp: 'アニメ', es: 'el anime', tag: 'anime' },
    { jp: 'まんが', es: 'el manga', tag: 'anime' },
    { jp: 'ゲーム', es: 'los videojuegos', tag: 'videojuegos' },
    { jp: 'サッカー', es: 'el fútbol', tag: 'deporte' },
    { jp: 'おんがく', es: 'la música', tag: 'musica' },
    { jp: 'ピアノ', es: 'el piano', tag: 'musica' },
    { jp: 'ラーメン', es: 'el ramen', tag: 'comida' },
    { jp: 'すし', es: 'el sushi', tag: 'comida' },
    { jp: 'りょこう', es: 'viajar', tag: 'viajes' },
    { jp: 'にほんご', es: 'el japonés', tag: 'estudios' },
    { jp: 'ねこ', es: 'los gatos' },
    { jp: 'いぬ', es: 'los perros' },
];
// ------------------------------- Palabras compartidas ------------------------------------------------------------- //

// ------------------------------- Temas ------------------------------------------------------------- //
/** Hueco de «cuándo» con las palabras dadas (sin partícula: hoy, mañana… no la llevan) */
function whenSlot(options: DiaryOption[], isOptional = true): DiarySlot {
    return { role: 'time', label: '¿Cuándo?', options, isOptional };
}

/** Temas del diario; cada día toca uno y se puede pasar al siguiente */
export const DIARY_PROMPTS: DiaryPrompt[] = [
    {
        id: 'today',
        question: '¿Qué hiciste hoy?',
        formula: '[cuándo] [dónde]で [con quién]と [qué]を [verbo en pasado]',
        tip: 'En pasado el verbo termina en ました. El lugar donde HACES algo lleva で.',
        slots: [
            whenSlot([
                { jp: 'きょう', es: 'hoy' },
                { jp: 'けさ', es: 'esta mañana' },
                { jp: 'ひる', es: 'al mediodía' },
                { jp: 'よる', es: 'en la noche' },
            ]),
            { role: 'place', label: '¿Dónde?', particle: 'で', esPrefix: 'en', options: PLACES, isOptional: true },
            { role: 'extra', label: '¿Con quién?', particle: 'と', esPrefix: 'con', options: PEOPLE, isOptional: true },
            { role: 'object', label: '¿Qué?', particle: 'を', options: THINGS },
            {
                role: 'verb',
                label: '¿Qué hiciste?',
                options: [
                    { jp: 'たべました', es: 'comí' },
                    { jp: 'のみました', es: 'tomé' },
                    { jp: 'みました', es: 'vi' },
                    { jp: 'しました', es: 'hice / jugué' },
                    { jp: 'べんきょうしました', es: 'estudié' },
                    { jp: 'よみました', es: 'leí' },
                    { jp: 'ききました', es: 'escuché' },
                    { jp: 'かいました', es: 'compré' },
                ],
            },
        ],
    },
    {
        id: 'tomorrow',
        question: '¿Qué vas a hacer?',
        formula: '[cuándo] [dónde]で [con quién]と [qué]を [verbo en ます]',
        tip: 'En japonés el presente (ます) también sirve para el futuro: あした たべます = mañana voy a comer.',
        slots: [
            whenSlot(
                [
                    { jp: 'あした', es: 'mañana' },
                    { jp: 'こんばん', es: 'esta noche' },
                    { jp: 'しゅうまつ', es: 'el fin de semana' },
                    { jp: 'らいしゅう', es: 'la próxima semana' },
                ],
                false,
            ),
            { role: 'place', label: '¿Dónde?', particle: 'で', esPrefix: 'en', options: PLACES, isOptional: true },
            { role: 'extra', label: '¿Con quién?', particle: 'と', esPrefix: 'con', options: PEOPLE, isOptional: true },
            { role: 'object', label: '¿Qué?', particle: 'を', options: THINGS },
            {
                role: 'verb',
                label: '¿Qué vas a hacer?',
                options: [
                    { jp: 'たべます', es: 'voy a comer' },
                    { jp: 'のみます', es: 'voy a tomar' },
                    { jp: 'みます', es: 'voy a ver' },
                    { jp: 'します', es: 'voy a hacer / jugar' },
                    { jp: 'べんきょうします', es: 'voy a estudiar' },
                    { jp: 'よみます', es: 'voy a leer' },
                    { jp: 'ききます', es: 'voy a escuchar' },
                    { jp: 'かいます', es: 'voy a comprar' },
                ],
            },
        ],
    },
    {
        id: 'likes',
        question: '¿Qué te gusta?',
        formula: 'わたしは [qué]が [cuánto] すきです',
        tip: 'Lo que te gusta lleva が, no を. だいすき = te encanta.',
        slots: [
            { role: 'topic', label: '¿Quién?', particle: 'は', options: [{ jp: 'わたし', es: 'yo' }], isOptional: true },
            { role: 'subject', label: '¿Qué te gusta?', particle: 'が', options: LIKES },
            {
                role: 'verb',
                label: '¿Cuánto?',
                options: [
                    { jp: 'すきです', es: 'me gusta' },
                    { jp: 'だいすきです', es: 'me encanta' },
                    { jp: 'とても すきです', es: 'me gusta mucho' },
                    { jp: 'あまり すきじゃ ありません', es: 'no me gusta mucho' },
                ],
            },
        ],
    },
    {
        id: 'travel',
        question: '¿A dónde quieres ir?',
        formula: '[cuándo] [con quién]と [lugar]へ いきたいです',
        tip: 'Quita ます y pon たいです para decir que quieres hacer algo: いきます → いきたいです.',
        slots: [
            whenSlot([
                { jp: 'らいねん', es: 'el próximo año' },
                { jp: 'いつか', es: 'algún día' },
                { jp: 'こんど', es: 'la próxima vez' },
            ]),
            { role: 'extra', label: '¿Con quién?', particle: 'と', esPrefix: 'con', options: PEOPLE, isOptional: true },
            {
                role: 'place',
                label: '¿A dónde?',
                particle: 'へ',
                esPrefix: 'a',
                options: [
                    { jp: 'にほん', es: 'Japón', tag: 'viajes' },
                    { jp: 'とうきょう', es: 'Tokio', tag: 'viajes' },
                    { jp: 'きょうと', es: 'Kioto', tag: 'viajes' },
                    { jp: 'おおさか', es: 'Osaka', tag: 'viajes' },
                    { jp: 'ほっかいどう', es: 'Hokkaido', tag: 'viajes' },
                    { jp: 'おきなわ', es: 'Okinawa', tag: 'viajes' },
                    { jp: 'うみ', es: 'el mar' },
                    { jp: 'やま', es: 'la montaña', tag: 'deporte' },
                ],
            },
            { role: 'verb', label: '¿Qué quieres?', options: [{ jp: 'いきたいです', es: 'quiero ir' }] },
        ],
    },
    {
        id: 'room',
        question: '¿Qué hay en tu cuarto?',
        formula: 'わたしの へやに [qué]が あります／います',
        tip: 'あります para cosas; います para personas y animales.',
        slots: [
            { role: 'extra', label: '¿De quién?', particle: 'の', options: [{ jp: 'わたし', es: 'mi' }] },
            { role: 'place', label: '¿Dónde?', particle: 'に', esPrefix: 'en', options: [{ jp: 'へや', es: 'cuarto' }] },
            {
                role: 'subject',
                label: '¿Qué hay?',
                particle: 'が',
                options: [
                    { jp: 'ベッド', es: 'una cama' },
                    { jp: 'つくえ', es: 'un escritorio' },
                    { jp: 'パソコン', es: 'una computadora', tag: 'trabajo' },
                    { jp: 'テレビ', es: 'una tele', tag: 'anime' },
                    { jp: 'ゲームき', es: 'una consola', tag: 'videojuegos' },
                    { jp: 'ギター', es: 'una guitarra', tag: 'musica' },
                    { jp: 'ほん', es: 'libros', tag: 'estudios' },
                    { jp: 'ねこ', es: 'un gato' },
                    { jp: 'いぬ', es: 'un perro' },
                ],
            },
            {
                role: 'verb',
                label: '¿Hay?',
                options: [
                    { jp: 'あります', es: 'hay (cosa)' },
                    { jp: 'います', es: 'hay (persona o animal)' },
                ],
            },
        ],
    },
    {
        id: 'describe',
        question: '¿Cómo estuvo tu día?',
        formula: 'きょうは [cuánto] [cómo]です',
        tip: 'Los adjetivos van al final con です. とても = muy; すこし = un poco.',
        slots: [
            { role: 'topic', label: '¿De qué hablas?', particle: 'は', options: [{ jp: 'きょう', es: 'hoy' }] },
            {
                role: 'describe',
                label: '¿Cuánto?',
                isOptional: true,
                options: [
                    { jp: 'とても', es: 'muy' },
                    { jp: 'すこし', es: 'un poco' },
                ],
            },
            {
                role: 'verb',
                label: '¿Cómo?',
                options: [
                    { jp: 'たのしかったです', es: 'fue divertido' },
                    { jp: 'いそがしかったです', es: 'estuvo ocupado' },
                    { jp: 'つかれました', es: 'me cansé' },
                    { jp: 'あつかったです', es: 'hizo calor' },
                    { jp: 'さむかったです', es: 'hizo frío' },
                    { jp: 'いい ひでした', es: 'fue un buen día' },
                ],
            },
        ],
    },
    {
        id: 'routine',
        question: '¿A qué hora haces tus cosas?',
        formula: 'まいにち [hora]に [verbo]',
        tip: 'Una hora exacta lleva に; まいにち (cada día) va sola.',
        slots: [
            whenSlot([{ jp: 'まいにち', es: 'todos los días' }, { jp: 'まいあさ', es: 'todas las mañanas' }]),
            {
                role: 'time',
                label: '¿A qué hora?',
                particle: 'に',
                esPrefix: 'a las',
                options: [
                    { jp: '6じ', es: '6' },
                    { jp: '7じ', es: '7' },
                    { jp: '8じ', es: '8' },
                    { jp: '9じ', es: '9' },
                    { jp: '10じ', es: '10' },
                    { jp: '11じ', es: '11' },
                    { jp: '12じ', es: '12' },
                ],
            },
            {
                role: 'verb',
                label: '¿Qué haces?',
                options: [
                    { jp: 'おきます', es: 'me levanto' },
                    { jp: 'ねます', es: 'me duermo' },
                    { jp: 'あさごはんを たべます', es: 'desayuno' },
                    { jp: 'うちを でます', es: 'salgo de casa' },
                    { jp: 'うちへ かえります', es: 'vuelvo a casa' },
                    { jp: 'べんきょうします', es: 'estudio' },
                ],
            },
        ],
    },
    {
        id: 'want-eat',
        question: '¿Qué quieres comer o tomar?',
        formula: '[cuándo] [qué]を [verbo]たいです',
        tip: 'Para «quiero comer» quita ます y pon たいです: たべます → たべたいです.',
        slots: [
            whenSlot([
                { jp: 'きょう', es: 'hoy' },
                { jp: 'こんばん', es: 'esta noche' },
                { jp: 'あした', es: 'mañana' },
            ]),
            {
                role: 'object',
                label: '¿Qué?',
                particle: 'を',
                options: [
                    { jp: 'ラーメン', es: 'ramen', tag: 'comida' },
                    { jp: 'すし', es: 'sushi', tag: 'comida' },
                    { jp: 'カレー', es: 'curry', tag: 'comida' },
                    { jp: 'てんぷら', es: 'tempura', tag: 'comida' },
                    { jp: 'ケーキ', es: 'pastel' },
                    { jp: 'コーヒー', es: 'café' },
                    { jp: 'おちゃ', es: 'té' },
                ],
            },
            {
                role: 'verb',
                label: '¿Qué quieres hacer?',
                options: [
                    { jp: 'たべたいです', es: 'quiero comer' },
                    { jp: 'のみたいです', es: 'quiero tomar' },
                ],
            },
        ],
    },
];

/** Devuelve el tema que toca hoy (cambia cada día y da la vuelta a la lista) */
export function promptOfDay(date = new Date()): number {
    return Math.floor(date.getTime() / MS_PER_DAY) % DIARY_PROMPTS.length;
}

/** Ordena las palabras de un hueco poniendo primero las de los intereses del usuario */
export function sortByInterest(options: DiaryOption[], interests: string[]): DiaryOption[] {
    if (!interests.length) return options;
    return [...options].sort((a, b) => Number(!!b.tag && interests.includes(b.tag)) - Number(!!a.tag && interests.includes(a.tag)));
}
// ------------------------------- Temas ------------------------------------------------------------- //

// ------------------------------- Frase armada ------------------------------------------------------------- //
/**
 * Arma la frase de los huecos elegidos (los vacíos se saltan). Una palabra con espacios (うちを でます)
 * se parte en varios trozos para que «Arma la frase» la trate igual que el resto.
 */
export function buildDiarySentence(slots: DiarySlot[], chosen: (DiaryOption | null)[]): GuideSentence {
    const blocks: SentenceBlock[] = [];
    const meanings: string[] = [];
    slots.forEach((slot, index) => {
        const option = chosen[index];
        if (!option) return;
        const words = option.jp.split(/\s+/);
        words.forEach((word, wordIndex) => {
            const isLast = wordIndex === words.length - 1;
            blocks.push(isLast && slot.particle ? { word, role: slot.role, particle: slot.particle } : { word, role: slot.role });
        });
        meanings.push(slot.esPrefix ? `${slot.esPrefix} ${option.es}` : option.es);
    });
    return { blocks, es: meanings.join(' · ') };
}

/**
 * Devuelve el texto de todos los trozos que pueden salir en una frase del diario (cada palabra de cada hueco
 * con su partícula). Los graba tools/build-audio.mjs: la frase entera no se puede grabar (hay miles de
 * combinaciones), pero sus trozos seguidos sí suenan.
 */
export function diaryBlockTexts(): string[] {
    const texts = new Set<string>();
    for (const prompt of DIARY_PROMPTS) {
        prompt.slots.forEach((slot, slotIndex) => {
            for (const option of slot.options) {
                const chosen = prompt.slots.map((_, index) => (index === slotIndex ? option : null));
                buildDiarySentence(prompt.slots, chosen).blocks.forEach((sentenceBlock) => texts.add(blockText(sentenceBlock)));
            }
        });
    }
    return [...texts];
}

/** Indica si todos los huecos obligatorios tienen palabra */
export function isDiaryComplete(slots: DiarySlot[], chosen: (DiaryOption | null)[]): boolean {
    return slots.every((slot, index) => slot.isOptional || !!chosen[index]);
}
// ------------------------------- Frase armada ------------------------------------------------------------- //
