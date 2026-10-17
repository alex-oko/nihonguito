/**
 * Contenido de «Gramática fácil» (/gramatica): conceptos básicos, partículas, moldes de frase y el método
 * para armar frases, todo en palabras sencillas. Las frases van partidas en trozos con su papel para
 * pintarlas por colores y para generar los ejercicios (ver grammarQuestions en questions.utils.ts).
 */
import {
    BlockRole,
    CheatGroup,
    GoldenRule,
    GrammarConcept,
    GrammarDrillOption,
    GuideSentence,
    ParticleGuide,
    ParticlePair,
    RoleInfo,
    SentenceBlock,
    SentenceMold,
    WorkedExample,
} from '../interfaces/grammar-guide.interface';

// ------------------------------- Ayudantes ------------------------------------------------------------- //
/** Crea un trozo de frase (atajo para que el contenido de abajo se lea en una línea) */
function block(word: string, role: BlockRole, particle?: string): SentenceBlock {
    return particle ? { word, role, particle } : { word, role };
}

/** Crea el final de la primera de dos frases unidas («むずかしいです» + «が、»): papel de acción y coma detrás */
function clause(word: string, particle: string): SentenceBlock {
    return { word, role: 'verb', particle, comma: true };
}

/** Devuelve el texto de un trozo con su partícula pegada: «わたし» + «は» → «わたしは» */
export function blockText(sentenceBlock: SentenceBlock): string {
    return sentenceBlock.word + (sentenceBlock.particle ?? '') + (sentenceBlock.comma ? '、' : '');
}

/** Devuelve la frase entera con espacios entre trozos y 。 al final (el formato del resto de la app) */
export function sentenceText(sentence: GuideSentence): string {
    return sentence.blocks.map(blockText).join(' ') + '。';
}

/** Devuelve el índice del trozo que se tapa en el ejercicio de partículas, o -1 si no hay */
export function blankIndex(sentence: GuideSentence, forms: string[] = []): number {
    if (sentence.blank !== undefined) return sentence.blank;
    return sentence.blocks.findIndex((sentenceBlock) => !!sentenceBlock.particle && forms.includes(sentenceBlock.particle));
}
// ------------------------------- Ayudantes ------------------------------------------------------------- //

// ------------------------------- Papeles y colores ------------------------------------------------------------- //
/** Papeles en el orden en que se enseñan en la leyenda (el habitual dentro de una frase) */
export const ROLE_ORDER: BlockRole[] = ['topic', 'subject', 'time', 'place', 'extra', 'object', 'describe', 'verb'];

/** Nombre, pregunta y explicación de cada papel */
export const ROLE_INFO: Record<BlockRole, RoleInfo> = {
    topic: { label: 'Tema', question: '¿De quién o de qué hablamos?', hint: 'Es el tema: «hablando de…». Lleva は (o も si es «también»).' },
    subject: { label: 'Quién / qué (con が)', question: '¿Quién exactamente? ¿Qué hay? ¿Qué te gusta?', hint: 'Lo señala が: quién hace algo, lo que hay o lo que te gusta.' },
    object: { label: 'Qué (recibe la acción)', question: '¿Qué comes, ves, compras…?', hint: 'Es lo que recibe la acción: respóndele «¿qué?» al verbo. Lleva を.' },
    place: { label: 'Dónde / a dónde', question: '¿Dónde? ¿A dónde?', hint: 'Es un lugar: で si haces algo ahí, に si algo está ahí o vas ahí, へ hacia dónde vas.' },
    time: { label: 'Cuándo', question: '¿Cuándo?', hint: 'Es el momento: las horas y días concretos llevan に; hoy, mañana o cada día van solos.' },
    extra: {
        label: 'Otro detalle',
        question: '¿Con quién? ¿Con qué? ¿De quién? ¿Para qué?',
        hint: 'Añade un detalle: con quién (と), con qué (で), de quién (の), a quién o para qué (に), más que qué (より).',
    },
    describe: { label: 'Cómo / cuánto', question: '¿Cómo es? ¿Cuánto? ¿Cada cuánto?', hint: 'Describe: un adjetivo o un adverbio como とても, よく o ときどき.' },
    verb: { label: 'Acción (al final)', question: '¿Qué pasa? ¿Qué se hace?', hint: 'Es el verbo o です: va siempre al final de la frase.' },
};
// ------------------------------- Papeles y colores ------------------------------------------------------------- //

// ------------------------------- Lo básico ------------------------------------------------------------- //
/** Conceptos de gramática explicados sin tecnicismos */
export const GRAMMAR_CONCEPTS: GrammarConcept[] = [
    {
        id: 'particle',
        name: 'Partícula',
        jpName: 'じょし',
        short: 'Una etiqueta pequeñita que va detrás de una palabra y dice qué papel cumple.',
        body: 'En español ponemos la palabrita ANTES: «en Tokio», «con un amigo». En japonés la etiqueta va DETRÁS: とうきょうで, ともだちと. Por eso, cuando leas, cada palabra trae pegada su etiqueta, y esa etiqueta te dice si es el lugar, la cosa, la persona…',
        examples: [
            {
                blocks: [block('とうきょう', 'place', 'で'), block('ともだち', 'extra', 'と'), block('あいます', 'verb')],
                es: 'Me veo con un amigo en Tokio.',
            },
        ],
        tip: 'Si no sabes qué partícula va, pregúntate qué papel cumple la palabra (¿dónde?, ¿qué?, ¿con quién?).',
    },
    {
        id: 'verb',
        name: 'Verbo',
        jpName: 'どうし',
        short: 'La acción: lo que se hace o lo que pasa.',
        body: 'たべます (comer), いきます (ir), ねます (dormir). La regla más importante del japonés: el verbo va SIEMPRE al final. En forma educada termina en ます; en pasado, ました; en negativo, ません.',
        examples: [
            {
                blocks: [block('ルシアさん', 'topic', 'は'), block('りょうり', 'object', 'を'), block('つくります', 'verb')],
                es: 'Lucía cocina.',
            },
        ],
        tip: 'Cuando armes una frase, coloca primero el verbo al final y construye hacia atrás.',
    },
    {
        id: 'noun',
        name: 'Sustantivo',
        jpName: 'めいし',
        short: 'El nombre de algo: una persona, una cosa, un lugar o una idea.',
        body: 'Todo lo que puedes señalar o nombrar: ほん (libro), がっこう (escuela), ルシア, あさ (mañana). No tienen «el/la» ni plural: ほん puede ser «libro», «el libro» o «libros». El contexto lo dice.',
        examples: [
            {
                blocks: [block('つくえ', 'place', 'の'), block('うえ', 'place', 'に'), block('ほん', 'subject', 'が'), block('あります', 'verb')],
                es: 'Hay un libro sobre el escritorio.',
            },
        ],
    },
    {
        id: 'i-adj',
        name: 'Adjetivo い',
        jpName: 'いけいようし',
        short: 'Describe cómo es algo y termina en い.',
        body: 'たかい (caro, alto), おいしい (rico), あつい (caliente). Pueden ir delante de la cosa (おおきい いぬ = un perro grande) o al final con です (ラーメンは おいしいです = el ramen está rico). El negativo lo hacen solos: おいしい → おいしくないです.',
        examples: [
            { blocks: [block('この', 'extra'), block('ラーメン', 'topic', 'は'), block('おいしいです', 'verb')], es: 'Este ramen está rico.' },
            { blocks: [block('こうえん', 'place', 'に'), block('おおきい', 'describe'), block('いぬ', 'subject', 'が'), block('います', 'verb')], es: 'En el parque hay un perro grande.' },
        ],
    },
    {
        id: 'na-adj',
        name: 'Adjetivo な',
        jpName: 'なけいようし',
        short: 'También describe, pero necesita な para pegarse a una cosa.',
        body: 'きれい (bonito, limpio), しずか (tranquilo), げんき (animado). Delante de una cosa llevan な: しずかな まち (una ciudad tranquila). Al final van con です, sin な: まちは しずかです. Ojo: きれい termina en い, pero es de los de な.',
        examples: [
            { blocks: [block('しずかな', 'describe'), block('まちです', 'verb')], es: 'Es una ciudad tranquila.' },
            { blocks: [block('この', 'extra'), block('こうえん', 'topic', 'は'), block('きれいです', 'verb')], es: 'Este parque es bonito.' },
        ],
    },
    {
        id: 'adverb',
        name: 'Adverbio',
        jpName: 'ふくし',
        short: 'Da un detalle: cuánto, cada cuánto o cómo.',
        body: 'とても (muy), すこし (un poco), よく (a menudo), ときどき (a veces), いつも (siempre). No llevan partícula y se ponen justo antes del verbo o del adjetivo al que le dan el detalle.',
        examples: [
            { blocks: [block('ときどき', 'describe'), block('ゲーム', 'object', 'を'), block('します', 'verb')], es: 'A veces juego videojuegos.' },
            { blocks: [block('とうきょう', 'topic', 'は'), block('とても', 'describe'), block('おおきいです', 'verb')], es: 'Tokio es muy grande.' },
        ],
    },
    {
        id: 'subject',
        name: 'Sujeto',
        short: 'Quién hace la acción (o de quién se dice algo).',
        body: 'En «Kenta come pan», el sujeto es Kenta. En japonés el sujeto muchas veces NI SE DICE si ya se entiende: パンを たべます ya significa «(yo) como pan». Cuando se dice, suele llevar は o が.',
        examples: [
            { blocks: [block('きのしたさん', 'topic', 'は'), block('パン', 'object', 'を'), block('たべます', 'verb')], es: 'Kenta come pan.' },
            { blocks: [block('パン', 'object', 'を'), block('たべます', 'verb')], es: '(Yo) como pan.' },
        ],
        tip: 'Decir わたしは en cada frase suena raro. Si está claro que hablas de ti, quítalo.',
    },
    {
        id: 'topic',
        name: 'Tema',
        short: 'De qué va la frase: «hablando de…».',
        body: 'Se parece al sujeto, pero es más amplio: es lo que presentas para luego decir algo sobre ello. Por eso el tema puede ser una persona, pero también un lugar o un día. Se marca con は.',
        examples: [
            { blocks: [block('にほん', 'topic', 'は'), block('いま', 'time'), block('なつです', 'verb')], es: 'En Japón ahora es verano.' },
            { blocks: [block('きょう', 'topic', 'は'), block('やすみです', 'verb')], es: 'Hoy es mi día libre.' },
        ],
    },
    {
        id: 'object',
        name: 'Objeto',
        short: 'La cosa que recibe la acción.',
        body: 'Pregúntale al verbo «¿qué?»: ¿qué bebes? → agua. Esa respuesta lleva を. No todos los verbos tienen objeto: ねます (dormir) o いきます (ir) no lo necesitan.',
        examples: [{ blocks: [block('まいあさ', 'time'), block('みず', 'object', 'を'), block('のみます', 'verb')], es: 'Todas las mañanas bebo agua.' }],
    },
    {
        id: 'time',
        name: 'Cuándo',
        short: 'Las palabras de tiempo: unas van solas y otras con に.',
        body: 'Las que dependen de hoy (きょう, あした, まいにち, らいしゅう) van SIN partícula. Las exactas, que salen en un reloj o calendario (7じ, げつようび, 3がつ), llevan に. Suelen ir al principio, justo después del tema.',
        examples: [{ blocks: [block('あした', 'time'), block('7じ', 'time', 'に'), block('おきます', 'verb')], es: 'Mañana me levanto a las 7.' }],
    },
];
// ------------------------------- Lo básico ------------------------------------------------------------- //

