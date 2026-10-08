import { Routes } from '@angular/router';

/** data de las rutas a pantalla completa: AppComponent oculta la barra de pestañas mientras están abiertas */
const IMMERSIVE = { immersive: true };

/** Rutas de la app. Todas cargan su vista en diferido (loadComponent) para que el primer arranque sea ligero */
export const routes: Routes = [
    // --- Inicio ---
    { path: '', loadComponent: () => import('./views/home/home.component').then((module) => module.HomeComponent) },

    // --- Kana, hora y laboratorio de katakana ---
    { path: 'kana', loadComponent: () => import('./views/kana/kana.component').then((module) => module.KanaComponent) },
    { path: 'tiempo', loadComponent: () => import('./views/time/time.component').then((module) => module.TimeComponent) },
    { path: 'kana/lab', loadComponent: () => import('./views/kana/views/katakana-lab/katakana-lab.component').then((module) => module.KatakanaLabComponent) },
    {
        path: 'kana/:script',
        loadComponent: () => import('./views/kana/views/kana-chart/kana-chart.component').then((module) => module.KanaChartComponent),
    },
    {
        path: 'kana/:script/practica/:mode',
        data: IMMERSIVE,
        loadComponent: () => import('./views/kana/views/kana-practice/kana-practice.component').then((module) => module.KanaPracticeComponent),
    },
    {
        path: 'kana/:script/memorama',
        data: IMMERSIVE,
        loadComponent: () => import('./views/kana/views/kana-match/kana-match.component').then((module) => module.KanaMatchComponent),
    },
    {
        path: 'kana/:script/trazar',
        data: IMMERSIVE,
        loadComponent: () => import('./views/kana/views/kana-trace/kana-trace.component').then((module) => module.KanaTraceComponent),
    },

    // --- Lecciones ---
    { path: 'lecciones', loadComponent: () => import('./views/lessons/lessons.component').then((module) => module.LessonsComponent) },
    {
        path: 'lecciones/:id',
        loadComponent: () => import('./views/lessons/views/lesson-detail/lesson-detail.component').then((module) => module.LessonDetailComponent),
    },
    {
        path: 'lecciones/:id/practica/:mode',
        data: IMMERSIVE,
        loadComponent: () => import('./views/lessons/views/lesson-practice/lesson-practice.component').then((module) => module.LessonPracticeComponent),
    },
    {
        path: 'lecciones/:id/conversacion/:cid',
        data: IMMERSIVE,
        loadComponent: () => import('./views/conversations/views/conversation-player/conversation-player.component').then((module) => module.ConversationPlayerComponent),
    },

    // --- Práctica, juegos, Musubi, exámenes, repaso, verbos y conversaciones ---
    { path: 'practicar', loadComponent: () => import('./views/practice/practice.component').then((module) => module.PracticeComponent) },
    {
        path: 'juego/:game',
        data: IMMERSIVE,
        loadComponent: () => import('./views/game-host/game-host.component').then((module) => module.GameHostComponent),
    },
    { path: 'musubi', loadComponent: () => import('./views/pet-house/pet-house.component').then((module) => module.PetHouseComponent) },
    { path: 'examenes', loadComponent: () => import('./views/exams/exams.component').then((module) => module.ExamsComponent) },
    { path: 'examen', loadComponent: () => import('./views/exams/views/exam-builder/exam-builder.component').then((module) => module.ExamBuilderComponent) },
    { path: 'examen/nivel', loadComponent: () => import('./views/exams/views/level-list/level-list.component').then((module) => module.LevelListComponent) },
    {
        path: 'examen/nivel/hoja',
        data: IMMERSIVE,
        loadComponent: () => import('./views/exams/views/level-sheet/level-sheet.component').then((module) => module.LevelSheetComponent),
    },
    {
        path: 'examen/prueba',
        data: IMMERSIVE,
        loadComponent: () => import('./views/exams/views/exam-run/exam-run.component').then((module) => module.ExamRunComponent),
    },
    {
        path: 'repaso',
        data: IMMERSIVE,
        loadComponent: () => import('./views/practice/views/review/review.component').then((module) => module.ReviewComponent),
    },
    { path: 'verbos', loadComponent: () => import('./views/verbs/verbs.component').then((module) => module.VerbsComponent) },
    {
        path: 'verbos/practica',
        data: IMMERSIVE,
        loadComponent: () => import('./views/verbs/views/verb-practice/verb-practice.component').then((module) => module.VerbPracticeComponent),
    },
    {
        path: 'conversaciones',
        loadComponent: () => import('./views/conversations/conversations.component').then((module) => module.ConversationsComponent),
    },

    // --- Perfil y ruta comodín (cualquier URL desconocida vuelve a Inicio) ---
    { path: 'perfil', loadComponent: () => import('./views/profile/profile.component').then((module) => module.ProfileComponent) },
    { path: '**', redirectTo: '' },
];
