import { Component, Inject, OnInit } from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
interface DialogData {
  password: string;
  onChange:any
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
      // this.dialogRef.close(this.data);
      this.data.onChange(this.data.password);
    }else{
      this.dialogRef.close(null);
    }
  }
}
