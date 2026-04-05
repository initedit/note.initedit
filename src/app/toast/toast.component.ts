import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastService } from '../toast.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.css'],
    standalone: false
})
export class ToastComponent implements OnInit, OnDestroy {
  messages: string[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(private toastService: ToastService, private snackBar: MatSnackBar) { }

  ngOnInit() {
    this.toastService.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
      this.messages.unshift(val);
      this.snackBar.open(val, undefined, {
        duration: 3000,
        panelClass: ['text-center', 'ui-toast-center']
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeLastMessage() {
    this.messages.pop();
  }

}
