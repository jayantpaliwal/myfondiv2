import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { CommonProvider } from '../../../providers/common';
import * as moment from 'moment';
import { Storage } from '@ionic/storage';
import swal from 'sweetalert';
import { Events } from 'src/app/services/Events.service';
import introJs from 'intro.js/intro.js';

@Component({
  selector: 'app-transaction-select',
  templateUrl: 'transaction-select.page.html',
  styleUrls: ['transaction-select.page.scss']
})
export class TransactionSelectPage {
  userName: string = "";
  loading: boolean = false;
  token: string = "";
  account = {
    accessToken: "",
    itemId: ""
  }
  transactions = [];
  items: any;
  connected: boolean = false;
  dateRange = {
    displayForm: moment(new Date(new Date().setDate(new Date().getDate() - 30))).format('L'),
    displayTo: moment(new Date).format('L'),
  };
  userPic: any;
  constructor(private navCtrl: NavController,public events: Events,
    private cp: CommonProvider, private storage: Storage,
    public logoutService: LogoutService) {
      events.subscribe('update:profile', (profile) => {
        if (profile.userPic) {
          this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
        }
      });
  }
  ngOnInit() {
    this.userPic = this.logoutService.userPic;
  }
  upload() {
    this.storage.get('accounts')
      .then(async (res) => {
        if (res.length) {
          this.storage.get('plaidTransaction')
            .then(async (trans) => {
              var active = trans.filter(o=>o.active_transaction == true);
              if (trans.length && active.length) {
                this.navCtrl.navigateForward('tabs/tabs/transaction-select/transaction-list');
              }
              else {
                this.cp.presentAlert("Plaid Transactions", "No Plaid Transaction Found !")
                return;
              }
            });
        }
        else {
          swal({
            title: "",
            text: "You must have an account connected to view bank integrations!",
            icon: "warning",
            buttons:["Maybe Later", "Take Me to Accounts"],
            closeOnClickOutside: false
          })
          .then((value) => {
            if(value){
              this.navCtrl.navigateForward('tabs/tabs/accounts');
            }
          })
        }
      });
  }
  manual() {
    this.navCtrl.navigateForward('tabs/tabs/transaction-select/manual-transactions');
  }
  goToProfile() {
    this.navCtrl.navigateForward(["tabs/tabs/home/profile"]);
  }

  ngAfterViewInit() {
      if (!localStorage.getItem('transactionInfo')) {
        localStorage.setItem('transactionInfo', 'true')
        introJs().setOptions({
          exitOnOverlayClick: false,
          showBullets: false,
          steps: [{
            intro: 'Transactions is where you can manually add transactions or view your automated transactions.'
          }]
        }).start();
      }
  }
}

