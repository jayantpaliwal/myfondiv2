import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import * as firebase from 'firebase';
import { stripe_publisher_key } from 'src/config/config';
import { CommonProvider } from 'src/providers/common';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { Location } from '@angular/common';
declare var Stripe;
declare var swal;
@Component({
  selector: 'app-stripe-subscription',
  templateUrl: './stripe-subscription.page.html',
  styleUrls: ['./stripe-subscription.page.scss'],
})
export class StripeSubscriptionPage implements OnInit {
  idToken: string = "";
  cardForm: FormGroup;
  isCard: boolean = false
  // public mask = {
  //   expire: [/\d/, /\d/, '/', /\d/, /\d/],
  //   cardNumber: [/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]
  // }
  userInfo: firebase.firestore.DocumentData;
  cardsList = [];
  userPic = "assets/image/default.png";
  stripe = Stripe(stripe_publisher_key);
  card: any;
  products;
  priceId = null;
  backbutton: any;
  isSubmitted: boolean = false;
  promoCode;
  loading: boolean = false;
  finalPrice = '0.00';
  isValidCoupon: boolean = false;
  couponForm:  FormGroup;
  constructor(private fb: FormBuilder, private api: ApiService,
    public logoutService: LogoutService, private cp: CommonProvider,
    private router: Router, private platform: Platform, private location: Location,
    public events: Events,) {
      this.couponForm = this.fb.group({
        coupon: new FormControl(''),
      });

    this.getHeaderToken()

    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });

  }
  ngOnInit() {

  }
  ionViewWillEnter() {
    this.getProducts();
    setTimeout(() => {
      let elements = this.stripe.elements();
      //console.log(elements);
      var style = {
        base: {
          color: '#32325d',
          lineHeight: '24px',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#000000'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      };
      // card number
      this.card = elements.create('cardNumber', { "style": style, "placeholder": 'xxxx xxxx xxxx xxxx' });
      this.card.mount('#card-number');
      this.card.on('change', function (event) {
        if (event.error) {
          swal({
            text: event.error.message,
            icon: 'error'
          });
        }
      });
      // CVC
      var cvc = elements.create('cardCvc', { "style": style });
      cvc.mount('#card-cvc');

      // Card expiry
      var exp = elements.create('cardExpiry', { "style": style });
      exp.mount('#card-exp');
    }, 1000);

  }
  getProducts() {
    this.products = [];
    this.api.getProducts().then((res: any) => {
      if (res.success && res.products.data.length) {
        res.products.data.forEach(element => {
          element['checked'] = false;
        });
        this.products = res.products.data.slice(0, 2);
      }
    })
  }
  getHeaderToken() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        user.getIdToken().then((idTokenData) => {
          this.idToken = idTokenData;
          let users = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
          users.get().then(snap => {
            this.userInfo = snap.data();
            const data = snap.data();
            let me = this;
            me.userPic = (data.userPic) ? data.userPic : "assets/image/default.png";
            me.logoutService.userName = data.name;
            me.logoutService.userPic = (data.userPic) ? data.userPic : "assets/image/default.png";
          })
        });
      }
    })
  }

  ionViewDidEnter() {
    this.backbutton = this.platform.backButton.observers.pop();
  }

  showCard(id) {
    this.isCard = true;
    this.priceId = id;
    this.products.forEach(o => {
      if (o.id == id) {
        o.checked = true
        this.finalPrice = (o.amount / 100).toFixed(2);
      }
      else {
        o.checked = false;
      }

    })

  }

  ionViewWillLeave() {
    this.platform.backButton.observers.push(this.backbutton);
  }
  back() {
    if (this.isCard) {
      this.isCard = false;
      this.products.forEach(o => {
        o.checked = false;
      })
    }
    else if (this.location.path() != '') {
      this.location.back()
    }
  }
  gotoProfile() {
    this.router.navigate(["/profile"]);
  }
  createSubscription() {
    console.log("CreateSubscription got a call");
    var me = this;
    me.cp.presentLoading();
    me.loading = true;
    me.stripe.createPaymentMethod({
      type: 'card',
      card: me.card,
      billing_details: {
        email: me.userInfo.email,
      },
    })
      .then(function (result1) {
        console.log(result1);
        if (result1.paymentMethod && result1.paymentMethod.id) {
          me.api.createStripecustomer({
            email: me.userInfo.email,
            name: me.userInfo.name,
            description: "this is test user",
            userId: firebase.auth().currentUser.uid,
            sourceToken: result1.paymentMethod,
            token: me.idToken,
            priceId: me.priceId,
            coupon: me.isValidCoupon?me.couponForm.value.coupon:""
          }).then((res: any) => {
            console.log("result", res);
            me.loading = false;
            me.cp.dismissLoading();
            if(res.success)
            {
              swal({
                icon: "success",
                title: "Subscription is done!!"
              }).then(() => {
                me.router.navigate(['/tabs']);
              });
            }
            else // else if(res.error && res.error.message.split(".")[0]=='Your card was declined')
            {
              swal({
                icon: "error",
                title: "Card is declined"
              })
            }
          }).catch((error) => {
            me.loading = false;
            me.cp.dismissLoading();
            swal({
              title: error.message,
              icon: 'error'
            })
          })
        } else {
          me.loading = false;
          me.cp.dismissLoading();
          swal({
            text: result1.error.message,
            icon: 'error'
          });
          return;
        }
      }).catch((err) => {
        console.log(err);
        me.cp.dismissLoading();
        me.loading = true;
        return;
      });
  }
  getPlanRecurring(interval) {
    if (interval == 'day') {
      return "Daily";
    }
    else if (interval == 'week') {
      return "Weekly";
    }
    else if (interval == 'month') {
      return "Monthly";
    }
    else if (interval == 'year') {
      return "Annually";
    }
    else {
      return "Custom"
    }
  }
  checkPromoCode(val) {
    this.api.isValidateStripe(val, this.idToken).then((result) => {
      console.log(result);
      this.isValidCoupon = true;
      console.log(this.isValidCoupon)
    }).catch((error) => {
      this.isValidCoupon = false;
      console.log(error);
      console.log(this.isValidCoupon);
    })
   // val = this.couponForm.controls.coupon.value
  // this.api.isValidateStripe(val, this.idToken).then((result)=>{ 
  //   console.log(val);
  //   console.log(result);
  // })
  
   }
}


