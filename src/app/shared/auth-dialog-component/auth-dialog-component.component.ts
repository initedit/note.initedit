import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
interface DialogData {
  password: string;
}

@Component({
  selector: 'app-auth-dialog-component',
  templateUrl: './auth-dialog-component.component.html',
  styleUrls: ['./auth-dialog-component.component.css']
})
export class AuthDialogComponentComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<AuthDialogComponentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }
  finishedInput() {
    if (this.data && this.data.password && this.data.password.length > 0) {
      this.dialogRef.close(this.data);
    }else{
      this.dialogRef.close(null);
    }
  }
}
