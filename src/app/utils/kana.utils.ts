import { toKatakana } from 'wanakana';
import { Script, KanaGroup, Kana, KanaRow, Lookalike, KanaRowDef, ExtendedRowDef, KatakanaRule } from '../interfaces/kana.interface';

// En las tablas, `_` marca una celda vacía de la cuadrícula y `/` separa las alternativas de romaji.

/** Filas básicas (gojūon): あ, か, さ… hasta ん */
const BASIC: KanaRowDef[] = [
    ['a', 'a', 'あいうえお', 'アイウエオ', 'a i u e o'],
    ['k', 'ka', 'かきくけこ', 'カキクケコ', 'ka ki ku ke ko'],
    ['s', 'sa', 'さしすせそ', 'サシスセソ', 'sa shi/si su se so'],
    ['t', 'ta', 'たちつてと', 'タチツテト', 'ta chi/ti tsu/tu te to'],
    ['n', 'na', 'なにぬねの', 'ナニヌネノ', 'na ni nu ne no'],
    ['h', 'ha', 'はひふへほ', 'ハヒフヘホ', 'ha hi fu/hu he ho'],
    ['m', 'ma', 'まみむめも', 'マミムメモ', 'ma mi mu me mo'],
    ['y', 'ya', 'や_ゆ_よ', 'ヤ_ユ_ヨ', 'ya _ yu _ yo'],
    ['r', 'ra', 'らりるれろ', 'ラリルレロ', 'ra ri ru re ro'],
    ['w', 'wa', 'わ___を', 'ワ___ヲ', 'wa _ _ _ wo/o'],
    ['nn', 'n', 'ん____', 'ン____', 'n/nn _ _ _ _'],
];

/** Filas con tenten ゛ o maru ゜ (が, ざ, だ, ば, ぱ) */
const DAKUTEN: KanaRowDef[] = [
    ['g', 'ga', 'がぎぐげご', 'ガギグゲゴ', 'ga gi gu ge go'],
    ['z', 'za', 'ざじずぜぞ', 'ザジズゼゾ', 'za ji/zi zu ze zo'],
    ['d', 'da', 'だぢづでど', 'ダヂヅデド', 'da ji/di zu/du de do'],
    ['b', 'ba', 'ばびぶべぼ', 'バビブベボ', 'ba bi bu be bo'],
    ['p', 'pa', 'ぱぴぷぺぽ', 'パピプペポ', 'pa pi pu pe po'],
];

/** Filas combinadas (yōon): consonante + ゃゅょ pequeña, 3 celdas cada una */
const YOON: KanaRowDef[] = [
    ['ky', 'kya', 'きゃ きゅ きょ', 'キャ キュ キョ', 'kya kyu kyo'],
    ['sh', 'sha', 'しゃ しゅ しょ', 'シャ シュ ショ', 'sha/sya shu/syu sho/syo'],
    ['ch', 'cha', 'ちゃ ちゅ ちょ', 'チャ チュ チョ', 'cha/tya chu/tyu cho/tyo'],
    ['ny', 'nya', 'にゃ にゅ にょ', 'ニャ ニュ ニョ', 'nya nyu nyo'],
    ['hy', 'hya', 'ひゃ ひゅ ひょ', 'ヒャ ヒュ ヒョ', 'hya hyu hyo'],
    ['my', 'mya', 'みゃ みゅ みょ', 'ミャ ミュ ミョ', 'mya myu myo'],
    ['ry', 'rya', 'りゃ りゅ りょ', 'リャ リュ リョ', 'rya ryu ryo'],
    ['gy', 'gya', 'ぎゃ ぎゅ ぎょ', 'ギャ ギュ ギョ', 'gya gyu gyo'],
    ['j', 'ja', 'じゃ じゅ じょ', 'ジャ ジュ ジョ', 'ja/jya/zya ju/jyu/zyu jo/jyo/zyo'],
    ['by', 'bya', 'びゃ びゅ びょ', 'ビャ ビュ ビョ', 'bya byu byo'],
    ['py', 'pya', 'ぴゃ ぴゅ ぴょ', 'ピャ ピュ ピョ', 'pya pyu pyo'],
];

