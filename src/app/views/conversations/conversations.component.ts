import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { Lesson } from '../../interfaces/lesson.interface';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
    selector: 'app-conversation-list',
    imports: [RouterLink, IconComponent],
    templateUrl: './conversations.component.html',
    styleUrl: './conversations.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationsComponent {
    // --- Inyección de dependencias ---
    private lessonSVC = inject(LessonService);

    // --- Estados UI con Signals ---
    /** Todas las lecciones; vacío mientras cargan */
    protected lessons = signal<Lesson[]>([]);

    constructor() {
        // Hacen falta las lecciones completas: el índice no trae los títulos de las conversaciones
        void this.lessonSVC.allLessons().then((allLessons) => this.lessons.set(allLessons));
    }
}
