import { Component, NgZone } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Events } from './services/Events.service';
import * as firebase from 'firebase';
import { ApiService } from './services/api/api.service';
import { FCM } from 'cordova-plugin-fcm-with-dependecy-updated/ionic/ngx/FCM';
import { FirebaseFunctionLocal } from './services/firebase-api-local/firebase-api-local';
import { CommonProvider } from 'src/providers/common';
import { TransactionService } from './services/transaction/transaction.service';
import DateDiff from './services/firebase-api-local/date-diff';
import { getTranslationDeclStmts } from '@angular/compiler/src/render3/view/template';
declare var Plaid: any;
declare var swal;
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  loading = false;
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public transService: TransactionService,
    private _ngZone: NgZone,
    public events: Events,
    private cp: CommonProvider,
    private nav: NavController,
    private api: ApiService,
    private fcm: FCM,
    private firebaseLocal: FirebaseFunctionLocal
  ) {
    this.initializeApp();
  }
  initializeApp() {
    let d1 = firebase.firestore().collection("users").doc();
    d1.get().then(snap=>{
      let d2 = snap.data();
      console.log(d2);
    })

    this.platform.ready().then(() => {
      this.statusBar.show();
      this.statusBar.overlaysWebView(false);
      this.statusBar.backgroundColorByHexString("#72D775");
      setTimeout(() => {
        this.splashScreen.hide();
      }, 1000);
      this.authLogin();
    });
  }
  
  authLogin() {
    // this.loading = true;
    let that = this;
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        if (user.emailVerified) {
          that.refreshDataFromServer();
          that.loadPush();
          let users = firebase.firestore().collection('users').doc(user.uid);
          // console.log(user.uid);
          users.get().then(snap => {
            const data = snap.data();
            data.lastLoginTime = new Date().getTime();
            users.update(data);
            // for checking if any token expire or invalid
            let createdDate = new Date(user.metadata.creationTime);
            var diff = new DateDiff(new Date(), createdDate);
            var numDays = diff.days();
            that._ngZone.run(() => {
              if (Math.abs(numDays) > 45 && (!data.sub_status || (data.sub_status && data.sub_status != "active"))) {
                that.nav.navigateRoot('stripe-subscription');
              }
              else {
                that.getAccountStatus(data.name, data.email);
                that.refreshDataFromServer();
                that.loadPush();
                // that.nav.navigateRoot('stripe-subscription');
                that.nav.navigateRoot('tabs');
              }
            })
          }).catch((error) => {
          });
        }
        else {
          that.nav.navigateRoot('email-verify');
        }
      } else {
        // that.loading = false;
        that._ngZone.run(() => {
          if (localStorage.getItem("instructions") != 'true') {
            that._ngZone.run(() => {
              that.nav.navigateRoot('instructions');
            })
          } else {
            // that.loading = false;
            that._ngZone.run(() => {
              that.nav.navigateRoot('startup');
            })
          }
        })
      }
    });
  }

  refreshDataFromServer() {
    this.loadPush();
    this.loading = true;
    this.api.getIncomeSource();
    this.api.getAccounts();
    this.api.getTransaction();
    this.api.getGoal();
    this.api.getPlaidCategories();
    this.api.getUniqeCategories();
    this.api.getPlaidTransaction();
    // console.log(this.categoryMap('18007009'))
    setTimeout(() => {
      this.loading = false;
    }, 3000)
    // this.firebaseLocal.dailyRUn();
  }
  loadPush() {
    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.fcm.getToken().then(token => {
          if (firebase.auth().currentUser.uid) {
            var info = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
            info.get().then(function (res) {
              let data = res.data();
              data.userFcmToken = token;
              info.update(data);
            })
          }
        });
        this.fcm.onNotification().subscribe(data => {
          if (data.wasTapped) {
            console.debug("Received in background");
            this.refreshDataFromServer();
          } else {
            console.debug("Received in foreground");
            swal({
              icon: "info",
              title: "Your account balance and transactions were updated! Refresh to see current view."
            }).then(() => {
              window.location.reload();
              this.refreshDataFromServer();
            });
          };
        });
        this.fcm.onTokenRefresh().subscribe(token => {
          var info = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
          info.get().then(function (res) {
            let data = res.data();
            data.userFcmToken = token;
            info.update(data);
          })
        });
      }
    });
  }
  // account token status checker
  getAccountStatus(name, email) {
    this.firebaseLocal.getFailedPlaidConnection().then((response: any) => {
      if (response.length) {
        swal({
          title: "Accounts Authentication",
          icon: "warning",
          text: `Your ${response[0].auth_tokens[0].bank_name} banks session expired, please re-authenticate it`,
          dangerMode: false,
          closeOnClickOutside: false
        })
      }
    })
  }
  categoryMap(category_id) {
   let betaCategories = [{"category_id":"18001000","group":"Income","hierarchy":["Wages"]},{"category_id":"18001001","group":"Income","hierarchy":["Unemployment"]},{"category_id":"18001002","group":"Income","hierarchy":["Retirement Pension"]},{"category_id":"18001003","group":"Income","hierarchy":["Tax Refund"]}, {"category_id":"18001004","group":"Income","hierarchy":["Interest / Dividends"]}, {"category_id":"18001005","group":"Income","hierarchy":[ "Other Income"]}, {"category_id":"18002000", "group":"Transfer In", "hierarchy":[ "Cash Advances & Loans"] }, {"category_id":"18002001", "group":"Transfer In","hierarchy":[ "Other Transfer In (Deposits)"]}, {"category_id":"18003000", "group":"Transfer Out","hierarchy":["Other Transfer Out"] }, {"category_id":"18003001", "group":"Transfer Out","hierarchy":[ "Investment & Retirement Fund"]},  {"category_id":"18003002", "group":"Transfer Out","hierarchy":["Savings"] },{"category_id":"18003003","group":"Transfer Out","hierarchy":["Withdrawal"]},{"category_id":"18004000", "group":"Loans and Payments","hierarchy":["Car Loan Payment "]},{"category_id":"18004001","group":"Loans and Payments","hierarchy":["Credit Card Payment "]}, {"category_id":"18004002","group":"Loans and Payments","hierarchy":["Personal Loan Payment"]}, {"category_id":"18004003","group":"Loans and Payments","hierarchy":["Mortgage Payment"]},{"category_id":"18004004", "group":"Loans and Payments","hierarchy":["Student loan Payment "]},{"category_id":"18004005","group":"Loans and Payments","hierarchy":["Other Payments"]},{"category_id":"18005000", "group":"Bank Fees","hierarchy":["ATM Fees"]},{ "category_id":"18005001","group":"Bank Fees","hierarchy":[ "Foreign Transaction Fees"]},{"category_id":"18005002","group":"Bank Fees","hierarchy":["Insufficient Funds "]},{"category_id":"18005003","group":"Bank Fees","hierarchy":["Overdraft Fees"]},{"category_id":"18005004","group":"Bank Fees","hierarchy":["Other Bank Fees"]}, {"category_id":"18006000","group":"Entertainment","hierarchy":[ "Sporting Events","Amusement Parks","Musuems"]},{ "category_id":"18006001", "group":"Entertainment","hierarchy":["Music"]},{"category_id":"18006002","group":"Entertainment","hierarchy":["Video Games"]},{"category_id":"18006003","group":"Entertainment","hierarchy":[ "TV & Movies"]}, {"category_id":"18006004","group":"Entertainment","hierarchy":["Casinos & Gambling"]},{"category_id":"18006005","group":"Entertainment","hierarchy":["Other Entertainment"] },{"category_id":"18007000","group":"Food & Drink","hierarchy":["Beer","Wine & Liquor Stores"]}, {"category_id":"18007001","group":"Food & Drink","hierarchy":["Coffee"]}, {"category_id":"18007002","group":"Food & Drink","hierarchy":["Dining"]},{"category_id":"18007003","group":"Food & Drink","hierarchy":["Groceries"]},{"category_id":"18007004","group":"Food & Drink","hierarchy":[ "Vending Machines"] }, {"category_id":"18007005","group":"Food & Drink","hierarchy":["Other Food & Drinks"]}, {"category_id":"18008000","group":"General Merchandise","hierarchy":["Bookstores & Newsstands "]},{"category_id":"18008001","group":"General Merchandise", "hierarchy":["Clothing & Accesories" ]}, {"category_id":"18008002", "group":"General Merchandise","hierarchy":["Convenience Stores"]}, { "category_id":"18008003", "group":"General Merchandise","hierarchy":["Department Stores "]},  {"category_id":"18008004","group":"General Merchandise","hierarchy":["Discount Stores"]},  {"category_id":"18008005","group":"General Merchandise","hierarchy":["Electronics" ]},  {"category_id":"18008006","group":"General Merchandise","hierarchy":["Gifts & Novelties"]},  {"category_id":"18008007","group":"General Merchandise","hierarchy":["Office Supplies " ]}, {"category_id":"18008008","group":"General Merchandise","hierarchy":[ "Online Marketplaces"]}, {"category_id":"18008009","group":"General Merchandise","hierarchy":["Pet Supplies"]},  {"category_id":"18008010","group":"General Merchandise","hierarchy":["Sporting Goods"] },  {"category_id":"18008011","group":"General Merchandise","hierarchy":["Superstores"]}, {"category_id":"18008012","group":"General Merchandise","hierarchy":["Other General Merchandise"]},  {"category_id":"18009000","group":"Home Improvement","hierarchy":["Furniture"]},    {"category_id":"18009001","group":"Home Improvement", "hierarchy":["Hardware" ]},    { "category_id":"18009002","group":"Home Improvement","hierarchy":["Repair & Maintenance"]},    {"category_id":"18009003","group":"Home Improvement","hierarchy":["Other Home Improvement"]},    {"category_id":"18010000","group":"Medical","hierarchy":["Primary Care"]},   {"category_id":"18010001","group":"Medical","hierarchy":["Dental Care "]},    {"category_id":"18010002","group":"Medical","hierarchy":["Eye Care"]},    {"category_id":"18010003","group":"Medical","hierarchy":["Nursing Care" ]},    {"category_id":"18010004","group":"Medical","hierarchy":["Veterinary Services"]},   {"category_id":"18010005", "group":"Medical","hierarchy":["Pharmacies & Supplements"]},    {"category_id":"18010006","group":"Medical","hierarchy":[ "Other Medical"]},    {"category_id":"18011000","group":"Personal Care","hierarchy":["Hair & Beauty"]},    {"category_id":"18011001","group":"Personal Care","hierarchy":[ "Laundry & Dry Cleaning"]},    { "category_id":"18011002","group":"Personal Care","hierarchy":["Gyms & Fitness Centers"]},    { "category_id":"18011003", "group":"Personal Care","hierarchy":["Other Personal Care" ]},    {"category_id":"18012000","group":"General Services","hierarchy":[ "Accounting & Financial Planning"]},    {"category_id":"18012001","group":"General Services","hierarchy":["Childcare"]},    {"category_id":"18012002", "group":"General Services","hierarchy":["Consulting & Legal "]},     {"category_id":"18012003","group":"General Services","hierarchy":["Postage & Shipping"]},    {"category_id":"18012004","group":"General Services","hierarchy":["Automotive"]},    { "category_id":"18012005","group":"General Services", "hierarchy":["Education"] },    { "category_id":"18012006","group":"General Services", "hierarchy":[ "Other Professional Services"]},    {"category_id":"18012007","group":"General Services","hierarchy":["Insurance"]},    { "category_id":"18013000","group":"Government & Non Profit ", "hierarchy":[ "Government Departments & Agencies"] },    {"category_id":"18013001", "group":"Government & Non Profit ","hierarchy":[ "Tax Payment "] },    {"category_id":"18013002","group":"Government & Non Profit ","hierarchy":["Donations"]},    {"category_id":"18013003", "group":"Government & Non Profit ", "hierarchy":["Other Government & Non Profit"]},    {"category_id":"18013004","group":"Government & Non Profit ","hierarchy":["Donations"]},    { "category_id":"18014000","group":"Transportation","hierarchy":[ "Public Transit"]},    {"category_id":"18014001","group":"Transportation","hierarchy":["Taxis & Ride Shares"] },    { "category_id":"18014002", "group":"Transportation","hierarchy":["Bikes & Scooters " ]},    {"category_id":"18014003", "group":"Transportation","hierarchy":[ "Gas"]},     { "category_id":"18014004", "group":"Transportation","hierarchy":["Tolls "]},    {"category_id":"18014005","group":"Transportation","hierarchy":["Parking"]},    {"category_id":"18014006","group":"Transportation","hierarchy":["Other Transportation " ]},    {"category_id":"18015000", "group":"Travel ","hierarchy":["Lodging"]},    {"category_id":"18015001","group":"Travel ","hierarchy":["Flights "]},    {"category_id":"18015002","group":"Travel ","hierarchy":["Rental Cars"]},    {"category_id":"18015003","group":"Travel ","hierarchy":["Other Travel"]},    { "category_id":"18016000","group":"Utilities","hierarchy":["Electricity"]},    {"category_id":"18016001","group":"Utilities","hierarchy":["Internet & Cable"] },    {"category_id":"18016002","group":"Utilities","hierarchy":["Telephone"]},    {"category_id":"18016003","group":"Utilities","hierarchy":["Water "]},    {"category_id":"18016004","group":"Utilities","hierarchy":["Sewage & Waste Management"]},    {"category_id":"18016005","group":"Utilities","hierarchy":["Rent"]},    {"category_id":"18016006","group":"Utilities","hierarchy":["Other Utilities"]},    {"category_id":"18017000","group":"Other","hierarchy":["Other"]}];
    betaCategories.forEach((element, index) => {
        var string = "";
        for (var i = 0; i < element.hierarchy.length; i++) {
            string = i == 0 ? element.hierarchy[i] : string + " " + element.hierarchy[i];
        }
        element['CategoryName'] = string;
    });
    let mappedCategories = betaCategories.filter(o => o.category_id == category_id);
    if (mappedCategories.length) {
      return mappedCategories[0];
    }
    else {
      mappedCategories = betaCategories.filter(o => o.category_id < category_id).sort((a, b) => parseInt(b.category_id) - parseInt(a.category_id))
      return mappedCategories.length ? mappedCategories[0] : {};
    }
  }
}