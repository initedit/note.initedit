import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { NoteService } from '../note.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NoteCreateRequestModel, NoteCreateRequestWithTabsModel } from '../model/note-create-request-model';
import { HttpErrorResponse } from '@angular/common/http';
import { NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { ToastService } from '../toast.service';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteCollectionComponent } from '../note-collection/note-collection.component';
import { ConfirmDialogComponentComponent } from '../shared/confirm-dialog-component/confirm-dialog-component.component';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Observable, of } from 'rxjs';
import { AuthDialogComponentComponent } from '../shared/auth-dialog-component/auth-dialog-component.component';
import { CreatePasswordDialogComponentComponent } from '../shared/create-password-dialog-component/create-password-dialog-component.component';
import { finalize } from 'rxjs/operators';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.css']
})
export class NoteComponent implements OnInit {
  response: NoteResponseModel;
  noteCollection: NoteTabUiModel[];
  filteredNoteCollection: NoteTabUiModel[];
  menuLeftVisible: boolean = false;
  selectedNote: NoteTabUiModel;
  selectedNotesTabIndex: number = 0;
  authModel: any;

  @ViewChild(NoteCollectionComponent)
  noteCollectionComponent: NoteCollectionComponent

  @ViewChild("searchInput")
  searchInput: ElementRef<HTMLInputElement>

  isFetchingNoteList: boolean = false


  constructor(private noteService: NoteService, private router: Router, private toastService: ToastService, private route: ActivatedRoute, public dialog: MatDialog) {
    const fragment: string = route.snapshot.fragment;
    try {
      let i = parseInt(fragment);
      if (i > 0) {
        this.selectedNotesTabIndex = i;
      }
    } catch (ex) {

    }

  }

