import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { email_pattern } from 'src/validation/pattern';
import { messages } from 'src/validation/messages';
import * as firebase from "firebase";
import { CommonProvider } from '../../providers/common';
import { NavController } from '@ionic/angular';
import { Events } from '../services/Events.service';
import { Facebook } from '@ionic-native/facebook/ngx';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Storage } from '@ionic/storage';
import { ApiService } from '../services/api/api.service';
declare var swal;
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  validation_messages = messages;
  public profileForm: FormGroup;
  serverError: string = "";
  profileImage: string = "";
  loading = false;
  max = new Date().getUTCFullYear();
  userInfo;
  idToken: string;
  constructor(public events: Events,
    private fb: Facebook,
    private googlePlus: GooglePlus,
    private nav: NavController,
    private formBuilder: FormBuilder,
    private cp: CommonProvider, private api: ApiService,
    private storage: Storage) {
    this.profileForm = this.formBuilder.group({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.pattern(email_pattern)]),
      zip_code: new FormControl(''),
      age: new FormControl(''),
    });
    let me = this;
    const user = firebase.firestore().collection('users').doc(firebase
      .auth().currentUser.uid);
    user.get().then(snap => {
      if (snap.exists) {
        const data = snap.data();
        this.userInfo = data;
        me.profileForm.controls["name"].setValue(data.name);
        me.profileForm.controls["age"].setValue(data.birthYear);
        me.profileForm.controls["email"].setValue(data.email);
        me.profileForm.controls["zip_code"].setValue(data.zipcode);
        me.profileImage = (data.userPic) ? data.userPic : "assets/image/default.png";
      }
    });
  }
  fileInput(obj) {
    var me = this;
    if (obj.target.files.length) {
      me.cp.presentLoading();
      var uploadTask = firebase.storage().ref().child('images').child(obj.target.files[0].name).put(obj.target.files[0]);
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshot) {
      }, function (error) {
        me.cp.dismissLoading();
      }, function () {
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        setTimeout(function () {
          uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
            me.profileImage = downloadURL;
            firebase
              .firestore().collection("users").doc(firebase.auth().currentUser.uid)
              .update({
                userPic: downloadURL
              })
              .then(res => {
                me.cp.dismissLoading();
                me.events.publish("update:profile", { userPic: me.profileImage })
              })
              .catch(err => {
                me.cp.dismissLoading();
              });
          });
        }, 1000);

      });
    }
  }

  addPhoto() {
    document.getElementById("file").click();
  }
  back() {
    this.nav.pop();
  }
  ngOnInit() {
  }
  logout() {
    let providerId = firebase.auth().currentUser.providerData[0].providerId;
    if (providerId == "google.com") {
      this.googlePlus.disconnect();
    }
    if (providerId == "facebook.com") {
      this.fb.getLoginStatus().then(data => {
        if (data.status == 'connected') {
          this.fb.logout()
        }
      });
    }
    this.storage.clear();
    firebase
      .auth()
      .signOut();
    //this.nav.navigateRoot('login');
  }
  updateProfile(formValue) {
    let me = this;
    me.loading = true;
    me.cp.presentLoading();
    firebase
      .firestore().collection("users").doc(firebase.auth().currentUser.uid)
      .update({
        name: (formValue.name ? formValue.name : null),
        email: (formValue.email ? formValue.email : null),
        birthYear: (formValue.age ? formValue.age : null),
        zipcode: (formValue.zip_code ? formValue.zip_code : null)
      })
      .then(() => {
        me.loading = false;
        me.cp.dismissLoading();
        me.events.publish("update:profile", { name: formValue.name })
        me.nav.pop();
      }).catch(() => {
        me.loading = false;
      })

  }
  showConfirmation() {
    swal({
      icon: 'warning',
      title: 'Subscription!',
      text: `Are you sure, you want to cancel this subscription plan?`,
      closeOnClickOutside: false,
      buttons: {
        cancel: {
          text: "No",
          value: false,
          visible: true,
          className: "",
          closeModal: true,
        },
        confirm: {
          text: "Yes",
          value: true,
          visible: true,
          className: "",
          closeModal: true
        }
      }
    }).then(results => {
      if (results) {
        this.cancelSubscription();
      }
    })
  }
  subscribeAction(status) {
    if (status && status == 'active') {
      this.showConfirmation();
    }
    else {
      this.subscribeNow();
    }
  }
  cancelSubscription() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        user.getIdToken().then((idTokenData) => {
          this.cp.presentLoading();
          let params = {
            subscriptionId: this.userInfo.subscription_id,
            token: idTokenData
          }
          this.api.cancelStripecustomer(params).then(() => {
            this.cp.dismissLoading();
            swal({
              title: "Subscription Plan is cancelled Successfully",
              icon: 'success'
            }).then(() => {
              this.nav.navigateRoot('stripe-subscription');
            })
          }).catch(() => {
            this.cp.dismissLoading();
          })
        })
      }
    })
  }
  getHeaderToken() {
  }
  subscribeNow() {
    this.nav.navigateRoot('stripe-subscription');
  }
}
