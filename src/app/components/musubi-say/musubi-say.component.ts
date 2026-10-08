import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MusubiComponent } from '../musubi/musubi.component';
import { MusubiMood } from '../../interfaces/pet.interface';

/** Musubi con un bocadillo al lado; el texto llega por proyección de contenido */
@Component({
    selector: 'app-musubi-say',
    imports: [MusubiComponent],
    templateUrl: './musubi-say.component.html',
    styleUrl: './musubi-say.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MusubiSayComponent {
    // --- Inputs y outputs ---
    readonly mood = input<MusubiMood>('idle');
    readonly size = input(64);
    /** Reenvía el toque sobre Musubi */
    readonly poke = output<void>();
}
