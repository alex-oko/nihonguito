import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Arranca la app con el shell (AppComponent) y los providers de app.config.ts
bootstrapApplication(AppComponent, appConfig)
    .catch((error) => console.error(error));
