import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {FormsModule } from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { NoteComponent } from './note/note.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { NoteCollectionComponent } from './note-collection/note-collection.component';
import { ClickStopPropagationDirective } from './click-stop-propagation.directive';
import {SortablejsModule} from 'angular-sortablejs';
import { ToastComponent } from './toast/toast.component';

import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import { SharedModule } from './shared/shared.module';



const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: ':slug', component: NoteComponent },
  { path: '**', component: NoteComponent },
];



@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NoteComponent,
    PageNotFoundComponent,
    HeaderNavComponent,
    NoteCollectionComponent,
    ClickStopPropagationDirective,
    ToastComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    SharedModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    SortablejsModule.forRoot({ animation: 150 }),
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
