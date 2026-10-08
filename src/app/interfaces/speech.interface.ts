/** Lo que devuelve un reconocimiento de voz: todas las alternativas oídas */
export interface ListenResult {
    transcripts: string[];
}

/** Un reconocimiento en marcha: la promesa con el resultado y cómo pararlo */
export interface Listening {
    result: Promise<ListenResult>;
    stop: () => void;
}

/**
 * Voz de una grabación, primer carácter de su clave (ver audio-key.utils, que comparte con
 * tools/build-audio.mjs): 'a' = voz general (femenina), 'b' = segundo hablante (masculino).
 */
export type Voice = string;
