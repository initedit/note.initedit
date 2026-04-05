import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoteResponseModel } from '../model/note-response-model';
import { NoteService } from '../note.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NoteGeneralSetting } from '../model/note-general-setting.model';

@Component({
    selector: 'app-setting',
    templateUrl: './setting.component.html',
    styleUrls: ['./setting.component.css'],
    standalone: false
})
export class SettingComponent implements OnInit, OnDestroy {
  formPassword: FormGroup;
  generalForm: FormGroup;
  activeNote: NoteResponseModel;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public noteService: NoteService,
    private matDialogRef: MatDialogRef<SettingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: unknown
  ) { }

  ngOnInit(): void {
    this.formPassword = this.fb.group({
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.checkIfMatchingPasswords('password', 'confirmPassword')
    });

    this.generalForm = this.fb.group({
      autoSave: [true],
      showTitle: [false],
      enableSpellCheck: [false],
      editorEnableLineNumber: [false],
      editorTheme: ['material-darker']
    });
    this.generalForm.patchValue(this.noteService.getGeneralSetting());

    this.generalForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => this.noteService.saveGeneralSetting(val as NoteGeneralSetting));

    this.noteService.onActiveNoteChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((note) => {
        this.activeNote = note;
      });
  }

  updatePassword() {
    const formValue = this.formPassword.value;
    this.noteService.updatePassword(formValue.password);
  }

  checkIfMatchingPasswords(passwordKey: string, passwordConfirmationKey: string) {
    return (group: FormGroup) => {
      const passwordInput = group.controls[passwordKey];
      const passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({ notEquivalent: true });
      }
      return passwordConfirmationInput.setErrors(null);
    };
  }

  closeDialog() {
    this.matDialogRef.close({});
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