/** Combinaciones que solo existen en katakana, para palabras extranjeras */
const EXTENDED: ExtendedRowDef[] = [
    ['x-t', 'ti', 'ティ ディ トゥ ドゥ デュ', 'ti di tu du dyu'],
    ['x-f', 'fa', 'ファ フィ フェ フォ フュ', 'fa fi fe fo fyu'],
    ['x-w', 'wi', 'ウィ ウェ ウォ ヴァ ヴ', 'wi we wo va vu'],
    ['x-sh', 'she', 'シェ ジェ チェ イェ ヴィ', 'she je che ye vi'],
];

/** Separa una cadena de kana en celdas: por espacios si los tiene (combinados de 2 caracteres), si no carácter a carácter */
function splitChars(text: string): string[] {
    return text.includes(' ') ? text.split(' ') : [...text];
}

/** Convierte las definiciones compactas de un grupo en filas de la tabla para un silabario */
function buildRows(definitions: KanaRowDef[], group: KanaGroup, script: Script): KanaRow[] {
    return definitions.map(([id, label, hira, kata, romajiText]) => {
        const chars = splitChars(script === 'hiragana' ? hira : kata);
        const romajiList = romajiText.split(' ');
        return {
            id,
            label,
            group,
            cells: chars.map((char, index) =>
                char === '_' ? null : { char, romaji: romajiList[index].split('/'), row: id, group, script },
            ),
        };
    });
}

/** Construye las filas de la pestaña «Extranjeros», que solo existe en katakana */
function buildExtended(): KanaRow[] {
    return EXTENDED.map(([id, label, kata, romajiText]) => {
        const chars = kata.split(' ');
        const romajiList = romajiText.split(' ');
        return {
            id,
            label,
            group: 'extended' as const,
            cells: chars.map((char, index) => ({
                char,
                romaji: romajiList[index].split('/'),
                row: id,
                group: 'extended' as const,
                script: 'katakana' as const,
            })),
        };
    });
}

/** Todas las filas de la tabla por silabario, en el orden en que se muestran */
export const KANA_ROWS: Record<Script, KanaRow[]> = {
    hiragana: [
        ...buildRows(BASIC, 'basic', 'hiragana'),
        ...buildRows(DAKUTEN, 'dakuten', 'hiragana'),
        ...buildRows(YOON, 'yoon', 'hiragana'),
    ],
    katakana: [
        ...buildRows(BASIC, 'basic', 'katakana'),
        ...buildRows(DAKUTEN, 'dakuten', 'katakana'),
        ...buildRows(YOON, 'yoon', 'katakana'),
        ...buildExtended(),
    ],
};

/** Devuelve los kana de un silabario (sin celdas vacías), solo de las filas pedidas si se pasan sus ids */
export function allKana(script: Script, rowIds?: string[]): Kana[] {
    return KANA_ROWS[script]
        .filter((row) => !rowIds || rowIds.includes(row.id))
        .flatMap((row) => row.cells.filter((cell): cell is Kana => !!cell));
}

/** Busca un carácter en hiragana y luego en katakana; devuelve undefined si no está en la tabla */
export function findKana(char: string): Kana | undefined {
    for (const script of ['hiragana', 'katakana'] as Script[]) {
        const kana = allKana(script).find((candidate) => candidate.char === char);
        if (kana) return kana;
    }
    return undefined;
}

/** Texto de cada pestaña de grupo en la tabla */
export const GROUP_LABELS: Record<KanaGroup, string> = {
    basic: 'Básicos',
    dakuten: 'Con tenten ゛゜',
    yoon: 'Combinados',
    extended: 'Extranjeros',
};

/* ---------------- Trucos para memorizar (redacción propia) ---------------- */

