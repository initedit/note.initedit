import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponentComponent } from './confirm-dialog-component/confirm-dialog-component.component';
import { MatDialogModule } from '@angular/material/dialog';
import {  MatFormFieldModule } from '@angular/material/form-field';
import {  MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
  ],
  declarations: [ConfirmDialogComponentComponent],
  exports:[
    ConfirmDialogComponentComponent,
  ],
  entryComponents: [
    ConfirmDialogComponentComponent
  ]
})
export class SharedModule { }
