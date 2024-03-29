import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';
if (environment.production) {
  enableProdMode();
}
/**
 * Hammerjs must be imported for gestures
 */
import 'hammerjs';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
