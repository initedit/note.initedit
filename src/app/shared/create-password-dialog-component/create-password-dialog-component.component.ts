import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
interface DialogData {
  password: string;
  isPrivate: boolean;
}

@Component({
  selector: 'app-auth-dialog-component',
  templateUrl: './create-password-dialog-component.component.html',
  styleUrls: ['./create-password-dialog-component.component.css']
})
export class CreatePasswordDialogComponentComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<CreatePasswordDialogComponentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }
  finishedInput() {
    if (this.data.password.length > 0) {
      this.dialogRef.close(this.data);
    } else {
      this.dialogRef.close(null);
    }
  }
}