/** Truco de memoria de cada katakana básico, por carácter */
export const KATAKANA_TIPS: Record<string, string> = {
    ア: 'Un hacha vista de lado. «A» de «Afilada».',
    イ: 'Una persona inclinada, como el radical 亻. «i» de «Inclinado».',
    ウ: 'Como う pero con un techito cuadrado arriba.',
    エ: 'Una viga de acero en forma de «I» acostada. «e» de «Estructura».',
    オ: 'Un espantapájaros con los brazos abiertos. Se parece a お sin el rizo.',
    カ: 'Igual que か, pero sin el trazo pequeño de la derecha.',
    キ: 'Como き sin la curva de abajo: una llave (key).',
    ク: 'Dos trazos: una «7» con la patita corta. Parece el pico de un cuervo que dice «ku».',
    ケ: 'Una «K» caída hacia la derecha. Tiene un palito que sale arriba (ク no lo tiene).',
    コ: 'Una esquina de caja abierta a la izquierda. «ko» de «Codo».',
    サ: 'Como さ, pero con dos patitas verticales.',
    シ: 'Dos gotas a la IZQUIERDA y un trazo que SUBE desde abajo. Como una sonrisa mirando al cielo.',
    ス: 'Una persona saltando con las piernas abiertas. «su» de «Subir».',
    セ: 'Como せ, pero la curva final es un gancho corto.',
    ソ: 'Una gota y un trazo largo que BAJA desde arriba (al revés que ン).',
    タ: 'Como ク pero con una rayita dentro: un «ta»burete.',
    チ: 'Parece el kanji 千 (mil): un «chi»co con los brazos abiertos y sombrero.',
    ツ: 'Tres trazos que CAEN desde arriba: las gotas miran hacia abajo. «tsu» de «tsunami».',
    テ: 'Una antena de TEle: dos rayas arriba y un poste.',
    ト: 'Un poste con una ramita: un «Tótem».',
    ナ: 'Una cruz con el brazo largo: «Navidad».',
    ニ: 'Dos rayas, como el número 二 (dos). Igual que に sin el palito.',
    ヌ: 'Como ス con una rayita cruzada: alguien haciendo un «nudo».',
    ネ: 'Una persona con brazos en cruz y una pierna levantada: «ne».',
    ノ: 'Un solo trazo diagonal, como decir «no» moviendo la mano.',
    ハ: 'Dos trazos que se abren como una carcajada: «ha-ha».',
    ヒ: 'Una silla vista de lado. «hi»: siéntate aquí.',
    フ: 'Un gancho como el sombrero de ふ. «fu» como un soplido de viento.',
    ヘ: 'Idéntica a へ: una montañita.',
    ホ: 'Una cruz con dos patitas: parece la parte derecha de ほ.',
    マ: 'La cabeza de una mamá con moño. «ma».',
    ミ: 'Tres rayas inclinadas: «mi» = tres (三) miradas.',
    ム: 'Un brazo flexionado mostrando «mu»sculo.',
    メ: 'Una «X»: «me» equivoqué. Es ノ con una rayita cruzada.',
    モ: 'Como も, pero con el trazo vertical recto.',
    ヤ: 'Como や, pero más simple.',
    ユ: 'Una «U» cuadrada: la raya de abajo sobresale (en コ no).',
    ヨ: 'Una «E» al revés. «yo»-yo.',
    ラ: 'Una tapa encima de フ: «ra».',
    リ: 'Casi igual que り.',
    ル: 'Dos raíces, la derecha termina en curva: «ru».',
    レ: 'Una «L» inclinada: «re».',
    ロ: 'Un cuadrado, como una boca 口: «ro».',
    ワ: 'Como ウ sin el puntito de arriba.',
    ヲ: 'Como フ con una raya en medio. Casi solo se usa como partícula.',
    ン: 'Una gota y un trazo que SUBE desde abajo (al revés que ソ).',
};

