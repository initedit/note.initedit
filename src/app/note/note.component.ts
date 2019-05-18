import { Component, OnInit } from '@angular/core';
import { NoteService } from '../note.service';
import { Router } from '@angular/router';
import { NoteCreateRequestModel } from '../model/note-create-request-model';
import { HttpErrorResponse } from '@angular/common/http';
import { NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: []
})
export class NoteComponent implements OnInit {
  response:NoteResponseModel;
  noteCollection:any;
  showAuthModel:boolean=false;
  constructor(private noteService:NoteService,private router:Router,private toastService:ToastService) { }

  ngOnInit() {
    // console.log(this.router.url);
    this.refreshNoteData();
  }

  refreshNoteData(){
    let slug = this.getCurrentNoteSlug();
    var objResponse  = this.noteService.fetchNote(slug)
    .subscribe((response:NoteResponseModel) => {
      this.response = response;
      this.noteCollection = response.content;
      console.log(response,"From note component");
    },
    (error:HttpErrorResponse)=>{
      let objError = error.error;
      if(error.status==404){
        //Note not found & available for creating new
        let request = new NoteCreateRequestModel();
        request.name = this.getCurrentNoteSlug();
        request.type = "Public";
        request.password = "";
        this.noteService.createNewNote(request)
        .subscribe(sucess=>{
          console.log(sucess);
        },
        (error:HttpErrorResponse)=>{
          console.log("Unable to create new note",error)
        });
      }else if(error.status==401){
        //Authorization Failed
        console.log("Error",error);
        this.showAuthModel=true;
      }
      console.log(error);
    });
  }

  getCurrentNoteSlug(){
    return this.router.url.substr(1);
  }
  validatePassword(password:string){
    let slug = this.getCurrentNoteSlug();
    let encPassword = Utils.noteEncrypt(slug,'/'+slug,password);
    console.log(password,slug,encPassword,"validatePassword");
    
    this.noteService.authenticate(slug,encPassword)
    .subscribe((response:NoteResponseModel)=>{
        console.log(response,"Authenticate");
        if(response.code==1){
          //valid password
          this.noteService.addPassword(slug,encPassword);
          this.showAuthModel=false;
          this.toastService.showToast("Unlocked");

        }else{
          this.toastService.showToast("Invalid Password")
        }
    })
  }
  showCreatePassword:boolean;
  noteCollectionEvent($event:any){
    if($event=="SET_PASSWORD"){
      this.showCreatePassword=true;
    }else if($event=="UNLOCK"){
      this.showAuthModel=true;
    }else if($event=="LOGOUT"){
      this.noteService.removePassword(this.getCurrentNoteSlug());
      if(this.response.info.type=="Private"){
        this.refreshNoteData();
      }
    }
  }
  setNotePassword(password:string,isPrivate:boolean){
    let slug = this.getCurrentNoteSlug();
    let encPassword = Utils.noteEncrypt(slug,'/'+slug,password);
    console.log(password,slug,encPassword,"setNotePassword");
    let request = new NoteCreateRequestModel();    
    request.name = slug;
    request.password=encPassword;
    request.type=isPrivate?"Private":"Protected";
    this.noteService.updateNote(slug,request)
    .subscribe((response:NoteResponseModel)=>{
      if(response.code==1){
        this.noteService.addPassword(slug,encPassword);
      }else{
        this.toastService.showToast("Unable to create note");
      }
    });
  }

}
