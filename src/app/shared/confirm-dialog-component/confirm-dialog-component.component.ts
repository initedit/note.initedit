import { Component, Inject } from '@angular/core';

import {MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-confirm-dialog-component',
  templateUrl: './confirm-dialog-component.component.html',
  styleUrls: ['./confirm-dialog-component.component.css']
})
export class ConfirmDialogComponentComponent {

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }
  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
export class DialogData{
  Title: string
  Message: string
}
