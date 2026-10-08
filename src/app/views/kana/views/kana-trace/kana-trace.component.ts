import { Location } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { allKana, HIRAGANA_TIPS, KATAKANA_TIPS } from '../../../../utils/kana.utils';
import { Script } from '../../../../interfaces/kana.interface';
import { ProgressService } from '../../../../services/progress.service';
import { SfxService } from '../../../../services/sfx.service';
import { SpeechService } from '../../../../services/speech.service';
import { shuffle } from '../../../../utils/text.utils';
import { IconComponent } from '../../../../components/icon/icon.component';

/** XP por cada símbolo trazado bien */
const XP_PER_KANA = 2;
/** Espera antes de pronunciar el primer símbolo, para que el lienzo ya esté pintado */
const FIRST_SPEAK_DELAY_MS = 300;
/** Espera antes de pronunciar el siguiente símbolo, para que no se pise con el sonido de acierto */
const NEXT_SPEAK_DELAY_MS = 200;

@Component({
    selector: 'app-kana-trace',
    imports: [IconComponent],
    templateUrl: './kana-trace.component.html',
    styleUrl: './kana-trace.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanaTraceComponent {
    // --- Inyección de dependencias ---
    protected location = inject(Location);
    private speechSVC = inject(SpeechService);
    private sfxSVC = inject(SfxService);
    private progressSVC = inject(ProgressService);

    // --- Inputs y outputs ---
    readonly script = input.required<Script>();
    /** Ids de fila separados por comas (query param `rows`) */
    readonly rows = input<string>('');

    // --- Estados UI con Signals ---
    protected index = signal(0);
    /** Paso del símbolo actual: copiar sobre la guía, de memoria y comprobar */
    protected step = signal<'copy' | 'memory' | 'check'>('copy');

    // --- Valores derivados (computed) ---
    /** Símbolos a trazar, barajados. Sin combinados ni extranjeros (son dos caracteres); si no queda ninguno, la fila あ */
    protected list = computed(() => {
        const rowIds = this.rows() ? this.rows().split(',').filter(Boolean) : undefined;
        const traceable = allKana(this.script(), rowIds).filter((kana) => kana.group !== 'yoon' && kana.group !== 'extended');
        return shuffle(traceable.length ? traceable : allKana(this.script(), ['a']));
    });
    protected current = computed(() => this.list()[this.index()]);
    /** Truco de memoria del símbolo actual (solo los básicos tienen; con tenten queda vacío) */
    protected tip = computed(() => {
        const kana = this.current();
        if (!kana) return '';
        return (kana.script === 'katakana' ? KATAKANA_TIPS : HIRAGANA_TIPS)[[...kana.char][0]] ?? '';
    });

    // Lienzo y estado del trazo en curso (no son signals: cambian en cada pointermove y no se pintan en la plantilla)
    private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
    private isDrawing = false;
    private lastPoint: { x: number; y: number } | null = null;
    private correctCount = 0;

    constructor() {
        // El lienzo necesita su tamaño real en pantalla para ajustar la resolución, por eso se espera al primer render
        afterNextRender(() => {
            this.resize();
            setTimeout(() => this.speak(), FIRST_SPEAK_DELAY_MS);
        });
    }

    // ------------------------------- Lienzo ------------------------------------------------------------- //
    /** Devuelve el contexto 2D del lienzo, o null si aún no existe */
    private context(): CanvasRenderingContext2D | null {
        return this.canvasRef()?.nativeElement.getContext('2d') ?? null;
    }

    /** Ajusta la resolución del lienzo a la densidad de píxeles y prepara el pincel con el color de tinta del tema */
    private resize(): void {
        const canvas = this.canvasRef()?.nativeElement;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        // Sin multiplicar por devicePixelRatio el trazo se ve borroso en pantallas retina
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = rect.width * pixelRatio;
        canvas.height = rect.height * pixelRatio;
        const context = this.context()!;
        context.scale(pixelRatio, pixelRatio);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = Math.max(10, rect.width / 26);
        context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#222';
    }

    /** Convierte la posición del puntero a coordenadas del lienzo */
    private pointFromEvent(event: PointerEvent): { x: number; y: number } {
        const rect = this.canvasRef()!.nativeElement.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /** Empieza un trazo y pinta un punto, para que un toque sin arrastrar también deje marca */
    protected startStroke(event: PointerEvent): void {
        this.isDrawing = true;
        // Captura el puntero para seguir recibiendo pointermove aunque el dedo salga del lienzo
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        this.lastPoint = this.pointFromEvent(event);
        const context = this.context();
        if (context) {
            context.beginPath();
            context.arc(this.lastPoint.x, this.lastPoint.y, context.lineWidth / 2, 0, Math.PI * 2);
            context.fillStyle = context.strokeStyle;
            context.fill();
        }
    }

    /** Continúa el trazo desde el último punto */
    protected continueStroke(event: PointerEvent): void {
        if (!this.isDrawing || !this.lastPoint) return;
        const point = this.pointFromEvent(event);
        const context = this.context();
        if (!context) return;
        context.beginPath();
        context.moveTo(this.lastPoint.x, this.lastPoint.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        this.lastPoint = point;
    }

    /** Termina el trazo */
    protected endStroke(): void {
        this.isDrawing = false;
        this.lastPoint = null;
    }

    /** Borra el lienzo */
    protected clear(): void {
        const canvas = this.canvasRef()?.nativeElement;
        const context = this.context();
        if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    // ------------------------------- Lienzo ------------------------------------------------------------- //

    // ------------------------------- Pasos y puntuación ------------------------------------------------------------- //
    /** Pronuncia el símbolo actual */
    protected speak(): void {
        const kana = this.current();
        if (kana) void this.speechSVC.speak(kana.char);
    }

    /** Pasa al paso «de memoria»: borra el lienzo y oculta la guía */
    protected toMemory(): void {
        this.clear();
        this.step.set('memory');
    }

    /** Puntúa el trazo: si no salió vuelve a copiar; si salió suma XP y pasa al siguiente o termina la sesión */
    protected rate(isCorrect: boolean): void {
        const kana = this.current();
        if (!kana) return;
        this.clear();

        // 1. Repetir: vuelve a copiar el mismo símbolo
        if (!isCorrect) {
            this.step.set('copy');
            this.sfxSVC.play('tap');
            return;
        }

        // 2. Bien: suma XP
        this.sfxSVC.play('ok');
        this.correctCount++;
        this.progressSVC.addXp(XP_PER_KANA);

        // 3. Último símbolo: cierra la sesión y vuelve a la pantalla anterior
        if (this.index() + 1 >= this.list().length) {
            this.sfxSVC.play('done');
            this.progressSVC.finishSession();
            this.location.back();
            return;
        }

        // 4. Siguiente símbolo
        this.index.update((index) => index + 1);
        this.step.set('copy');
        setTimeout(() => this.speak(), NEXT_SPEAK_DELAY_MS);
    }
    // ------------------------------- Pasos y puntuación ------------------------------------------------------------- //
}