// ------------------------------- Partículas ------------------------------------------------------------- //
/** Fichas de las partículas, de la más usada a la menos */
export const PARTICLE_GUIDES: ParticleGuide[] = [
    {
        id: 'は',
        particle: 'は',
        forms: ['は'],
        romaji: 'wa',
        nickname: 'La del tema',
        question: '¿De quién o de qué estamos hablando?',
        short: 'Presenta el tema de la frase. Es como decir «hablando de…» o «en cuanto a…».',
        body: 'Ponla detrás de la persona o cosa de la que vas a contar algo. Todo lo que viene después es lo que dices sobre ese tema. Se escribe は, pero se pronuncia «wa».',
        trap: 'No es exactamente «el sujeto», es el tema. Y si ya está claro (casi siempre «yo»), se quita: わたしは がくせいです → がくせいです.',
        examples: [
            { blocks: [block('わたし', 'topic', 'は'), block('がくせいです', 'verb')], es: 'Soy estudiante.', why: 'は marca de quién hablo (de mí); lo demás es lo que digo.', distractors: ['を', 'で', 'に'] },
            { blocks: [block('ラーメン', 'topic', 'は'), block('おいしいです', 'verb')], es: 'El ramen está rico.', why: 'Hablamos del ramen (tema con は) y decimos cómo está.', distractors: ['を', 'で', 'に'] },
            { blocks: [block('きょう', 'topic', 'は'), block('やすみです', 'verb')], es: 'Hoy es mi día libre.', why: 'El tema también puede ser un momento: «hablando de hoy…».', distractors: ['を', 'で', 'に'] },
        ],
    },
    {
        id: 'が',
        particle: 'が',
        forms: ['が'],
        romaji: 'ga',
        nickname: 'La que señala',
        question: '¿Quién exactamente? ¿Qué hay? ¿Qué te gusta?',
        short: 'Señala con el dedo quién o qué: en preguntas con «quién», con lo que «hay» y con gustos.',
        body: 'Usa が cuando la palabra es la información nueva o importante: «¿Quién vino? — Vino Kenta». Además va siempre con unos verbos y adjetivos fijos: あります / います (hay), すき (gustar), じょうず (ser bueno en), わかります (entender) y ほしい (querer una cosa).',
        trap: 'Con すき, わかります, ほしい y あります la cosa lleva が, ¡no を! ねこが すきです (me gustan los gatos).',
        examples: [
            { blocks: [block('だれ', 'subject', 'が'), block('きました', 'verb', 'か')], es: '¿Quién vino?', why: 'Con だれ (quién) como sujeto va が, nunca は.', distractors: ['は', 'を', 'で'] },
            { blocks: [block('ねこ', 'subject', 'が'), block('すきです', 'verb')], es: 'Me gustan los gatos.', why: 'すき (gustar) lleva が: lo que te gusta va con が, no con を.', distractors: ['を', 'で', 'に'] },
            {
                blocks: [block('こうえん', 'place', 'に'), block('いぬ', 'subject', 'が'), block('います', 'verb')],
                es: 'En el parque hay un perro.',
                why: 'Lo que «hay» lleva が; el lugar donde está lleva に.',
                blank: 1,
                distractors: ['を', 'で', 'と'],
            },
        ],
    },
    {
        id: 'を',
        particle: 'を',
        forms: ['を'],
        romaji: 'o',
        nickname: 'La del objeto',
        question: '¿Qué? (lo que recibe la acción)',
        short: 'Marca la cosa sobre la que cae la acción: lo que comes, bebes, ves, compras…',
        body: 'Pregúntale al verbo «¿qué?»: ¿qué comes? → pan. Esa respuesta lleva を. Se escribe を, pero se pronuncia «o».',
        trap: 'すき, わかります y ほしい NO llevan を, llevan が.',
        examples: [
            { blocks: [block('まいあさ', 'time'), block('コーヒー', 'object', 'を'), block('のみます', 'verb')], es: 'Todas las mañanas tomo café.', why: '¿Qué tomas? → café. Lo que recibe la acción lleva を.', distractors: ['が', 'に', 'で'] },
            { blocks: [block('よる', 'time'), block('テレビ', 'object', 'を'), block('みます', 'verb')], es: 'En la noche veo la tele.', why: '¿Qué ves? → la tele. Por eso を.', distractors: ['が', 'に', 'で'] },
            {
                blocks: [block('デパート', 'place', 'で'), block('かばん', 'object', 'を'), block('かいました', 'verb')],
                es: 'Compré una bolsa en la tienda departamental.',
                why: '¿Qué compraste? → una bolsa. Lo comprado lleva を.',
                blank: 1,
                distractors: ['が', 'に', 'で'],
            },
        ],
        extraUses: [
            {
                title: 'De dónde sales o te bajas',
                body: 'Con でます (salir), おります (bajarse) y そつぎょうします (graduarse), el lugar que DEJAS lleva を: うちを でます (salgo de casa), でんしゃを おります (me bajo del tren). Ojo: subirse es al revés, con に: でんしゃに のります.',
                examples: [
                    {
                        blocks: [block('8じ', 'time', 'に'), block('うち', 'place', 'を'), block('でます', 'verb')],
                        es: 'Salgo de casa a las 8.',
                        why: 'El lugar del que sales lleva を.',
                        blank: 1,
                        distractors: ['で', 'に', 'へ'],
                    },
                    {
                        blocks: [block('つぎ', 'extra', 'の'), block('えき', 'place', 'で'), block('でんしゃ', 'place', 'を'), block('おります', 'verb')],
                        es: 'Me bajo del tren en la próxima estación.',
                        why: 'Bajarse DE algo → を. (Subirse es に: でんしゃに のります.)',
                        blank: 2,
                        distractors: ['に', 'で', 'が'],
                    },
                ],
            },
            {
                title: 'Por dónde pasas',
                body: 'Con verbos de moverse por un sitio (さんぽします, あるきます, わたります), を marca el camino: こうえんを さんぽします (paseo por el parque), はしを わたります (cruzo el puente).',
                examples: [{ blocks: [block('まいあさ', 'time'), block('こうえん', 'place', 'を'), block('さんぽします', 'verb')], es: 'Todas las mañanas paseo por el parque.' }],
            },
        ],
    },
    {
        id: 'に',
        particle: 'に',
        forms: ['に'],
        romaji: 'ni',
        nickname: 'El alfiler',
        question: '¿A qué hora? ¿A dónde? ¿Dónde está? ¿A quién?',
        short: 'Clava un punto exacto: una hora o día, el destino, dónde está algo o a quién le das algo.',
        body: 'Imagina un alfiler clavado en un mapa o en un calendario. 7じに (a las 7), にちようびに (el domingo), がっこうに いきます (voy a la escuela), へやに います (está en el cuarto), ともだちに あげます (se lo doy a un amigo).',
        trap: 'あした, きょう y まいにち NO llevan に. Y si HACES algo en un lugar, es で: へやで べんきょうします.',
        examples: [
            { blocks: [block('7じ', 'time', 'に'), block('おきます', 'verb')], es: 'Me levanto a las 7.', why: 'Una hora exacta lleva に.', distractors: ['で', 'を', 'が'] },
            {
                blocks: [block('ルシアさん', 'topic', 'は'), block('とうきょう', 'place', 'に'), block('すんでいます', 'verb')],
                es: 'Lucía vive en Tokio.',
                why: 'すむ (vivir) usa に: es el punto donde estás instalado, no algo que «haces» ahí.',
                distractors: ['で', 'を', 'が'],
            },
            {
                blocks: [block('ともだち', 'extra', 'に'), block('てがみ', 'object', 'を'), block('かきます', 'verb')],
                es: 'Le escribo una carta a un amigo.',
                why: 'La persona que recibe algo lleva に.',
                distractors: ['を', 'で', 'が'],
            },
            {
                blocks: [block('あした', 'time'), block('ぎんこう', 'place', 'に'), block('いきます', 'verb')],
                es: 'Mañana voy al banco.',
                why: 'El destino (a dónde vas) lleva に. Aquí へ también valdría.',
                distractors: ['を', 'で', 'が'],
            },
        ],
        extraUses: [
            {
                title: 'Para qué vas (ir a hacer algo)',
                body: 'Con いきます, きます o かえります, に también dice PARA QUÉ vas. Va detrás de una actividad (かいものに いきます = voy de compras) o del verbo sin ます (みます → みに いきます = voy a ver).',
                examples: [
                    {
                        blocks: [block('デパート', 'place', 'へ'), block('かいもの', 'extra', 'に'), block('いきます', 'verb')],
                        es: 'Voy de compras a la tienda departamental.',
                        why: '¿Para qué vas? → de compras → に.',
                        blank: 1,
                        distractors: ['を', 'で', 'へ'],
                    },
                    {
                        blocks: [block('ともだち', 'extra', 'と'), block('えいが', 'object', 'を'), block('み', 'extra', 'に'), block('いきます', 'verb')],
                        es: 'Voy a ver una película con un amigo.',
                        why: 'Verbo sin ます + に + いきます: ir a hacer algo (み → みに).',
                        blank: 2,
                        distractors: ['を', 'で', 'が'],
                    },
                ],
            },
        ],
    },
    {
        id: 'で',
        particle: 'で',
        forms: ['で'],
        romaji: 'de',
        nickname: 'La del escenario',
        question: '¿Dónde pasa la acción? ¿Con qué?',
        short: 'Marca el lugar donde HACES algo, o la herramienta o el medio con que lo haces.',
        body: 'Piensa en un escenario: で dice dónde sucede la escena. レストランで たべます (como en el restaurante). También dice con qué: はしで (con palillos), でんしゃで (en tren), にほんごで (en japonés).',
        trap: 'に o で: に = dónde ESTÁ algo o a dónde VAS; で = dónde HACES algo. へやに います (estoy en el cuarto) / へやで べんきょうします (estudio en el cuarto).',
        examples: [
            { blocks: [block('としょかん', 'place', 'で'), block('べんきょうします', 'verb')], es: 'Estudio en la biblioteca.', why: 'Estudiar es una acción; el lugar donde pasa lleva で.', distractors: ['に', 'を', 'へ'] },
            {
                blocks: [block('でんしゃ', 'extra', 'で'), block('かいしゃ', 'place', 'へ'), block('いきます', 'verb')],
                es: 'Voy a la empresa en tren.',
                why: 'El medio de transporte lleva で.',
                distractors: ['に', 'を', 'と'],
            },
            {
                blocks: [block('はし', 'extra', 'で'), block('ごはん', 'object', 'を'), block('たべます', 'verb')],
                es: 'Como arroz con palillos.',
                why: 'La herramienta con la que haces algo lleva で.',
                distractors: ['と', 'に', 'を'],
            },
        ],
    },
    {
        id: 'へ',
        particle: 'へ',
        forms: ['へ'],
        romaji: 'e',
        nickname: 'La flecha',
        question: '¿Hacia dónde vas?',
        short: 'Marca la dirección. Solo con verbos de moverse: いきます, きます, かえります.',
        body: 'Es una flecha →. Se escribe へ, pero se pronuncia «e». Casi siempre puedes usar に en su lugar y está bien.',
        trap: 'へ solo sirve para moverse. No va con horas, ni con personas, ni con lo que haces en un lugar.',
        examples: [
            { blocks: [block('らいしゅう', 'time'), block('きょうと', 'place', 'へ'), block('いきます', 'verb')], es: 'La próxima semana voy a Kioto.', why: 'Hacia dónde vas → へ (también valdría に).', distractors: ['で', 'を', 'が'] },
            {
                blocks: [block('なんじ', 'time', 'に'), block('うち', 'place', 'へ'), block('かえります', 'verb', 'か')],
                es: '¿A qué hora vuelves a casa?',
                why: 'Volver (かえります) es moverse: la dirección lleva へ.',
                distractors: ['で', 'を', 'と'],
            },
        ],
    },
    {
        id: 'と',
        particle: 'と',
        forms: ['と'],
        romaji: 'to',
        nickname: 'La de «y» y «con»',
        question: '¿Con quién? ¿Y qué más?',
        short: 'Une cosas (A y B) o dice con quién haces algo.',
        body: 'パンと たまご = pan y huevo. ともだちと いきます = voy con un amigo.',
        trap: 'と es «y» solo entre cosas o personas, no entre dos frases o dos verbos.',
        examples: [
            {
                blocks: [block('なかむらさん', 'extra', 'と'), block('えいが', 'object', 'を'), block('みました', 'verb')],
                es: 'Vi una película con Nakamura.',
                why: '¿Con quién? → と.',
                distractors: ['に', 'で', 'を'],
            },
            {
                blocks: [block('あさ', 'topic', 'は'), block('パン', 'object', 'と'), block('たまご', 'object', 'を'), block('たべます', 'verb')],
                es: 'En la mañana como pan y huevo.',
                why: 'と une dos cosas: pan Y huevo.',
                blank: 1,
                distractors: ['を', 'が', 'で'],
            },
        ],
    },
    {
        id: 'も',
        particle: 'も',
        forms: ['も'],
        romaji: 'mo',
        nickname: 'La de «también»',
        question: '¿También?',
        short: 'Significa «también» (o «tampoco» con negativo). Ocupa el lugar de は, が o を.',
        body: 'わたしは がくせいです → わたしも がくせいです (yo también soy estudiante). Con negativo: わたしも わかりません (yo tampoco entiendo).',
        trap: 'No se juntan: わたしはも ✗. Solo わたしも.',
        examples: [
            {
                blocks: [block('わたし', 'topic', 'も'), block('コーヒー', 'subject', 'が'), block('すきです', 'verb')],
                es: 'A mí también me gusta el café.',
                why: '«También» → も, en el lugar de は.',
                distractors: ['は', 'を', 'で'],
            },
            { blocks: [block('あした', 'time', 'も'), block('しごとです', 'verb')], es: 'Mañana también trabajo.', why: 'も también va con el tiempo: «mañana también».', distractors: ['は', 'に', 'で'] },
        ],
    },
    {
        id: 'の',
        particle: 'の',
        forms: ['の'],
        romaji: 'no',
        nickname: 'La del «de»',
        question: '¿De quién? ¿De qué?',
        short: 'Une dos cosas: A の B = «B de A». Sirve para dueño, origen o tipo.',
        body: 'Va al revés que en español: lo que describe va primero y la cosa principal al final. わたしの ほん = mi libro (el libro de mí). にほんごの ほん = libro de japonés.',
        trap: 'Cuidado con el orden: «el libro de Lucía» es ルシアさんの ほん, no ほんの ルシアさん.',
        examples: [
            { blocks: [block('これ', 'topic', 'は'), block('わたし', 'extra', 'の'), block('かさです', 'verb')], es: 'Este es mi paraguas.', why: '¿De quién? → mío: わたしの.', distractors: ['は', 'が', 'を'] },
            {
                blocks: [block('にほんご', 'extra', 'の'), block('せんせい', 'topic', 'は'), block('やさしいです', 'verb')],
                es: 'La profesora de japonés es amable.',
                why: '«Profesora DE japonés»: el tipo va primero con の.',
                distractors: ['と', 'で', 'に'],
            },
        ],
    },
    {
        id: 'から・まで',
        particle: 'から・まで',
        forms: ['から', 'まで'],
        romaji: 'kara · made',
        nickname: 'Desde y hasta',
        question: '¿Desde cuándo/dónde? ¿Hasta cuándo/dónde?',
        short: 'から = desde; まで = hasta. Sirven para horas y para lugares.',
        body: '9じから 5じまで はたらきます (trabajo de 9 a 5). とうきょうから おおさかまで (de Tokio a Osaka).',
        trap: 'Para «unos 10 minutos» no es まで: es ぐらい (10ぷんぐらい). まで es el final de un tramo.',
        examples: [
            {
                blocks: [block('9じ', 'time', 'から'), block('5じ', 'time', 'まで'), block('はたらきます', 'verb')],
                es: 'Trabajo de 9 a 5.',
                why: '«Desde» las 9 → から.',
                blank: 0,
                distractors: ['まで', 'に', 'で'],
            },
            {
                blocks: [block('うち', 'place', 'から'), block('えき', 'place', 'まで'), block('あるきます', 'verb')],
                es: 'Camino de mi casa a la estación.',
                why: '«Hasta» la estación → まで.',
                blank: 1,
                distractors: ['から', 'と', 'が'],
            },
        ],
        extraUses: [
            {
                title: 'から = porque',
                body: 'Detrás de una frase completa (después de です, ます o un adjetivo), から explica el motivo: «como…», «porque…». Primero va el motivo y después lo que pasa: あついですから、まどを あけます (como hace calor, abro la ventana).',
                examples: [
                    {
                        blocks: [block('じかん', 'subject', 'が'), clause('ありません', 'から'), block('タクシー', 'extra', 'で'), block('いきます', 'verb')],
                        es: 'Como no tengo tiempo, voy en taxi.',
                        why: 'El motivo (no tengo tiempo) termina en から.',
                        blank: 1,
                        distractors: ['を', 'に', 'で'],
                    },
                    {
                        blocks: [block('あした', 'topic', 'は'), clause('テストです', 'から'), block('こんばん', 'time'), block('べんきょうします', 'verb')],
                        es: 'Como mañana tengo examen, esta noche estudio.',
                        why: '¿Por qué estudias? Porque hay examen → から al final del motivo.',
                        blank: 1,
                        distractors: ['を', 'に', 'で'],
                    },
                ],
            },
        ],
    },
    {
        id: 'か',
        particle: 'か',
        forms: ['か'],
        romaji: 'ka',
        nickname: 'El signo de pregunta',
        question: '¿Es una pregunta?',
        short: 'Al final de la frase la convierte en pregunta. Es el «¿?» del japonés.',
        body: 'No cambias el orden de nada: がくせいです (es estudiante) → がくせいですか (¿es estudiante?). La palabra de pregunta (なに, どこ, だれ) va donde iría la respuesta.',
        trap: 'En japonés educado no hace falta ？: el か ya hace de signo de pregunta.',
        examples: [
            {
                blocks: [block('ルシアさん', 'topic', 'は'), block('メキシコじんです', 'verb', 'か')],
                es: '¿Lucía es mexicana?',
                why: 'か al final convierte la frase en pregunta.',
                distractors: ['を', 'に', 'で'],
            },
            { blocks: [block('なに', 'object', 'を'), block('たべます', 'verb', 'か')], es: '¿Qué comes?', why: 'Pregunta → か al final, sin cambiar el orden.', blank: 1, distractors: ['を', 'で', 'に'] },
        ],
        extraUses: [
            {
                title: 'か = «o» (elegir)',
                body: 'Entre dos cosas, か es «o»: コーヒーか こうちゃ (café o té). Entre dos preguntas seguidas también: えいがですか、コンサートですか (¿es cine o un concierto?).',
                examples: [
                    {
                        blocks: [block('コーヒー', 'object', 'か'), block('こうちゃ', 'object', 'を'), block('ください', 'verb')],
                        es: 'Café o té, por favor.',
                        why: '«O» entre dos cosas → か. (と sería «café Y té».)',
                        blank: 0,
                        distractors: ['と', 'も', 'で'],
                    },
                    {
                        blocks: [block('やすみ', 'topic', 'は'), block('どようび', 'time', 'か'), block('にちようびです', 'verb')],
                        es: 'El día libre es el sábado o el domingo.',
                        why: 'Uno de los dos, no los dos → か.',
                        blank: 1,
                        distractors: ['と', 'や', 'に'],
                    },
                ],
            },
        ],
    },
    {
        id: 'や',
        particle: 'や',
        forms: ['や'],
        romaji: 'ya',
        nickname: 'La lista con «etcétera»',
        question: '¿Y qué más? (sin decirlo todo)',
        short: 'Une cosas como と, pero deja la lista abierta: «A, B y cosas así».',
        body: 'と es una lista completa: パンと たまご (pan y huevo, nada más). や deja ver que hay más: パンや たまご (pan, huevo y otras cosas). Muchas veces se cierra con など (etcétera): パンや たまごなど.',
        trap: 'や solo une cosas (sustantivos), igual que と. No une verbos ni frases.',
        examples: [
            {
                blocks: [block('かばん', 'extra', 'の'), block('なか', 'place', 'に'), block('さいふ', 'subject', 'や'), block('かぎ', 'subject', 'が'), block('あります', 'verb')],
                es: 'En la bolsa hay una cartera, llaves y otras cosas.',
                why: 'Lista abierta (hay más cosas) → や.',
                blank: 2,
                distractors: ['を', 'で', 'に'],
            },
            {
                blocks: [block('コンビニ', 'place', 'で'), block('パン', 'object', 'や'), block('のみもの', 'object', 'を'), block('かいます', 'verb')],
                es: 'En la tienda compro pan, bebidas y cosas así.',
                why: '«…y cosas así» → や.',
                blank: 1,
                distractors: ['が', 'で', 'に'],
            },
        ],
    },
    {
        id: 'より',
        particle: 'より',
        forms: ['より'],
        romaji: 'yori',
        nickname: 'La de comparar',
        question: '¿Más que qué?',
        short: 'Marca con qué comparas: A は B より [adjetivo] = A es más [adjetivo] que B.',
        body: 'でんしゃは バスより はやいです = el tren es más rápido que el autobús. No hace falta una palabra para «más»: より ya lo dice. Para preguntar cuál de dos: A と B と どちらが はやいですか → A の ほうが はやいです.',
        trap: 'Fíjate en quién lleva より: es aquello con lo que comparas, NO lo que gana. バスより はやい → gana el tren, no el autobús.',
        examples: [
            {
                blocks: [block('でんしゃ', 'topic', 'は'), block('バス', 'extra', 'より'), block('はやいです', 'verb')],
                es: 'El tren es más rápido que el autobús.',
                why: 'Con qué comparas (el autobús) → より.',
                blank: 1,
                distractors: ['から', 'と', 'で'],
            },
            {
                blocks: [block('きょう', 'topic', 'は'), block('きのう', 'extra', 'より'), block('さむいです', 'verb')],
                es: 'Hoy hace más frío que ayer.',
                why: '«Más que ayer» → きのうより.',
                blank: 1,
                distractors: ['から', 'まで', 'に'],
            },
        ],
    },
    {
        id: 'ぐらい',
        particle: 'ぐらい',
        forms: ['ぐらい', 'くらい'],
        romaji: 'gurai · kurai',
        nickname: 'Más o menos',
        question: '¿Cuánto, aproximadamente?',
        short: 'Va detrás de una cantidad o de un tiempo y significa «más o menos», «unos».',
        body: '1じかんぐらい (como una hora), 3000えんぐらい (unos 3000 yenes). ぐらい y くらい significan lo mismo. Para preguntar: どのくらい かかりますか (¿cuánto tarda?).',
        trap: 'ぐらい es para cantidades y duraciones. Para la hora del reloj se usa ごろ: 2じかんぐらい (unas 2 horas) / 2じごろ (hacia las 2).',
        examples: [
            {
                blocks: [block('うち', 'place', 'から'), block('えき', 'place', 'まで'), block('10ぷん', 'describe', 'ぐらい'), block('かかります', 'verb')],
                es: 'De mi casa a la estación se tarda unos 10 minutos.',
                why: 'Una duración aproximada (unos 10 minutos) → ぐらい.',
                blank: 2,
                distractors: ['ごろ', 'まで', 'に'],
            },
            {
                blocks: [block('まいにち', 'time'), block('2じかん', 'describe', 'ぐらい'), block('べんきょうします', 'verb')],
                es: 'Estudio unas 2 horas cada día.',
                why: '«Unas» 2 horas (cuánto tiempo, no a qué hora) → ぐらい.',
                blank: 1,
                distractors: ['ごろ', 'に', 'を'],
            },
        ],
    },
    {
        id: 'だけ',
        particle: 'だけ',
        forms: ['だけ'],
        romaji: 'dake',
        nickname: 'Solo',
        question: '¿Nada más eso?',
        short: 'Va detrás de una palabra y significa «solo», «nada más».',
        body: 'ひとりだけ (solo una persona), すこしだけ (solo un poco). Ocupa el lugar de が o を: コーヒーだけ のみます (solo tomo café).',
        trap: 'だけ va con frases en afirmativo. Para «solo» con negativo hay otra partícula, しか (しか ありません = solo hay), que verás más adelante.',
        examples: [
            {
                blocks: [block('あさ', 'topic', 'は'), block('コーヒー', 'object', 'だけ'), block('のみます', 'verb')],
                es: 'En la mañana solo tomo café.',
                why: '«Solo» café → だけ.',
                blank: 1,
                distractors: ['も', 'が', 'で'],
            },
            {
                blocks: [block('にほんご', 'topic', 'は'), block('すこし', 'describe', 'だけ'), block('わかります', 'verb')],
                es: 'Entiendo solo un poco de japonés.',
                why: '«Solo» un poco → すこしだけ.',
                blank: 1,
                distractors: ['も', 'を', 'に'],
            },
        ],
    },
    {
        id: 'でも',
        particle: 'でも',
        forms: ['でも'],
        romaji: 'demo',
        nickname: '«…o algo»',
        question: '¿Una sugerencia sin presionar?',
        short: 'Detrás de una cosa la suaviza: «…o algo así». Sirve para invitar u ofrecer sin presionar.',
        body: 'コーヒーでも のみませんか = ¿tomamos un café o algo? No dice que tenga que ser café: es una propuesta suave. Ocupa el lugar de を o が.',
        trap: 'Al principio de la frase, でも significa «pero»: でも、じかんが ありません (pero no tengo tiempo).',
        examples: [
            {
                blocks: [block('おちゃ', 'object', 'でも'), block('のみません', 'verb', 'か')],
                es: '¿Tomamos un té o algo?',
                why: 'Propuesta suave («…o algo») → でも.',
                blank: 0,
                distractors: ['に', 'で', 'が'],
            },
            {
                blocks: [block('しゅうまつ', 'time'), block('えいが', 'object', 'でも'), block('みません', 'verb', 'か')],
                es: '¿Vemos una película o algo el fin de semana?',
                why: 'Invitas sin presionar («una película o algo») → でも.',
                blank: 1,
                distractors: ['に', 'で', 'が'],
            },
        ],
    },
    {
        id: 'pero',
        particle: 'が・けど',
        forms: ['けど'],
        romaji: 'ga · kedo',
        nickname: 'El «pero»',
        question: '¿Unes dos ideas que chocan?',
        short: 'Al final de la primera frase la une con la segunda: «…, pero…». けど es la versión casual.',
        body: 'にほんごは むずかしいですが、おもしろいです = el japonés es difícil, pero interesante. Con amigos: たかいけど、おいしい (es caro, pero rico). Va detrás de です, ます o un adjetivo, y después se pone una coma 、.',
        trap: 'No lo confundas con el が de sujeto (ねこが すきです). El が de «pero» va al final de una frase completa (después de です o ます) y lleva coma.',
        examples: [
            {
                blocks: [block('にほんご', 'topic', 'は'), clause('むずかしいです', 'が'), block('おもしろいです', 'verb')],
                es: 'El japonés es difícil, pero interesante.',
                why: 'Dos ideas que chocan (difícil / interesante) → が al final de la primera.',
                blank: 1,
                distractors: ['を', 'で', 'に'],
            },
            {
                blocks: [block('この', 'extra'), block('ラーメン', 'topic', 'は'), clause('たかい', 'けど'), block('おいしい', 'verb')],
                es: 'Este ramen es caro, pero rico. (casual)',
                why: '«Pero» entre amigos → けど.',
                blank: 2,
                distractors: ['を', 'で', 'に'],
            },
        ],
    },
    {
        id: 'ね・よ',
        particle: 'ね・よ',
        forms: ['ね', 'よ'],
        romaji: 'ne · yo',
        nickname: 'El tono final',
        question: '¿Buscas que te den la razón o avisas algo?',
        short: 'ね busca que el otro esté de acuerdo («¿verdad?»); よ avisa algo que el otro no sabe («¡te digo!»).',
        body: 'いい てんきですね = qué buen tiempo, ¿verdad? / あの みせは たかいですよ = esa tienda es cara, ¡eh! (te aviso).',
        trap: 'Usar よ todo el tiempo suena a que corriges al otro. ね es más suave.',
        examples: [
            {
                blocks: [block('きょう', 'topic', 'は'), block('あついです', 'verb', 'ね')],
                es: 'Hoy hace calor, ¿verdad?',
                why: 'Buscas que el otro esté de acuerdo → ね.',
                blank: 1,
                distractors: ['よ', 'か', 'を'],
            },
            {
                blocks: [block('あの', 'extra'), block('みせ', 'topic', 'は'), block('たかいです', 'verb', 'よ')],
                es: 'Esa tienda es cara, ¡te aviso!',
                why: 'Le cuentas algo que no sabe → よ.',
                blank: 2,
                distractors: ['ね', 'か', 'を'],
            },
        ],
    },
];

