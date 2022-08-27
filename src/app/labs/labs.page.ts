import { NavController } from '@ionic/angular';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Events } from '../services/Events.service';
@Component({
  selector: 'app-labs',
  templateUrl: 'labs.page.html',
  styleUrls: ['labs.page.scss']
})
export class LabsPage implements OnInit {
  userPic: any;
  constructor(public logoutService: LogoutService, private navCtrl: NavController,
     private router: Router, public events: Events) { 
      events.subscribe('update:profile', (profile) => {
        if (profile.userPic) {
          this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
        }
      });
      this.userPic = this.logoutService.userPic
     }

  ngOnInit() { }
  goToProfile() {
    this.router.navigate(["tabs/tabs/home/profile"]);
  }

}