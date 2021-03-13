import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, Inject, HostListener, ViewChildren, QueryList } from '@angular/core';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteService } from '../note.service';
import { ToastService } from '../toast.service';
import { NoteResponseInfoModel, NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponentComponent } from '../shared/confirm-dialog-component/confirm-dialog-component.component';
import { BehaviorSubject, forkJoin, Observable, Subject } from 'rxjs';
import { debounceTime, map, switchMap, takeUntil, tap } from 'rxjs/operators';
@Component({
  selector: 'app-note-collection',
  templateUrl: './note-collection.component.html',
  styleUrls: [
    './note-collection.component.css',
  ]
})
export class NoteCollectionComponent implements OnInit {

  noteCollection: NoteTabUiModel[];
  _noteDetails: NoteResponseModel;
  noteInfo: NoteResponseInfoModel;
  selectedNote: NoteTabUiModel;
  authorized: boolean;
  isFetchingNoteContent: boolean = false;
  autoSave: BehaviorSubject<any> = new BehaviorSubject(null);
  @Output('onAction')
  toParrent: EventEmitter<any> = new EventEmitter();

  @ViewChild('inputContent')
  inputContentEl: ElementRef;
  isLoaded: boolean = false;

  @ViewChildren('itemTitleInput')
  itemTitleInputCollection: QueryList<ElementRef>;

  @ViewChild('btnInputAdd')
  btnInputAddEl: ElementRef;

  @ViewChild('tabScrollBar')
  topScrollbar: ElementRef;

  tabScrollLeft: number

  @ViewChildren('itemRef')
  tabs: QueryList<ElementRef>

  @Input()
  set activeNote(value: NoteTabUiModel) {
    this.selectedNote = value;
    if (this.selectedNote) {
      this.fetchNoteTabContent();
    }
  }


  @Input()
  slug: string;
  set(value: string) {
    this.slug = value;
    if (this.noteService.getPassword(this.slug)) {
      this.authorized = true;
    } else {
      this.authorized = false;
    }
  }

  @Input('notes')
  set notes(value: NoteResponseModel) {
    this._noteDetails = value;
    if (this._noteDetails) {
      this.noteCollection = this._noteDetails.content;
      this.noteCollection.forEach((tab: NoteTabUiModel) => {
        if (this._noteDetails.info.type == 'Private') {
          tab.title = Utils.noteDecrypt(tab.slug, tab.title);
        }
      });


      this.noteInfo = this._noteDetails.info;
      if (this.noteCollection.length == 0) {
        this.addNewNoteTab();
      }
      if (this.noteCollection.length > 0 && !this.selectedNote) {
        this.selectedNote = this.noteCollection[0];
      }
    }
  }
  constructor(private noteService: NoteService, private toastService: ToastService, @Inject(DOCUMENT) private document: any, private router: Router, public dialog: MatDialog, private el: ElementRef) {
    this.autoSave.pipe(
      debounceTime(5000),
    ).subscribe((val) => {
      if (val == true) {
        this.saveNotes()
      }
      console.log("Started Auto Saver", val);
    })
  }

  ngOnInit() {
    this.selectedNote = new NoteTabUiModel();
  }

  @HostListener('window:resize', ['$event'])
  onWindowsResize(e: any) {
    this.updateAddButtonLocation();
  }

  ngDoCheck() {
    this.updateAddButtonLocation();
  }