/** Truco de memoria de cada hiragana básico, por carácter */
export const HIRAGANA_TIPS: Record<string, string> = {
    あ: 'Una «a» con una cruz encima.',
    い: 'Dos palitos, como dos «i» juntas.',
    う: 'Una oreja con un puntito: «u».',
    え: 'Un pájaro «e»xótico bailando.',
    お: 'Como あ pero con un puntito aparte: ¡«o»h!',
    か: 'Un «ka»rateca dando una patada.',
    き: 'Una llave (key).',
    く: 'El pico abierto de un pájaro: «ku-ku».',
    け: 'Un barril de «ke»tchup.',
    こ: 'Dos lombrices «co»rtas.',
    さ: 'Una cara de perfil sonriendo: «sa».',
    し: 'Un anzuelo: «shi».',
    す: 'Un lazo en una cuerda: «su».',
    せ: 'Una boca abierta diciendo «se».',
    そ: 'Una costura en zigzag: «so».',
    た: 'Parece «t» y «a» juntas: «ta».',
    ち: 'Un «5» al revés: «chi».',
    つ: 'Una ola de tsunami: «tsu».',
    て: 'Una mano extendida (te = mano en japonés).',
    と: 'Un dedo del pie con una espina: «to».',
    な: 'Una cruz con un nudo: «na».',
    に: 'Un palito y dos rayas (como 二): «ni».',
    ぬ: 'Fideos con un rizo al final: «nu». (め no tiene rizo)',
    ね: 'Un gato enroscado con cola en rizo: «ne».',
    の: 'Una señal de prohibido: «no».',
    は: 'Una «h» con una «a»: «ha».',
    ひ: 'Una sonrisa grande: «hi-hi».',
    ふ: 'Un Monte Fuji con nubes: «fu».',
    へ: 'Una montañita: «he».',
    ほ: 'Como は pero con techo: «ho».',
    ま: 'Una «ma»ma con los brazos cruzados.',
    み: 'El número 21: «mi».',
    む: 'Una vaca diciendo «mu».',
    め: 'Un ojo (me = ojo en japonés). Sin rizo, a diferencia de ぬ.',
    も: 'Un anzuelo con dos rayas: «mo».',
    や: 'Un yak con cuernos: «ya».',
    ゆ: 'Un pez nadando: «yu».',
    よ: 'Un yo-yo colgando: «yo».',
    ら: 'Un conejo (rabbit) sentado: «ra».',
    り: 'Dos juncos: «ri».',
    る: 'Un camino con rizo al final: «ru». (ろ no tiene rizo)',
    れ: 'Una persona arrodillada: «re». Termina con una curva hacia afuera.',
    ろ: 'Como る pero sin rizo: «ro».',
    わ: 'Como ね pero sin rizo: «wa».',
    を: 'Alguien ¡«wo»! tropezando.',
    ん: 'Una «n» escrita a mano.',
};

/* ---------------- Símbolos parecidos ---------------- */

/** Grupos de katakana que se confunden, con el truco para distinguirlos */
export const KATAKANA_LOOKALIKES: Lookalike[] = [
    {
        chars: ['シ', 'ツ'],
        tip: 'シ (shi): gotas a la izquierda y el trazo largo SUBE de abajo a arriba. ツ (tsu): gotas arriba y el trazo largo BAJA de arriba hacia abajo.',
    },
    {
        chars: ['ソ', 'ン'],
        tip: 'ソ (so): el trazo largo BAJA, casi vertical. ン (n): el trazo largo SUBE, casi horizontal.',
    },
    {
        chars: ['シ', 'ツ', 'ソ', 'ン'],
        tip: 'Truco: si las gotas están a la izquierda (シ ン) el trazo sube; si están arriba (ツ ソ) el trazo baja.',
    },
    {
        chars: ['ク', 'ケ', 'タ'],
        tip: 'ク (ku): solo el gancho. ケ (ke): el palito de arriba cruza hacia la derecha. タ (ta): ク con una rayita dentro.',
    },
    {
        chars: ['ワ', 'ウ', 'フ', 'ラ'],
        tip: 'フ (fu): solo el gancho. ワ (wa): フ con una patita a la izquierda. ウ (u): ワ con un puntito arriba. ラ (ra): フ con una tapa encima.',
    },
    {
        chars: ['ス', 'ヌ'],
        tip: 'ス (su): una persona saltando. ヌ (nu): la misma persona pero con una rayita que la cruza.',
    },
    {
        chars: ['チ', 'テ'],
        tip: 'チ (chi): el primer trazo es inclinado y el poste se curva. テ (te): dos rayas rectas arriba.',
    },
    {
        chars: ['ノ', 'メ'],
        tip: 'ノ (no): un solo trazo. メ (me): ノ con otra rayita que lo cruza.',
    },
    {
        chars: ['コ', 'ユ', 'ロ'],
        tip: 'コ (ko): abierta a la izquierda. ユ (yu): la raya de abajo sobresale. ロ (ro): cerrada como un cuadrado.',
    },
    {
        chars: ['マ', 'ア'],
        tip: 'マ (ma): el trazo pequeño va hacia la derecha abajo. ア (a): el trazo baja desde el centro hacia la izquierda.',
    },
    {
        chars: ['ル', 'レ'],
        tip: 'ル (ru): dos trazos. レ (re): uno solo, como una «L».',
    },
    {
        chars: ['ナ', 'メ', 'サ'],
        tip: 'ナ (na): una cruz. メ (me): una «X». サ (sa): una cruz con dos patas.',
    },
];

