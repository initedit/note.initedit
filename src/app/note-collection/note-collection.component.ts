import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CodemirrorComponent } from '@ctrl/ngx-codemirror';
import { BehaviorSubject, forkJoin, Observable, Subject } from 'rxjs';
import { debounceTime, map, takeUntil, tap } from 'rxjs/operators';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteService } from '../note.service';
import { ToastService } from '../toast.service';
import { NoteResponseInfoModel, NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { ConfirmDialogComponentComponent } from '../shared/confirm-dialog-component/confirm-dialog-component.component';
import { NoteGeneralSetting } from '../model/note-general-setting.model';

type TabChangeType = 'content' | 'title' | 'visibility' | 'order';
type NoteCollectionMenuAction =
  | 'SET_PASSWORD'
  | 'UNLOCK'
  | 'LOGOUT'
  | 'DELETE_NOTE'
  | 'DOWNLOAD_CURRENT_TAB'
  | 'TOGGLE_MENU_LEFT';

@Component({
  selector: 'app-note-collection',
  templateUrl: './note-collection.component.html',
  styleUrls: ['./note-collection.component.css'],
  standalone: false
})
export class NoteCollectionComponent implements OnInit, AfterViewInit, OnDestroy {
  noteCollection: NoteTabUiModel[] = [];
  noteInfo: NoteResponseInfoModel | null = null;
  selectedNote: NoteTabUiModel = new NoteTabUiModel();
  authorized = false;
  isFetchingNoteContent = false;
  enableSpellCheck = false;
  editorTheme = '';
  editorEnableLineNumber = false;
  autoSaveEnabled = true;

  private noteDetails: NoteResponseModel | null = null;
  private readonly autoSave = new BehaviorSubject<boolean>(false);
  private readonly destroy$ = new Subject<void>();
  private currentSlug = '';
  @Output('onAction')
  toParrent: EventEmitter<NoteCollectionMenuAction> = new EventEmitter();

  @ViewChildren('itemTitleInput')
  itemTitleInputCollection?: QueryList<ElementRef<HTMLInputElement>>;

  @ViewChild('tabScrollBar')
  topScrollbar?: ElementRef<HTMLDivElement>;

  @ViewChildren('itemRef')
  tabs?: QueryList<ElementRef<HTMLDivElement>>;

  @ViewChild('codemirror')
  codeMirror?: CodemirrorComponent;

  @Input()
  set activeNote(value: NoteTabUiModel | null) {
    if (!value) {
      return;
    }

    this.selectedNote = value;
    this.fetchNoteTabContent();
    this.syncEditorOptions();
  }

  @Input()
  set slug(value: string) {
    this.currentSlug = value;
    this.authorized = !!this.noteService.getPassword(value);
  }

  get slug(): string {
    return this.currentSlug;
  }

  @Input('notes')
  set notes(value: NoteResponseModel | null) {
    this.noteDetails = value;
    if (!value) {
      this.noteCollection = [];
      this.noteInfo = null;
      this.selectedNote = new NoteTabUiModel();
      return;
    }

    this.noteCollection = value.content;
    this.noteInfo = value.info;
    this.decryptPrivateTitles();

    if (this.noteCollection.length === 0) {
      this.addNewNoteTab();
      return;
    }

    if (!this.selectedNote?.slug) {
      this.selectedNote = this.noteCollection[0];
    }

    this.syncEditorOptions();
  }

  constructor(
    private noteService: NoteService,
    private toastService: ToastService,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    public dialog: MatDialog,
    private el: ElementRef
  ) {
    this.autoSave
      .pipe(
        debounceTime(5000),
        takeUntil(this.destroy$)
      )
      .subscribe((shouldSave) => {
        if (shouldSave && this.autoSaveEnabled) {
          this.saveNotes();
        }
      });
  }

  ngOnInit(): void {
    this.noteService.onGeneralSettingUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((form) => {
        this.applyGeneralSettings(form);
      });
  }

  ngAfterViewInit(): void {
    this.codeMirror?.registerOnChange((value: string) => {
      if (!this.selectedNote) {
        return;
      }

      this.selectedNote.content = value;
      this.modifiedTab('content', this.selectedNote);
    });

    this.syncEditorOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowsResize(): void {
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    let keyLetter = event.key.toLowerCase();
    if (keyLetter === 'dead') {
      keyLetter = (event as KeyboardEvent & { code: string }).code.replace('Key', '').toLowerCase();
    }

    if (event.ctrlKey) {
      if (keyLetter === 's') {
        this.saveNotes();
        event.preventDefault();
      } else if (keyLetter === 'm') {
        this.toParrent.emit('TOGGLE_MENU_LEFT');
      }
      return;
    }

    if (!event.altKey) {
      return;
    }

    switch (keyLetter) {
      case 't':
      case 'n':
        this.addNewNoteTab();
        return;
      case 'w':
        this.hideNoteTab(this.selectedNote);
        return;
      case 'l':
        if (this.isNoteAuthorized()) {
          this.removePassword();
        } else if (!this.isNoteLocked()) {
          this.lockCurrentNote();
        }
        return;
      case 'u':
        if (this.isNoteLocked() && !this.isNoteAuthorized()) {
          this.unlockCurrentNote();
        }
        return;
      case 'r':
        this.enableTitleEditing(this.selectedNote);
        return;
      case 'e':
        this.codeMirror?.codeMirror.focus();
        return;
      case 'h':
        this.router.navigateByUrl('/');
        return;
      case 'b':
        this.toParrent.emit('TOGGLE_MENU_LEFT');
        return;
      case 'c':
        this.copyCurrentNoteText();
        return;
      default: {
        const index = Number.parseInt(keyLetter, 10);
        if (!Number.isNaN(index)) {
          this.navigateToPosition(index);
        }
      }
    }
  }

  navigateToPosition(index: number): void {
    const visibleNotes = this.getVisibleNotes();
    if (!visibleNotes.length) {
      return;
    }

    if (index === 0) {
      this.selectedNote = visibleNotes[visibleNotes.length - 1];
    } else if (index <= visibleNotes.length) {
      this.selectedNote = visibleNotes[index - 1];
    } else {
      return;
    }

    this.scrollToNoteElement(this.selectedNote);
    this.fetchNoteTabContent();
  }

  fetchNoteTabContent(): void {
    if (this.selectedNote?.id && !this.selectedNote.content) {
      this.isFetchingNoteContent = true;
      this.noteService.fetchNoteTab(this.selectedNote.slug, this.selectedNote.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.code !== 1) {
              return;
            }

            let content = response.content.content;
            if (this.noteInfo?.type === 'Private') {
              content = Utils.noteDecrypt(this.selectedNote.slug, content);
            }
            this.selectedNote.content = content;
          },
          complete: () => {
            this.isFetchingNoteContent = false;
          },
          error: () => {
            this.isFetchingNoteContent = false;
          }
        });
    }

    const currentIndex = this.getVisibleNotes().indexOf(this.selectedNote);
    if (currentIndex >= 0) {
      window.location.hash = String(currentIndex + 1);
    }
  }

  onChangeSelectedNote(note: NoteTabUiModel, scrollToElement: boolean): void {
    if (this.selectedNote === note) {
      return;
    }

    this.selectedNote = note;
    if (this.selectedNote.id) {
      this.fetchNoteTabContent();
    }

    if (scrollToElement) {
      this.scrollToNoteElement(note);
    }

    this.syncEditorOptions();
  }

  scrollToNoteElement(note: NoteTabUiModel): void {
    const position = this.noteCollection.indexOf(note);
    const tabElement = this.tabs?.toArray()[position]?.nativeElement;
    const scrollContainer = this.topScrollbar?.nativeElement;

    if (tabElement && scrollContainer) {
      scrollContainer.scrollTo({ left: tabElement.offsetLeft, behavior: 'smooth' });
    }
  }

  hasEditPermission(): boolean {
    return !this.isNoteLocked() || this.isNoteAuthorized();
  }

  addNewNoteTab(): void {
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
    tab.order_index = this.getNextOrderIndex();

    this.noteCollection.push(tab);
    this.onChangeSelectedNote(tab, true);

    setTimeout(() => {
      this.focusLastTitleInput();
    }, 10);
  }

  hideNoteTab(note: NoteTabUiModel): void {
    if (!this.hasEditPermission()) {
      this.toastService.showToast('Unlock note to delete tabs');
      return;
    }

    const isCurrentNote = note === this.selectedNote;
    note.visibility = 0;

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
      this.selectedNote = this.findAdjacentVisibleTab(note) ?? new NoteTabUiModel();
    }
  }

  onDoubleClickTab(tab: NoteTabUiModel, event: MouseEvent): void {
    if (!this.hasEditPermission()) {
      this.toastService.showToast('Unlock note to edit title');
      return;
    }

    this.enableTitleEditing(tab, event.target as HTMLElement);
  }

  onTitleBlur(note: NoteTabUiModel): void {
    note.isTitleEnabled = false;
  }

  modifiedTab(action: TabChangeType, tab: NoteTabUiModel): void {
    switch (action) {
      case 'content':
        tab.modifiedContent = true;
        break;
      case 'title':
        tab.modifiedTitle = true;
        this.syncEditorOptions();
        break;
      case 'visibility':
        tab.modifiedVisibility = true;
        break;
      case 'order':
        tab.modifiedOrder = true;
        break;
    }

    this.autoSave.next(true);
  }

  hasUnsavedNotes(): boolean {
    const pendingChanges = this.getPendingSaveState();
    return pendingChanges.modifiedTabs.length > 0 || pendingChanges.newTabs.length > 0;
  }

  saveNotes(): void {
    const request = this.saveNotesRequest();
    if (!request) {
      return;
    }

    request
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.toastService.showToast('Saved');
      });
  }

  saveNotesRequest(): Observable<unknown> | null {
    if (this.isNoteLocked() && !this.isNoteAuthorized()) {
      this.unlockCurrentNote();
      return null;
    }

    const pendingChanges = this.getPendingSaveState();
    if (pendingChanges.modifiedTabs.length + pendingChanges.newTabs.length === 0) {
      this.toastService.showToast('Nothing to save.');
      return null;
    }

    const requests: Observable<unknown>[] = [];
    if (pendingChanges.modifiedTabs.length) {
      const tabs = this.buildPersistableTabs(pendingChanges.modifiedTabs);
      requests.push(this.noteService.updateNoteTabs(this.slug, { items: tabs }));
    }

    if (pendingChanges.newTabs.length) {
      const tabs = this.buildPersistableTabs(pendingChanges.newTabs);
      requests.push(
        this.noteService.createNewNoteTabs(this.slug, { items: tabs }).pipe(
          tap((response: { code: number; tabs: Array<{ id: string }> }) => {
            if (response.code === 1) {
              pendingChanges.newTabs.forEach((note, index) => {
                note.id = response.tabs[index].id;
              });
            }
          })
        )
      );
    }

    this.resetModifiedFlags();

    return forkJoin(requests).pipe(
      map((results) => {
        if (results.length === 1) {
          return results[0];
        }

        return {
          updated: results[0],
          created: results[1]
        };
      })
    );
  }

  lockCurrentNote(): void {
    this.toParrent.emit('SET_PASSWORD');
  }

  unlockCurrentNote(): void {
    this.toParrent.emit('UNLOCK');
  }

  removePassword(): void {
    this.toParrent.emit('LOGOUT');
  }

  isNoteAuthorized(): boolean {
    return !!this.noteService.getPassword(this.slug);
  }

  isNoteLocked(): boolean {
    return this.noteInfo ? this.noteInfo.type !== 'Public' : false;
  }

  copyInputMessage(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
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

  copyCurrentNoteText(): void {
    this.copyText(this.selectedNote?.content ?? '');
    this.toastService.showToast('Copied');
  }

  copyCurrentNoteLink(): void {
    this.copyText(this.document.location.href);
    this.toastService.showToast('Copied link');
  }

  download(): void {
    this.toParrent.emit('DOWNLOAD_CURRENT_TAB');
  }

  onTabMouseWheel(event: Event): void {
    event.stopPropagation();
    const scrollContainer = this.topScrollbar?.nativeElement;
    if (!scrollContainer) {
      return;
    }

    const wheelEvent = event as WheelEvent & { detail?: number; wheelDelta?: number };
    let delta = wheelEvent.deltaY;
    if (delta === undefined) {
      const detail = wheelEvent.detail === 0 ? wheelEvent.wheelDelta : wheelEvent.detail;
      delta = detail && detail > 0 ? 30 : -30;
    }

    scrollContainer.scrollLeft -= delta * 3;
  }

  showConfirmDeleteBox(): void {
    if (this.isNoteLocked() && !this.isNoteAuthorized()) {
      this.toastService.showToast('Unlock note and try again.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponentComponent, {
      data: {
        Title: 'Delete?',
        Message: 'Are you sure you want to delete all notes?'
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.deleteNote();
        }
      });
  }

  deleteNote(): void {
    this.toParrent.emit('DELETE_NOTE');
  }

  private applyGeneralSettings(form: NoteGeneralSetting): void {
    this.enableSpellCheck = form.enableSpellCheck;
    this.editorEnableLineNumber = form.editorEnableLineNumber;
    this.editorTheme = form.editorTheme;
    this.autoSaveEnabled = form.autoSave;
    this.syncEditorOptions();
  }

  private decryptPrivateTitles(): void {
    if (this.noteInfo?.type !== 'Private') {
      return;
    }

    this.noteCollection.forEach((tab) => {
      tab.title = Utils.noteDecrypt(tab.slug, tab.title);
    });
  }

  private getVisibleNotes(): NoteTabUiModel[] {
    return this.noteCollection.filter((tab) => tab.visibility === 1);
  }

  private getNextOrderIndex(): number {
    const highestOrderIndex = this.noteCollection.reduce((max, tab) => Math.max(max, tab.order_index ?? 0), 0);
    return highestOrderIndex + 1;
  }

  private focusLastTitleInput(): void {
    const element = this.itemTitleInputCollection?.last?.nativeElement;
    if (!element) {
      return;
    }

    element.focus();
    setTimeout(() => element.select(), 0);
  }

  private handleEmptyCollection(): void {
    if (!this.getVisibleNotes().length) {
      this.addNewNoteTab();
    }
  }

  private getPendingSaveState(): { modifiedTabs: NoteTabUiModel[]; newTabs: NoteTabUiModel[] } {
    const modifiedTabs: NoteTabUiModel[] = [];
    const newTabs: NoteTabUiModel[] = [];

    for (const note of this.noteCollection) {
      if (this.slug !== note.slug) {
        return { modifiedTabs: [], newTabs: [] };
      }

      if (!note.id) {
        if (!this.isDefaultUnsavedTab(note)) {
          newTabs.push(note);
        }
        continue;
      }

      const updatedNote = this.toChangedTab(note);
      if (updatedNote) {
        modifiedTabs.push(updatedNote);
      }
    }

    return { modifiedTabs, newTabs };
  }

  private toChangedTab(note: NoteTabUiModel): NoteTabUiModel | null {
    const updatedNote = Object.assign(new NoteTabUiModel(), note);
    if (!updatedNote.modifiedTitle) {
      updatedNote.title = null;
    }
    if (!updatedNote.modifiedContent) {
      updatedNote.content = null;
    }
    if (!updatedNote.modifiedVisibility) {
      updatedNote.visibility = null;
    }

    if (!updatedNote.modifiedContent && !updatedNote.modifiedTitle && !updatedNote.modifiedOrder && !updatedNote.modifiedVisibility) {
      return null;
    }

    return updatedNote;
  }

  private isDefaultUnsavedTab(note: NoteTabUiModel): boolean {
    return note.title === 'Untitled Document' && note.content.length === 0;
  }

  private buildPersistableTabs(tabs: NoteTabUiModel[]): NoteTabUiModel[] {
    return tabs.map((item) => {
      const tab = Object.assign(new NoteTabUiModel(), item);
      if (this.noteInfo?.type === 'Private') {
        if (tab.content) {
          tab.content = Utils.noteEncrypt(tab.slug, tab.content);
        }
        if (tab.title) {
          tab.title = Utils.noteEncrypt(tab.slug, tab.title);
        }
      }
      return tab;
    });
  }

  private resetModifiedFlags(): void {
    this.noteCollection.forEach((item) => {
      item.modifiedContent = false;
      item.modifiedOrder = false;
      item.modifiedTitle = false;
      item.modifiedVisibility = false;
    });
  }

  private findAdjacentVisibleTab(note: NoteTabUiModel): NoteTabUiModel | undefined {
    return this.noteCollection.find((item) => item.order_index > note.order_index && item.visibility === 1)
      ?? [...this.noteCollection].reverse().find((item) => item.order_index < note.order_index && item.visibility === 1);
  }

  private enableTitleEditing(tab: NoteTabUiModel, target?: HTMLElement): void {
    tab.isTitleEnabled = true;
    const element = target ?? this.el.nativeElement.querySelector('.tab.active .tab-title');
    if (!element) {
      return;
    }

    setTimeout(() => {
      if (element instanceof HTMLInputElement) {
        element.focus();
        element.select();
        return;
      }

      const input = element.querySelector('.tab-title') as HTMLInputElement | null;
      input?.select();
    }, 0);
  }

  private syncEditorOptions(): void {
    const editor = this.codeMirror;
    if (!editor) {
      return;
    }

    const useCodeMode = this.shouldUseCodeEditorEnhancements();
    editor.setOptionIfChanged('theme', useCodeMode ? this.editorTheme : 'null');
    editor.setOptionIfChanged('lineNumbers', useCodeMode && this.editorEnableLineNumber);
  }

  private shouldUseCodeEditorEnhancements(): boolean {
    if (!this.selectedNote?.title || this.editorTheme === 'null') {
      return false;
    }

    const extension = this.selectedNote.title.toLowerCase().split('.').pop();
    return !!extension && [
      'js', 'ts', 'json', 'yaml', 'yml', 'php', 'py', 'c', 'cpp', 'go',
      'sh', 'bash', 'zsh', 'md', 'xml', 'html', 'css', 'docker', 'htaccess', 'conf'
    ].includes(extension);
  }
}
