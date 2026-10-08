import { inject, Injectable, signal } from '@angular/core';
import { audioKey, cleanSpeech } from '../utils/audio-key.utils';
import { ProgressService } from './progress.service';
import { ListenResult, Listening } from '../interfaces/speech.interface';

// La Web Speech API de reconocimiento no está en los tipos de TypeScript (y en Chrome lleva prefijo webkit)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

/** Velocidad a la que están hechas las grabaciones; coincide con el ajuste por defecto (0.9) */
const BASE_RATE = 0.9;

/** playbackRate mínimo del audio grabado: más lento suena distorsionado */
const MIN_PLAYBACK_RATE = 0.5;

/** playbackRate máximo del audio grabado: más rápido suena distorsionado */
const MAX_PLAYBACK_RATE = 1.5;

/** Tono que se usa para el hablante B cuando no hay una segunda voz japonesa */
const SECOND_SPEAKER_PITCH = 1.25;

@Injectable({
    providedIn: 'root'
})
export class SpeechService {
    // --- Inyección de Dependencias ---
    private progressSVC = inject(ProgressService);

    // Voces japonesas del sistema y claves de los mp3 que trae la app
    private voices: SpeechSynthesisVoice[] = [];
    private recorded = new Set<string>();
    // Un solo <audio> reutilizado para todas las grabaciones (null fuera del navegador)
    private audio: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
    // Cierra la reproducción en curso; lo usa stopSpeaking para resolver su promesa
    private finishAudio: (() => void) | null = null;

    // --- Capacidades del dispositivo ---
    private readonly hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window;
    readonly canSpeak = this.hasTts || !!this.audio;
    readonly canListen =
        typeof window !== 'undefined' &&
        !!((window as AnyRecognition).SpeechRecognition || (window as AnyRecognition).webkitSpeechRecognition);

    // --- Estados con Signals ---
    readonly speaking = signal(false);
    readonly listening = signal(false);
    readonly hasJapaneseVoice = signal(true);
    /** True cuando la app trae audio pregrabado (no hace falta voz del sistema) */
    readonly hasRecordings = signal(false);
    readonly recordingKeys = signal<string[]>([]);
    readonly credits = signal<string[]>([]);

    constructor() {
        void this.loadManifest();
        if (!this.hasTts) return;
        const refreshVoices = () => {
            this.voices = speechSynthesis.getVoices().filter((voice) => voice.lang?.toLowerCase().startsWith('ja'));
            // Con la lista aún vacía (algunos navegadores la cargan tarde) no se avisa de que falta voz
            this.hasJapaneseVoice.set(this.voices.length > 0 || speechSynthesis.getVoices().length === 0);
        };
        refreshVoices();
        speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    }

    // ------------------------------- Audio pregrabado ------------------------------------------------------------- //
    /** Lee audio/manifest.json con las claves de las grabaciones y los créditos de las voces */
    private async loadManifest(): Promise<void> {
        try {
            const manifest = (await fetch('audio/manifest.json').then((response) => response.json())) as { keys: string[]; credits: string[] };
            this.recorded = new Set(manifest.keys);
            this.recordingKeys.set(manifest.keys);
            this.credits.set(manifest.credits ?? []);
            this.hasRecordings.set(manifest.keys.length > 0);
        } catch {
            /* sin grabaciones: solo voz del sistema */
        }
    }

    /** Devuelve la clave del mp3 de un texto, prefiriendo la voz pedida y si no la otra */
    private recordingFor(text: string, voice: 0 | 1 | undefined): string | null {
        const primary = audioKey(text, voice === 1 ? 'b' : 'a');
        if (this.recorded.has(primary)) return primary;
        const other = audioKey(text, voice === 1 ? 'a' : 'b');
        return this.recorded.has(other) ? other : null;
    }