  updateAddButtonLocation() {
    if (this.itemTitleInputCollection && this.itemTitleInputCollection.length > 0) {
      const visibleTitleInputCollection = this.itemTitleInputCollection.filter((item) => {
        return (item.nativeElement as HTMLElement).clientWidth != 0;
      })
      const el = visibleTitleInputCollection[0].nativeElement as HTMLElement;
      const tabWidth = (el ? el.parentElement.clientWidth : 0) + 1;// border width
      const tabTop = (this.topScrollbar.nativeElement as HTMLElement).parentElement.offsetTop;
      const visibleCount = this.noteCollection.filter(n => n.visibility == 1).length;
      const totalWidth = tabWidth * visibleCount;
      const btn = this.btnInputAddEl.nativeElement as HTMLButtonElement;
      const btnWidth = btn.clientWidth;
      const screenWidth = document.body.clientWidth;
      btn.style.top = tabTop + "px";
      if (totalWidth > screenWidth) {
        btn.style.left = (screenWidth - btnWidth) + "px";
      } else {
        btn.style.left = totalWidth + "px";
      }
    }
  }
  getPosition(inputEl) {
    let offsetLeft = 0;
    let offsetTop = 0;

    let el = inputEl;

    while (el) {
      offsetLeft += el.offsetLeft;
      offsetTop += el.offsetTop;
      el = el.parentElement;
    }
    return { offsetTop: offsetTop, offsetLeft: offsetLeft }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const keyLetter = e.key.toLowerCase();
    if (e.ctrlKey) {
      if (keyLetter == 's') {
        this.saveNotes();
        e.preventDefault();
      } else if (keyLetter == 'm') {
        this.toParrent.emit('TOGGLE_MENU_LEFT');
      }

    } else if (e.altKey) {
      if (keyLetter == 't') {
        this.addNewNoteTab();
      } else if (keyLetter == 'w') {
        this.hideNoteTab(this.selectedNote);
      } else if (keyLetter == 'l') {
        if (this.isNoteAuthorized()) {
          this.removePassword();
        } else {
          if (!this.isNoteLocked()) {
            this.lockCurrentNote();
          }
        }
      } else if (keyLetter == 'u') {
        if (this.isNoteLocked()) {
          if (!this.isNoteAuthorized()) {
            this.unlockCurrentNote();
          }
        }
      } else if (keyLetter == 'r') {
        this.selectedNote.isTitleEnabled = true;
        setTimeout(() => {
          let el = (document.querySelector('.tab.active .tab-title') as HTMLInputElement);
          el.focus();
          el.select();
        }, 50);
      } else if (keyLetter == 'e') {
        (this.inputContentEl.nativeElement as HTMLTextAreaElement).focus();
        e.preventDefault();
      } else if (keyLetter == 'n') {
        this.addNewNoteTab();
      } else if (keyLetter == 'h') {
        this.router.navigateByUrl('/');
      } else if (keyLetter == 'b') {
        this.toParrent.emit('TOGGLE_MENU_LEFT');
      } else if (keyLetter == 'c') {
        this.copyCurrentNoteText();
      }
      // Paginations
      try {
        const i = parseInt(keyLetter);
        if (i >= 0 || i <= 9) {
          this.navigateToPosition(i);
        }
      } catch {

      }
    }
  }

  navigateToPosition(index: number) {
    const visibleNotes = this.noteCollection.filter((tab: NoteTabUiModel) => {
      return tab.visibility === 1;
    });
    if (index === 0) {
      this.selectedNote = visibleNotes[visibleNotes.length - 1];
      this.fetchNoteTabContent();
      this.scrollToNoteElement(this.selectedNote)

    } else {
      if (index <= visibleNotes.length) {
        this.selectedNote = visibleNotes[index - 1];
        this.scrollToNoteElement(this.selectedNote)

        this.fetchNoteTabContent();
      }
    }

  }

  fetchNoteTabContent() {
    //Fetch only if tab created otherwise it has no meaning to hit web server
    if (this.selectedNote.id && !this.selectedNote.content) {
      this.isFetchingNoteContent = true;
      this.noteService.fetchNoteTab(this.selectedNote.slug, this.selectedNote.id)
        .subscribe(
          response => {
            if (response.code == 1) {
              let content = response.content.content;
              if (this._noteDetails.info.type == 'Private') {
                content = Utils.noteDecrypt(this.selectedNote.slug, content);
              }
              this.selectedNote.content = content;
            }
          }, error => { }, () => {
            this.isFetchingNoteContent = false;
          }
        );
    }
    if (this.noteCollection) {
      const currentIndex = this.noteCollection.filter(n => n.visibility === 1).indexOf(this.selectedNote);
      window.location.hash = (currentIndex + 1).toString();
    }
  }

