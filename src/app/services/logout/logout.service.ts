import { Injectable } from "@angular/core";
import * as firebase from "firebase";
import { NavController } from '@ionic/angular';
import { CommonProvider } from "src/providers/common";
@Injectable({
  providedIn: "root"
})
export class LogoutService {
  userName: string;
  userPic: string;
  goals: any;
  email: string;
  constructor( private nav: NavController,private cp: CommonProvider,
  ) { }

  logout() {
    this.cp.clearAllAccounts();
    firebase
      .auth()
      .signOut()
      .then(function () {
        this.nav.navigateRoot('instructions');
      })
  }
}