    /** Reproduce un mp3 grabado; si falla, cae a la voz del sistema con `fallback` */
    private playRecording(key: string, rate: number, fallback: () => Promise<void>): Promise<void> {
        const audio = this.audio!;
        return new Promise((resolve) => {
            // Varios caminos pueden terminar la reproducción (fin, error, stop): solo cuenta el primero
            let isSettled = false;
            const finish = (useFallback = false) => {
                if (isSettled) return;
                isSettled = true;
                this.finishAudio = null;
                audio.onended = audio.onerror = null;
                this.speaking.set(false);
                if (useFallback) void fallback().then(resolve);
                else resolve();
            };
            this.finishAudio = () => finish();
            audio.onended = () => finish();
            audio.onerror = () => finish(true);
            audio.src = `audio/${key}.mp3`;
            audio.playbackRate = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, rate / BASE_RATE));
            this.speaking.set(true);
            audio.play().catch(() => finish(true));
        });
    }
    // ------------------------------- Audio pregrabado ------------------------------------------------------------- //

    // ------------------------------- Hablar ------------------------------------------------------------- //
    /** Pronuncia un texto: usa la grabación si existe y si no la voz del dispositivo */
    speak(text: string, options: { rate?: number; voice?: 0 | 1; pitch?: number } = {}): Promise<void> {
        if (!text) return Promise.resolve();
        this.stopSpeaking();
        const key = this.audio ? this.recordingFor(text, options.voice) : null;
        if (key) return this.playRecording(key, options.rate ?? this.progressSVC.settings().rate, () => this.speakTts(text, options));
        return this.speakTts(text, options);
    }

    /** Pronuncia un texto con la síntesis de voz del dispositivo (ja-JP) */
    private speakTts(text: string, options: { rate?: number; voice?: 0 | 1; pitch?: number }): Promise<void> {
        if (!this.hasTts) return Promise.resolve();
        speechSynthesis.cancel();
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(cleanSpeech(text));
            utterance.lang = 'ja-JP';
            utterance.rate = options.rate ?? this.progressSVC.settings().rate;
            utterance.pitch = options.pitch ?? 1;
            if (this.voices.length) {
                // Si hay varias voces, una distinta para el hablante A y otra para el B
                const voice = options.voice === 1 && this.voices.length > 1 ? this.voices[1] : this.voices[0];
                utterance.voice = voice;
                if (options.voice === 1 && this.voices.length === 1) utterance.pitch = options.pitch ?? SECOND_SPEAKER_PITCH;
            } else if (options.voice === 1) {
                utterance.pitch = options.pitch ?? SECOND_SPEAKER_PITCH;
            }
            const finish = () => {
                this.speaking.set(false);
                resolve();
            };
            utterance.onend = finish;
            utterance.onerror = finish;
            this.speaking.set(true);
            speechSynthesis.speak(utterance);
        });
    }

    /** Corta lo que esté sonando (voz del sistema o grabación) y resuelve su promesa */
    stopSpeaking(): void {
        if (this.hasTts) speechSynthesis.cancel();
        if (this.audio && !this.audio.paused) this.audio.pause();
        this.finishAudio?.();
        this.speaking.set(false);
    }
    // ------------------------------- Hablar ------------------------------------------------------------- //

    // ------------------------------- Escuchar ------------------------------------------------------------- //
    /** Arranca el reconocimiento de voz en japonés y devuelve la promesa con las transcripciones y un `stop` */
    listen(): Listening {
        const browserWindow = window as AnyRecognition;
        const RecognitionConstructor = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
        if (!RecognitionConstructor) {
            return { result: Promise.reject(new Error('unsupported')), stop: () => {} };
        }
        this.stopSpeaking();

        // 1. Configurar: una sola frase, solo resultados finales y hasta 5 alternativas
        const recognition: AnyRecognition = new RecognitionConstructor();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.maxAlternatives = 5;
        recognition.continuous = false;

        // 2. Resolver con todas las alternativas, rechazar con el código de error,
        //    o resolver vacío si termina sin oír nada
        const result = new Promise<ListenResult>((resolve, reject) => {
            let isSettled = false;
            recognition.onresult = (event: AnyRecognition) => {
                const alternatives: string[] = [];
                for (const recognitionResult of event.results) {
                    for (const alternative of recognitionResult) alternatives.push(alternative.transcript);
                }
                isSettled = true;
                resolve({ transcripts: alternatives });
            };
            recognition.onerror = (event: AnyRecognition) => {
                isSettled = true;
                reject(new Error(event.error || 'error'));
            };
            recognition.onend = () => {
                this.listening.set(false);
                if (!isSettled) resolve({ transcripts: [] });
            };
        });

        // 3. Empezar a escuchar (start lanza si ya había un reconocimiento activo)
        this.listening.set(true);
        try {
            recognition.start();
        } catch {
            this.listening.set(false);
        }
        return { result, stop: () => recognition.stop() };
    }
    // ------------------------------- Escuchar ------------------------------------------------------------- //
}