  onChangeSelectedNote(note: NoteTabUiModel, scrollToElement: boolean) {
    if (this.selectedNote != note) {
      this.selectedNote = note;
      if (this.selectedNote.id) {
        this.fetchNoteTabContent();
      }
      if (scrollToElement) {
        this.scrollToNoteElement(note)
      }
    }
  }

  scrollToNoteElement(note: NoteTabUiModel) {
    //Scroll To Left Position
    var position = this.noteCollection.indexOf(note)
    if (this.tabs.length > 0 && this.tabs.toArray()[position]) {
      var el = this.tabs.toArray()[position].nativeElement as HTMLDivElement
      var div = this.topScrollbar.nativeElement as HTMLDivElement
      // div.scrollLeft = el.offsetLeft;
      div.scrollTo({ left: el.offsetLeft, behavior: 'smooth' })
    }
  }

  hasEditPermission() {
    return !this.isNoteLocked() || (this.isNoteLocked() && this.isNoteAuthorized());
  }

  addNewNoteTab() {
    if (this.noteCollection.length > 20) {
      this.toastService.showToast('20 tabs only');
      return;
    }
    if (!this.hasEditPermission()) {
      this.toastService.showToast('Unlock note to add tabs');
      return;
    }

    const tab = new NoteTabUiModel();
    tab.title = 'Untitled Document';
    tab.content = '';
    tab.slug = this.slug;
    tab.visibility = 1;
    tab.isTitleEnabled = true;
    let dummy = new NoteTabUiModel();
    dummy.order_index = 0;
    tab.order_index = this.noteCollection.reduce((oldVal: NoteTabUiModel, newVal: NoteTabUiModel) => oldVal.order_index > newVal.order_index ? oldVal : newVal, dummy).order_index + 1;

    this.noteCollection.push(tab);
    this.onChangeSelectedNote(tab, true);

    setTimeout(() => {
      const element = this.itemTitleInputCollection.last.nativeElement as HTMLInputElement;
      element.focus();
      if (element.nodeName.toUpperCase() == 'INPUT') {
        setTimeout(() => {
          element.select();
        }, 0);
      } else {
        setTimeout(() => {
          (element.querySelector('.tab-title') as HTMLInputElement).select();
        }, 0);
      }
    }, 10);
  }
  hideNoteTab(note: NoteTabUiModel) {
    if (!this.hasEditPermission()) {
      this.toastService.showToast('Unlock note to delete tabs');
      return;
    }
    note.visibility = 0;
    const isCurrentNote = note === this.selectedNote;
    if (!note.id) {
      const indexOf = this.noteCollection.indexOf(note);
      this.noteCollection.splice(indexOf, 1);
      this.handleEmptyCollection();
      this.modifiedTab('visibility', note);
      return;

    }

    this.handleEmptyCollection();
    this.modifiedTab('visibility', note);

    if (isCurrentNote) {
      this.selectedNote = null;
      let nextTab = this.noteCollection.filter((item: NoteTabUiModel) => {
        return item.order_index > note.order_index && item.visibility == 1;
      }).shift();
      if (nextTab) {
        this.onChangeSelectedNote(nextTab, false);
      } else {
        let previousTab = this.noteCollection.filter((item: NoteTabUiModel) => {
          return item.order_index < note.order_index && item.visibility == 1;
        }).pop();
        if (previousTab) {
          this.onChangeSelectedNote(previousTab, false);
        }
      }
    }
  }
  onDoubleClickTab(tab: NoteTabUiModel, $event: MouseEvent) {
    if (!this.hasEditPermission()) {
      this.toastService.showToast('Unlock note to edit title');
      return;
    }
    tab.isTitleEnabled = true;
    const element = $event.srcElement as HTMLInputElement;

    if (element.nodeName.toUpperCase() == 'INPUT') {
      setTimeout(() => {
        element.select();
      }, 0);
    } else {
      setTimeout(() => {
        (element.querySelector('.tab-title') as HTMLInputElement).select();
      }, 0);
    }

  }
  onTitleBlur(note: NoteTabUiModel) {
    note.isTitleEnabled = false;
  }

