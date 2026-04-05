import { HttpErrorResponse } from '@angular/common/http';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { NoteCollectionComponent } from '../note-collection/note-collection.component';
import { NoteService } from '../note.service';
import { NoteCreateRequestModel, NoteCreateRequestWithTabsModel } from '../model/note-create-request-model';
import { NoteResponseModel } from '../model/note-response-model';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import Utils from '../Util';
import { ToastService } from '../toast.service';
import { ConfirmDialogComponentComponent } from '../shared/confirm-dialog-component/confirm-dialog-component.component';
import { AuthDialogComponentComponent } from '../shared/auth-dialog-component/auth-dialog-component.component';
import { CreatePasswordDialogComponentComponent } from '../shared/create-password-dialog-component/create-password-dialog-component.component';

type NoteCollectionAction =
  | 'SET_PASSWORD'
  | 'UNLOCK'
  | 'LOGOUT'
  | 'TOGGLE_MENU_LEFT'
  | 'DOWNLOAD_CURRENT_TAB'
  | 'DELETE_NOTE';

type MenuAction = 'OPEN_MENU_LEFT' | 'CLOSE_MENU_LEFT' | 'TOGGLE_MENU_LEFT';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.css'],
  standalone: false
})
export class NoteComponent implements OnInit, OnDestroy {
  response: NoteResponseModel | null = null;
  noteCollection: NoteTabUiModel[] = [];
  filteredNoteCollection: NoteTabUiModel[] = [];
  menuLeftVisible = false;
  selectedNote: NoteTabUiModel | null = null;
  selectedNotesTabIndex = 0;
  isFetchingNoteList = false;
  currentSlug = '';

  @ViewChild(NoteCollectionComponent)
  noteCollectionComponent?: NoteCollectionComponent;

  @ViewChild('searchInput')
  searchInput?: ElementRef<HTMLInputElement>;

  private readonly destroy$ = new Subject<void>();
  private authDialogRef?: MatDialogRef<AuthDialogComponentComponent>;

  constructor(
    private noteService: NoteService,
    private router: Router,
    private toastService: ToastService,
    private route: ActivatedRoute,
    public dialog: MatDialog
  ) {
    this.currentSlug = this.resolveCurrentNoteSlug();
    this.selectedNotesTabIndex = this.parseFragmentIndex(this.route.snapshot.fragment);
  }

