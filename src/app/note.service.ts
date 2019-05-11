import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClientModule }    from '@angular/common/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NoteCreateRequestModel } from './model/note-create-request-model';
import { NoteTabCreateRequestModel } from './model/note-tab-create-request-model';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private baseUrl = '//note.home/public/api/';
  constructor( private http: HttpClient) { }

  fetchNote(slug:string):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json'})
    };
    return this.http.get(this.getAPIUrl("note/"+slug),httpOptions)
  }

  fetchNoteTab(slug:string,tabid:any):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json'})
    };
    return this.http.get(this.getAPIUrl("note/"+slug+"/tab/"+tabid),httpOptions)
  }

  createNewNote(request:NoteCreateRequestModel):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json'})
    };
    return this.http.post(this.getAPIUrl("note/add"),request,httpOptions)
  }

  createNewNoteTab(slug:string,token:string,request:NoteTabCreateRequestModel):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.post(this.getAPIUrl("note/"+slug+"/tab"),request,httpOptions)
  }

  createNewNoteTabs(slug:string,token:string,request:NoteTabCreateRequestModel[]):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.post(this.getAPIUrl("note/"+slug+"/tabs"),request,httpOptions)
  }

  updateNewNoteTab(slug:string,token:string,request:NoteTabCreateRequestModel):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.patch(this.getAPIUrl("note/"+slug+"/tab/"+request.id),request,httpOptions)
  }

  updateNewNoteTabs(slug:string,token:string,request:NoteTabCreateRequestModel[]):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.patch(this.getAPIUrl("note/"+slug+"/tab"),request,httpOptions)
  }
  
  deleteNoteTab(slug:string,token:string,tabid:any):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.delete(this.getAPIUrl("note/"+slug+"/tab/"+tabid),httpOptions)
  }

  deleteNoteTabs(slug:string,token:string,tabid:any):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.delete(this.getAPIUrl("note/"+slug+"/tab/"+tabid),httpOptions)
  }

  deleteNote(slug:string,token:string):any{
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json','Accept':'application/json','token':token})
    };
    return this.http.delete(this.getAPIUrl("note/"+slug),httpOptions)
  }


  getAPIUrl(path:string){
    return this.baseUrl + path;
  }
}