/** Grupos de hiragana que se confunden, con el truco para distinguirlos */
export const HIRAGANA_LOOKALIKES: Lookalike[] = [
    { chars: ['ぬ', 'め'], tip: 'ぬ (nu) termina con un rizo; め (me) no.' },
    { chars: ['ね', 'れ', 'わ'], tip: 'ね (ne) termina en rizo; れ (re) termina en curva hacia afuera; わ (wa) termina en curva hacia adentro.' },
    { chars: ['る', 'ろ'], tip: 'る (ru) tiene un rizo al final; ろ (ro) no.' },
    { chars: ['は', 'ほ'], tip: 'ほ (ho) tiene una raya extra arriba, como un techo.' },
    { chars: ['さ', 'ち'], tip: 'Son espejos: さ (sa) abre hacia la izquierda; ち (chi) hacia la derecha.' },
    { chars: ['き', 'さ'], tip: 'き (ki) tiene dos rayas horizontales; さ (sa) solo una.' },
    { chars: ['い', 'り'], tip: 'い (i): dos trazos separados y cortos. り (ri): el trazo derecho es mucho más largo.' },
    { chars: ['あ', 'お'], tip: 'あ (a): la cruz atraviesa el círculo. お (o): tiene un puntito a la derecha.' },
];

/* ---------------- Reglas del katakana ---------------- */

/** Reglas que explica el laboratorio de katakana, con ejemplos que se pueden escuchar */
export const KATAKANA_RULES: KatakanaRule[] = [
    {
        title: '¿Para qué sirve el katakana?',
        body: 'Se usa sobre todo para palabras que vienen de otros idiomas, nombres de países y nombres de personas extranjeras. ¡Tu nombre en japonés se escribe en katakana!',
        examples: [
            ['テレビ', 'terebi · televisión'],
            ['メキシコ', 'mekishiko · México'],
        ],
    },
    {
        title: 'La raya ー alarga la vocal',
        body: 'En katakana las vocales largas se marcan con una raya ー. Solo dura el doble: コ-ヒ-ー suena «kōhī».',
        examples: [
            ['コーヒー', 'kōhī · café'],
            ['ケーキ', 'kēki · pastel'],
        ],
    },
    {
        title: 'La ッ pequeña = pausa',
        body: 'Una ッ pequeña duplica la consonante siguiente: haces una micro-pausa antes de ella.',
        examples: [
            ['ベッド', 'beddo · cama'],
            ['サッカー', 'sakkā · fútbol'],
        ],
    },
    {
        title: 'Vocales pequeñas ァィゥェォ',
        body: 'Para sonidos que no existen en japonés se usan vocales pequeñas: フ + ァ = «fa», テ + ィ = «ti».',
        examples: [
            ['パーティー', 'pātī · fiesta'],
            ['フォーク', 'fōku · tenedor'],
        ],
    },
    {
        title: 'Cómo se adaptan los sonidos',
        body: 'El japonés no tiene «l» (se usa ラ行), casi no usa «v» (se usa バ行) y casi todas las sílabas terminan en vocal: por eso «hotel» es ホテル (hoteru).',
        examples: [
            ['ホテル', 'hoteru · hotel'],
            ['ワイン', 'wain · vino'],
        ],
    },
];

/* ---------------- Préstamos (práctica de lectura en katakana) ---------------- */

