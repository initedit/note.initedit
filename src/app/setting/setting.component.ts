import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoteResponseModel } from '../model/note-response-model';
import { NoteService } from '../note.service';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.css']
})
export class SettingComponent implements OnInit {

  constructor(private fb: FormBuilder, public noteService: NoteService, private matDialogRef: MatDialogRef<SettingComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  formPassword: FormGroup;
  generalForm: FormGroup;
  activeNote: NoteResponseModel;
  ngOnInit(): void {
    this.formPassword = this.fb.group({
      "password": ["", Validators.required],
      "confirmPassword": ["", Validators.required]
    }, {
      validator: this.checkIfMatchingPasswords('password', 'confirmPassword')
    })

    this.generalForm = this.fb.group({
      'autoSave': [true],
      'showTitle': [false]
    })
    this.generalForm.patchValue(this.noteService.getGeneralSetting());

    this.generalForm.valueChanges.subscribe(val => {
      this.noteService.saveGeneralSetting(val);
    })
    this.noteService.onActiveNoteChange().subscribe(note => {
      this.activeNote = note;
    })
  }

  updatePassword() {
    const formValue = this.formPassword.value;
    this.noteService.updatePassword(formValue.password)
  }

  checkIfMatchingPasswords(passwordKey: string, passwordConfirmationKey: string) {
    return (group: FormGroup) => {
      let passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({ notEquivalent: true })
      }
      else {
        return passwordConfirmationInput.setErrors(null);
      }
    }
  }

  closeDialog() {
    this.matDialogRef.close({})
  }

}
