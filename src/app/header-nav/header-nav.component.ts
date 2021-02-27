import { Component, OnInit, Output, EventEmitter, ViewChild, HostListener, Input } from '@angular/core';
import { MatRipple, RippleRef } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { SettingComponent } from '../setting/setting.component';

@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.css']
})
export class HeaderNavComponent implements OnInit {

  @ViewChild(MatRipple, { static: true })
  buttonRipple: MatRipple

  showAboutUs: boolean

  rippleRef: RippleRef

  constructor(public dialog: MatDialog) { }
  @Output("onAction")
  toParrent: EventEmitter<any> = new EventEmitter();

  @HostListener('document:keydown.escape', ["$event"]) onKeyDown(event: KeyboardEvent) {
    console.log("Clicked")
    if (this.showAboutUs) {
      this.onInfoClosed()
    }
  }


  ngOnInit() {
    this.buttonRipple.color = "#FFF"
    this.buttonRipple.unbounded = true
    this.buttonRipple.radius = 1700;
    this.buttonRipple.disabled = true;

    this.showAboutUs = false
  }
  onInfoClicked(event: MouseEvent) {
    // this.buttonRipple.disabled=true;
    this.rippleRef = this.buttonRipple.launch(event.x, event.y, {
      animation: {
        exitDuration: 400
      },
      persistent: true,
    });

    setTimeout(() => {
      this.showAboutUs = true
    }, this.rippleRef.config.animation.exitDuration)
  }
  onInfoClosed() {
    this.showAboutUs = false;
    this.rippleRef.fadeOut()
  }

  onSettingClicked(){
    this.dialog.open(SettingComponent,{
      width:"90%",
      height:"80%",
      panelClass:'setting-panel',
    })
  }
}

