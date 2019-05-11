import { Component, OnInit,ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { NoteService } from '../note.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})


export class HomeComponent implements OnInit {
  @ViewChild('inputName') inputEl:ElementRef;

  title="Note"
  constructor(private noteService:NoteService,private router: Router) { }

  ngOnInit() {
    // var objResponse  = this.noteService.getContent("10")
    // .subscribe(response => {
    //   objResponse = response;
    //   console.log(objResponse);
    // });
    
  }
  ngAfterViewInit() {
    setTimeout(() => this.inputEl.nativeElement.focus());
  }
  onEnter(val:string){
    //console.log(val);
    this.router.navigate(["/"+val]);
  }
}
