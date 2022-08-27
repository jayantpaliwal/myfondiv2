import { Component, OnInit, NgZone } from '@angular/core';
import { Platform, AlertController, NavController } from '@ionic/angular';
import { Facebook } from '@ionic-native/facebook/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import * as firebase from 'firebase';
import { CommonProvider } from 'src/providers/common';
import { ApiService } from '../services/api/api.service';
@Component({
  selector: 'app-startup',
  templateUrl: './startup.page.html',
  styleUrls: ['./startup.page.scss'],
})
export class StartupPage implements OnInit {
  constructor(private _ngZone: NgZone, private fb: Facebook, private cp: CommonProvider,
    private googlePlus: GooglePlus, private nav: NavController, private api: ApiService) {
  }

  ngOnInit() {
  }


  login() {
    this._ngZone.run(() => {
      this.nav.navigateRoot('login');
    });
  }
  facebook() {
    const me = this;
    me.fbLogin()
      .then(response => {
         const credential = firebase.auth.FacebookAuthProvider.credential(response.authResponse.accessToken);
        me.cp.presentLoading();
        firebase.auth().signInWithCredential(credential)
          .then((res) => {
            me.getUser()
              .then(user => {
                me.api.refreshDataFromServer();
                let users = firebase.firestore().collection('users').doc(firebase
                  .auth().currentUser.uid);
                let email = user.email ? user.email : null
                users.set({
                  name: user.first_name + " " + user.last_name,
                  email: email,
                  lastLoginTime:new Date().getTime(),
                  questionaire: false
                })
                me.cp.dismissLoading();
              })
              .catch(() => {
                me.cp.dismissLoading();
              });
          }).catch(() => {
            me.cp.dismissLoading();
          });
      });

  }

  async fbLogin(): Promise<any> {
    return await this.fb.login(["email"]).catch(err => err);
  }
  async getUser(): Promise<any> {
    return await this.fb
      .api("/me?fields=email,first_name,last_name", ["public_profile", "email"])
      .catch(err => {
        });
  }
  google() {
    this.googlePlus.login({
      'scopes': 'profile', // optional, space-separated list of scopes, If not included or empty, defaults to `profile` and `email`.
      'webClientId': '592683818798-sjm890dri1o5c8bc879j022oilrqbbl5.apps.googleusercontent.com', // optional clientId of your Web application from Credentials settings of your project - On Android, this MUST be included to get an idToken. On iOS, it is not required.
      'offline': true // Optional, but requires the webClientId - if set to true the plugin will also return a serverAuthCode, which can be used to grant offline access to a non-Google server
    }).then(obj => {
      const googleCredential = firebase.auth.GoogleAuthProvider
        .credential(obj.idToken);
      this.cp.presentLoading();
      firebase.auth().signInWithCredential(googleCredential)
        .then(response => {
          this.api.refreshDataFromServer();
          let users = firebase.firestore().collection('users').doc(firebase
            .auth().currentUser.uid);
          users.set({
            name: obj.displayName,
            email: obj.email,
            lastLoginTime:new Date().getTime(),
            questionaire: false
          })
          this.cp.dismissLoading();
          return firebase
            .auth().currentUser.sendEmailVerification();
           
        }, () => {
          this.cp.dismissLoading();
        });
    })
  }
  register() {
    this._ngZone.run(() => {
      this.nav.navigateRoot('register');
    });

  }

}