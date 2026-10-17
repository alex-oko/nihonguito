import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { ProgressService } from '../../../../services/progress.service';
import { SfxService } from '../../../../services/sfx.service';
import { KanjiInfo } from '../../../../interfaces/kanji.interface';
import { kanjiInScope, kanjiWithLessons, prioritizeKanji } from '../../../../utils/kanji.utils';
import { IconComponent } from '../../../../components/icon/icon.component';
import { TracePadComponent } from '../../../../components/trace-pad/trace-pad.component';

/** XP por cada kanji trazado bien */
const XP_PER_KANJI = 3;
/** Kanji por ronda si la query no dice otra cosa */
const DEFAULT_COUNT = 10;

@Component({
    selector: 'app-kanji-trace',
    imports: [IconComponent, TracePadComponent],
    templateUrl: './kanji-trace.component.html',
    styleUrl: './kanji-trace.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanjiTraceComponent {
    // --- Inyección de dependencias ---
    protected location = inject(Location);
    private lessonSVC = inject(LessonService);
    private progressSVC = inject(ProgressService);
    private sfxSVC = inject(SfxService);

    // --- Inputs y outputs ---
    // Llegan de la query de /kanji/trazar: ?chars=日月 (unos kanji concretos) o ?scope=upto&count=10
    readonly chars = input<string>('');
    readonly scope = input<string>('upto');
    readonly count = input<string>('');

    // --- Estados UI con Signals ---
    protected list = signal<KanjiInfo[]>([]);
    protected index = signal(0);
    /** Paso del kanji actual: copiar sobre la guía, de memoria y comparar */
    protected step = signal<'copy' | 'memory' | 'check'>('copy');

    // --- Valores derivados (computed) ---
    protected current = computed(() => this.list()[this.index()] ?? null);
    /** Lecturas kun y on del kanji actual en una línea */
    protected readings = computed(() => {
        const info = this.current();
        return info ? [info.kun.join('、'), info.on.join('、')].filter((part) => part).join(' · ') : '';
    });
    protected guide = computed(() => (this.step() === 'copy' ? 'show' : this.step() === 'memory' ? 'hide' : 'reveal'));

    // Lienzo del trazo (para borrarlo entre pasos)
    private pad = viewChild(TracePadComponent);

    constructor() {
        // Rearma la lista si cambia la query; untracked para que lo que lee build no vuelva a disparar el effect
        effect(() => {
            this.chars();
            this.scope();
            this.count();
            untracked(() => void this.build());
        });
    }

    // ------------------------------- Carga de datos ------------------------------------------------------------- //
    /** Arma la lista: los kanji de `chars` en ese orden, o los del alcance con prioridad para los flojos */
    private async build(): Promise<void> {
        const all = kanjiWithLessons(await this.lessonSVC.allLessons());
        const chars = [...this.chars()];
        if (chars.length) {
            this.list.set(chars.map((char) => all.find((info) => info.char === char)).filter((info): info is KanjiInfo => !!info));
        } else {
            const pool = kanjiInScope(all, this.scope(), this.progressSVC.lastLesson().id);
            this.list.set(prioritizeKanji(pool, this.progressSVC.mastery(), Number(this.count()) || DEFAULT_COUNT));
        }
        this.index.set(0);
        this.step.set('copy');
    }
    // ------------------------------- Carga de datos ------------------------------------------------------------- //

    // ------------------------------- Pasos y puntuación ------------------------------------------------------------- //
    /** Borra el lienzo */
    protected clear(): void {
        this.pad()?.clear();
    }

    /** Pasa al paso «de memoria»: borra el lienzo y oculta la guía */
    protected toMemory(): void {
        this.clear();
        this.step.set('memory');
    }

    /** Puntúa el trazo: si no salió vuelve a copiar; si salió suma XP y pasa al siguiente o termina */
    protected rate(isCorrect: boolean): void {
        this.clear();

        // 1. Repetir: vuelve a copiar el mismo kanji
        if (!isCorrect) {
            this.step.set('copy');
            this.sfxSVC.play('tap');
            return;
        }

        // 2. Bien: suma XP
        this.sfxSVC.play('ok');
        this.progressSVC.addXp(XP_PER_KANJI);

        // 3. Último kanji: cierra la sesión y vuelve a la pantalla anterior
        if (this.index() + 1 >= this.list().length) {
            this.sfxSVC.play('done');
            this.progressSVC.finishSession();
            this.location.back();
            return;
        }

        // 4. Siguiente kanji
        this.index.update((index) => index + 1);
        this.step.set('copy');
    }
    // ------------------------------- Pasos y puntuación ------------------------------------------------------------- //
}
