import { Injectable } from '@angular/core';
import { Observable, Subject, Observer } from 'rxjs';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  messages:string[];
  message:Observable<string>
  observer:Observer<string>;
  constructor(private _snackBar: MatSnackBar) { 
    this.messages = new Array<string>();
    this.message = new Observable((observer:Observer<string>)=>{
      this.observer = observer;
    });

  }

  public showToast(val:string){
    this.messages.push(val);
    this.observer.next(val);
  }

}
