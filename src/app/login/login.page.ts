import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { email_pattern } from 'src/validation/pattern';
import { messages } from 'src/validation/messages';
import * as firebase from "firebase";
import { CommonProvider } from '../../providers/common';
import { Router } from '@angular/router';
import { Platform, AlertController, NavController } from '@ionic/angular';
import { Events } from '../services/Events.service';
import { ApiService } from '../services/api/api.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  validation_messages = messages;
  public loginForm: FormGroup;
  serverError: string = "";
  constructor(private _ngZone: NgZone, private nav: NavController, private formBuilder: FormBuilder,
    private api: ApiService, private alertController: AlertController,
    private cp: CommonProvider, private router: Router) {
    this.loginForm = this.formBuilder.group({
      email: new FormControl('', [Validators.required, Validators.pattern(email_pattern)]),
      password: new FormControl('', [Validators.required,
      Validators.minLength(8),
      Validators.maxLength(30),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)])
    });
  }
  ngOnInit() {
  }
  goBack() {
    this.router.navigateByUrl('/startup')
  }
  login() {
    if (this.loginForm.valid) {
      this.cp.presentLoading();
      firebase
        .auth()
        .signInWithEmailAndPassword(this.loginForm.value.email, this.loginForm.value.password)
        .then(user => {
          this.api.refreshDataFromServer();
          var info = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
          info.get().then(function (res) {
            let data = res.data();
            data.lastLoginTime = new Date().getTime();
            info.update(data);
          })
          this.cp.dismissLoading();
        })
        .catch(error => {
          this.cp.dismissLoading();
          if (error.code === "auth/invalid-email") {
            this.cp.presentAlert("Login failed", "Incorrect Email.Please enter correct email.");
          }
          else if (error.code === "auth/wrong-password") {
            this.cp.presentAlert("Login failed", "Incorrect Password. Enter correct password.");
          }
          else if (error.code === "auth/user-not-found") {
            this.cp.presentAlert("Login failed", "User not exist for this email.");
          }
          else {
            this.cp.presentAlert("Login failed", error.messages);
          }

        });
    }
  }


  async onForgotPasswordClick() {
    let that = this;
    const alert = await this.alertController.create({
      header: "Forgot password",
      message: "Enter your email so we can send you a reset password link.",
      inputs: [
        {
          name: "email",
          placeholder: "Enter your email"
        }
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel"
        },
        {
          text: "Send",
          handler: data => {
            that.cp.presentLoading();
            firebase.auth().sendPasswordResetEmail(data.email)
              .then(() => {
                that.cp.dismissLoading();
                that.cp.presentAlert("Success", "Reset instructions sent. Please check your e-mail.");
              })
              .catch((error: any) => {
                that.cp.dismissLoading();
                switch (error.code) {
                  case "auth/invalid-email":
                    that.cp.presentAlert("", "Invalid Email");
                    break;
                  case "auth/user-not-found":
                    that.cp.presentAlert("", "User does not exist");
                    break;
                  default:
                    that.cp.presentAlert("", error.messages);
                    break;
                }
              });
          }
        }
      ]
    });
    alert.present();
  }
  Register() {
    this._ngZone.run(() => {
      this.nav.navigateRoot('register');

    });

  }

}