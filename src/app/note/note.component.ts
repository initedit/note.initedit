import { Component, OnInit, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { NoteService } from '../note.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NoteCreateRequestModel } from '../model/note-create-request-model';
import { HttpErrorResponse } from '@angular/common/http';
import { NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { ToastService } from '../toast.service';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteTabCreateRequestModel } from '../model/note-tab-create-request-model';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.css']
})
export class NoteComponent implements OnInit, AfterViewInit {
  response: NoteResponseModel;
  noteCollection: NoteTabUiModel[];
  filteredNoteCollection: NoteTabUiModel[];
  showAuthModel: boolean = false;
  menuLeftVisible: boolean = false;
  selectedNote: NoteTabUiModel;
  selectedNotesTabIndex: number = 0;

  @ViewChild('myNewPassword')
  inputNewPasswordEL: ElementRef

  @ViewChild('myPassword')
  inputPasswordEL: ElementRef

  constructor(private noteService: NoteService, private router: Router, private toastService: ToastService, private route: ActivatedRoute) {
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
  }
  ngAfterViewInit() {

  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {

    const keyLetter = e.key.toLowerCase();
    if (keyLetter === 'escape') {
      this.showAuthModel = false;
      this.showCreatePassword = false;
      this.menuEvent('CLOSE_MENU_LEFT');
    }
  }

  refreshNoteData() {
    const slug = this.getCurrentNoteSlug();
    var objResponse = this.noteService.fetchNote(slug)
      .subscribe((response: NoteResponseModel) => {
        this.response = response;
        this.noteCollection = response.content;
        if (this.selectedNotesTabIndex >= 0 && this.noteCollection.length >= this.selectedNotesTabIndex) {
          let visibleCount = 0;
          this.noteCollection.forEach((tab: NoteTabUiModel) => {
            if (tab.visibility == 1) {
              visibleCount++;
            }
            if (visibleCount == this.selectedNotesTabIndex) {
              this.selectedNote = tab;
            }
          });
          if (!this.selectedNote && this.noteCollection.length > 0) {
            this.selectedNote = this.noteCollection[0];
          }
          this.selectedNotesTabIndex = -1;
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
          //valid password
          this.noteService.addPassword(slug, encPassword, password);
          this.showAuthModel = false;
          this.toastService.showToast('Unlocked');
          this.refreshNoteData();
        } else {
          this.toastService.showToast('Invalid Password')
        }
      })
  }
  showCreatePassword: boolean;
  noteCollectionEvent($event: any) {
    if ($event == 'SET_PASSWORD') {
      //this.showCreatePassword=true;
      this.showSetNewPasswordDialog();
    } else if ($event == 'UNLOCK') {
      this.showValidatePasswordDialog();
    } else if ($event == 'LOGOUT') {
      this.noteService.removePassword(this.getCurrentNoteSlug());
      if (this.response.info.type == 'Private') {
        this.noteCollection = [];
        this.response = null;
        this.refreshNoteData();
      }
      this.toastService.showToast('Locked');
    } else if ($event == 'TOGGLE_MENU_LEFT') {
      this.menuEvent("TOGGLE_MENU_LEFT");
    } else if ($event == 'DOWNLOAD_CURRENT_TAB') {
      this.downloadNoteTab(this.selectedNote);
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

  private makeNotePrivateAndSave(slug: string, request: NoteCreateRequestModel, encPassword: any, password: string) {
    this.noteService.updateNote(slug, request)
      .subscribe((response: NoteResponseModel) => {
        if (response.code == 1) {
          this.noteService.addPassword(slug, encPassword, password);
          this.showCreatePassword = false;
          this.response.info.type = request.type;
          if (request.type == 'Private') {
            this.noteCollection.forEach((tab: NoteTabUiModel) => {
              tab.modifiedContent = true;
              tab.modifiedTitle = true;
            });
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
    } else if ($event == 'CLOSE_MENU_LEFT') {
      this.menuLeftVisible = false;
    } else if ($event == 'TOGGLE_MENU_LEFT') {
      this.menuLeftVisible = !this.menuLeftVisible;
      if (this.menuLeftVisible) {
        this.filteredNoteCollection = this.noteCollection;
      }
    }
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
        },err=>{
          //Handle Authorization Rejection
        });
    } else {
      this.removeNoteTabFromCollection(tab);
    }
  }
  removeNoteTabFromCollection(tab: NoteTabUiModel) {
    let index = this.noteCollection.indexOf(tab);
    this.noteCollection.splice(index, 1);
    this.toastService.showToast('Deleted tabs');
  }

  sortableOption = {
    onUpdate: (event: any) => {
      this.noteCollection.forEach((note: NoteTabUiModel, index: number) => {
        note.order_index = (index + 1);
        note.modifiedOrder = true;
      })
    }
  }

  showSetNewPasswordDialog() {
    this.showCreatePassword = true;
    setTimeout(() => {
      (this.inputNewPasswordEL.nativeElement as HTMLInputElement).focus();
    }, 50);
  }
  showValidatePasswordDialog() {
    this.showAuthModel = true;
    setTimeout(() => {
      (this.inputPasswordEL.nativeElement as HTMLInputElement).focus();
    }, 50);
  }
  onSwipeLeft(e: any) {
    this.menuEvent('CLOSE_MENU_LEFT');
  }
  onSwipeRight(e: any) {
    this.menuEvent('OPEN_MENU_LEFT');
  }


  search(val: string) {
    this.filteredNoteCollection = [];
    this.noteCollection.forEach(n => {
      if (n.title.toLowerCase().indexOf(val.toLowerCase()) !== -1) {
        this.filteredNoteCollection.push(n);
      }
    });
  }

  downloadNoteTab(tabData:NoteTabUiModel) {

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
}
