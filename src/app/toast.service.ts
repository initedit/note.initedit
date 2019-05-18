import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  messages:string[];

  constructor() { 
    this.messages = new Array<string>();
  }

  public showToast(val:string){
    this.messages.push(val);
  }

}
