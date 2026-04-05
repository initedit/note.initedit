import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NoteCreateRequestModel, NoteCreateRequestWithTabsModel } from './model/note-create-request-model';
import { NoteTabCreateRequestModel } from './model/note-tab-create-request-model';
import { NoteResponseModel, SingleNoteResponseModel } from './model/note-response-model';
import Utils from './Util';
import { NoteItemsTemplate } from './model/note-items-template';
import { environment } from 'src/environments/environment';
import { DEFAULT_NOTE_GENERAL_SETTING, NoteGeneralSetting } from './model/note-general-setting.model';
import { NoteCacheEntry, NoteCacheModel } from './model/note-cache.model';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private static readonly NOTE_CACHE_KEY = 'cacheNotes';
  private static readonly GENERAL_SETTING_KEY = 'setting.general';
  private static readonly PASSWORD_SUFFIX = '_PASS';
  private static readonly MAX_CACHE_NOTES = 5;

  private baseUrl = environment.apiEndpoint;

  private readonly rxNotePasswordChanged = new BehaviorSubject<string | null>(null);
  private readonly rxNoteGeneralSetting = new BehaviorSubject<NoteGeneralSetting>(this.getGeneralSetting());
  private readonly rxNoteActive = new BehaviorSubject<NoteResponseModel | null>(null);

  constructor(private http: HttpClient) {
  }

  addPassword(slug: string, encToken: string, vanilaPass: string): boolean {
    // TODO : Encrypt password if required
    localStorage.setItem(slug, encToken);
    // const normalPassword = Utils.normalizeKey(vanilaPass);
    const normalPassword = Utils.normalizeKey(encToken);
    localStorage.setItem(this.getPasswordStorageKey(slug), normalPassword);
    return true;
  }

  removePassword(slug: string): boolean {
    localStorage.removeItem(slug);
    localStorage.removeItem(this.getPasswordStorageKey(slug));
    return true;
  }

  getPassword(slug: string): string {
    return localStorage.getItem(slug) ?? '';
  }

  onPasswordUpdated(): Observable<string> {
    return this.rxNotePasswordChanged.asObservable();
  }

  updatePassword(password: string): void {
    this.rxNotePasswordChanged.next(password);
  }

  authenticate(slug: string, password: string): Observable<NoteResponseModel> {
    return this.http.post<NoteResponseModel>(
      this.getAPIUrl(`note/${slug}/auth`),
      {},
      this.getJsonHttpOptions(password)
    );
  }

  addNoteToCache(slug: string): void {
    const noteCache = this.getNoteCache();

    const existingNote = noteCache.notes.find((item) => item.slug === slug);
    if (existingNote) {
      existingNote.updatedAt = Date.now();
    } else {
      const newNote: NoteCacheEntry = {
        slug,
        addedAt: Date.now(),
        updatedAt: Date.now()
      };
      noteCache.notes.push(newNote);
    }

    const sortedNotes = noteCache.notes.sort((a, b) => {
      return b.updatedAt - a.updatedAt;
    });

    // Keep Max in Cache
    if (sortedNotes.length > NoteService.MAX_CACHE_NOTES) {
      for (let i = NoteService.MAX_CACHE_NOTES; i < sortedNotes.length; i++) {
        const remove = noteCache.notes.indexOf(sortedNotes[i]);
        noteCache.notes.splice(remove, 1);
      }
    }

    localStorage.setItem(NoteService.NOTE_CACHE_KEY, JSON.stringify(noteCache));
  }

  getNoteCache(): NoteCacheModel {
    const noteCacheString = localStorage.getItem(NoteService.NOTE_CACHE_KEY);
    let noteCache: NoteCacheModel = {
      notes: []
    };
    if (noteCacheString) {
      noteCache = JSON.parse(noteCacheString);
    }
    return noteCache;
  }

  fetchNote(slug: string): Observable<NoteResponseModel> {
    this.addNoteToCache(slug);
    return this.http.get<NoteResponseModel>(this.getAPIUrl(`note/${slug}`), this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  fetchNoteTab(slug: string, tabid: string): Observable<SingleNoteResponseModel> {
    return this.http.get<SingleNoteResponseModel>(
      this.getAPIUrl(`note/${slug}/tab/${tabid}`),
      this.getJsonHttpOptions(this.getApiToken(slug))
    );
  }

  fetchNoteTabs(slug: string, ids: string[]): Observable<NoteResponseModel> {
    const strIds = ids.join(',');
    return this.http.get<NoteResponseModel>(
      this.getAPIUrl(`note/${slug}/tabs?ids=${strIds}`),
      this.getJsonHttpOptions(this.getApiToken(slug))
    );
  }

  createNewNote(request: NoteCreateRequestModel): Observable<NoteResponseModel> {
    return this.http.post<NoteResponseModel>(this.getAPIUrl('note'), request, this.getJsonHttpOptions());
  }

  createNewNoteTab(slug: string, request: NoteTabCreateRequestModel): Observable<unknown> {
    return this.http.post(this.getAPIUrl(`note/${slug}/tab`), request, this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  createNewNoteTabs(slug: string, request: NoteItemsTemplate<NoteTabCreateRequestModel>): Observable<unknown> {
    return this.http.post(this.getAPIUrl(`note/${slug}/tabs`), request, this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  updateNote(slug: string, request: NoteCreateRequestModel): Observable<NoteResponseModel> {
    return this.http.patch<NoteResponseModel>(this.getAPIUrl(`note/${slug}`), request, this.getJsonHttpOptions(request.password));
  }

  updateNotePassword(slug: string, token: string, request: NoteCreateRequestWithTabsModel): Observable<NoteResponseModel> {
    return this.http.patch<NoteResponseModel>(this.getAPIUrl(`note/${slug}`), request, this.getJsonHttpOptions(token));
  }

  updateNoteTab(slug: string, request: NoteTabCreateRequestModel): Observable<unknown> {
    return this.http.patch(
      this.getAPIUrl(`note/${slug}/tab/${request.id}`),
      request,
      this.getJsonHttpOptions(this.getApiToken(slug))
    );
  }

  updateNoteTabs(slug: string, request: NoteItemsTemplate<NoteTabCreateRequestModel>): Observable<any> {
    return this.http.patch(this.getAPIUrl(`note/${slug}/tab`), request, this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  deleteNoteTab(slug: string, tabid: string): Observable<NoteResponseModel> {
    return this.http.delete<NoteResponseModel>(
      this.getAPIUrl(`note/${slug}/tab/${tabid}`),
      this.getJsonHttpOptions(this.getApiToken(slug))
    );
  }

  deleteNoteTabs(slug: string, tabid: string): Observable<unknown> {
    return this.http.delete(this.getAPIUrl(`note/${slug}/tab/${tabid}`), this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  deleteNote(slug: string): Observable<NoteResponseModel> {
    return this.http.delete<NoteResponseModel>(this.getAPIUrl(`note/${slug}`), this.getJsonHttpOptions(this.getApiToken(slug)));
  }

  getAPIUrl(path: string): string {
    return this.baseUrl + path;
  }

  getApiToken(slug: string): string {
    return this.getPassword(slug);
  }

  saveGeneralSetting(val: NoteGeneralSetting): void {
    localStorage.setItem(NoteService.GENERAL_SETTING_KEY, JSON.stringify(val));
    this.rxNoteGeneralSetting.next(this.getGeneralSetting());
  }

  getGeneralSetting(): NoteGeneralSetting {
    let obj: Partial<NoteGeneralSetting> = {};
    const currentVal = localStorage.getItem(NoteService.GENERAL_SETTING_KEY);
    if (currentVal) {
      obj = JSON.parse(currentVal);
    }
    return Object.assign({}, DEFAULT_NOTE_GENERAL_SETTING, obj);
  }

  onGeneralSettingUpdate(): Observable<NoteGeneralSetting> {
    return this.rxNoteGeneralSetting.asObservable();
  }

  setActiveNote(note: NoteResponseModel): void {
    this.rxNoteActive.next(note);
  }

  onActiveNoteChange(): Observable<NoteResponseModel | null> {
    return this.rxNoteActive.asObservable();
  }

  private getJsonHttpOptions(token?: string): { headers: HttpHeaders } {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    if (token) {
      headers = headers.append('token', token);
    }

    return { headers };
  }

  private getPasswordStorageKey(slug: string): string {
    return `${slug}${NoteService.PASSWORD_SUFFIX}`;
  }

}
