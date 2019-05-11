import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from './home/home.component';
import {NoteComponent} from './note/note.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';

// const routes: Routes = [
//   { path: '', component: HomeComponent },
//   { path: ':slug', component: NoteComponent },
//   { path: '**', component: PageNotFoundComponent },
// ];


@NgModule({
  exports: [ RouterModule ],
  //imports:[RouterModule.forRoot(routes) ]
})
export class AppRoutingModule {}