/** Las confusiones más comunes, con un ejemplo de cada lado */
export const PARTICLE_PAIRS: ParticlePair[] = [
    {
        title: 'に o で: ¿estar o hacer?',
        body: 'に = dónde ESTÁ algo (o a dónde vas). で = dónde HACES algo. Mira el verbo: います / あります / すんでいます → に; cualquier otra acción → で.',
        sides: [
            { label: 'Estar', sentence: { blocks: [block('へや', 'place', 'に'), block('います', 'verb')], es: 'Estoy en el cuarto.' } },
            { label: 'Hacer', sentence: { blocks: [block('へや', 'place', 'で'), block('べんきょうします', 'verb')], es: 'Estudio en el cuarto.' } },
        ],
    },
    {
        title: 'は o が: ¿tema o respuesta?',
        body: 'は presenta el tema, algo que ya se conoce («hablando de Kenta…»). が señala la información nueva, la respuesta a «¿quién?». Truco: だれ, なに o どこ como sujeto llevan siempre が, y la respuesta también.',
        sides: [
            { label: 'Tema', sentence: { blocks: [block('きのしたさん', 'topic', 'は'), block('がくせいです', 'verb')], es: 'Kenta es estudiante.' } },
            { label: 'Respuesta', sentence: { blocks: [block('きのしたさん', 'subject', 'が'), block('きました', 'verb')], es: 'El que vino fue Kenta.' } },
        ],
    },
    {
        title: 'を o が: ¿acción o gusto?',
        body: 'Con acciones (comer, ver, comprar) lo que recibe la acción va con を. Con gustos, habilidades y entender (すき, じょうず, わかります, ほしい) va con が.',
        sides: [
            { label: 'Acción', sentence: { blocks: [block('すし', 'object', 'を'), block('たべます', 'verb')], es: 'Como sushi.' } },
            { label: 'Gusto', sentence: { blocks: [block('すし', 'subject', 'が'), block('すきです', 'verb')], es: 'Me gusta el sushi.' } },
        ],
    },
    {
        title: 'に o へ: ¿a dónde?',
        body: 'Para ir a un lugar las dos valen: へ pone el foco en la dirección y に en la llegada. Para horas, días y personas, solo に.',
        sides: [
            { label: 'Dirección', sentence: { blocks: [block('きょうと', 'place', 'へ'), block('いきます', 'verb')], es: 'Voy hacia Kioto.' } },
            { label: 'Llegada', sentence: { blocks: [block('きょうと', 'place', 'に'), block('いきます', 'verb')], es: 'Voy a Kioto.' } },
        ],
    },
    {
        title: 'と o や: ¿lista cerrada o abierta?',
        body: 'と nombra TODO lo que hay (y nada más). や nombra solo algunos ejemplos y deja ver que hay más.',
        sides: [
            { label: 'Todo', sentence: { blocks: [block('パン', 'object', 'と'), block('たまご', 'object', 'を'), block('かいました', 'verb')], es: 'Compré pan y huevos (solo eso).' } },
            { label: 'Y más', sentence: { blocks: [block('パン', 'object', 'や'), block('たまご', 'object', 'を'), block('かいました', 'verb')], es: 'Compré pan, huevos y otras cosas.' } },
        ],
    },
    {
        title: 'ぐらい o ごろ: ¿cuánto o a qué hora?',
        body: 'ぐらい = cuánto (una cantidad o lo que dura algo). ごろ = a qué hora, más o menos (un punto en el reloj o el calendario).',
        sides: [
            { label: 'Cuánto', sentence: { blocks: [block('2じかん', 'describe', 'ぐらい'), block('ねます', 'verb')], es: 'Duermo unas 2 horas.' } },
            { label: 'A qué hora', sentence: { blocks: [block('2じ', 'time', 'ごろ'), block('ねます', 'verb')], es: 'Me duermo hacia las 2.' } },
        ],
    },
    {
        title: 'から: ¿desde o porque?',
        body: 'Detrás de un lugar o una hora, から es «desde». Detrás de una frase completa (です, ます o un adjetivo), es «porque».',
        sides: [
            { label: 'Desde', sentence: { blocks: [block('メキシコ', 'place', 'から'), block('きました', 'verb')], es: 'Vine de México.' } },
            { label: 'Porque', sentence: { blocks: [clause('あめです', 'から'), block('うち', 'place', 'に'), block('います', 'verb')], es: 'Como llueve, me quedo en casa.' } },
        ],
    },
];

