import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly messageSubject = new Subject<string>();
  readonly message$: Observable<string> = this.messageSubject.asObservable();

  public showToast(value: string): void {
    this.messageSubject.next(value);
  }
}
