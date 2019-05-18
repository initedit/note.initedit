import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.css']
})
export class HeaderNavComponent implements OnInit {

  constructor() { }
  @Output("onAction")
  toParrent:EventEmitter<any> = new EventEmitter();
  ngOnInit() {
  }
  
}