  handleEmptyCollection() {
    if (this.noteCollection.filter(note => note.visibility == 1).length == 0) {
      this.addNewNoteTab();
    }
  }
  modifiedTab(action: string, tab: NoteTabUiModel) {
    if (action == 'content') {
      tab.modifiedContent = true;
    } else if (action == 'title') {
      tab.modifiedTitle = true;
    } else if (action == 'visibility') {
      tab.modifiedVisibility = true;
    } else if (action == 'order') {
      tab.modifiedOrder = true;
    }
    this.autoSave.next(true);
  }
  hasUnsavedNotes() {

    const modifiedTab: NoteTabUiModel[] = [];
    const newTabs: NoteTabUiModel[] = [];
    if (this.noteCollection == null) {
      return;
    }
    for (let i = 0; i < this.noteCollection.length; i++) {
      const note = this.noteCollection[i];
      if (this.slug != note.slug) {
        return;
      }

      if (!note.id) {
        newTabs.push(note);
      } else {
        let updatedNote = new NoteTabUiModel();
        updatedNote = Object.assign({}, note);
        if (!updatedNote.modifiedTitle) {
          updatedNote.title = null;
        }
        if (!updatedNote.modifiedContent) {
          updatedNote.content = null;
        }
        if (!updatedNote.modifiedVisibility) {
          updatedNote.visibility = null;
        }
        if (updatedNote.modifiedContent || updatedNote.modifiedTitle || updatedNote.modifiedOrder || updatedNote.modifiedVisibility) {
          modifiedTab.push(updatedNote);
        }
      }
    }
    let unchangedNewTabs = newTabs.filter((item) => {
      return item.title == "Untitled Document" && item.content.length == 0
    });
    if (modifiedTab.length == 0 && (newTabs.length - unchangedNewTabs.length) === 0) {
      return false;
    }
    return true;
  }

  saveNotes() {
    let allObservable = this.saveNotesReuqest();
    if (allObservable != null) {
      allObservable.subscribe(results => {
        //TODO:: Check if code==1
        this.toastService.showToast("Saved");
        console.log(results);
      })
    }
  }

