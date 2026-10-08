/** Una pareja del juego de Parejas: lo que va en la columna izquierda y lo que va en la derecha */
export interface MatchPair {
    id: string;
    left: string;
    right: string;
    /** Texto japonés que se lee en voz alta al tocar la ficha de la izquierda */
    speak?: string;
    leftStyle?: 'jp' | 'jp-big' | 'es';
    rightStyle?: 'jp' | 'jp-big' | 'es';
    /** Clave de dominio (`w:<id>`, `k:<kana>`) que se registra al unir la pareja */
    track?: string;
}

/** Una ficha en pantalla: la mitad izquierda o derecha de una pareja */
export interface MatchCard {
    pairId: string;
    text: string;
    side: 'L' | 'R';
    /** Clase de estilo de la ficha: 'jp', 'jp-big' o 'es' */
    style: string;
}
