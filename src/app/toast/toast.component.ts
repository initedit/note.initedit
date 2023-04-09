import { Component, OnInit } from '@angular/core';
import { ToastService } from '../toast.service';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarConfig as MatSnackBarConfig, MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {
  messages: Array<string> = new Array();
  timer: any = null;
  constructor(private toastService: ToastService, private _snackBar: MatSnackBar) { }

  ngOnInit() {
    this.toastService.message.subscribe(val => {
      this.messages.unshift(val);
      this._snackBar.open(val, undefined, {
        duration: 3000,
        panelClass: ['text-center', 'ui-toast-center']
      });
    });
  }

  removeLastMessage() {
    this.messages.pop();
  }

}
