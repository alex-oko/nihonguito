import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SpeechService } from '../../services/speech.service';
import { IconComponent } from '../icon/icon.component';

/** Velocidad de la voz en modo lento (`slow`) */
const SLOW_RATE = 0.6;

@Component({
    selector: 'app-speak',
    imports: [IconComponent],
    templateUrl: './speak-button.component.html',
    styleUrl: './speak-button.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpeakButtonComponent {
    // --- Inyección de dependencias ---
    protected speechSVC = inject(SpeechService);

    // --- Inputs y outputs ---
    readonly text = input.required<string>();
    readonly big = input(false);
    readonly slow = input(false);

    // ------------------------------- Audio ------------------------------------------------------------- //
    /** Pronuncia el texto sin que el clic llegue a la tarjeta o botón que contiene el altavoz */
    say(event: Event): void {
        event.stopPropagation();
        void this.speechSVC.speak(this.text(), this.slow() ? { rate: SLOW_RATE } : {});
    }
    // ------------------------------- Audio ------------------------------------------------------------- //
}