/** Resumen rápido por grupos: pregunta que responde la palabra → partícula */
export const CHEAT_SHEET: CheatGroup[] = [
    {
        title: 'Las de cada frase',
        rows: [
            { role: 'topic', question: '¿De quién o de qué hablo?', particle: 'は' },
            { role: 'subject', question: '¿Quién? (pregunta o dato nuevo) · lo que hay · lo que gusta', particle: 'が' },
            { role: 'object', question: '¿Qué? (lo que recibe la acción)', particle: 'を' },
            { role: 'place', question: '¿Dónde HAGO algo? · ¿Con qué?', particle: 'で' },
            { role: 'place', question: '¿Dónde ESTÁ? · ¿A qué hora? · ¿A quién?', particle: 'に' },
            { role: 'place', question: '¿Hacia dónde voy?', particle: 'へ / に' },
            { role: 'extra', question: '¿Para qué voy? (みに いきます)', particle: 'に' },
            { role: 'place', question: '¿De dónde salgo o me bajo? · ¿Por dónde paso?', particle: 'を' },
            { role: 'extra', question: '¿Con quién? · A y B (todo)', particle: 'と' },
            { role: 'extra', question: '¿De quién? · ¿De qué tipo?', particle: 'の' },
            { role: 'time', question: '¿Desde? · ¿Hasta?', particle: 'から / まで' },
            { role: 'time', question: 'Hoy, mañana, cada día…', particle: '(nada)' },
        ],
    },
    {
        title: 'Las que añaden un matiz',
        rows: [
            { role: 'topic', question: 'También · tampoco', particle: 'も' },
            { role: 'object', question: 'A, B y cosas así (lista abierta)', particle: 'や' },
            { role: 'extra', question: 'A o B', particle: 'か' },
            { role: 'extra', question: '¿Más que qué? (comparar)', particle: 'より' },
            { role: 'describe', question: '¿Cuánto, más o menos?', particle: 'ぐらい' },
            { role: 'time', question: '¿A qué hora, más o menos?', particle: 'ごろ' },
            { role: 'describe', question: 'Solo, nada más', particle: 'だけ' },
            { role: 'object', question: '…o algo (propuesta suave)', particle: 'でも' },
        ],
    },
    {
        title: 'Las que unen o cierran frases',
        rows: [
            { role: 'verb', question: 'Pero', particle: 'が / けど' },
            { role: 'verb', question: 'Porque, como', particle: 'から' },
            { role: 'verb', question: 'Pregunta', particle: 'か' },
            { role: 'verb', question: '¿Verdad? (buscas acuerdo)', particle: 'ね' },
            { role: 'verb', question: '¡Te aviso! (algo que el otro no sabe)', particle: 'よ' },
        ],
    },
];
// ------------------------------- Partículas ------------------------------------------------------------- //