  ngOnInit(): void {
    this.refreshNoteData();
    this.noteService.onPasswordUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((password) => {
        if (password) {
          this.updateNotePassword(password);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.noteCollectionComponent?.hasUnsavedNotes()) {
      return of(window.confirm('Changes you made may not be saved.'));
    }

    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  showLeaveMessage($event: BeforeUnloadEvent): string | void {
    if (this.noteCollectionComponent?.hasUnsavedNotes()) {
      const confirmationMessage = '\\o/';
      $event.returnValue = confirmationMessage;
      return confirmationMessage;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'escape') {
      this.menuEvent('CLOSE_MENU_LEFT');
    }
  }

  refreshNoteData(): void {
    const slug = this.getCurrentNoteSlug();
    this.isFetchingNoteList = true;

    this.noteService.fetchNote(slug)
      .pipe(
        finalize(() => {
          this.isFetchingNoteList = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => this.handleFetchedNote(response),
        error: (error) => this.handleRefreshError(error, slug)
      });
  }

  getCurrentNoteSlug(): string {
    this.currentSlug = this.resolveCurrentNoteSlug();
    return this.currentSlug;
  }

  validatePassword(password: string): void {
    const slug = this.getCurrentNoteSlug();
    const encryptedPassword = Utils.noteEncrypt(slug, `/${slug}`, password);

    this.noteService.authenticate(slug, encryptedPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response.code !== 1) {
          this.toastService.showToast('Invalid Password');
          return;
        }

        this.authDialogRef?.close();
        this.noteService.addPassword(slug, encryptedPassword, password);
        this.toastService.showToast('Unlocked');
        this.selectedNotesTabIndex = this.parseFragmentIndex(this.route.snapshot.fragment);
        this.refreshNoteData();
      });
  }

  noteCollectionEvent(action: NoteCollectionAction): void {
    switch (action) {
      case 'SET_PASSWORD':
        this.showSetNewPasswordDialog();
        return;
      case 'UNLOCK':
        this.showValidatePasswordDialog();
        return;
      case 'LOGOUT':
        this.logoutFromCurrentNote();
        return;
      case 'TOGGLE_MENU_LEFT':
        this.menuEvent('TOGGLE_MENU_LEFT');
        return;
      case 'DOWNLOAD_CURRENT_TAB':
        if (this.selectedNote) {
          this.downloadNoteTab(this.selectedNote);
        }
        return;
      case 'DELETE_NOTE':
        this.deleteNote(this.selectedNote);
        return;
    }
  }

  setNotePassword(password: string, isPrivate: boolean): void {
    const slug = this.getCurrentNoteSlug();
    const encryptedPassword = Utils.noteEncrypt(slug, `/${slug}`, password);
    const request = new NoteCreateRequestModel();
    request.name = slug;
    request.password = encryptedPassword;
    request.type = isPrivate ? 'Private' : 'Protected';

    if (request.type !== 'Private') {
      this.makeNotePrivateAndSave(slug, request, encryptedPassword, password);
      return;
    }

    const ids = this.getMissingContentTabIds();
    if (ids.length === 0) {
      this.makeNotePrivateAndSave(slug, request, encryptedPassword, password);
      return;
    }

    this.noteService.fetchNoteTabs(slug, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response.code !== 1 || !this.response) {
          return;
        }

        this.response.content.forEach((item) => {
          if (!item.id || !ids.includes(item.id)) {
            return;
          }

          const matchedTab = response.content.find((tab) => tab.id === item.id);
          if (matchedTab) {
            item.content = matchedTab.content;
          }
        });

        this.makeNotePrivateAndSave(slug, request, encryptedPassword, password);
      });
  }

