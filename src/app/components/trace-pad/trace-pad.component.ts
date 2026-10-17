import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/** Grosor mínimo del pincel en píxeles; en lienzos grandes se escala con el ancho */
const MIN_LINE_WIDTH = 8;
/** Ancho del lienzo entre el que se divide para calcular el grosor del pincel */
const LINE_WIDTH_DIVISOR = 30;

/**
 * Lienzo cuadrado para trazar con el dedo un carácter (kanji o kana) sobre una guía tenue, con una cruz de
 * referencia. El padre decide si la guía se ve, se oculta o se resalta para comparar, y llama a `clear()`.
 */
@Component({
    selector: 'app-trace-pad',
    imports: [],
    templateUrl: './trace-pad.component.html',
    styleUrl: './trace-pad.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TracePadComponent {
    // --- Inputs y outputs ---
    readonly char = input.required<string>();
    /** show = guía tenue para copiar; hide = de memoria; reveal = guía resaltada para comparar */
    readonly guide = input<'show' | 'hide' | 'reveal'>('show');

    // Lienzo y estado del trazo en curso (no son signals: cambian en cada pointermove y no se pintan en la plantilla)
    private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    private isDrawing = false;
    private lastPoint: { x: number; y: number } | null = null;

    constructor() {
        // El lienzo necesita su tamaño real en pantalla para ajustar la resolución, por eso se espera al primer render
        afterNextRender(() => this.resize());
    }

    // ------------------------------- Lienzo ------------------------------------------------------------- //
    /** Devuelve el contexto 2D del lienzo */
    private context(): CanvasRenderingContext2D | null {
        return this.canvasRef().nativeElement.getContext('2d');
    }

    /** Ajusta la resolución del lienzo a la densidad de píxeles y prepara el pincel con el color de tinta del tema */
    private resize(): void {
        const canvas = this.canvasRef().nativeElement;
        const rect = canvas.getBoundingClientRect();
        // Sin multiplicar por devicePixelRatio el trazo se ve borroso en pantallas retina
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = rect.width * pixelRatio;
        canvas.height = rect.height * pixelRatio;
        const context = this.context();
        if (!context) return;
        context.scale(pixelRatio, pixelRatio);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = Math.max(MIN_LINE_WIDTH, rect.width / LINE_WIDTH_DIVISOR);
        context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#222';
    }

    /** Convierte la posición del puntero a coordenadas del lienzo */
    private pointFromEvent(event: PointerEvent): { x: number; y: number } {
        const rect = this.canvasRef().nativeElement.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /** Empieza un trazo y pinta un punto, para que un toque sin arrastrar también deje marca */
    protected startStroke(event: PointerEvent): void {
        this.isDrawing = true;
        // Captura el puntero para seguir recibiendo pointermove aunque el dedo salga del lienzo
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        this.lastPoint = this.pointFromEvent(event);
        const context = this.context();
        if (!context) return;
        context.beginPath();
        context.arc(this.lastPoint.x, this.lastPoint.y, context.lineWidth / 2, 0, Math.PI * 2);
        context.fillStyle = context.strokeStyle;
        context.fill();
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
    clear(): void {
        const canvas = this.canvasRef().nativeElement;
        this.context()?.clearRect(0, 0, canvas.width, canvas.height);
    }
    // ------------------------------- Lienzo ------------------------------------------------------------- //
}