// ------------------------------- Armar frases ------------------------------------------------------------- //
/** Reglas de oro del orden de la frase */
export const GOLDEN_RULES: GoldenRule[] = [
    { title: 'El verbo va al final', body: 'Siempre. Si no hay verbo, la frase termina en です (o en un adjetivo + です). Es lo primero que puedes colocar.' },
    { title: 'La etiqueta va detrás', body: 'En español decimos «en casa»; en japonés, «casa-en»: うちで. Cada palabra lleva pegada su partícula.' },
    { title: 'El medio es flexible', body: 'Como cada trozo lleva su etiqueta, se pueden mover. El orden más común es: tema → cuándo → dónde → con quién → qué → verbo.' },
    { title: 'Lo obvio se calla', body: 'Si se entiende quién (casi siempre «yo» o «tú»), no se dice. Repetir わたしは en cada frase suena raro.' },
    { title: 'Para preguntar, añade か', body: 'No cambias el orden: pones か al final. La palabra de pregunta (なに, どこ, いつ) va donde iría la respuesta.' },
];

/** Frase de muestra del molde general, con un trozo de cada papel */
export const MAIN_TEMPLATE: GuideSentence = {
    blocks: [
        block('わたし', 'topic', 'は'),
        block('あした', 'time'),
        block('としょかん', 'place', 'で'),
        block('カルロスさん', 'extra', 'と'),
        block('にほんご', 'object', 'を'),
        block('べんきょうします', 'verb'),
    ],
    es: 'Mañana estudio japonés con Carlos en la biblioteca.',
};

/** Ejemplos resueltos del método «de español a japonés» */
export const WORKED_EXAMPLES: WorkedExample[] = [
    {
        es: 'El domingo como sushi con Nakamura en Shibuya.',
        steps: [
            { ask: '¿Cuál es la acción?', found: 'comer → たべます. Va al final.', block: block('たべます', 'verb') },
            { ask: '¿Qué cosa recibe la acción?', found: 'sushi → lleva を.', block: block('すし', 'object', 'を') },
            { ask: '¿Con quién?', found: 'con Nakamura → lleva と.', block: block('なかむらさん', 'extra', 'と') },
            { ask: '¿Dónde pasa?', found: 'en Shibuya; ahí HAGO algo → で.', block: block('しぶや', 'place', 'で') },
            { ask: '¿Cuándo?', found: 'el domingo, un día concreto → に.', block: block('にちようび', 'time', 'に') },
            { ask: '¿Quién lo hace?', found: 'yo → わたしは, pero se entiende solo: lo quito.' },
        ],
        result: {
            blocks: [block('にちようび', 'time', 'に'), block('しぶや', 'place', 'で'), block('なかむらさん', 'extra', 'と'), block('すし', 'object', 'を'), block('たべます', 'verb')],
            es: 'El domingo como sushi con Nakamura en Shibuya.',
        },
    },
    {
        es: 'Mañana voy a Kioto en tren.',
        steps: [
            { ask: '¿Cuál es la acción?', found: 'ir → いきます. Va al final.', block: block('いきます', 'verb') },
            { ask: '¿A dónde?', found: 'a Kioto; es moverse → へ (o に).', block: block('きょうと', 'place', 'へ') },
            { ask: '¿Con qué / cómo?', found: 'en tren, el medio → で.', block: block('でんしゃ', 'extra', 'で') },
            { ask: '¿Cuándo?', found: 'mañana; depende de hoy → sin partícula.', block: block('あした', 'time') },
        ],
        result: {
            blocks: [block('あした', 'time'), block('でんしゃ', 'extra', 'で'), block('きょうと', 'place', 'へ'), block('いきます', 'verb')],
            es: 'Mañana voy a Kioto en tren.',
        },
    },
    {
        es: 'En mi cuarto hay una computadora.',
        steps: [
            { ask: '¿Cuál es la acción?', found: 'hay (una cosa) → あります. Va al final.', block: block('あります', 'verb') },
            { ask: '¿Qué hay?', found: 'una computadora; lo que hay → が.', block: block('パソコン', 'subject', 'が') },
            { ask: '¿Dónde está?', found: 'en mi cuarto; ESTAR en un lugar → に.', block: block('へや', 'place', 'に') },
            { ask: '¿De quién es el cuarto?', found: 'mío → わたしの, delante del cuarto.', block: block('わたし', 'extra', 'の') },
        ],
        result: {
            blocks: [block('わたし', 'extra', 'の'), block('へや', 'place', 'に'), block('パソコン', 'subject', 'が'), block('あります', 'verb')],
            es: 'En mi cuarto hay una computadora.',
        },
    },
];

