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
    /** Trozos de la frase: si la frase entera no está grabada, suenan los trozos grabados seguidos */
    readonly parts = input<string[]>([]);

    // ------------------------------- Audio ------------------------------------------------------------- //
    /** Pronuncia el texto sin que el clic llegue a la tarjeta o botón que contiene el altavoz */
    say(event: Event): void {
        event.stopPropagation();
        const options = this.slow() ? { rate: SLOW_RATE } : {};
        if (this.parts().length) void this.speechSVC.speakParts(this.text(), this.parts(), options);
        else void this.speechSVC.speak(this.text(), options);
    }
    // ------------------------------- Audio ------------------------------------------------------------- //
}
