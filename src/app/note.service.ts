import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NoteCreateRequestModel, NoteCreateRequestWithTabsModel } from './model/note-create-request-model';
import { NoteTabCreateRequestModel } from './model/note-tab-create-request-model';
import { NoteResponseModel, SingleNoteResponseModel } from './model/note-response-model';
import Utils from './Util';
import { NoteItemsTemplate } from './model/note-items-template';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private baseUrl = environment.apiEndpoint;

  private rxNotePasswordChanged: BehaviorSubject<any>;
  private rxNoteGeneralSetting: BehaviorSubject<any>;
  private rxNoteActive: BehaviorSubject<NoteResponseModel>;

  constructor(private http: HttpClient) {
    this.rxNotePasswordChanged = new BehaviorSubject(null);
    this.rxNoteActive = new BehaviorSubject(null);
    this.rxNoteGeneralSetting = new BehaviorSubject(this.getGeneralSetting());
  }

  addPassword(slug: string, encToken: string, vanilaPass: string): boolean {
    // TODO : Encrypt password if required
    localStorage.setItem(slug, encToken);
    // const normalPassword = Utils.normalizeKey(vanilaPass);
    const normalPassword = Utils.normalizeKey(encToken);
    localStorage.setItem(slug + '_PASS', normalPassword);
    return true;
  }
  removePassword(slug: string): boolean {
    localStorage.removeItem(slug);
    localStorage.removeItem(slug + '_PASS');
    return true;
  }
  getPassword(slug: string): string {
    return localStorage.getItem(slug);
  }
  onPasswordUpdated(): Observable<string> {
    return this.rxNotePasswordChanged.asObservable();
  }
  updatePassword(password) {
    this.rxNotePasswordChanged.next(password);
  }


  authenticate(slug: string, password: string): Observable<NoteResponseModel> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': password })
    };
    return this.http.post<NoteResponseModel>(this.getAPIUrl('note/' + slug + '/auth'), {}, httpOptions)
  }

  addNoteToCache(slug: string){
    let noteCache = this.getNoteCache();

    const existingNote = noteCache.notes.find(item=>item.slug===slug);
    if(existingNote){
      existingNote.updatedAt = Date.now();
    }else{
      const newNote = {
        slug: slug,
        addedAt: Date.now(),
        updatedAt: Date.now()
      }
      noteCache.notes.push(newNote);
    }

    const sortedNotes = noteCache.notes.sort((a,b)=>{
      return b.updatedAt - a.updatedAt;
    });

    // Keep Max in Cache
    const maxInCache = 5;
    if(sortedNotes.length>maxInCache){
      for(let i=maxInCache;i<sortedNotes.length;i++){
       const remove = noteCache.notes.indexOf(sortedNotes[i]);
       noteCache.notes.splice(remove,1);
      }
    }

    localStorage.setItem('cacheNotes', JSON.stringify(noteCache));
  }

  getNoteCache(){
    let noteCacheString  = localStorage.getItem('cacheNotes');
    let noteCache = {
      notes:[],
    };
    if(noteCacheString){
      noteCache = JSON.parse(noteCacheString);
    }
    return noteCache;

  }


  fetchNote(slug: string): Observable<NoteResponseModel> {
    this.addNoteToCache(slug);
    let token = this.getApiToken(slug);;
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.get<NoteResponseModel>(this.getAPIUrl('note/' + slug), httpOptions)
  }

  fetchNoteTab(slug: string, tabid: any): Observable<SingleNoteResponseModel> {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.get<SingleNoteResponseModel>(this.getAPIUrl('note/' + slug + '/tab/' + tabid), httpOptions)
  }
  fetchNoteTabs(slug: string, ids: any[]): Observable<NoteResponseModel> {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    let strIds = ids.join(',');
    return this.http.get<NoteResponseModel>(this.getAPIUrl('note/' + slug + '/tabs?ids=' + strIds), httpOptions)
  }

  createNewNote(request: NoteCreateRequestModel): any {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    return this.http.post(this.getAPIUrl('note'), request, httpOptions)
  }

  createNewNoteTab(slug: string, request: NoteTabCreateRequestModel): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.post(this.getAPIUrl('note/' + slug + '/tab'), request, httpOptions)
  }

  createNewNoteTabs(slug: string, request: NoteItemsTemplate<NoteTabCreateRequestModel>): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.post(this.getAPIUrl('note/' + slug + '/tabs'), request, httpOptions)
  }

  updateNote(slug: string, request: NoteCreateRequestModel): any {
    let token = request.password;
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': token })
    };
    return this.http.patch(this.getAPIUrl('note/' + slug), request, httpOptions)
  }

  updateNotePassword(slug: string, token: string, request: NoteCreateRequestWithTabsModel): any {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': token })
    };
    return this.http.patch(this.getAPIUrl('note/' + slug), request, httpOptions)
  }

  updateNoteTab(slug: string, request: NoteTabCreateRequestModel): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.patch(this.getAPIUrl('note/' + slug + '/tab/' + request.id), request, httpOptions)
  }

  updateNoteTabs(slug: string, request: NoteItemsTemplate<NoteTabCreateRequestModel>): Observable<any> {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.patch(this.getAPIUrl('note/' + slug + '/tab'), request, httpOptions)
  }

  deleteNoteTab(slug: string, tabid: any): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token && token.length > 0) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.delete(this.getAPIUrl('note/' + slug + '/tab/' + tabid), httpOptions)
  }

  deleteNoteTabs(slug: string, tabid: any): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.delete(this.getAPIUrl('note/' + slug + '/tab/' + tabid), httpOptions)
  }

  deleteNote(slug: string): any {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.delete(this.getAPIUrl('note/' + slug), httpOptions)
  }


  getAPIUrl(path: string) {
    return this.baseUrl + path;
  }
  getApiToken(slug: string) {
    return this.getPassword(slug);
  }

  saveGeneralSetting(val: any) {
    localStorage.setItem("setting.general", JSON.stringify(val));
    this.rxNoteGeneralSetting.next(this.getGeneralSetting());
  }

  getGeneralSetting() {
    let defaultVal = {
      autoSave: true,
      showTitle: false,
      enableSpellCheck: false,
    };
    let obj = {};
    let currentVal = localStorage.getItem("setting.general");
    if (currentVal) {
      obj = JSON.parse(currentVal);
    }
    return Object.assign({}, defaultVal, obj);
  }

  onGeneralSettingUpdate(): Observable<any> {
    return this.rxNoteGeneralSetting.asObservable();
  }

  setActiveNote(note: NoteResponseModel) {
    this.rxNoteActive.next(note);
  }

  onActiveNoteChange(): Observable<NoteResponseModel> {
    return this.rxNoteActive.asObservable();
  }

}
