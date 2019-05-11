import { Component, OnInit } from '@angular/core';
import { NoteService } from '../note.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.css']
})
export class NoteComponent implements OnInit {

  constructor(private noteService:NoteService,private router:Router) { }

  ngOnInit() {
    // console.log(this.router.url);
    var objResponse  = this.noteService.fetchNote(this.getCurrentNoteSlug())
    .subscribe(response => {
      objResponse = response;
      console.log(objResponse);
    },
    error=>{
      let objError = error.error;
      if(error.status==404){
        //Note not found & available for creating new
      }
      console.log(error);
    });
  }
  getCurrentNoteSlug(){
    return this.router.url.substr(1);
  }
}
