import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NoteCreateRequestModel } from './model/note-create-request-model';
import { NoteTabCreateRequestModel } from './model/note-tab-create-request-model';
import { NoteResponseModel } from './model/note-response-model';
import Utils from './Util';
import { NoteItemsTemplate } from './model/note-items-template';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  // private baseUrl = 'https://api.note.initedit.com/public/api/';
  private baseUrl = 'http://localhost:8000/api/';

  constructor(private http: HttpClient) { }

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


  authenticate(slug: string, password: string): Observable<NoteResponseModel> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': password })
    };
    return this.http.post<NoteResponseModel>(this.getAPIUrl('note/' + slug + '/auth'), {}, httpOptions)
  }
  fetchNote(slug: string): Observable<NoteResponseModel> {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.get<NoteResponseModel>(this.getAPIUrl('note/' + slug), httpOptions)
  }

  fetchNoteTab(slug: string, tabid: any): Observable<NoteResponseModel> {
    let token = this.getApiToken(slug);
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };
    if (token) {
      httpOptions.headers = httpOptions.headers.append('token', token);
    }
    return this.http.get<NoteResponseModel>(this.getAPIUrl('note/' + slug + '/tab/' + tabid), httpOptions)
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

  updateNoteTabs(slug: string, request: NoteTabCreateRequestModel[]): any {
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
}