/** Palabras extranjeras en katakana con su significado en español */
export const LOANWORDS: [kata: string, es: string][] = [
    ['コーヒー', 'café'], ['テレビ', 'televisión'], ['パン', 'pan'], ['カメラ', 'cámara'],
    ['ラジオ', 'radio'], ['コンピューター', 'computadora'], ['ノート', 'cuaderno'],
    ['ボールペン', 'bolígrafo'], ['カード', 'tarjeta'], ['ネクタイ', 'corbata'], ['シャツ', 'camisa'],
    ['ワイン', 'vino'], ['ビール', 'cerveza'], ['ジュース', 'jugo'], ['ケーキ', 'pastel'],
    ['アイスクリーム', 'helado'], ['ホテル', 'hotel'], ['レストラン', 'restaurante'],
    ['デパート', 'grandes almacenes'], ['エレベーター', 'ascensor'], ['タクシー', 'taxi'],
    ['バス', 'autobús'], ['トイレ', 'baño'], ['メール', 'correo electrónico'],
    ['インターネット', 'internet'], ['ゲーム', 'videojuego'], ['サッカー', 'fútbol'],
    ['テニス', 'tenis'], ['ピアノ', 'piano'], ['ギター', 'guitarra'], ['パーティー', 'fiesta'],
    ['プレゼント', 'regalo'], ['チョコレート', 'chocolate'], ['サラダ', 'ensalada'],
    ['スープ', 'sopa'], ['ハンバーガー', 'hamburguesa'], ['ピザ', 'pizza'], ['トマト', 'tomate'],
    ['バナナ', 'plátano'], ['オレンジ', 'naranja'], ['レモン', 'limón'], ['ミルク', 'leche'],
    ['チーズ', 'queso'], ['フォーク', 'tenedor'], ['ナイフ', 'cuchillo'], ['スプーン', 'cuchara'],
    ['カレー', 'curry'], ['ラーメン', 'ramen'], ['アニメ', 'anime'], ['コンビニ', 'tienda 24 h'],
    ['ソファ', 'sofá'], ['パソコン', 'computadora personal'], ['ドア', 'puerta'], ['ベッド', 'cama'],
    ['シャワー', 'ducha'], ['テーブル', 'mesa'], ['ペン', 'pluma'], ['ビデオ', 'video'],
    ['スマホ', 'teléfono inteligente'], ['ティッシュ', 'pañuelo de papel'],
    ['アメリカ', 'Estados Unidos'], ['メキシコ', 'México'], ['スペイン', 'España'],
    ['ブラジル', 'Brasil'], ['アルゼンチン', 'Argentina'], ['コロンビア', 'Colombia'],
    ['ペルー', 'Perú'], ['チリ', 'Chile'], ['フランス', 'Francia'], ['イタリア', 'Italia'],
    ['ドイツ', 'Alemania'], ['カナダ', 'Canadá'], ['キューバ', 'Cuba'], ['ベネズエラ', 'Venezuela'],
];

/* ---------------- Nombres en katakana ---------------- */

/** Mapeo extra para wanakana: sílabas con vocal pequeña que no sabe sacar del romaji */
const NAME_KANA_MAPPING: Record<string, string> = { thi: 'ティ', dhi: 'ディ', twu: 'トゥ', dwu: 'ドゥ' };

/** Adapta de forma aproximada un nombre en español a katakana (es un juego, no una transcripción oficial) */
export function nameToKatakana(name: string): string {
    // 1. Minúsculas sin acentos ni símbolos (la regla de la ñ quiere dejarla como «ny»)
    let romaji = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/ñ/g, 'ny')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s-]/g, '');

    // 2. Sonidos del español que el japonés no tiene. «ch» se protege en mayúsculas para que la regla de la «c» no la toque
    romaji = romaji
        .replace(/ll/g, 'y')
        .replace(/qu/g, 'k')
        .replace(/c([ei])/g, 's$1')
        .replace(/ch/g, 'CH')
        .replace(/c/g, 'k')
        .replace(/x/g, 'ks')
        .replace(/z/g, 's')
        .replace(/v/g, 'b')
        .replace(/l/g, 'r')
        .replace(/j/g, 'h')
        .replace(/g([ei])/g, 'h$1')
        .replace(/w/g, 'u')
        .replace(/CH/g, 'ch')
        .replace(/h(?![aeiou])/g, '');

    // 3. Añade una vocal tras cada consonante sin vocal detrás: en japonés casi toda sílaba acaba en vocal
    let withVowels = '';
    for (let i = 0; i < romaji.length; i++) {
        const letter = romaji[i];
        const nextLetter = romaji[i + 1] ?? '';
        withVowels += letter;
        if (/[bcdfghjkmpqrstvxyz]/.test(letter) && !/[aeiouy]/.test(nextLetter) && !(letter === 'c' && nextLetter === 'h') && !(letter === 's' && nextLetter === 'h')) {
            withVowels += letter === 't' || letter === 'd' ? 'o' : 'u';
        }
    }

    // 4. ti/di/tu/du se marcan para que salgan ティ, ディ, トゥ, ドゥ y no チ, ヂ, ツ, ヅ
    withVowels = withVowels.replace(/ti/g, 'thi').replace(/di/g, 'dhi').replace(/tu/g, 'twu').replace(/du/g, 'dwu');

    // 5. A katakana; el espacio entre nombre y apellido pasa a ・
    return toKatakana(withVowels, { customKanaMapping: NAME_KANA_MAPPING }).replace(/\s+/g, '・');
}
