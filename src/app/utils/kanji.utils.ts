/**
 * Kanji básicos (nivel N5) con significado, lecturas, trazos y un truco para recordarlos, y las funciones
 * que los cruzan con el vocabulario de las lecciones (en qué lección aparece cada uno y qué palabras lo usan).
 */
import { Lesson } from '../interfaces/lesson.interface';
import { KanjiDrillOption, KanjiEntry, KanjiGroup, KanjiInfo, KanjiWord } from '../interfaces/kanji.interface';
import { MasteryEntry } from '../interfaces/progress.interface';
import { cleanForm } from './questions.utils';
import { todayKey } from './text.utils';

/** Palabras de ejemplo que se enseñan como máximo en la ficha de un kanji */
const MAX_WORDS_PER_KANJI = 8;

/** Los 100 kanji básicos, por tema (la lista los ordena después por la lección donde aparecen) */
export const KANJI_N5: KanjiEntry[] = [
    // --- Números y dinero ---
    { char: '一', meaning: 'uno', on: ['イチ', 'イツ'], kun: ['ひと(つ)'], strokes: 1, tip: 'Una sola raya: uno.' },
    { char: '二', meaning: 'dos', on: ['ニ'], kun: ['ふた(つ)'], strokes: 2, tip: 'Dos rayas: dos. La de abajo es más larga.' },
    { char: '三', meaning: 'tres', on: ['サン'], kun: ['みっ(つ)'], strokes: 3, tip: 'Tres rayas: tres.' },
    { char: '四', meaning: 'cuatro', on: ['シ'], kun: ['よ(っつ)', 'よん'], strokes: 5, tip: 'Un cuarto con cuatro esquinas y cortinas en la ventana.' },
    { char: '五', meaning: 'cinco', on: ['ゴ'], kun: ['いつ(つ)'], strokes: 4, tip: 'Parece un 5 con techo y piso.' },
    { char: '六', meaning: 'seis', on: ['ロク'], kun: ['むっ(つ)'], strokes: 4, tip: 'Una persona con sombrero que abre las piernas.' },
    { char: '七', meaning: 'siete', on: ['シチ'], kun: ['なな(つ)', 'なな'], strokes: 2, tip: 'Es un 7 volteado de cabeza.' },
    { char: '八', meaning: 'ocho', on: ['ハチ'], kun: ['やっ(つ)'], strokes: 2, tip: 'Dos trazos que se abren hacia abajo, como el techo de una casita.' },
    { char: '九', meaning: 'nueve', on: ['キュウ', 'ク'], kun: ['ここの(つ)'], strokes: 2, tip: 'Una «n» con un brazo estirado: casi un 9.' },
    { char: '十', meaning: 'diez', on: ['ジュウ'], kun: ['とお'], strokes: 2, tip: 'Una cruz, como la X romana (10) girada.' },
    { char: '百', meaning: 'cien', on: ['ヒャク'], kun: [], strokes: 6, tip: 'Uno (一) encima de blanco (白): cien.' },
    { char: '千', meaning: 'mil', on: ['セン'], kun: ['ち'], strokes: 3, tip: 'Diez (十) con un sombrerito: mil.' },
    { char: '万', meaning: 'diez mil', on: ['マン', 'バン'], kun: [], strokes: 3, tip: 'El billete grande: いちまんえん = 10 000 yenes.' },
    { char: '円', meaning: 'yen; círculo', on: ['エン'], kun: ['まる(い)'], strokes: 4, tip: 'Una ventanilla de banco donde pagas en yenes.' },

    // --- Días y tiempo ---
    { char: '日', meaning: 'día; sol', on: ['ニチ', 'ジツ'], kun: ['ひ', 'か'], strokes: 4, tip: 'Una ventana por donde entra el sol.' },
    { char: '月', meaning: 'mes; luna', on: ['ゲツ', 'ガツ'], kun: ['つき'], strokes: 4, tip: 'Una luna con dos nubes que la cruzan.' },
    { char: '火', meaning: 'fuego', on: ['カ'], kun: ['ひ'], strokes: 4, tip: 'Una fogata con chispas a los lados. かようび = martes.' },
    { char: '水', meaning: 'agua', on: ['スイ'], kun: ['みず'], strokes: 4, tip: 'Un chorro de agua que salpica a los lados. すいようび = miércoles.' },
    { char: '木', meaning: 'árbol; madera', on: ['モク', 'ボク'], kun: ['き'], strokes: 4, tip: 'Un árbol: tronco, ramas y raíces. もくようび = jueves.' },
    { char: '金', meaning: 'dinero; oro', on: ['キン', 'コン'], kun: ['かね'], strokes: 8, tip: 'Un techo que guarda lingotes de oro. きんようび = viernes.' },
    { char: '土', meaning: 'tierra', on: ['ド', 'ト'], kun: ['つち'], strokes: 3, tip: 'Un brote que sale de la tierra. どようび = sábado.' },
    { char: '年', meaning: 'año', on: ['ネン'], kun: ['とし'], strokes: 6, tip: 'Alguien cargando la cosecha de todo el año.' },
    { char: '時', meaning: 'hora; tiempo', on: ['ジ'], kun: ['とき'], strokes: 10, tip: 'Sol (日) + templo (寺): la campana del templo da la hora.' },
    { char: '分', meaning: 'minuto; parte; entender', on: ['フン', 'ブン'], kun: ['わ(かる)'], strokes: 4, tip: 'Un cuchillo (刀) que corta en partes: dividir el tiempo en minutos.' },
    { char: '半', meaning: 'mitad; y media', on: ['ハン'], kun: ['なか(ば)'], strokes: 5, tip: 'Una línea que corta todo justo por la mitad. 3じはん = 3 y media.' },
    { char: '今', meaning: 'ahora', on: ['コン', 'キン'], kun: ['いま'], strokes: 4, tip: 'Un techo que cubre este momento: ahora.' },
    { char: '午', meaning: 'mediodía', on: ['ゴ'], kun: [], strokes: 4, tip: 'Sale en ごぜん (a. m.) y ごご (p. m.). Parece 牛 (vaca) sin el cuerno.' },
    { char: '前', meaning: 'antes; delante', on: ['ゼン'], kun: ['まえ'], strokes: 9, tip: 'Sale en なまえ (nombre) y ごぜん (antes del mediodía).' },
    { char: '後', meaning: 'después; detrás', on: ['ゴ', 'コウ'], kun: ['うし(ろ)', 'あと'], strokes: 9, tip: 'Sale en ごご: después del mediodía.' },
    { char: '毎', meaning: 'cada', on: ['マイ'], kun: [], strokes: 6, tip: 'Lo verás en まいにち (cada día) y まいあさ (cada mañana).' },
    { char: '週', meaning: 'semana', on: ['シュウ'], kun: [], strokes: 11, tip: 'Camino (⻌) que da la vuelta: la semana empieza otra vez.' },
    { char: '間', meaning: 'intervalo; entre', on: ['カン', 'ケン'], kun: ['あいだ', 'ま'], strokes: 12, tip: 'El sol (日) visto entre las dos hojas de una puerta (門).' },

    // --- Personas y escuela ---
    { char: '人', meaning: 'persona', on: ['ジン', 'ニン'], kun: ['ひと'], strokes: 2, tip: 'Una persona caminando, vista de lado.' },
    { char: '男', meaning: 'hombre', on: ['ダン', 'ナン'], kun: ['おとこ'], strokes: 7, tip: 'Campo (田) + fuerza (力): el que trabaja el campo.' },
    { char: '女', meaning: 'mujer', on: ['ジョ', 'ニョ'], kun: ['おんな'], strokes: 3, tip: 'Una mujer sentada con las piernas cruzadas.' },
    { char: '子', meaning: 'niño', on: ['シ', 'ス'], kun: ['こ'], strokes: 3, tip: 'Un bebé envuelto con los brazos abiertos.' },
    { char: '父', meaning: 'papá', on: ['フ'], kun: ['ちち'], strokes: 4, tip: 'Dos herramientas cruzadas: papá trabajando.' },
    { char: '母', meaning: 'mamá', on: ['ボ'], kun: ['はは'], strokes: 5, tip: 'Una mujer con dos puntos: mamá cuidando a su bebé.' },
    { char: '友', meaning: 'amigo', on: ['ユウ'], kun: ['とも'], strokes: 4, tip: 'Dos manos que se juntan: amistad.' },
    { char: '先', meaning: 'primero; adelante', on: ['セン'], kun: ['さき'], strokes: 6, tip: 'Sale en せんせい (profesor): el que va delante.' },
    { char: '生', meaning: 'vida; nacer', on: ['セイ', 'ショウ'], kun: ['い(きる)', 'う(まれる)'], strokes: 5, tip: 'Una planta que nace de la tierra (土). がくせい = estudiante.' },
    { char: '学', meaning: 'estudiar', on: ['ガク'], kun: ['まな(ぶ)'], strokes: 8, tip: 'Un niño (子) bajo un techo con luces: estudiando.' },
    { char: '校', meaning: 'escuela', on: ['コウ'], kun: [], strokes: 10, tip: 'Árbol (木) + cruzar (交): la escuela con su patio de árboles.' },
    { char: '名', meaning: 'nombre', on: ['メイ', 'ミョウ'], kun: ['な'], strokes: 6, tip: 'Tarde (夕) + boca (口): de noche dices tu nombre para que te reconozcan.' },

    // --- Lugares y direcciones ---
    { char: '上', meaning: 'arriba', on: ['ジョウ'], kun: ['うえ', 'あ(がる)'], strokes: 3, tip: 'Una rayita que apunta arriba del suelo.' },
    { char: '下', meaning: 'abajo', on: ['カ', 'ゲ'], kun: ['した', 'さ(がる)'], strokes: 3, tip: 'Una rayita que cuelga debajo del techo.' },
    { char: '中', meaning: 'dentro; centro', on: ['チュウ'], kun: ['なか'], strokes: 4, tip: 'Una línea que atraviesa una caja justo por el centro.' },
    { char: '外', meaning: 'fuera', on: ['ガイ', 'ゲ'], kun: ['そと'], strokes: 5, tip: 'Sale en がいこく (extranjero): el país de fuera.' },
    { char: '左', meaning: 'izquierda', on: ['サ'], kun: ['ひだり'], strokes: 5, tip: 'Una mano que sostiene una regla (工): la izquierda la sujeta.' },
    { char: '右', meaning: 'derecha', on: ['ウ', 'ユウ'], kun: ['みぎ'], strokes: 5, tip: 'Una mano que lleva comida a la boca (口): la derecha.' },
    { char: '東', meaning: 'este', on: ['トウ'], kun: ['ひがし'], strokes: 8, tip: 'El sol (日) saliendo detrás de un árbol (木): por el este. とうきょう = Tokio.' },
    { char: '西', meaning: 'oeste', on: ['セイ', 'サイ'], kun: ['にし'], strokes: 6, tip: 'Una caja donde el sol se guarda al atardecer: el oeste.' },
    { char: '南', meaning: 'sur', on: ['ナン'], kun: ['みなみ'], strokes: 9, tip: 'Una tienda de campaña con una cruz arriba: acampas en el sur, donde hace calor.' },
    { char: '北', meaning: 'norte', on: ['ホク'], kun: ['きた'], strokes: 5, tip: 'Dos personas de espaldas que se protegen del frío del norte.' },
    { char: '国', meaning: 'país', on: ['コク'], kun: ['くに'], strokes: 8, tip: 'Una joya (玉) guardada dentro de las fronteras (囗).' },
    { char: '駅', meaning: 'estación', on: ['エキ'], kun: [], strokes: 14, tip: 'Lleva caballo (馬): antes las estaciones eran postas de caballos.' },
    { char: '社', meaning: 'empresa; santuario', on: ['シャ'], kun: ['やしろ'], strokes: 7, tip: 'Altar (礻) + tierra (土). かいしゃ = empresa.' },
    { char: '店', meaning: 'tienda', on: ['テン'], kun: ['みせ'], strokes: 8, tip: 'Un techo que cubre el mostrador de una tienda.' },
    { char: '道', meaning: 'camino', on: ['ドウ'], kun: ['みち'], strokes: 12, tip: 'Cabeza (首) + caminar (⻌): el camino por donde vas.' },

    // --- Naturaleza ---
    { char: '山', meaning: 'montaña', on: ['サン'], kun: ['やま'], strokes: 3, tip: 'Tres picos de montaña. ふじさん = monte Fuji.' },
    { char: '川', meaning: 'río', on: ['セン'], kun: ['かわ'], strokes: 3, tip: 'Tres líneas de agua que corren.' },
    { char: '天', meaning: 'cielo', on: ['テン'], kun: ['あめ'], strokes: 4, tip: 'Una persona grande (大) y encima una raya: el cielo. てんき = clima.' },
    { char: '気', meaning: 'energía; ánimo', on: ['キ', 'ケ'], kun: [], strokes: 6, tip: 'Vapor que sube. げんき (ánimo), てんき (clima).' },
    { char: '雨', meaning: 'lluvia', on: ['ウ'], kun: ['あめ'], strokes: 8, tip: 'Gotas de lluvia cayendo detrás de una ventana.' },
    { char: '花', meaning: 'flor', on: ['カ'], kun: ['はな'], strokes: 7, tip: 'Hierba (艹) arriba + cambiar (化): la planta que se convierte en flor.' },

    // --- Acciones ---
    { char: '見', meaning: 'ver', on: ['ケン'], kun: ['み(る)'], strokes: 7, tip: 'Un ojo (目) con piernas: va a ver.' },
    { char: '行', meaning: 'ir', on: ['コウ', 'ギョウ'], kun: ['い(く)', 'おこな(う)'], strokes: 6, tip: 'Un cruce de caminos: por ahí vas.' },
    { char: '来', meaning: 'venir', on: ['ライ'], kun: ['く(る)', 'き(ます)'], strokes: 7, tip: 'Un árbol (木) con frutos que vienen cada temporada. らいねん = el próximo año.' },
    { char: '出', meaning: 'salir', on: ['シュツ'], kun: ['で(る)', 'だ(す)'], strokes: 5, tip: 'Dos montañas una sobre otra: sales por encima. でぐち = salida.' },
    { char: '入', meaning: 'entrar', on: ['ニュウ'], kun: ['はい(る)', 'い(れる)'], strokes: 2, tip: 'Una flecha que entra. いりぐち = entrada.' },
    { char: '食', meaning: 'comer', on: ['ショク'], kun: ['た(べる)'], strokes: 9, tip: 'Un techo y debajo un plato lleno de comida.' },
    { char: '飲', meaning: 'beber', on: ['イン'], kun: ['の(む)'], strokes: 12, tip: 'Comida (食) + boca bien abierta (欠): beber.' },
    { char: '言', meaning: 'decir', on: ['ゲン', 'ゴン'], kun: ['い(う)'], strokes: 7, tip: 'Palabras (las rayas) que salen de una boca (口).' },
    { char: '話', meaning: 'hablar; plática', on: ['ワ'], kun: ['はな(す)', 'はなし'], strokes: 13, tip: 'Decir (言) + lengua (舌): hablar. でんわ = teléfono.' },
    { char: '読', meaning: 'leer', on: ['ドク'], kun: ['よ(む)'], strokes: 14, tip: 'Decir (言) + vender (売): leer en voz alta, como el vendedor.' },
    { char: '書', meaning: 'escribir', on: ['ショ'], kun: ['か(く)'], strokes: 10, tip: 'Una mano con un pincel sobre el papel. じしょ = diccionario.' },
    { char: '聞', meaning: 'oír; preguntar', on: ['ブン', 'モン'], kun: ['き(く)'], strokes: 14, tip: 'Una oreja (耳) pegada a la puerta (門): escuchando. しんぶん = periódico.' },
    { char: '買', meaning: 'comprar', on: ['バイ'], kun: ['か(う)'], strokes: 12, tip: 'Una red llena de conchas (el dinero antiguo): compras.' },
    { char: '休', meaning: 'descansar', on: ['キュウ'], kun: ['やす(む)'], strokes: 6, tip: 'Una persona (亻) apoyada en un árbol (木): descansando.' },
    { char: '立', meaning: 'pararse', on: ['リツ'], kun: ['た(つ)'], strokes: 5, tip: 'Una persona de pie sobre el suelo.' },
    { char: '会', meaning: 'reunirse', on: ['カイ', 'エ'], kun: ['あ(う)'], strokes: 6, tip: 'Gente bajo un mismo techo: una reunión. かいしゃ = empresa.' },

    // --- Cómo son las cosas ---
    { char: '大', meaning: 'grande', on: ['ダイ', 'タイ'], kun: ['おお(きい)'], strokes: 3, tip: 'Una persona con los brazos abiertos: ¡así de grande!' },
    { char: '小', meaning: 'pequeño', on: ['ショウ'], kun: ['ちい(さい)', 'こ'], strokes: 3, tip: 'Una rayita en medio y dos puntitos chiquitos a los lados.' },
    { char: '高', meaning: 'alto; caro', on: ['コウ'], kun: ['たか(い)'], strokes: 10, tip: 'Un edificio alto con varios pisos.' },
    { char: '安', meaning: 'barato; tranquilo', on: ['アン'], kun: ['やす(い)'], strokes: 6, tip: 'Una mujer (女) bajo techo: casa tranquila.' },
    { char: '新', meaning: 'nuevo', on: ['シン'], kun: ['あたら(しい)'], strokes: 13, tip: 'Árbol + hacha: madera recién cortada, nueva. しんぶん = periódico.' },
    { char: '古', meaning: 'viejo', on: ['コ'], kun: ['ふる(い)'], strokes: 5, tip: 'Diez (十) bocas (口): una historia contada por diez generaciones.' },
    { char: '長', meaning: 'largo; jefe', on: ['チョウ'], kun: ['なが(い)'], strokes: 8, tip: 'Un anciano con el pelo largo.' },
    { char: '白', meaning: 'blanco', on: ['ハク'], kun: ['しろ'], strokes: 5, tip: 'El sol (日) con un rayo de luz: blanco.' },
    { char: '多', meaning: 'mucho', on: ['タ'], kun: ['おお(い)'], strokes: 6, tip: 'Dos tardes (夕) una sobre otra: muchos días.' },

    // --- Cosas y cuerpo ---
    { char: '本', meaning: 'libro; origen', on: ['ホン'], kun: ['もと'], strokes: 5, tip: 'Un árbol (木) con una marca en la raíz: el origen. にほん = Japón.' },
    { char: '語', meaning: 'idioma; palabra', on: ['ゴ'], kun: ['かた(る)'], strokes: 14, tip: 'Decir (言) + cinco (五) + boca (口). にほんご = japonés.' },
    { char: '電', meaning: 'electricidad', on: ['デン'], kun: [], strokes: 13, tip: 'Lluvia (雨) con un relámpago abajo. でんしゃ (tren), でんわ (teléfono).' },
    { char: '車', meaning: 'auto; vehículo', on: ['シャ'], kun: ['くるま'], strokes: 7, tip: 'Una carreta vista desde arriba, con su eje y sus ruedas.' },
    { char: '何', meaning: 'qué', on: ['カ'], kun: ['なに', 'なん'], strokes: 7, tip: 'Una persona (亻) que pregunta: ¿qué?' },
    { char: '口', meaning: 'boca', on: ['コウ', 'ク'], kun: ['くち'], strokes: 3, tip: 'Una boca abierta. いりぐち = entrada.' },
    { char: '目', meaning: 'ojo', on: ['モク'], kun: ['め'], strokes: 5, tip: 'Un ojo puesto de pie.' },
    { char: '耳', meaning: 'oreja', on: ['ジ'], kun: ['みみ'], strokes: 6, tip: 'Una oreja con sus pliegues.' },
    { char: '手', meaning: 'mano', on: ['シュ'], kun: ['て'], strokes: 4, tip: 'Una mano con sus dedos. きって = estampilla.' },
    { char: '足', meaning: 'pie; pierna', on: ['ソク'], kun: ['あし', 'た(りる)'], strokes: 7, tip: 'Una rodilla (口) sobre un pie que camina.' },
];