  ngOnInit() {
    this.refreshNoteData();
    this.noteService.onPasswordUpdated().subscribe(value => {
      if (value != null) {
        this.updateNotePassword(value)
      }
    })
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.noteCollectionComponent.hasUnsavedNotes()) {
      const result = window.confirm('Changes you made may not be saved.');
      return of(result);
    }
    return true;
  }
  @HostListener('window:beforeunload', ['$event'])
  showLeaveMessage($event: BeforeUnloadEvent) {
    if (this.noteCollectionComponent.hasUnsavedNotes()) {
      var confirmationMessage = "\o/";
      $event.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
      return confirmationMessage;              // Gecko, WebKit, Chrome <34
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {

    const keyLetter = e.key.toLowerCase();
    if (keyLetter === 'escape') {
      this.menuEvent('CLOSE_MENU_LEFT');
    }
  }

  refreshNoteData() {
    const slug = this.getCurrentNoteSlug();
    this.isFetchingNoteList = true;
    var objResponse = this.noteService.fetchNote(slug).pipe(
      finalize(() => {
        this.isFetchingNoteList = false;
      })
    )
      .subscribe((response: NoteResponseModel) => {
        this.response = response;
        this.noteService.setActiveNote(this.response);
        this.noteCollection = response.content;
        if (this.selectedNotesTabIndex >= 0 && this.noteCollection.length >= this.selectedNotesTabIndex) {
          let visibleCount = 0;
          this.noteCollection.every((tab: NoteTabUiModel) => {
            if (tab.visibility == 1) {
              visibleCount++;
            }
            if (visibleCount == this.selectedNotesTabIndex) {
              this.selectedNote = tab;
              return false;
            }
            return true;
          });
          if (!this.selectedNote && this.noteCollection.length > 0) {
            this.selectedNote = this.noteCollection[0];
          }
          this.selectedNotesTabIndex = -1;
        } else
          if (this.selectedNote) {
            const visibleNotes = this.noteCollection.filter(item => item.visibility == 1);
            let selectedNote = visibleNotes.filter(item => {
              return item.id == this.selectedNote.id && item.slug == this.selectedNote.slug
            });
            if (selectedNote.length > 0) {
              this.selectedNote = selectedNote.pop();
            } else if (visibleNotes.length > 0) {
              this.selectedNote = visibleNotes[0];
            }
          }
      },
        (error: HttpErrorResponse) => {
          let objError = error.error;
          if (error.status == 404) {
            //Note not found & available for creating new
            let request = new NoteCreateRequestModel();
            request.name = this.getCurrentNoteSlug();
            request.type = 'Public';
            request.password = '';
            this.noteService.createNewNote(request)
              .subscribe(sucess => {
                this.refreshNoteData();
              },
                (error: HttpErrorResponse) => {
                });
          } else if (error.status == 401) {
            // Authorization Failed
            this.showValidatePasswordDialog();
          }
        });
  }

  getCurrentNoteSlug() {
    return this.route.snapshot.url[0].path.toLowerCase();
  }
  validatePassword(password: string) {
    let slug = this.getCurrentNoteSlug();
    let encPassword = Utils.noteEncrypt(slug, '/' + slug, password);
    this.noteService.authenticate(slug, encPassword)
      .subscribe((response: NoteResponseModel) => {
        if (response.code == 1) {
          if (this.authModel) {
            this.authModel.close();
          }
          //valid password
          this.noteService.addPassword(slug, encPassword, password);
          this.toastService.showToast('Unlocked');
          const fragment: string = this.route.snapshot.fragment;
          try {
            let i = parseInt(fragment);
            if (i > 0) {
              this.selectedNotesTabIndex = i;
            }
          } catch (ex) {

          }
          this.refreshNoteData();
        } else {
          this.toastService.showToast('Invalid Password')
        }
      })
  }

  noteCollectionEvent($event: any) {
    if ($event == 'SET_PASSWORD') {
      this.showSetNewPasswordDialog();
    } else if ($event == 'UNLOCK') {
      this.showValidatePasswordDialog();
    } else if ($event == 'LOGOUT') {
      let hasPendingNotes = this.noteCollectionComponent.hasUnsavedNotes();
      if (hasPendingNotes) {
        if (confirm("Changes you made will not be saved.\nDo you still want to lock the notes?") == false) {
          return;
        }
      }

      this.noteService.removePassword(this.getCurrentNoteSlug());
      if (this.response.info.type == 'Private' || hasPendingNotes) {
        this.noteCollection = [];
        this.response = null;
        this.refreshNoteData();
      }
      this.toastService.showToast('Locked');
    } else if ($event == 'TOGGLE_MENU_LEFT') {
      this.menuEvent("TOGGLE_MENU_LEFT");
    } else if ($event == 'DOWNLOAD_CURRENT_TAB') {
      this.downloadNoteTab(this.selectedNote);
    } else if ($event == 'DELETE_NOTE') {
      this.deleteNote(this.selectedNote);
    }
  }
  setNotePassword(password: string, isPrivate: boolean) {
    let slug = this.getCurrentNoteSlug();
    let encPassword = Utils.noteEncrypt(slug, '/' + slug, password);
    let request = new NoteCreateRequestModel();
    request.name = slug;
    request.password = encPassword;
    request.type = isPrivate ? 'Private' : 'Protected';

    //if request is private then fetch all tabs content first
    if (request.type == 'Private') {
      let ids = new Array<string>();
      this.response.content.forEach((item: NoteTabUiModel) => {
        if (item.id && !item.content) {
          ids.push(item.id);
        }
      });
      if (ids.length > 0) {
        this.noteService.fetchNoteTabs(slug, ids)
          .subscribe((response: NoteResponseModel) => {
            if (response.code == 1) {
              let collection = response.content;
              this.response.content.forEach((item: NoteTabUiModel) => {
                if (ids.indexOf(item.id) >= 0) {
                  let encContent = collection.filter((tab: NoteTabUiModel) => {
                    return tab.id == item.id
                  })[0].content;
                  item.content = encContent;

                }
              });
              this.makeNotePrivateAndSave(slug, request, encPassword, password);
            }
          });
      } else {
        this.makeNotePrivateAndSave(slug, request, encPassword, password);
      }

    } else {
      this.makeNotePrivateAndSave(slug, request, encPassword, password);
    }
  }

  updateNotePassword(password: string) {
    let slug = this.getCurrentNoteSlug();
    let encPassword = Utils.noteEncrypt(slug, '/' + slug, password);
    let request = new NoteCreateRequestWithTabsModel;
    request.name = slug;
    request.password = encPassword;
    request.type = this.response.info.type;
    request.items = [];

    let token = this.noteService.getApiToken(slug);
    console.log(this.response, 'Info');
    //if request is private then fetch all tabs content first
    if (request.type == 'Private') {
      let ids = new Array<string>();
      this.response.content.forEach((item: NoteTabUiModel) => {
        if (item.id) {
          ids.push(item.id);
        }
      });

      if (ids.length > 0) {
        this.noteService.fetchNoteTabs(slug, ids)
          .subscribe((response: NoteResponseModel) => {
            if (response.code == 1) {
              let collection = response.content;
              let tempContent: NoteTabUiModel[] = JSON.parse(JSON.stringify(this.response.content));

              tempContent.forEach((item: NoteTabUiModel) => {
                if (ids.indexOf(item.id) >= 0) {
                  let encContent = collection.filter((tab: NoteTabUiModel) => {
                    return tab.id == item.id
                  })[0].content;
                  item.content = encContent;
                }
              });

              let encryptedContent: NoteTabUiModel[] = tempContent.map(item => {
                //First Descrypt Note
                item.content = Utils.noteDecrypt(item.slug, item.content)
                // //Encrypt with new password
                item.content = Utils.noteEncrypt(item.slug, item.content, request.password)
                item.title = Utils.noteEncrypt(item.slug, item.title, request.password)

                return item;
              })
              //TODO:: Decrypt/Encrypt Notes Content
              request.items = encryptedContent;
              this.saveUpdatedNotePassword(slug, request, encPassword, password, token);
            }
          });
      } else {
        this.saveUpdatedNotePassword(slug, request, encPassword, password, token);
      }

    } else {
      this.saveUpdatedNotePassword(slug, request, encPassword, password, token);
    }
  }

  private saveUpdatedNotePassword(slug: string, request: NoteCreateRequestWithTabsModel, encPassword: any, password: string, token: string) {

    this.noteService.updateNotePassword(slug, token, request)
      .subscribe((response: NoteResponseModel) => {
        if (response.code == 1) {
          this.noteService.addPassword(slug, encPassword, password);
          this.response.info.type = request.type;
          this.toastService.showToast("Updated Password")

        }
        else {
          this.toastService.showToast('Unable to update note');
        }
      });
  }

  private makeNotePrivateAndSave(slug: string, request: NoteCreateRequestModel, encPassword: any, password: string) {
    this.noteService.updateNote(slug, request)
      .subscribe((response: NoteResponseModel) => {
        if (response.code == 1) {
          this.noteService.addPassword(slug, encPassword, password);
          this.response.info.type = request.type;
          if (request.type == 'Private') {
            this.noteCollection.forEach((tab: NoteTabUiModel) => {
              tab.modifiedContent = true;
              tab.modifiedTitle = true;
            });
            this.noteCollectionComponent.saveNotes();
          }
        }
        else {
          this.toastService.showToast('Unable to create note');
        }
      });
  }

  menuEvent($event: any) {
    if ($event == 'OPEN_MENU_LEFT') {
      this.filteredNoteCollection = this.noteCollection;
      this.menuLeftVisible = true;
      (this.searchInput.nativeElement as HTMLInputElement).focus()
    } else if ($event == 'CLOSE_MENU_LEFT') {
      this.menuLeftVisible = false;
    } else if ($event == 'TOGGLE_MENU_LEFT') {
      this.menuLeftVisible = !this.menuLeftVisible;
      if (this.menuLeftVisible) {
        (this.searchInput.nativeElement as HTMLInputElement).focus()
        this.filteredNoteCollection = this.noteCollection;
      }
    }
  }
  showDeleteConfirmationTab(tab: NoteTabUiModel) {
    if (this.noteCollectionComponent.isNoteLocked() &&
      this.noteCollectionComponent.isNoteAuthorized() == false) {
      this.toastService.showToast('Unlock note and try again.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponentComponent, {
      data: {
        Title: "Delete?",
        Message: "Are you sure you want to delete tab?"
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteTab(tab)
      }
    });
  }
  deleteTab(tab: NoteTabUiModel) {
    if (tab.id) {
      this.noteService.deleteNoteTab(tab.slug, tab.id)
        .subscribe((response: NoteResponseModel) => {
          if (response.code == 1) {
            this.removeNoteTabFromCollection(tab);
          } else {
            this.toastService.showToast('Unable to delete tab');
          }
        }, err => {
          //Handle Authorization Rejection
        });
    } else {
      this.removeNoteTabFromCollection(tab);
    }
  }
  deleteNote(tab: NoteTabUiModel) {
    if (tab) {
      this.noteService.deleteNote(tab.slug)
        .subscribe((response: NoteResponseModel) => {
          if (response.code == 1) {
            this.refreshNoteData()
          } else {
            this.toastService.showToast('Unable to delete note.');
          }
        }, err => {
          //Handle Authorization Rejection
        });
    } else {
      this.toastService.showToast('Something went wrong.Try again after some time');
    }
  }
  removeNoteTabFromCollection(tab: NoteTabUiModel) {
    let index = this.noteCollection.indexOf(tab);
    this.noteCollection.splice(index, 1);
    if (this.noteCollection.filter(n => n.visibility).length == 0) {
      this.noteCollectionComponent.addNewNoteTab()
    }
    this.toastService.showToast('Deleted tabs');
  }

  // sortableOption: SortableData = {
  //   onUpdate: (event: any) => {
  //     this.noteCollection.forEach((note: NoteTabUiModel, index: number) => {
  //       note.order_index = (index + 1);
  //       note.modifiedOrder = true;
  //     })
  //   },
  //   handle: ".sort-handle"
  // }

  drop(event: CdkDragDrop<NoteTabUiModel[]>) {
    moveItemInArray(this.filteredNoteCollection, event.previousIndex, event.currentIndex);
  }

  showSetNewPasswordDialog() {
    let dialogRef = this.dialog.open(CreatePasswordDialogComponentComponent, {
      data: {},
      width: "400px",
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.setNotePassword(result.password, result.isPrivate);
      }
    })
  }
  showValidatePasswordDialog() {
    this.authModel = this.dialog.open(AuthDialogComponentComponent, {
      data: {
        onChange: this.authenticatUserWithModel.bind(this)
      },
      width: "400px",
    });

  }

  authenticatUserWithModel(pass) {
    console.log(pass);
    this.validatePassword(pass);
  }



  search(val: string) {
    this.filteredNoteCollection = [];
    this.noteCollection.forEach(n => {
      if (n.title.toLowerCase().indexOf(val.toLowerCase()) !== -1) {
        this.filteredNoteCollection.push(n);
      }
    });
  }

  downloadNoteTab(tabData: NoteTabUiModel) {

    const tabBlog = new Blob([tabData.content], {
      type: 'text/plain'
    });
    const a = document.createElement('a');
    const url = window.URL.createObjectURL(tabBlog);
    a.href = url;
    a.download = tabData.title + ".txt";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  updateSelectedNote(note: NoteTabUiModel) {
    this.selectedNote = note;
    this.selectedNote.visibility = 1;
    this.noteService.updateNoteTab(this.selectedNote.slug, this.selectedNote)
    this.noteCollectionComponent.onChangeSelectedNote(note, true)
  }

}
