import { Component, EventEmitter, HostListener, Inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatRipple, RippleRef } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NoteResponseModel } from '../model/note-response-model';
import { NoteService } from '../note.service';
import { SettingComponent } from '../setting/setting.component';
import { ToastService } from '../toast.service';

type HeaderAction = 'TOGGLE_MENU_LEFT';

@Component({
    selector: 'app-header-nav',
    templateUrl: './header-nav.component.html',
    styleUrls: ['./header-nav.component.css'],
    standalone: false
})
export class HeaderNavComponent implements OnInit, OnDestroy {

  @ViewChild(MatRipple, { static: true })
  buttonRipple: MatRipple;

  showAboutUs = false;

  rippleRef?: RippleRef;

  activeNote: NoteResponseModel | null = null;

  showNoteTitle = false;
  title = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    private noteService: NoteService,
    @Inject(DOCUMENT) private document: Document,
    private toastService: ToastService
  ) { }

  @Output("onAction")
  toParrent: EventEmitter<HeaderAction> = new EventEmitter();

  @HostListener('document:keydown.escape', ['$event'])
  onKeyDown(): void {
    if (this.showAboutUs) {
      this.onInfoClosed();
    }
  }


  ngOnInit(): void {
    this.buttonRipple.color = "#FFF";
    this.buttonRipple.unbounded = true;
    this.buttonRipple.radius = 1700;
    this.buttonRipple.disabled = true;

    this.noteService.onGeneralSettingUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.showNoteTitle = val.showTitle;
      });

    this.noteService.onActiveNoteChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((note) => {
        this.activeNote = note;
        this.title = note?.info.slug ?? '';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInfoClicked(event: MouseEvent): void {
    this.rippleRef = this.buttonRipple.launch(event.x, event.y, {
      animation: {
        exitDuration: 400
      },
      persistent: true,
    });

    setTimeout(() => {
      this.showAboutUs = true;
    }, this.rippleRef.config.animation.exitDuration);
  }

  onInfoClosed(): void {
    this.showAboutUs = false;
    this.rippleRef?.fadeOut();
  }

  onSettingClicked(): void {
    if (!this.activeNote) {
      return;
    }

    this.dialog.open(SettingComponent, {
      width: '90%',
      height: '80%',
      panelClass: 'setting-panel',
      data: {
        isNoteAuthorized: !!this.noteService.getPassword(this.activeNote.info.slug)
      }
    });
  }

  copyText(val: string): void {
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

  copyLink(): void {
    this.copyText(this.document.location.href);
    this.toastService.showToast('Copied link');
  }
}
