import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponentComponent } from './confirm-dialog-component/confirm-dialog-component.component';
import { AuthDialogComponentComponent } from './auth-dialog-component/auth-dialog-component.component';
import { CreatePasswordDialogComponentComponent } from './create-password-dialog-component/create-password-dialog-component.component';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../material/material.module';

@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        FormsModule,
    ],
    declarations: [ConfirmDialogComponentComponent, AuthDialogComponentComponent, CreatePasswordDialogComponentComponent],
    exports: [
        ConfirmDialogComponentComponent,
    ]
})
export class SharedModule { }