  updateNotePassword(password: string): void {
    if (!this.response) {
      return;
    }

    const slug = this.getCurrentNoteSlug();
    const encryptedPassword = Utils.noteEncrypt(slug, `/${slug}`, password);
    const request = new NoteCreateRequestWithTabsModel();
    request.name = slug;
    request.password = encryptedPassword;
    request.type = this.response.info.type;
    request.items = [];

    const token = this.noteService.getApiToken(slug);
    if (request.type !== 'Private') {
      this.saveUpdatedNotePassword(slug, request, encryptedPassword, password, token);
      return;
    }

    const ids = this.response.content.filter((item) => item.id).map((item) => item.id);
    if (ids.length === 0) {
      this.saveUpdatedNotePassword(slug, request, encryptedPassword, password, token);
      return;
    }

    this.noteService.fetchNoteTabs(slug, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response.code !== 1 || !this.response) {
          return;
        }

        const tempContent: NoteTabUiModel[] = JSON.parse(JSON.stringify(this.response.content));
        tempContent.forEach((item) => {
          const matchedTab = response.content.find((tab) => tab.id === item.id);
          if (matchedTab) {
            item.content = matchedTab.content;
          }
        });

        request.items = tempContent.map((item) => {
          item.content = Utils.noteEncrypt(
            item.slug,
            Utils.noteDecrypt(item.slug, item.content),
            request.password
          );
          item.title = Utils.noteEncrypt(item.slug, item.title, request.password);
          return item;
        });

        this.saveUpdatedNotePassword(slug, request, encryptedPassword, password, token);
      });
  }

  menuEvent(action: MenuAction): void {
    switch (action) {
      case 'OPEN_MENU_LEFT':
        this.menuLeftVisible = true;
        this.filteredNoteCollection = [...this.noteCollection];
        this.focusSearchInput();
        return;
      case 'CLOSE_MENU_LEFT':
        this.menuLeftVisible = false;
        return;
      case 'TOGGLE_MENU_LEFT':
        this.menuLeftVisible = !this.menuLeftVisible;
        if (this.menuLeftVisible) {
          this.filteredNoteCollection = [...this.noteCollection];
          this.focusSearchInput();
        }
    }
  }

  showDeleteConfirmationTab(tab: NoteTabUiModel): void {
    if (this.noteCollectionComponent?.isNoteLocked() && !this.noteCollectionComponent.isNoteAuthorized()) {
      this.toastService.showToast('Unlock note and try again.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponentComponent, {
      data: {
        Title: 'Delete?',
        Message: 'Are you sure you want to delete tab?'
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.deleteTab(tab);
        }
      });
  }

  deleteTab(tab: NoteTabUiModel): void {
    if (!tab.id) {
      this.removeNoteTabFromCollection(tab);
      return;
    }

    this.noteService.deleteNoteTab(tab.slug, tab.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.code === 1) {
            this.removeNoteTabFromCollection(tab);
            return;
          }

          this.toastService.showToast('Unable to delete tab');
        }
      });
  }

  deleteNote(tab: NoteTabUiModel | null): void {
    if (!tab) {
      this.toastService.showToast('Something went wrong.Try again after some time');
      return;
    }

    this.noteService.deleteNote(tab.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.code === 1) {
            this.refreshNoteData();
            return;
          }

          this.toastService.showToast('Unable to delete note.');
        }
      });
  }

  drop(event: CdkDragDrop<NoteTabUiModel[]>): void {
    moveItemInArray(this.filteredNoteCollection, event.previousIndex, event.currentIndex);
    this.noteCollection.forEach((note, index) => {
      note.order_index = index + 1;
      note.modifiedOrder = true;
    });
  }

  showSetNewPasswordDialog(): void {
    const dialogRef = this.dialog.open(CreatePasswordDialogComponentComponent, {
      data: {},
      width: '400px'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.setNotePassword(result.password, result.isPrivate);
        }
      });
  }

  showValidatePasswordDialog(): void {
    this.authDialogRef = this.dialog.open(AuthDialogComponentComponent, {
      data: {
        onChange: this.authenticatUserWithModel.bind(this)
      },
      width: '400px'
    });
  }

  authenticatUserWithModel(pass: string): void {
    this.validatePassword(pass);
  }

  search(val: string): void {
    const searchTerm = val.toLowerCase();
    this.filteredNoteCollection = this.noteCollection.filter((note) => note.title.toLowerCase().includes(searchTerm));
  }

  downloadNoteTab(tabData: NoteTabUiModel): void {
    const tabBlob = new Blob([tabData.content], { type: 'text/plain' });
    const anchor = document.createElement('a');
    const url = window.URL.createObjectURL(tabBlob);
    anchor.href = url;
    anchor.download = `${tabData.title}.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  updateSelectedNote(note: NoteTabUiModel): void {
    this.selectedNote = note;
    this.selectedNote.visibility = 1;
    this.selectedNote.modifiedVisibility = true;
    this.noteService.updateNoteTab(this.selectedNote.slug, this.selectedNote)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.noteCollectionComponent?.onChangeSelectedNote(note, true);
      });
  }

  private handleFetchedNote(response: NoteResponseModel): void {
    this.response = response;
    this.noteService.setActiveNote(response);
    this.noteCollection = response.content;
    this.filteredNoteCollection = [...response.content];
    this.syncSelectedNoteWithResponse();
  }

  private handleRefreshError(error: HttpErrorResponse, slug: string): void {
    if (error.status === 404) {
      const request = new NoteCreateRequestModel();
      request.name = slug;
      request.type = 'Public';
      request.password = '';

      this.noteService.createNewNote(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.refreshNoteData());
      return;
    }

    if (error.status === 401) {
      this.showValidatePasswordDialog();
    }
  }

  private syncSelectedNoteWithResponse(): void {
    if (!this.noteCollection.length) {
      this.selectedNote = null;
      return;
    }

    if (this.selectedNotesTabIndex > 0) {
      this.selectedNote = this.findVisibleTabByIndex(this.selectedNotesTabIndex) ?? this.noteCollection[0];
      this.selectedNotesTabIndex = -1;
      return;
    }

    if (!this.selectedNote) {
      this.selectedNote = this.noteCollection[0];
      return;
    }

    const visibleNotes = this.noteCollection.filter((item) => item.visibility === 1);
    const existingSelection = visibleNotes.find((item) => item.id === this.selectedNote?.id && item.slug === this.selectedNote.slug);
    this.selectedNote = existingSelection ?? visibleNotes[0] ?? this.noteCollection[0];
  }

  private findVisibleTabByIndex(index: number): NoteTabUiModel | undefined {
    let visibleCount = 0;
    for (const tab of this.noteCollection) {
      if (tab.visibility === 1) {
        visibleCount++;
      }

      if (visibleCount === index) {
        return tab;
      }
    }

    return undefined;
  }

  private logoutFromCurrentNote(): void {
    const hasPendingNotes = this.noteCollectionComponent?.hasUnsavedNotes() ?? false;
    if (hasPendingNotes && !confirm('Changes you made will not be saved.\nDo you still want to lock the notes?')) {
      return;
    }

    this.noteService.removePassword(this.getCurrentNoteSlug());
    if (this.response?.info.type === 'Private' || hasPendingNotes) {
      this.noteCollection = [];
      this.filteredNoteCollection = [];
      this.response = null;
      this.selectedNote = null;
      this.refreshNoteData();
    }

    this.toastService.showToast('Locked');
  }

  private getMissingContentTabIds(): string[] {
    return (this.response?.content ?? [])
      .filter((item) => item.id && !item.content)
      .map((item) => item.id);
  }

  private saveUpdatedNotePassword(
    slug: string,
    request: NoteCreateRequestWithTabsModel,
    encryptedPassword: string,
    password: string,
    token: string
  ): void {
    this.noteService.updateNotePassword(slug, token, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response.code === 1) {
          this.noteService.addPassword(slug, encryptedPassword, password);
          if (this.response) {
            this.response.info.type = request.type;
          }
          this.toastService.showToast('Updated Password');
          return;
        }

        this.toastService.showToast('Unable to update note');
      });
  }

  private makeNotePrivateAndSave(
    slug: string,
    request: NoteCreateRequestModel,
    encryptedPassword: string,
    password: string
  ): void {
    this.noteService.updateNote(slug, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        if (response.code !== 1) {
          this.toastService.showToast('Unable to create note');
          return;
        }

        this.noteService.addPassword(slug, encryptedPassword, password);
        if (this.response) {
          this.response.info.type = request.type;
        }

        if (request.type === 'Private') {
          this.noteCollection.forEach((tab) => {
            tab.modifiedContent = true;
            tab.modifiedTitle = true;
          });
          this.noteCollectionComponent?.saveNotes();
        }
      });
  }

  private removeNoteTabFromCollection(tab: NoteTabUiModel): void {
    const index = this.noteCollection.indexOf(tab);
    if (index >= 0) {
      this.noteCollection.splice(index, 1);
    }

    this.filteredNoteCollection = this.filteredNoteCollection.filter((item) => item !== tab);
    if (!this.noteCollection.some((note) => note.visibility === 1)) {
      this.noteCollectionComponent?.addNewNoteTab();
    }

    this.toastService.showToast('Deleted tabs');
  }

  private resolveCurrentNoteSlug(): string {
    const routeSlug = this.route.snapshot.paramMap.get('slug') ?? this.route.snapshot.url[0]?.path ?? '';
    return routeSlug.toLowerCase();
  }

  private parseFragmentIndex(fragment: string | null): number {
    if (!fragment) {
      return 0;
    }

    const parsedIndex = Number.parseInt(fragment, 10);
    return Number.isNaN(parsedIndex) || parsedIndex < 1 ? 0 : parsedIndex;
  }

  private focusSearchInput(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }
}
