import { Component, OnInit } from '@angular/core';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {
  messages:Array<string> = new Array();
  timer:any=null;
  constructor(private toastService:ToastService) { }

  ngOnInit() {
    this.toastService.message.subscribe(val=>{
      this.messages.unshift(val);
      if(this.timer==null){
        this.timer=setInterval(()=>{
          this.removeLastMessage();
          if(this.messages.length==0){
            clearInterval(this.timer);
            this.timer=null;
          }
        },1500);
      }
    });
  }

  removeLastMessage(){
    this.messages.pop();
  }

}