/** Pasos para resolver un «completa la frase» */
export const FILL_STEPS: string[] = [
    'Lee primero el final: el verbo te dice qué tipo de frase es (¿moverse?, ¿hacer algo?, ¿haber?, ¿gustar?).',
    'Mira la palabra justo antes del hueco y pregúntate qué papel cumple: ¿quién, qué, dónde, cuándo, con quién?',
    'Busca esa pregunta en el resumen rápido de partículas y elige.',
    'Si dudas entre dos, vuelve al verbo: いきます / きます / かえります → へ o に; あります / います → に; casi cualquier otra acción → で para el lugar.',
];

/** Moldes de las frases que más se usan */
export const SENTENCE_MOLDS: SentenceMold[] = [
    {
        id: 'is',
        name: 'Decir qué es algo',
        formula: 'A は B です',
        short: '«A es B». Para presentarte, decir qué es algo o qué día es.',
        examples: [{ blocks: [block('ルシアさん', 'topic', 'は'), block('デザイナーです', 'verb')], es: 'Lucía es diseñadora.' }],
        tip: 'En negativo: B じゃ ありません. En pregunta: B ですか.',
    },
    {
        id: 'describe',
        name: 'Describir',
        formula: 'A は [adjetivo] です',
        short: '«A es / está así». Para decir cómo es algo.',
        examples: [{ blocks: [block('とうきょう', 'topic', 'は'), block('にぎやかです', 'verb')], es: 'Tokio es muy animado.' }],
    },
    {
        id: 'do',
        name: 'Hacer algo a algo',
        formula: '(A は) X を [verbo]',
        short: 'Comer, ver, comprar, estudiar… lo que recibe la acción lleva を.',
        examples: [{ blocks: [block('まいにち', 'time'), block('にほんご', 'object', 'を'), block('べんきょうします', 'verb')], es: 'Estudio japonés todos los días.' }],
    },
    {
        id: 'go',
        name: 'Ir, venir, volver',
        formula: '(A は) [lugar] へ いきます / きます / かえります',
        short: 'El destino lleva へ o に.',
        examples: [{ blocks: [block('あした', 'time'), block('ぎんこう', 'place', 'へ'), block('いきます', 'verb')], es: 'Mañana voy al banco.' }],
    },
    {
        id: 'there-is',
        name: 'Decir que hay algo',
        formula: '[lugar] に X が あります / います',
        short: 'あります para cosas y plantas; います para personas y animales.',
        examples: [{ blocks: [block('えき', 'extra', 'の'), block('ちかく', 'place', 'に'), block('コンビニ', 'subject', 'が'), block('あります', 'verb')], es: 'Cerca de la estación hay una tienda.' }],
    },
    {
        id: 'do-at',
        name: 'Hacer algo en un lugar',
        formula: '[lugar] で [verbo]',
        short: 'Si HACES algo ahí, el lugar lleva で.',
        examples: [{ blocks: [block('カフェ', 'place', 'で'), block('コーヒー', 'object', 'を'), block('のみます', 'verb')], es: 'Tomo café en la cafetería.' }],
    },
    {
        id: 'like',
        name: 'Gustos y habilidades',
        formula: 'X が すきです / じょうずです / わかります',
        short: 'Lo que te gusta, se te da bien o entiendes lleva が, no を.',
        examples: [{ blocks: [block('わたし', 'topic', 'は'), block('おんがく', 'subject', 'が'), block('すきです', 'verb')], es: 'Me gusta la música.' }],
    },
    {
        id: 'want',
        name: 'Querer hacer algo',
        formula: 'X を [verbo sin ます] たいです',
        short: 'Quita ます y pon たいです: いきます → いきたいです.',
        examples: [{ blocks: [block('ほっかいどう', 'place', 'へ'), block('いきたいです', 'verb')], es: 'Quiero ir a Hokkaido.' }],
    },
    {
        id: 'please',
        name: 'Pedir por favor',
        formula: '[verbo en forma て] ください',
        short: 'Para pedir que alguien haga algo: かきます → かいてください.',
        examples: [{ blocks: [block('ここ', 'place', 'に'), block('なまえ', 'object', 'を'), block('かいてください', 'verb')], es: 'Escriba su nombre aquí, por favor.' }],
    },
    {
        id: 'ask',
        name: 'Preguntar',
        formula: '… [verbo / です] か',
        short: 'Mismo orden, か al final. La palabra de pregunta va donde iría la respuesta.',
        examples: [{ blocks: [block('どこ', 'place', 'で'), block('ひるごはん', 'object', 'を'), block('たべます', 'verb', 'か')], es: '¿Dónde almuerzas?' }],
    },
];
// ------------------------------- Armar frases ------------------------------------------------------------- //