/** Tipos de ejercicio de la práctica de kanji */
export const KANJI_DRILLS: KanjiDrillOption[] = [
    { id: 'meaning', label: '¿Qué significa?', desc: 'Ves el kanji y eliges su significado', icon: 'eye' },
    { id: 'reverse', label: 'Al kanji', desc: 'Ves el significado y eliges el kanji', icon: 'swap' },
    { id: 'words', label: 'Lee la palabra', desc: 'Palabras de tus lecciones escritas con kanji', icon: 'read' },
    { id: 'trace', label: 'Trazar', desc: 'Cópialo con el dedo y luego de memoria', icon: 'brush' },
    { id: 'mixed', label: 'Todo mezclado', desc: 'Significado, al kanji y palabras', icon: 'shuffle' },
];

// ------------------------------- Cruce con las lecciones ------------------------------------------------------------- //
/**
 * Devuelve los kanji con la primera lección cuyo vocabulario los usa y las palabras que los llevan,
 * ordenados por esa lección (los que ninguna usa, al final, en el orden de la lista)
 */
export function kanjiWithLessons(lessons: Lesson[]): KanjiInfo[] {
    const ordered = [...lessons].sort((a, b) => a.id - b.id);
    const infos = KANJI_N5.map((entry, order) => {
        const words: KanjiWord[] = [];
        let lesson: number | null = null;
        for (const lessonData of ordered) {
            for (const word of lessonData.vocab) {
                if (!word.kanji?.includes(entry.char)) continue;
                lesson ??= lessonData.id;
                // Las entradas con varios nombres juntos (A／B) no sirven de ejemplo
                const kanji = cleanForm(word.kanji).main;
                if (/[／/]/.test(word.kanji) || !kanji.includes(entry.char)) continue;
                if (words.length < MAX_WORDS_PER_KANJI && !words.some((known) => known.kanji === kanji)) {
                    words.push({ id: word.id, kanji, kana: word.kana, es: word.es, lesson: lessonData.id });
                }
            }
        }
        return { info: { ...entry, lesson, words }, order };
    });
    return infos
        .sort((a, b) => (a.info.lesson ?? Infinity) - (b.info.lesson ?? Infinity) || a.order - b.order)
        .map((item) => item.info);
}

