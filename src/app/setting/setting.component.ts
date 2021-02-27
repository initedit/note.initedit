import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoteService } from '../note.service';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.css']
})
export class SettingComponent implements OnInit {

  constructor(private fb:FormBuilder,private noteService:NoteService) { }

  formPassword:FormGroup
  ngOnInit(): void {
    this.formPassword = this.fb.group({
      "password":["",Validators.required],
      "confirmPassword":["",Validators.required]
    },{
      validator:this.checkIfMatchingPasswords('password','confirmPassword')
    })
  }

  updatePassword(){
    const formValue = this.formPassword.value;
    this.noteService.updatePassword(formValue.password)
  }

  checkIfMatchingPasswords(passwordKey: string, passwordConfirmationKey: string) {
    return (group: FormGroup) => {
      let passwordInput = group.controls[passwordKey],
          passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({notEquivalent: true})
      }
      else {
          return passwordConfirmationInput.setErrors(null);
      }
    }
  }

}