// ------------------------------- Frases por interés ------------------------------------------------------------- //
/** Frases de práctica sobre cada interés del alumno (todas con hueco y distractores para el ejercicio de partículas) */
export const INTEREST_SENTENCES: GuideSentence[] = [
    // --- Viajes: lo que te sirve en un viaje a Japón ---
    { tag: 'viajes', blocks: [block('えき', 'topic', 'は'), block('どこです', 'verb', 'か')], es: '¿Dónde está la estación?', why: 'Hablas de la estación (tema) y preguntas dónde está.', blank: 0, distractors: ['を', 'で', 'に'] },
    {
        tag: 'viajes',
        blocks: [block('この', 'extra'), block('でんしゃ', 'topic', 'は'), block('きょうと', 'place', 'へ'), block('いきます', 'verb', 'か')],
        es: '¿Este tren va a Kioto?',
        why: 'Hacia dónde va el tren → へ.',
        blank: 2,
        distractors: ['を', 'で', 'が'],
    },
    { tag: 'viajes', blocks: [block('ホテル', 'place', 'まで'), block('タクシー', 'extra', 'で'), block('いきます', 'verb')], es: 'Voy al hotel en taxi.', why: 'El medio de transporte lleva で.', blank: 1, distractors: ['に', 'を', 'と'] },
    { tag: 'viajes', blocks: [block('きっぷ', 'object', 'を'), block('2まい', 'describe'), block('ください', 'verb')], es: 'Dos boletos, por favor.', why: 'Lo que pides lleva を.', blank: 0, distractors: ['が', 'に', 'で'] },
    { tag: 'viajes', blocks: [block('トイレ', 'topic', 'は'), block('あそこです', 'verb')], es: 'El baño está allá.', why: 'Hablas del baño (tema) y dices dónde está.', blank: 0, distractors: ['を', 'で', 'へ'] },
    { tag: 'viajes', blocks: [block('ふじさん', 'place', 'に'), block('のぼりたいです', 'verb')], es: 'Quiero subir el monte Fuji.', why: 'のぼります (subir a) lleva に: el punto al que llegas.', blank: 0, distractors: ['で', 'と', 'の'] },
    {
        tag: 'viajes',
        blocks: [block('おおさか', 'place', 'で'), block('たこやき', 'object', 'を'), block('たべたいです', 'verb')],
        es: 'Quiero comer takoyaki en Osaka.',
        why: 'Comer es algo que HACES en Osaka → で.',
        blank: 0,
        distractors: ['に', 'へ', 'を'],
    },

    // --- Comida ---
    { tag: 'comida', blocks: [block('ラーメン', 'subject', 'が'), block('だいすきです', 'verb')], es: '¡Me encanta el ramen!', why: 'だいすき (encantar) lleva が, como すき.', blank: 0, distractors: ['を', 'で', 'に'] },
    {
        tag: 'comida',
        blocks: [block('おはし', 'extra', 'で'), block('ラーメン', 'object', 'を'), block('たべます', 'verb')],
        es: 'Como ramen con palillos.',
        why: 'La herramienta con la que comes lleva で.',
        blank: 0,
        distractors: ['と', 'に', 'を'],
    },
    {
        tag: 'comida',
        blocks: [block('コンビニ', 'place', 'で'), block('おにぎり', 'object', 'を'), block('かいます', 'verb')],
        es: 'Compro onigiri en la tienda.',
        why: '¿Qué compras? → onigiri → を.',
        blank: 1,
        distractors: ['が', 'に', 'で'],
    },
    { tag: 'comida', blocks: [block('みず', 'object', 'を'), block('ください', 'verb')], es: 'Agua, por favor.', why: 'Lo que pides lleva を.', blank: 0, distractors: ['が', 'に', 'で'] },
    { tag: 'comida', blocks: [block('この', 'extra'), block('カレー', 'topic', 'は'), block('からいです', 'verb')], es: 'Este curry es picante.', why: 'Hablas del curry (tema) y dices cómo es.', blank: 1, distractors: ['を', 'で', 'に'] },
    {
        tag: 'comida',
        blocks: [block('ともだち', 'extra', 'と'), block('すしや', 'place', 'へ'), block('いきます', 'verb')],
        es: 'Voy a un restaurante de sushi con un amigo.',
        why: '¿Con quién vas? → と.',
        blank: 0,
        distractors: ['に', 'を', 'が'],
    },

    // --- Trabajo ---
    {
        tag: 'trabajo',
        blocks: [block('9じ', 'time', 'に'), block('かいしゃ', 'place', 'へ'), block('いきます', 'verb')],
        es: 'Voy a la oficina a las 9.',
        why: 'Una hora exacta lleva に.',
        blank: 0,
        distractors: ['で', 'を', 'が'],
    },
    {
        tag: 'trabajo',
        blocks: [block('かいぎしつ', 'place', 'で'), block('かいぎ', 'object', 'を'), block('します', 'verb')],
        es: 'Hacemos la reunión en la sala de juntas.',
        why: 'Hacer una reunión es una acción; el lugar donde pasa lleva で.',
        blank: 0,
        distractors: ['に', 'へ', 'を'],
    },
    {
        tag: 'trabajo',
        blocks: [block('もりさん', 'extra', 'に'), block('メール', 'object', 'を'), block('おくります', 'verb')],
        es: 'Le mando un correo al señor Mori.',
        why: 'La persona que recibe algo lleva に.',
        blank: 0,
        distractors: ['を', 'で', 'が'],
    },
    {
        tag: 'trabajo',
        blocks: [block('パソコン', 'extra', 'で'), block('しりょう', 'object', 'を'), block('つくります', 'verb')],
        es: 'Hago los documentos en la computadora.',
        why: 'La herramienta con la que trabajas lleva で.',
        blank: 0,
        distractors: ['に', 'と', 'を'],
    },
    {
        tag: 'trabajo',
        blocks: [block('きょう', 'topic', 'は'), block('しごと', 'subject', 'が'), block('たくさん', 'describe'), block('あります', 'verb')],
        es: 'Hoy tengo mucho trabajo.',
        why: 'Con あります (hay / tengo) la cosa lleva が.',
        blank: 1,
        distractors: ['を', 'で', 'に'],
    },
    {
        tag: 'trabajo',
        blocks: [block('なかむらさん', 'extra', 'と'), block('ひるごはん', 'object', 'を'), block('たべます', 'verb')],
        es: 'Almuerzo con Nakamura.',
        why: '¿Con quién? → と.',
        blank: 0,
        distractors: ['に', 'で', 'を'],
    },

    // --- Estudios ---
    {
        tag: 'estudios',
        blocks: [block('としょかん', 'place', 'で'), block('しゅくだい', 'object', 'を'), block('します', 'verb')],
        es: 'Hago la tarea en la biblioteca.',
        why: 'Hacer la tarea es una acción; el lugar donde pasa lleva で.',
        blank: 0,
        distractors: ['に', 'へ', 'を'],
    },
    {
        tag: 'estudios',
        blocks: [block('にほんご', 'extra', 'の'), block('テスト', 'topic', 'は'), block('あしたです', 'verb')],
        es: 'El examen de japonés es mañana.',
        why: '«Examen DE japonés»: el tipo va primero con の.',
        blank: 0,
        distractors: ['と', 'で', 'を'],
    },
    { tag: 'estudios', blocks: [block('かんじ', 'subject', 'が'), block('わかりません', 'verb')], es: 'No entiendo los kanji.', why: 'わかります (entender) lleva が, no を.', blank: 0, distractors: ['を', 'で', 'に'] },
    {
        tag: 'estudios',
        blocks: [block('せんせい', 'extra', 'に'), block('しつもん', 'object', 'を'), block('します', 'verb')],
        es: 'Le hago una pregunta a la profesora.',
        why: 'La persona a la que le haces la pregunta lleva に.',
        blank: 0,
        distractors: ['を', 'で', 'が'],
    },
    {
        tag: 'estudios',
        blocks: [block('まいばん', 'time'), block('にほんご', 'object', 'を'), block('べんきょうします', 'verb')],
        es: 'Estudio japonés todas las noches.',
        why: '¿Qué estudias? → japonés → を.',
        blank: 1,
        distractors: ['が', 'に', 'で'],
    },
    {
        tag: 'estudios',
        blocks: [block('じゅぎょう', 'topic', 'は'), block('9じ', 'time', 'に'), block('はじまります', 'verb')],
        es: 'La clase empieza a las 9.',
        why: 'Una hora exacta lleva に.',
        blank: 1,
        distractors: ['で', 'を', 'が'],
    },

    // --- Anime y manga ---
    { tag: 'anime', blocks: [block('しゅうまつ', 'time'), block('アニメ', 'object', 'を'), block('みます', 'verb')], es: 'El fin de semana veo anime.', why: '¿Qué ves? → anime → を.', blank: 1, distractors: ['が', 'に', 'で'] },
    { tag: 'anime', blocks: [block('わたし', 'topic', 'は'), block('アニメ', 'subject', 'が'), block('だいすきです', 'verb')], es: 'Me encanta el anime.', why: 'だいすき (encantar) lleva が, no を.', blank: 1, distractors: ['を', 'で', 'に'] },
    {
        tag: 'anime',
        blocks: [block('アニメ', 'extra', 'で'), block('にほんご', 'object', 'を'), block('べんきょうします', 'verb')],
        es: 'Estudio japonés con anime.',
        why: 'Lo que usas para hacer algo (el medio) lleva で.',
        blank: 0,
        distractors: ['に', 'と', 'を'],
    },
    {
        tag: 'anime',
        blocks: [block('ほんや', 'place', 'で'), block('まんが', 'object', 'を'), block('かいました', 'verb')],
        es: 'Compré un manga en la librería.',
        why: 'Comprar es algo que HACES en la librería → で.',
        blank: 0,
        distractors: ['に', 'へ', 'を'],
    },
    {
        tag: 'anime',
        blocks: [block('ともだち', 'extra', 'と'), block('アニメ', 'extra', 'の'), block('はなし', 'object', 'を'), block('します', 'verb')],
        es: 'Hablo de anime con mis amigos.',
        why: '«Plática DE anime»: el tema de la plática va con の.',
        blank: 1,
        distractors: ['を', 'と', 'で'],
    },
    { tag: 'anime', blocks: [block('この', 'extra'), block('まんが', 'topic', 'は'), block('おもしろいです', 'verb')], es: 'Este manga es interesante.', why: 'Hablas del manga (tema) y dices cómo es.', blank: 1, distractors: ['を', 'で', 'に'] },

    // --- Videojuegos ---
    { tag: 'videojuegos', blocks: [block('まいばん', 'time'), block('ゲーム', 'object', 'を'), block('します', 'verb')], es: 'Juego videojuegos todas las noches.', why: '¿Qué haces? → videojuegos → を.', blank: 1, distractors: ['が', 'に', 'で'] },
    {
        tag: 'videojuegos',
        blocks: [block('オンライン', 'place', 'で'), block('ともだち', 'extra', 'と'), block('あそびます', 'verb')],
        es: 'Juego en línea con amigos.',
        why: '¿Con quién juegas? → と.',
        blank: 1,
        distractors: ['に', 'を', 'が'],
    },
    { tag: 'videojuegos', blocks: [block('きのしたさん', 'topic', 'は'), block('ゲーム', 'subject', 'が'), block('じょうずです', 'verb')], es: 'Kenta es bueno en los videojuegos.', why: 'じょうず (ser bueno en) lleva が.', blank: 1, distractors: ['を', 'で', 'に'] },
    { tag: 'videojuegos', blocks: [block('あたらしい', 'describe'), block('ゲーム', 'subject', 'が'), block('ほしいです', 'verb')], es: 'Quiero un videojuego nuevo.', why: 'ほしい (querer una cosa) lleva が.', blank: 1, distractors: ['を', 'で', 'に'] },
    { tag: 'videojuegos', blocks: [block('へや', 'place', 'で'), block('ゲーム', 'object', 'を'), block('します', 'verb')], es: 'Juego en mi cuarto.', why: 'Jugar es algo que HACES en el cuarto → で.', blank: 0, distractors: ['に', 'へ', 'を'] },
    { tag: 'videojuegos', blocks: [block('この', 'extra'), block('ゲーム', 'topic', 'は'), block('むずかしいです', 'verb')], es: 'Este juego es difícil.', why: 'Hablas del juego (tema) y dices cómo es.', blank: 1, distractors: ['を', 'で', 'に'] },

    // --- Deporte ---
    {
        tag: 'deporte',
        blocks: [block('こうえん', 'place', 'で'), block('サッカー', 'object', 'を'), block('します', 'verb')],
        es: 'Juego fútbol en el parque.',
        why: 'Jugar es algo que HACES en el parque → で.',
        blank: 0,
        distractors: ['に', 'へ', 'を'],
    },
    { tag: 'deporte', blocks: [block('テレビ', 'extra', 'で'), block('やきゅう', 'object', 'を'), block('みます', 'verb')], es: 'Veo béisbol en la tele.', why: 'El medio por el que lo ves lleva で.', blank: 0, distractors: ['に', 'と', 'が'] },
    { tag: 'deporte', blocks: [block('どようび', 'time', 'に'), block('テニス', 'object', 'を'), block('します', 'verb')], es: 'Juego tenis el sábado.', why: 'Un día concreto de la semana lleva に.', blank: 0, distractors: ['で', 'を', 'が'] },
    { tag: 'deporte', blocks: [block('あした', 'time'), block('ジム', 'place', 'へ'), block('いきます', 'verb')], es: 'Mañana voy al gimnasio.', why: 'Hacia dónde vas → へ.', blank: 1, distractors: ['で', 'を', 'が'] },
    {
        tag: 'deporte',
        blocks: [block('ともだち', 'extra', 'と'), block('やま', 'place', 'に'), block('のぼります', 'verb')],
        es: 'Subo la montaña con amigos.',
        why: '¿Con quién? → と.',
        blank: 0,
        distractors: ['に', 'を', 'で'],
    },
    {
        tag: 'deporte',
        blocks: [block('サッカー', 'extra', 'の'), block('しあい', 'object', 'を'), block('みます', 'verb')],
        es: 'Veo el partido de fútbol.',
        why: '«Partido DE fútbol»: el tipo va primero con の.',
        blank: 0,
        distractors: ['と', 'を', 'で'],
    },

    // --- Música ---
    { tag: 'musica', blocks: [block('まいにち', 'time'), block('ピアノ', 'object', 'を'), block('ひきます', 'verb')], es: 'Toco el piano todos los días.', why: '¿Qué tocas? → el piano → を.', blank: 1, distractors: ['が', 'に', 'で'] },
    {
        tag: 'musica',
        blocks: [block('でんしゃ', 'place', 'で'), block('おんがく', 'object', 'を'), block('ききます', 'verb')],
        es: 'Escucho música en el tren.',
        why: 'Escuchar es algo que HACES en el tren → で.',
        blank: 0,
        distractors: ['に', 'を', 'が'],
    },
    { tag: 'musica', blocks: [block('わたし', 'topic', 'は'), block('うた', 'subject', 'が'), block('すきです', 'verb')], es: 'Me gustan las canciones.', why: 'すき (gustar) lleva が, no を.', blank: 1, distractors: ['を', 'で', 'に'] },
    {
        tag: 'musica',
        blocks: [block('どようび', 'time', 'に'), block('コンサート', 'place', 'へ'), block('いきます', 'verb')],
        es: 'El sábado voy a un concierto.',
        why: 'Hacia dónde vas → へ.',
        blank: 1,
        distractors: ['で', 'を', 'が'],
    },
    { tag: 'musica', blocks: [block('カラオケ', 'place', 'で'), block('うたいます', 'verb')], es: 'Canto en el karaoke.', why: 'Cantar es algo que HACES en el karaoke → で.', blank: 0, distractors: ['に', 'を', 'へ'] },
    {
        tag: 'musica',
        blocks: [block('ともだち', 'extra', 'の'), block('バンド', 'topic', 'は'), block('じょうずです', 'verb')],
        es: 'La banda de mi amigo es buena.',
        why: '«La banda DE mi amigo» → の.',
        blank: 0,
        distractors: ['と', 'を', 'で'],
    },

    // --- Partículas de matiz y de unir frases, también por interés ---
    {
        tag: 'viajes',
        blocks: [block('とうきょう', 'topic', 'は'), block('おおさか', 'extra', 'より'), block('おおきいです', 'verb')],
        es: 'Tokio es más grande que Osaka.',
        why: 'Con qué comparas (Osaka) → より.',
        blank: 1,
        distractors: ['から', 'と', 'で'],
    },
    {
        tag: 'viajes',
        blocks: [block('ホテル', 'place', 'から'), block('くうこう', 'place', 'まで'), block('1じかん', 'describe', 'ぐらい'), block('かかります', 'verb')],
        es: 'Del hotel al aeropuerto se tarda como una hora.',
        why: 'Cuánto tarda, más o menos → ぐらい.',
        blank: 2,
        distractors: ['ごろ', 'まで', 'に'],
    },
    {
        tag: 'viajes',
        blocks: [block('きょうと', 'place', 'へ'), block('おてら', 'object', 'を'), block('み', 'extra', 'に'), block('いきます', 'verb')],
        es: 'Voy a Kioto a ver templos.',
        why: 'Para qué vas (a ver) → みに いきます.',
        blank: 2,
        distractors: ['を', 'で', 'が'],
    },
    {
        tag: 'comida',
        blocks: [block('ラーメン', 'object', 'や'), block('ぎょうざ', 'object', 'を'), block('たべました', 'verb')],
        es: 'Comí ramen, gyoza y otras cosas.',
        why: 'Lista abierta («y otras cosas») → や.',
        blank: 0,
        distractors: ['を', 'で', 'が'],
    },
    {
        tag: 'comida',
        guide: 'pero',
        blocks: [block('この', 'extra'), block('みせ', 'topic', 'は'), clause('たかいです', 'が'), block('おいしいです', 'verb')],
        es: 'Este restaurante es caro, pero rico.',
        why: 'Dos ideas que chocan (caro / rico) → が al final de la primera.',
        blank: 2,
        distractors: ['を', 'で', 'に'],
    },
    {
        tag: 'trabajo',
        blocks: [block('かいぎ', 'topic', 'は'), block('30ぷん', 'describe', 'ぐらい'), block('かかります', 'verb')],
        es: 'La reunión dura unos 30 minutos.',
        why: 'Cuánto dura, más o menos → ぐらい.',
        blank: 1,
        distractors: ['ごろ', 'に', 'を'],
    },
    {
        tag: 'trabajo',
        guide: 'pero',
        blocks: [block('しごと', 'topic', 'は'), clause('いそがしいです', 'が'), block('たのしいです', 'verb')],
        es: 'El trabajo es pesado, pero divertido.',
        why: 'Dos ideas que chocan → が al final de la primera.',
        blank: 1,
        distractors: ['を', 'で', 'に'],
    },
    {
        tag: 'estudios',
        blocks: [block('ひらがな', 'topic', 'は'), block('かんじ', 'extra', 'より'), block('かんたんです', 'verb')],
        es: 'El hiragana es más fácil que los kanji.',
        why: 'Con qué comparas (los kanji) → より.',
        blank: 1,
        distractors: ['から', 'と', 'で'],
    },
    {
        tag: 'estudios',
        blocks: [block('きょう', 'topic', 'は'), block('ひらがな', 'object', 'だけ'), block('かきます', 'verb')],
        es: 'Hoy solo escribo hiragana.',
        why: '«Solo» hiragana → だけ.',
        blank: 1,
        distractors: ['も', 'が', 'で'],
    },
    {
        tag: 'anime',
        blocks: [block('アニメ', 'subject', 'や'), block('まんが', 'subject', 'が'), block('すきです', 'verb')],
        es: 'Me gustan el anime, el manga y cosas así.',
        why: 'Lista abierta («y cosas así») → や.',
        blank: 0,
        distractors: ['を', 'で', 'に'],
    },
    {
        tag: 'anime',
        blocks: [block('しゅうまつ', 'time'), block('アニメ', 'object', 'でも'), block('みません', 'verb', 'か')],
        es: '¿Vemos un anime o algo el fin de semana?',
        why: 'Propuesta suave («…o algo») → でも.',
        blank: 1,
        distractors: ['に', 'で', 'が'],
    },
    {
        tag: 'videojuegos',
        guide: 'pero',
        blocks: [block('この', 'extra'), block('ゲーム', 'topic', 'は'), clause('むずかしい', 'けど'), block('おもしろい', 'verb')],
        es: 'Este juego es difícil, pero divertido. (casual)',
        why: '«Pero» entre amigos → けど.',
        blank: 2,
        distractors: ['を', 'で', 'に'],
    },
    {
        tag: 'videojuegos',
        blocks: [block('ゲーム', 'topic', 'は'), block('1にち', 'time'), block('1じかん', 'describe', 'だけ'), block('します', 'verb')],
        es: 'Juego solo una hora al día.',
        why: '«Solo» una hora → だけ.',
        blank: 2,
        distractors: ['も', 'を', 'に'],
    },
    {
        tag: 'deporte',
        blocks: [block('やきゅう', 'extra', 'より'), block('サッカー', 'subject', 'が'), block('すきです', 'verb')],
        es: 'Me gusta más el fútbol que el béisbol.',
        why: 'Con qué comparas (el béisbol) → より.',
        blank: 0,
        distractors: ['から', 'と', 'で'],
    },
    {
        tag: 'deporte',
        blocks: [block('まいあさ', 'time'), block('30ぷん', 'describe', 'ぐらい'), block('はしります', 'verb')],
        es: 'Corro unos 30 minutos cada mañana.',
        why: 'Cuánto tiempo, más o menos → ぐらい.',
        blank: 1,
        distractors: ['ごろ', 'に', 'を'],
    },
    {
        tag: 'musica',
        blocks: [block('ピアノ', 'object', 'や'), block('ギター', 'object', 'を'), block('ひきます', 'verb')],
        es: 'Toco el piano, la guitarra y otros.',
        why: 'Lista abierta («y otros») → や.',
        blank: 0,
        distractors: ['を', 'で', 'が'],
    },
    {
        tag: 'anime',
        blocks: [block('わたし', 'topic', 'も'), block('アニメ', 'subject', 'が'), block('すきです', 'verb')],
        es: 'A mí también me gusta el anime.',
        why: '«También» → も, en el lugar de は.',
        blank: 0,
        distractors: ['は', 'を', 'で'],
    },
    {
        tag: 'deporte',
        blocks: [block('カルロスさん', 'topic', 'も'), block('サッカー', 'subject', 'が'), block('じょうずです', 'verb')],
        es: 'Carlos también es bueno en el fútbol.',
        why: '«También» → も, en el lugar de は.',
        blank: 0,
        distractors: ['は', 'を', 'で'],
    },
    {
        tag: 'viajes',
        blocks: [block('この', 'extra'), block('バス', 'topic', 'は'), block('くうこう', 'place', 'へ'), block('いきます', 'verb', 'か')],
        es: '¿Este autobús va al aeropuerto?',
        why: 'Pregunta → か al final.',
        blank: 3,
        distractors: ['を', 'に', 'で'],
    },
    {
        tag: 'comida',
        blocks: [block('おすすめ', 'topic', 'は'), block('なんです', 'verb', 'か')],
        es: '¿Qué me recomienda?',
        why: 'Pregunta → か al final.',
        blank: 1,
        distractors: ['を', 'に', 'で'],
    },
    {
        tag: 'viajes',
        blocks: [block('なりた', 'place', 'から'), block('とうきょう', 'place', 'まで'), block('でんしゃ', 'extra', 'で'), block('いきます', 'verb')],
        es: 'Voy de Narita a Tokio en tren.',
        why: '«Desde» Narita → から.',
        blank: 0,
        distractors: ['まで', 'に', 'を'],
    },
    {
        tag: 'estudios',
        blocks: [block('まいにち', 'time'), block('としょかん', 'place', 'で'), block('5じ', 'time', 'まで'), block('べんきょうします', 'verb')],
        es: 'Todos los días estudio en la biblioteca hasta las 5.',
        why: '«Hasta» las 5 → まで.',
        blank: 2,
        distractors: ['から', 'に', 'で'],
    },
    {
        tag: 'musica',
        blocks: [block('この', 'extra'), block('うた', 'topic', 'は'), block('いいです', 'verb', 'ね')],
        es: 'Esta canción está buena, ¿verdad?',
        why: 'Buscas que el otro esté de acuerdo → ね.',
        blank: 2,
        distractors: ['よ', 'か', 'を'],
    },
    {
        tag: 'videojuegos',
        blocks: [block('この', 'extra'), block('ゲーム', 'topic', 'は'), block('おもしろいです', 'verb', 'よ')],
        es: 'Este juego es divertido, ¡te lo digo!',
        why: 'Le cuentas algo que no sabe → よ.',
        blank: 2,
        distractors: ['ね', 'か', 'を'],
    },
    {
        tag: 'musica',
        blocks: [block('いっしょ', 'extra', 'に'), block('うた', 'object', 'でも'), block('うたいません', 'verb', 'か')],
        es: '¿Cantamos algo juntos?',
        why: 'Propuesta suave («una canción o algo») → でも.',
        blank: 1,
        distractors: ['に', 'で', 'が'],
    },
];

