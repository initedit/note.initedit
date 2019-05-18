import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './/app-routing.module';
import { NoteComponent } from './note/note.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { NoteService } from './note.service';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { NoteCollectionComponent } from './note-collection/note-collection.component';
import { BsModelComponent } from './bs-model/bs-model.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: ':slug', component: NoteComponent },
  { path: '**', component: PageNotFoundComponent },
];



@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NoteComponent,
    PageNotFoundComponent,
    HeaderNavComponent,
    NoteCollectionComponent,
    BsModelComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes),
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
