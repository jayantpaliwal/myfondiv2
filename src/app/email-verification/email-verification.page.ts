import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import * as firebase from 'firebase';
import swal from 'sweetalert';

@Component({
  selector: 'app-budgets',
  templateUrl: 'email-verification.page.html',
  styleUrls: ['email-verification.page.scss']
})
export class EmailVerificationPage implements OnInit {

  allpayChecks: any;
  user: any;
  constructor(
    private nav: NavController,
    private _ngZone: NgZone,) {

  }
  ngOnInit() {
    this.user = firebase.auth().currentUser;
    if(!this.user){
      this._ngZone.run(() => {
        this.nav.navigateRoot('startup');
      })
    }
    firebase
      .auth()
      .onAuthStateChanged(response => {
        const unsubscribeSetInterval = setInterval(() => {//this works as a next in for-like
       if(  firebase.auth().currentUser){
        firebase.auth().currentUser.reload();
        if (firebase.auth().currentUser.emailVerified) {
          clearInterval(unsubscribeSetInterval);
          this._ngZone.run(() => {
            this.nav.navigateRoot('tabs');
          });
        }
       }
         
        }, 10000);

      });
  }
resentEmailVerification(){

  this.user.sendEmailVerification().then(()=>{
    swal({
      title: "Email Sent",
      icon:'success',
      text:`Verification email was sent to ${this.user.email}, please check!`
    })
  })
}
startPage(){
  this.nav.navigateRoot('startup');
}
}
