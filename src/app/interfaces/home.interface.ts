import { Word } from './lesson.interface';

/** Tipo de recomendación de Inicio; el de la tarjeta grande no se repite en las alternativas */
export type HomeStepKind = 'skill' | 'review' | 'test' | 'guided';

/** Tarjeta grande «Tu siguiente paso» de Inicio */
export interface NextStep {
    kind: HomeStepKind;
    icon: string;
    /** Línea pequeña en mayúsculas encima del título (tipo y duración) */
    eyebrow: string;
    title: string;
    body: string;
    /** Palabras falladas de la lección, como pista de por qué se recomienda */
    chips: string[];
    link: (string | number)[];
    /** Texto del botón */
    cta: string;
}

/** Tarjeta pequeña con una alternativa al siguiente paso */
export interface AltStep {
    kind: HomeStepKind | 'convo';
    icon: string;
    /** Color del icono (data-c): gold, ok, indigo… */
    color: string;
    title: string;
    sub: string;
    link: (string | number)[];
}

/** Casa del barrio de Musubi: una por lección */
export interface House {
    id: number;
    /** Posición horizontal dentro del SVG */
    x: number;
    /** Ventanas encendidas (0–6): una por cada ~1/6 de las palabras de la lección que ya conoces */
    lit: number;
    /** La lección ya se empezó (o es anterior a la actual): si no, la casa sale atenuada */
    started: boolean;
}

/** Día de la tira de farolillos de los últimos 14 días */
export interface HomeDay {
    key: string;
    xp: number;
    today: boolean;
    /** on: meta cumplida, half: al menos media meta, off: menos */
    state: 'on' | 'half' | 'off';
    label: string;
    title: string;
}

/** Palabra con más fallos para «Palabras que se te escapan» */
export interface HardWord {
    word: Word;
    lesson: number;
    wrong: number;
    /** Traducción sin las notas entre paréntesis */
    es: string;
}

