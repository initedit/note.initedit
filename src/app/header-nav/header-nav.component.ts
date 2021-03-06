import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, ViewChild, HostListener, Input, Inject } from '@angular/core';
import { MatRipple, RippleRef } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { NoteResponseModel } from '../model/note-response-model';
import { NoteService } from '../note.service';
import { SettingComponent } from '../setting/setting.component';
import { ToastService } from '../toast.service';
import Utils from '../Util';

@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.css']
})
export class HeaderNavComponent implements OnInit {

  @ViewChild(MatRipple, { static: true })
  buttonRipple: MatRipple

  showAboutUs: boolean

  rippleRef: RippleRef

  activeNote: NoteResponseModel

  showNoteTitle: boolean = false
  title: string = ''
  constructor(public dialog: MatDialog, private noteService: NoteService, @Inject(DOCUMENT) private document: any, private toastService: ToastService) { }
  @Output("onAction")
  toParrent: EventEmitter<any> = new EventEmitter();

  @HostListener('document:keydown.escape', ["$event"]) onKeyDown(event: KeyboardEvent) {
    console.log("Clicked")
    if (this.showAboutUs) {
      this.onInfoClosed()
    }
  }


  ngOnInit() {
    this.buttonRipple.color = "#FFF"
    this.buttonRipple.unbounded = true
    this.buttonRipple.radius = 1700;
    this.buttonRipple.disabled = true;

    this.showAboutUs = false
    this.noteService.onGeneralSettingUpdate().subscribe(val => {
      this.showNoteTitle = val.showTitle;
    })
    this.noteService.onActiveNoteChange().subscribe(note => {
      if (note) {
        this.title = note.info.slug
        this.activeNote = note;
      }
    })
  }
  onInfoClicked(event: MouseEvent) {
    // this.buttonRipple.disabled=true;
    this.rippleRef = this.buttonRipple.launch(event.x, event.y, {
      animation: {
        exitDuration: 400
      },
      persistent: true,
    });

    setTimeout(() => {
      this.showAboutUs = true
    }, this.rippleRef.config.animation.exitDuration)
  }
  onInfoClosed() {
    this.showAboutUs = false;
    this.rippleRef.fadeOut()
  }

  onSettingClicked() {
    this.dialog.open(SettingComponent, {
      width: "90%",
      height: "80%",
      panelClass: 'setting-panel',
      data: {
        isNoteAuthorized: this.noteService.getPassword(this.activeNote.info.slug) ? true : false
      }
    })
  }
  /* To copy any Text */
  copyText(val: string) {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }
  copyLink() {
    this.copyText(this.document.location.href);
    this.toastService.showToast('Copied link');
  }
}

