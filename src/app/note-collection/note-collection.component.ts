import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteService } from '../note.service';
import { ToastService } from '../toast.service';
import { NoteResponseInfoModel, NoteResponseModel } from '../model/note-response-model';

@Component({
  selector: 'app-note-collection',
  templateUrl: './note-collection.component.html',
  styleUrls: []
})
export class NoteCollectionComponent implements OnInit {
  
  noteCollection:NoteTabUiModel[];
  
  @Input()
  selectedNote:NoteTabUiModel;

  noteInfo:NoteResponseInfoModel;

  @Input()
  slug:string;
  set(value:string){
    this.slug=value;
    if(this.noteService.getPassword(this.slug)){
      this.authorized=true;
    }else{
      this.authorized=false;
    }
  }

  _noteDetails:NoteResponseModel
  @Input("notes")
  set notes(value: NoteResponseModel) {
    this._noteDetails = value;
    if(this._noteDetails){
      this.noteCollection=this._noteDetails.content;
      this.noteInfo = this._noteDetails.info;
    }
  }

  authorized:boolean

  @Output("onAction")
  toParrent:EventEmitter<any> = new EventEmitter();

  @ViewChild('inputContent') 
  inputContentEl:ElementRef;
  isLoaded:boolean=false;

  constructor(private noteService:NoteService,private toastService:ToastService) { }

  ngOnInit() {
    this.selectedNote = new NoteTabUiModel();
  }
  ngOnChanges(){
    console.log("ngOnChanges",this.selectedNote,this.noteCollection);
    if(!this.isLoaded && this.noteCollection){
      this.selectedNote = this.noteCollection[0];
      this.isLoaded=false;
    }
    if(this.selectedNote){
      this.fetchNoteTabContent();
    }
  }

  fetchNoteTabContent(){
    this.noteService.fetchNoteTab(this.selectedNote.slug,this.selectedNote.id)
    .subscribe(
      response=>{
        console.log(response);
        if(response.code==1){
          this.selectedNote.content = response.content[0].content;
        }
      }
    );
  }

  onChangeSelectedNote(note:NoteTabUiModel){
    if(this.selectedNote!=note){
        this.selectedNote=note;
        if(this.selectedNote.id){
          this.fetchNoteTabContent();
        }
    }
  }

  addNewNoteTab(){
    let tab = new NoteTabUiModel();
    tab.title = "Untitled Document";
    tab.content = "";
    tab.slug = this.slug;
    tab.visibility=1;
    tab.order_index = this.noteCollection.reduce((oldVal,newVal)=>oldVal.order_index>newVal.order_index?oldVal:newVal).order_index + 1;

    this.noteCollection.unshift(tab);
    this.onChangeSelectedNote(tab);
    
    this.inputContentEl.nativeElement.focus();
  }
  hideNoteTab(note:NoteTabUiModel){
    note.visibility=0;
    this.handleEmptyCollection();
    this.modifiedTab("visibility",note);
  }
  onDoubleClickTab(tab:NoteTabUiModel,$event:MouseEvent){
    tab.isTitleEnabled=true;
    var element = $event.toElement as HTMLInputElement;
    console.log("Called",tab,$event,element.nodeName);

    if(element.nodeName.toUpperCase()=="INPUT"){
      setTimeout(()=>{
        element.select();
      },0);
    }else{
      setTimeout(()=>{
        (element.querySelector(".tab-title") as HTMLInputElement).select();
      },0);
    }
    
  }
  onTitleBlur(note:NoteTabUiModel){
    note.isTitleEnabled=false;
  }

  handleEmptyCollection(){
    if(this.noteCollection.filter(note=>note.visibility==1).length==0){
      this.addNewNoteTab();
    }
  }
  modifiedTab(action:string,tab:NoteTabUiModel){
    if(action=="content"){
      tab.modifiedContent=true;
    }else if(action=="title"){
      tab.modifiedTitle=true;
    }else if(action=="visibility"){
      tab.modifiedVisibility=true;
    }else if(action=="order"){
      tab.modifiedOrder=true;
    }
  }
  saveNotes(){

    if(!this.isNoteAuthorized()){
      if(this._noteDetails.info.type=="Public"){
        this.lockCurrentNote();
      }else{
        this.unlockCurrentNote();
      }
      return;
    }


    let modifiedTab : NoteTabUiModel[] = [];
    let newTabs:NoteTabUiModel[] = [];
    
    for(let i=0;i<this.noteCollection.length;i++){
      let note = this.noteCollection[i];
      if(this.slug!=note.slug){
        console.log("Slug did not match.","Aborting");
        return;
      }

      if(!note.id){
        newTabs.push(note);
      }else{
        let updatedNote = new NoteTabUiModel();
        updatedNote = Object.assign({},note);
        if(!updatedNote.modifiedTitle){
          updatedNote.title=null;
        }
        if(!updatedNote.modifiedContent){
          updatedNote.content=null;
        }
        if(!updatedNote.modifiedVisibility){
          updatedNote.visibility=null;
        }
        if(updatedNote.modifiedContent || updatedNote.modifiedTitle || updatedNote.modifiedOrder || updatedNote.modifiedVisibility){
          modifiedTab.push(updatedNote);
        }
       }
    }
    console.log("found modified tabs",modifiedTab,newTabs);

    if(modifiedTab.length>0){
      this.noteService.updateNoteTabs(this.slug,modifiedTab)
      .subscribe(response=>{
        console.log("saved",response)
        if(response.code==1){
          this.toastService.showToast("Saved")
        }
      });
    }
    if(newTabs.length>0){
      this.noteService.createNewNoteTabs(this.slug,newTabs)
      .subscribe(response=>{
        console.log("saved:new",response)
        if(response.code==1){
          this.toastService.showToast("Created tabs")
          for(let i=0;i<newTabs.length;i++)
          {
            let _note = newTabs[i];
            _note.id = response.tabs[i].id;
          }
        }
      });
      
    }
    this.noteCollection.forEach(item=>{
      item.modifiedContent=false;
      item.modifiedOrder=false;
      item.modifiedTitle=false;
      item.modifiedVisibility=false;
    });


  }
  lockCurrentNote(){
    this.toParrent.emit("SET_PASSWORD");
  }
  unlockCurrentNote(){
    this.toParrent.emit("UNLOCK");
  }
  removePassword(){
    this.toParrent.emit("LOGOUT");
  }

  isNoteAuthorized(){
    return  (this.noteService.getPassword(this.slug)?true:false);
  }
  
}
