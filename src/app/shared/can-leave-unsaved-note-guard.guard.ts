import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, CanDeactivate, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { NoteComponent } from '../note/note.component';

@Injectable({
  providedIn: 'root'
})
export class CanLeaveUnsavedNoteGuardGuard implements CanDeactivate<NoteComponent> {


  canDeactivate(
    component: NoteComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
  ): boolean | Observable<boolean> {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
