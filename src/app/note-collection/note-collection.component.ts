import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, Inject, HostListener } from '@angular/core';
import { NoteTabUiModel } from '../model/note-tab-ui-model';
import { NoteService } from '../note.service';
import { ToastService } from '../toast.service';
import { NoteResponseInfoModel, NoteResponseModel } from '../model/note-response-model';
import Utils from '../Util';
import { DOCUMENT } from '@angular/platform-browser';
import { Key } from 'protractor';

@Component({
  selector: 'app-note-collection',
  templateUrl: './note-collection.component.html',
  styleUrls: []
})
export class NoteCollectionComponent implements OnInit {
  
  noteCollection:NoteTabUiModel[];
  
  selectedNote:NoteTabUiModel;
  @Input()
  set activeNote(value:NoteTabUiModel){
    this.selectedNote=value;
    if(this.selectedNote){
      this.fetchNoteTabContent();
    }
  }

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
      this.noteCollection.forEach((tab:NoteTabUiModel)=>{
        if(this._noteDetails.info.type=="Private"){
          tab.title = Utils.noteDecrypt(tab.slug,tab.title);
        }
      });


      this.noteInfo = this._noteDetails.info;
      if(this.noteCollection.length==0){
        this.addNewNoteTab();
      }
      if(this.noteCollection.length>0 && !this.selectedNote){
        this.selectedNote=this.noteCollection[0];
      }
      // if(this.selectedNote){
      //   this.fetchNoteTabContent();
      // }
      
    }
  }

  authorized:boolean

  @Output("onAction")
  toParrent:EventEmitter<any> = new EventEmitter();

  @ViewChild('inputContent') 
  inputContentEl:ElementRef;
  isLoaded:boolean=false;

  constructor(private noteService:NoteService,private toastService:ToastService, @Inject(DOCUMENT) private document: any) { }

  ngOnInit() {
    this.selectedNote = new NoteTabUiModel();
  }
  
  onKeyDownTextArea(e:KeyboardEvent){
    if(e.keyCode==9 || e.which==9){
      // let textarea = this.inputContentEl.nativeElement as HTMLTextAreaElement;
      // e.preventDefault();
      // var s = textarea.selectionStart;
      // textarea.value = textarea.value.substring(0,textarea.selectionStart) + "\t" + textarea.value.substring(textarea.selectionEnd);
      // textarea.selectionEnd = s+1; 
    }
  }

  @HostListener('document:keydown', ['$event']) 
  onKeyDown(e:KeyboardEvent) {
    //console.log(e);
    let keyLetter = e.key.toLowerCase();
    if(e.ctrlKey){
      if(keyLetter=="s"){
        this.saveNotes();
        e.preventDefault();
      }else if(keyLetter=="m"){
        this.toParrent.emit("TOGGLE_MENU_LEFT")
      }

    }else if(e.altKey){
      if(keyLetter=="t"){
        this.addNewNoteTab();
      }else if(keyLetter=="w"){
        this.hideNoteTab(this.selectedNote);
      }else if(keyLetter=="l"){
        if(this.isNoteAuthorized()){
          this.removePassword();
        }else{
          if(!this.isNoteLocked()){
            this.lockCurrentNote();
          }
        }
      }else if(keyLetter=="u"){
        if(this.isNoteLocked()){
          if(!this.isNoteAuthorized()){
            this.unlockCurrentNote();
          }
        }
      }else if(keyLetter=="r"){
        this.selectedNote.isTitleEnabled=true;
        setTimeout(()=>{
          console.log(document.querySelector(".tab.active .tab-title"));
          let el =  (document.querySelector(".tab.active .tab-title") as HTMLInputElement);
          el.focus();
          el.select();
        },50);  
      }else if(keyLetter=="e"){
        (this.inputContentEl.nativeElement as HTMLTextAreaElement).focus();
        e.preventDefault();
      }else if(keyLetter=="n"){
        this.addNewNoteTab();
      }
      //Paginations
      try{
        let i = parseInt(keyLetter);
        if(i>=0 || i<=9){
          this.navigateToPosition(i);
        }
      }catch{

      }
    }
  }
  ngOnChanges(){
    // console.log("ngOnChanges",this.selectedNote,this.noteCollection);
    // if(!this.isLoaded && this.noteCollection){
    //   this.selectedNote = this.noteCollection[0];
    //   this.isLoaded=false;
    // }
    // if(this.selectedNote){
    //   this.fetchNoteTabContent();
    // }
  }

  navigateToPosition(index:number){
    let visibleNotes = this.noteCollection.filter((tab:NoteTabUiModel)=>{
      return tab.visibility==1;
    });
    if(index==0){
      this.selectedNote = visibleNotes[visibleNotes.length - 1];
      this.fetchNoteTabContent();
    }else{
      if(index<=visibleNotes.length){
        this.selectedNote = visibleNotes[index - 1];
        this.fetchNoteTabContent();
      }
    }
    
  }

  fetchNoteTabContent(){
    //Fetch only if tab created otherwise it has no meaning to hit web server
    if(this.selectedNote.id && !this.selectedNote.content){
      this.noteService.fetchNoteTab(this.selectedNote.slug,this.selectedNote.id)
      .subscribe(
        response=>{
          console.log(response);
          if(response.code==1){
            let content = response.content[0].content;
            if(this._noteDetails.info.type=="Private"){
              content = Utils.noteDecrypt(this.selectedNote.slug,content);
            }
            this.selectedNote.content = content;
          }
        }
      );
    }
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
    if(this.noteCollection.length>20){
      this.toastService.showToast("20 tabs only");
      return;
    }
    let tab = new NoteTabUiModel();
    tab.title = "Untitled Document";
    tab.content = "";
    tab.slug = this.slug;
    tab.visibility=1;
    let dummy = new NoteTabUiModel();
    dummy.order_index=0;
    tab.order_index = this.noteCollection.reduce((oldVal:NoteTabUiModel,newVal:NoteTabUiModel)=>oldVal.order_index>newVal.order_index?oldVal:newVal,dummy).order_index + 1;

    //this.noteCollection.unshift(tab);
    this.noteCollection.push(tab);
    //this.selectedNote=tab;
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
    
    //show password dialog only when note is locked & not yet authorized
    //do not show dialog when its created newly or Public
    if(this.isNoteLocked()){
      if(!this.isNoteAuthorized()){
          this.unlockCurrentNote();
        return;
      }
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

    if(modifiedTab.length>0){

      //create new element so that if note is private 
      //then it will impact UI if content encrypted
      let tabs = new Array<NoteTabUiModel>();
      modifiedTab.forEach((mItem:NoteTabUiModel,index:number)=>{
        let mTab = new NoteTabUiModel();
        mTab.id=mItem.id;
        mTab.order_index=mItem.order_index;
        mTab.title=mItem.title;
        mTab.content = mItem.content;
        mTab.slug=mItem.slug;
        mTab.status=mItem.status;
        mTab.visibility=mItem.visibility;
        if(this._noteDetails.info.type=="Private"){
          if(mTab.content){
            mTab.content = Utils.noteEncrypt(mTab.slug,mTab.content);
          }
          if(mTab.title){
            mTab.title = Utils.noteEncrypt(mTab.slug,mTab.title);
          }
        }
        tabs.push(mTab);
      })



      this.noteService.updateNoteTabs(this.slug,tabs)
      .subscribe((response:NoteResponseModel)=>{
        console.log("saved",response)
        if(response.code==1){
          this.toastService.showToast("Saved")
        }
      });
    }
    if(newTabs.length>0){

      //create new element so that if note is private 
      //then it will impact UI if content encrypted
      let tabs = new Array<NoteTabUiModel>();
      newTabs.forEach((mItem:NoteTabUiModel,index:number)=>{
        let mTab = new NoteTabUiModel();
        mTab.id=mItem.id;
        mTab.order_index=mItem.order_index;
        mTab.title=mItem.title;
        mTab.content = mItem.content;
        mTab.slug=mItem.slug;
        mTab.status=mItem.status;
        mTab.visibility=mItem.visibility;
        if(this._noteDetails.info.type=="Private"){
          if(mTab.content){
            mTab.content = Utils.noteEncrypt(mTab.slug,mTab.content);
          }
          if(mTab.title){
            mTab.title = Utils.noteEncrypt(mTab.slug,mTab.title);
          }
        }
        tabs.push(mTab);
      })

      this.noteService.createNewNoteTabs(this.slug,tabs)
      .subscribe((response:any)=>{
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
  /**
   *checks if use has permission to perform edit/delete operation(If password has been set) 
   */
  isNoteAuthorized(){
    return  (this.noteService.getPassword(this.slug)?true:false);
  }

  /**
   * Checks if note is locked or note
   */
  isNoteLocked(){
    if(this.noteInfo){
      return this.noteInfo.type=="Public"?false:true;
    }
    return false;
  }
  /* To copy Text from Textbox */
  copyInputMessage(inputElement:HTMLInputElement){
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }

  /* To copy any Text */
  copyText(val: string){
    let selBox = document.createElement('textarea');
      selBox.style.position = 'fixed';
      selBox.style.left = '0';
      selBox.style.top = '0';
      selBox.style.opacity = '0';
      selBox.value = val;
      document.body.appendChild(selBox);
      selBox.focus();
      selBox.select();
      document.execCommand('copy');
      document.body.removeChild(selBox);
    }
    copyCurrentNoteText(){
      this.copyText(this.selectedNote.content);
      this.toastService.showToast("Copied");
    }
    copyCurrentNoteLink(){
      this.copyText(this.document.location.href);
      this.toastService.showToast("Copied link");
    }
    scrollIntoView(element:HTMLElement,note:NoteTabUiModel){
       if(this.selectedNote==note){
         //element.scrollIntoView();
         element.parentElement.scrollLeft=element.offsetLeft;
        }
    }
}