/** Devuelve los kanji de la práctica: los de las lecciones hasta la actual ('upto') o todos */
export function kanjiInScope(kanji: KanjiInfo[], scope: string, lastLesson: number): KanjiInfo[] {
    if (scope === 'all') return kanji;
    return kanji.filter((info) => info.lesson !== null && info.lesson <= Math.max(1, lastLesson));
}

/** Elige `count` kanji dando prioridad a los nuevos, los flojos y los que toca repasar (igual que prioritize con palabras) */
export function prioritizeKanji(kanji: KanjiInfo[], mastery: Record<string, MasteryEntry>, count: number): KanjiInfo[] {
    const today = todayKey();
    const scoreOf = (info: KanjiInfo) => {
        const entry = mastery[`j:${info.char}`];
        // Kanji nuevo: prioridad media; el azar evita que salgan siempre los mismos
        if (!entry) return 1 + Math.random();
        return (entry.due <= today ? 2 : 0) + (5 - entry.box) * 0.5 + Math.random();
    };
    return [...kanji]
        .map((info) => ({ info, score: scoreOf(info) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((scored) => scored.info);
}

/** Agrupa los kanji por lección (ya vienen ordenados) */
export function groupByLesson(kanji: KanjiInfo[]): KanjiGroup[] {
    const groups: KanjiGroup[] = [];
    for (const info of kanji) {
        const last = groups[groups.length - 1];
        if (last && last.lesson === info.lesson) last.kanji.push(info);
        else groups.push({ lesson: info.lesson, kanji: [info] });
    }
    return groups;
}
// ------------------------------- Cruce con las lecciones ------------------------------------------------------------- //
