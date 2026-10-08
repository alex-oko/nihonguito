import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { VerbEntry } from '../../interfaces/lesson.interface';
import { VERB_FORM_LABEL } from '../../utils/questions.utils';
import { VerbForm } from '../../interfaces/question.interface';
import { IconComponent } from '../../components/icon/icon.component';
import { SpeakButtonComponent } from '../../components/speak-button/speak-button.component';
import { JpComponent } from '../../components/jp/jp.component';

@Component({
    selector: 'app-verbs',
    imports: [RouterLink, IconComponent, SpeakButtonComponent, JpComponent],
    templateUrl: './verbs.component.html',
    styleUrl: './verbs.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerbsComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);
    private router = inject(Router);

    // --- Estados UI con Signals ---
    protected tab = signal<'rules' | 'list' | 'practice'>('rules');
    /** Verbos del apéndice; vacío mientras carga */
    protected verbs = signal<VerbEntry[]>([]);
    /** Grupo elegido (1, 2 o 3); 0 = todos. Lo comparten «Lista» y «Practicar» */
    protected group = signal(0);
    /** Formas elegidas para practicar */
    protected forms = signal<VerbForm[]>(['te']);

    // --- Valores derivados (computed) ---
    protected filtered = computed(() => (this.group() ? this.verbs().filter((verb) => verb.group === this.group()) : this.verbs()));

    // Opciones fijas de la plantilla
    protected allForms: VerbForm[] = ['te', 'nai', 'ta', 'dict'];
    protected formLabel = VERB_FORM_LABEL;
    /** Tabla de la forma て del Grupo I: [terminación antes de ます, cambio, ejemplo] */
    protected teRules: [string, string, string][] = [
        ['い・ち・り', 'って', 'かいます → かって'],
        ['み・び・に', 'んで', 'のみます → のんで'],
        ['き', 'いて', 'かきます → かいて'],
        ['ぎ', 'いで', 'いそぎます → いそいで'],
        ['し', 'して', 'かします → かして'],
    ];

    constructor() {
        void this.lessonSVC.appendix().then((appendix) => this.verbs.set(appendix.verbs));
    }

    // ------------------------------- Práctica ------------------------------------------------------------- //
    /** Marca o desmarca una forma para practicar */
    protected toggleForm(form: VerbForm): void {
        this.forms.update((selectedForms) => (selectedForms.includes(form) ? selectedForms.filter((selected) => selected !== form) : [...selectedForms, form]));
    }

    /** Abre la práctica con las formas y el grupo elegidos en la query (?forms=te,nai&group=1) */
    protected practice(): void {
        void this.router.navigate(['/verbos/practica'], { queryParams: { forms: this.forms().join(','), group: this.group() } });
    }
    // ------------------------------- Práctica ------------------------------------------------------------- //
}
