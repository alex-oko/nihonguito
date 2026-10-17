import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressService } from '../../services/progress.service';
import { GrammarDrill, GrammarTab, GuideSentence } from '../../interfaces/grammar-guide.interface';
import {
    CHEAT_SHEET,
    FILL_STEPS,
    GOLDEN_RULES,
    GRAMMAR_CONCEPTS,
    GRAMMAR_DRILLS,
    interestSentences,
    interestSentencesFor,
    MAIN_TEMPLATE,
    PARTICLE_GUIDES,
    PARTICLE_PAIRS,
    ROLE_INFO,
    ROLE_ORDER,
    SENTENCE_MOLDS,
    WORKED_EXAMPLES,
    blockText,
} from '../../utils/grammar-guide.utils';
import { interestLabel } from '../../utils/interests.utils';
import { persisted } from '../../utils/storage.utils';
import { IconComponent } from '../../components/icon/icon.component';
import { SentenceBlocksComponent } from '../../components/sentence-blocks/sentence-blocks.component';

/** Frases de ejemplo que se enseñan en «Frases para ti» cuando el usuario no eligió intereses */
const SAMPLE_WITHOUT_INTERESTS = 6;

@Component({
    selector: 'app-grammar',
    imports: [RouterLink, IconComponent, SentenceBlocksComponent],
    templateUrl: './grammar.component.html',
    styleUrl: './grammar.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrammarComponent {
    // --- Inyección de dependencias ---
    private progressSVC = inject(ProgressService);
    private router = inject(Router);

    // --- Estados UI con Signals ---
    /** Pestaña abierta; se recuerda para volver a ella al salir de una práctica */
    protected tab = persisted<GrammarTab>('grammarTab', 'basics', false);
    /** Concepto, partícula o molde desplegado (solo uno a la vez) */
    protected openId = signal<string | null>(null);
    /** Ejemplo resuelto que se enseña en «Paso a paso» */
    protected workedIndex = signal(0);

    // --- Valores derivados (computed) ---
    protected interests = computed(() => this.progressSVC.settings().interests ?? []);
    protected interestNames = computed(() => this.interests().map(interestLabel).join(', ').toLowerCase());
    protected forYou = computed(() => {
        const sentences = interestSentences(this.interests());
        return this.interests().length ? sentences : sentences.slice(0, SAMPLE_WITHOUT_INTERESTS);
    });
    protected worked = computed(() => WORKED_EXAMPLES[this.workedIndex()]);
    /** Frases de los intereses del usuario que usan cada partícula, por id de la ficha */
    protected particleForYou = computed(
        () => new Map(PARTICLE_GUIDES.map((guide): [string, GuideSentence[]] => [guide.id, interestSentencesFor(guide, this.interests())])),
    );

    // Contenido fijo de la plantilla
    protected roleOrder = ROLE_ORDER;
    protected roleInfo = ROLE_INFO;
    protected concepts = GRAMMAR_CONCEPTS;
    protected particles = PARTICLE_GUIDES;
    protected pairs = PARTICLE_PAIRS;
    protected cheatSheet = CHEAT_SHEET;
    protected rules = GOLDEN_RULES;
    protected template = MAIN_TEMPLATE;
    protected workedExamples = WORKED_EXAMPLES;
    protected fillSteps = FILL_STEPS;
    protected molds = SENTENCE_MOLDS;
    protected drills = GRAMMAR_DRILLS;
    protected blockText = blockText;

    // ------------------------------- Navegación ------------------------------------------------------------- //
    /** Cambia de pestaña, cierra lo desplegado y sube al principio */
    protected setTab(tab: GrammarTab): void {
        this.tab.set(tab);
        this.openId.set(null);
        window.scrollTo({ top: 0 });
    }

    /** Despliega una tarjeta o la cierra si ya estaba abierta */
    protected toggle(id: string): void {
        this.openId.update((openId) => (openId === id ? null : id));
    }

    /** Abre la práctica del tipo elegido (?mode=particles) */
    protected practice(drill: GrammarDrill): void {
        void this.router.navigate(['/gramatica/practica'], { queryParams: { mode: drill } });
    }
    // ------------------------------- Navegación ------------------------------------------------------------- //
}