/** Devuelve las frases de los intereses del usuario (todas si no eligió ninguno) */
export function interestSentences(interests: string[]): GuideSentence[] {
    return interests.length ? INTEREST_SENTENCES.filter((sentence) => !!sentence.tag && interests.includes(sentence.tag)) : INTEREST_SENTENCES;
}

/**
 * Devuelve las frases de los intereses del usuario que practican una partícula: las marcadas con
 * `guide` van solo a esa ficha (el が de «pero» no es el de sujeto); el resto, por el trozo que se tapa
 */
export function interestSentencesFor(guide: ParticleGuide, interests: string[]): GuideSentence[] {
    return interestSentences(interests).filter((sentence) => {
        if (sentence.guide) return sentence.guide === guide.id;
        const particle = sentence.blocks[blankIndex(sentence)]?.particle;
        return !!particle && guide.forms.includes(particle);
    });
}
// ------------------------------- Frases por interés ------------------------------------------------------------- //

// ------------------------------- Práctica ------------------------------------------------------------- //
/** Ejercicios que se ofrecen en la pestaña «Practicar» */
export const GRAMMAR_DRILLS: GrammarDrillOption[] = [
    { id: 'particles', label: '¿Qué partícula va?', desc: 'Completa el hueco y aprende por qué va esa', icon: 'link' },
    { id: 'roles', label: '¿Qué papel cumple?', desc: 'Reconoce el tema, el lugar, el cuándo…', icon: 'target' },
    { id: 'build', label: 'Arma la frase', desc: 'Pon los trozos en orden: verbo al final', icon: 'puzzle' },
    { id: 'mixed', label: 'Todo mezclado', desc: 'Un poco de cada uno', icon: 'shuffle' },
];
// ------------------------------- Práctica ------------------------------------------------------------- //