  saveNotesReuqest(): Observable<any> | null {

    // show password dialog only when note is locked & not yet authorized
    // do not show dialog when its created newly or Public
    if (this.isNoteLocked()) {
      if (!this.isNoteAuthorized()) {
        this.unlockCurrentNote();
        return null;
      }
    }


    const modifiedTab: NoteTabUiModel[] = [];
    const newTabs: NoteTabUiModel[] = [];

    for (let i = 0; i < this.noteCollection.length; i++) {
      const note = this.noteCollection[i];
      if (this.slug != note.slug) {
        return null;
      }

      if (!note.id) {
        newTabs.push(note);
      } else {
        let updatedNote = new NoteTabUiModel();
        updatedNote = Object.assign({}, note);
        if (!updatedNote.modifiedTitle) {
          updatedNote.title = null;
        }
        if (!updatedNote.modifiedContent) {
          updatedNote.content = null;
        }
        if (!updatedNote.modifiedVisibility) {
          updatedNote.visibility = null;
        }
        if (updatedNote.modifiedContent || updatedNote.modifiedTitle || updatedNote.modifiedOrder || updatedNote.modifiedVisibility) {
          modifiedTab.push(updatedNote);
        }
      }
    }

    if (modifiedTab.length + newTabs.length === 0) {
      this.toastService.showToast('Nothing to save.');
      return null;
    }
    let allObservable: Observable<any>
    let obsArray: Observable<any>[] = [];
    if (modifiedTab.length > 0) {

      // create new element so that if note is private
      // then it will impact UI if content encrypted
      const tabs = new Array<NoteTabUiModel>();
      modifiedTab.forEach((mItem: NoteTabUiModel, index: number) => {
        const mTab = new NoteTabUiModel();
        mTab.id = mItem.id;
        mTab.order_index = mItem.order_index;
        mTab.title = mItem.title;
        mTab.content = mItem.content;
        mTab.slug = mItem.slug;
        mTab.status = mItem.status;
        mTab.visibility = mItem.visibility;
        if (this._noteDetails.info.type === 'Private') {
          if (mTab.content) {
            mTab.content = Utils.noteEncrypt(mTab.slug, mTab.content);
          }
          if (mTab.title) {
            mTab.title = Utils.noteEncrypt(mTab.slug, mTab.title);
          }
        }
        tabs.push(mTab);
      });
      obsArray.push(this.noteService.updateNoteTabs(this.slug, { items: tabs }))
    }
    if (newTabs.length > 0) {

      // create new element so that if note is private
      // then it will impact UI if content encrypted
      const tabs = new Array<NoteTabUiModel>();
      newTabs.forEach((mItem: NoteTabUiModel, index: number) => {
        const mTab = new NoteTabUiModel();
        mTab.id = mItem.id;
        mTab.order_index = mItem.order_index;
        mTab.title = mItem.title;
        mTab.content = mItem.content;
        mTab.slug = mItem.slug;
        mTab.status = mItem.status;
        mTab.visibility = mItem.visibility;
        if (this._noteDetails.info.type == 'Private') {
          if (mTab.content) {
            mTab.content = Utils.noteEncrypt(mTab.slug, mTab.content);
          }
          if (mTab.title) {
            mTab.title = Utils.noteEncrypt(mTab.slug, mTab.title);
          }
        }
        tabs.push(mTab);
      });

      obsArray.push(this.noteService.createNewNoteTabs(this.slug, { items: tabs }).pipe(
        tap((response: any) => {
          if (response.code == 1) {
            for (let i = 0; i < newTabs.length; i++) {
              const _note = newTabs[i];
              _note.id = response.tabs[i].id;
            }
          }
        })
      ))
    }

    allObservable = forkJoin(obsArray).pipe(map(results => {
      let response: any = {}
      if (modifiedTab.length > 0) {
        response.updated = results[0];
      }
      if (newTabs.length > 0) {
        response.new = results[modifiedTab.length == 0 ? 0 : 1];
      }
      return response
    }));

    this.noteCollection.forEach(item => {
      item.modifiedContent = false;
      item.modifiedOrder = false;
      item.modifiedTitle = false;
      item.modifiedVisibility = false;
    });
    return allObservable;
  }
  lockCurrentNote() {
    this.toParrent.emit('SET_PASSWORD');
  }
  unlockCurrentNote() {
    this.toParrent.emit('UNLOCK');
  }
  removePassword() {
    this.toParrent.emit('LOGOUT');
  }
  /**
   *checks if use has permission to perform edit/delete operation(If password has been set)
   */
  isNoteAuthorized() {
    return (this.noteService.getPassword(this.slug) ? true : false);
  }

  /**
   * Checks if note is locked or note
   */
  isNoteLocked() {
    if (this.noteInfo) {
      return this.noteInfo.type === 'Public' ? false : true;
    }
    return false;
  }
  /* To copy Text from Textbox */
  copyInputMessage(inputElement: HTMLInputElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
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
  copyCurrentNoteText() {
    this.copyText(this.selectedNote.content);
    this.toastService.showToast('Copied');
  }
  copyCurrentNoteLink() {
    this.copyText(this.document.location.href);
    this.toastService.showToast('Copied link');
  }
  download() {
    this.toParrent.emit('DOWNLOAD_CURRENT_TAB');
  }

  onTabMouseWheel(event: WheelEvent) {
    event.stopPropagation()
    var div = this.topScrollbar.nativeElement as HTMLDivElement
    var delta = event.deltaY;

    if (delta == undefined) {
      var detail = event.detail == 0 ? (event as any).wheelDelta : event.detail
      if (detail > 0) {
        delta = 30;
      } else {
        delta = -30;
      }
    }

    div.scrollLeft -= delta * 3;
  }

  showConfirmDeleteBox() {

    if (this.isNoteLocked() && this.isNoteAuthorized() == false) {
      this.toastService.showToast('Unlock note and try again.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponentComponent, {
      data: {
        Title: "Delete?",
        Message: "Are you sure you want to delete all notes?"
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteNote()
      }
    });
  }

  deleteNote() {
    this.toParrent.emit("DELETE_NOTE")
  }

}
