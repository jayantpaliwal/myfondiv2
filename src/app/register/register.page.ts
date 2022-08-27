import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { email_pattern } from 'src/validation/pattern';
import { messages } from 'src/validation/messages';
import { PasswordMatchValidator } from 'src/validation/passwordMatch.validator';
import * as firebase from "firebase";
import { CommonProvider } from '../../providers/common';
import { Router } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import swal from 'sweetalert';
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  validation_messages = messages;
  public registerForm: FormGroup;
  serverError: string = "";
  max  = new Date().getUTCFullYear();
  constructor(private _ngZone: NgZone,private nav:NavController, private formBuilder: FormBuilder,
     private api: ApiService, private cp: CommonProvider, private router: Router) {
    this.registerForm = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      zip: new FormControl('', [Validators.required]),
      birthYear: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.pattern(email_pattern)]),
      password: new FormControl('', [Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
      ]),
      confirmPassword: new FormControl('', Validators.compose([Validators.required, PasswordMatchValidator.matchingPasswords('password')]))
    });
  }
  ngOnInit() {
  }
  register() {
    let that = this;
    var currentYear = new Date();
    var yearGap = currentYear.getFullYear() - parseInt(that.registerForm.value.birthYear.split("-")[0]);
    if(!(yearGap>=18))
    {
      swal({
        title:"You are not eligible",
        text:"Age should be greater than or equal to 18",
        icon: "error"
      })
    }
    else if (this.registerForm.valid) {
      this.cp.presentLoading();
      firebase
        .auth()
        .createUserWithEmailAndPassword(
          that.registerForm.value.email,
          that.registerForm.value.password
        )
        .then(() => {
          this.api.refreshDataFromServer();
          let users = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
            users.set({
              name: that.registerForm.value.name,
              email: that.registerForm.value.email,
              birthYear: that.registerForm.value.birthYear,
              zipcode: that.registerForm.value.zip,
              lastLoginTime:new Date().getTime(),
              questionaire:false,
              emailVerified: false
            })
            firebase
            .auth().currentUser.updateProfile({
              displayName: that.registerForm.value.name
            })
             return firebase
            .auth().currentUser.sendEmailVerification()
        })
        .catch(function (error) {
          that.cp.dismissLoading();
          if (error.code === "auth/email-already-in-use") {
            that.serverError = "This email has already been taken";
          }
          else {
            that.serverError = error.messages;
          }
        })
        .finally(() => {
          that.cp.dismissLoading();
        });
    }
  }
  login() {
    this._ngZone.run(() => {
      this.nav.navigateRoot('login');
    });
  }
  goBack(){
    this.router.navigateByUrl('/startup');
  }
}