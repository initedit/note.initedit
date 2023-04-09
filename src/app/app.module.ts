import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { NoteComponent } from './note/note.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { NoteCollectionComponent } from './note-collection/note-collection.component';
import { ClickStopPropagationDirective } from './click-stop-propagation.directive';
// import { SortablejsModule } from 'angular-sortablejs';
import { ToastComponent } from './toast/toast.component';

import { SharedModule } from './shared/shared.module';
import { CanLeaveUnsavedNoteGuardGuard } from './shared/can-leave-unsaved-note-guard.guard';
import { SortablejsModule } from 'ngx-sortablejs';
import { DateAgoPipe } from './pipes/date-ago.pipe';
import { MaterialModule } from './material/material.module';
import { SettingComponent } from './setting/setting.component';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: ':slug', canDeactivate: [CanLeaveUnsavedNoteGuardGuard], component: NoteComponent },
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
    ToastComponent,
    DateAgoPipe,
    SettingComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    SortablejsModule.forRoot({ animation: 150 }),
    BrowserAnimationsModule,
    MaterialModule,
    CodemirrorModule,
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
