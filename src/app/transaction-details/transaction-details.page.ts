import { LogoutService } from 'src/app/services/logout/logout.service';
import { Router, NavigationExtras } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { CalendarModal, CalendarModalOptions } from "ion2-calendar";
import { ModalController, AlertController, NavController, PopoverController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { ApiService } from '../services/api/api.service';
import { CommonProvider } from 'src/providers/common';
import { Events } from '../services/Events.service';
import { DetailsPage } from './more-option/more-option.page';
import swal from 'sweetalert';
import { TransactionService } from '../services/transaction/transaction.service';
import { ChangePaycheckPopupPage } from './change-paycheck-popup/change-paycheck-popup.page';
@Component({
  selector: 'app-transaction-details',
  templateUrl: './transaction-details.page.html',
  styleUrls: ['./transaction-details.page.scss'],
})
export class TransactionDetailsPage implements OnInit {
  transactions = [];
  public loading = false;
  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
    displayForm: moment(new Date(new Date().setDate(new Date().getDate() - 30))).format('L'),
    displayTo: moment(new Date).format('L'),
  };
  Alltransactions: any;
  userPic: any;
  constructor(private cp: CommonProvider, 
    private modalCtrl: ModalController, 
    private api: ApiService,
    public events: Events, 
    public transService: TransactionService, 
    private nav: NavController,
    public popoverController: PopoverController,
    public logoutService: LogoutService, 
    private storage: Storage ) {
      events.subscribe('update:profile', (profile) => {
        if (profile.userPic) {
          this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
        }
      });
    events.subscribe('delete:transaction', () => {
      this.getTransaction(this.dateRange.from, this.dateRange.to);
    });
  }
  ngOnInit() {

  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic;
    this.getTransaction(this.dateRange.from, this.dateRange.to);
  }
  getTransaction(from, to) {
    let me = this;
    me.transactions = [];
    me.loading = true;
    var payChecks = [];
    me.storage.get('incomeSource')
      .then((res) => {
        if (res && res.length > 0) {
          res.forEach(inc => {
            inc.paychecks.forEach(pay => {
              let data = {
                incomeid: inc.id,
                isRepeating: inc.isRepeating,
                incomeName: inc.name,
                repeating: inc.repeating,
                id: pay.id,
                payDate : new Date(pay.payDateTimeStamp),
                name: pay.name,
              };
              payChecks.push(data);

            })
          })
        }
      })
    me.storage.get('getTransaction').then((res) => {
      me.Alltransactions = res['transactions'];
      if (me.Alltransactions.length > 0) {
        me.loading = false;
        me.transactions = me.getFilter(me.Alltransactions, payChecks);
        me.transactions = me.transactions.sort(function (a, b) { return b.transactionDateTimeStamp - a.transactionDateTimeStamp });
      }
      else {
        me.loading = false;
      }
    }).catch(() => {
      me.loading = false;
    });
  }
  async details(data) {
    this.transService.settransactionDetails({
      transaction:data,
      lastRoute:'/tabs/tabs/transaction-select/transaction-details'
    })
    var that = this;
    const modal = await that.modalCtrl.create({
      component: ChangePaycheckPopupPage,
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        this.getTransaction(this.dateRange.from, this.dateRange.to);
      })
  }
  async openCalendar() {
    const options: CalendarModalOptions = {
      pickMode: 'range',
      title: 'RANGE',
      canBackwardsSelected: true
    };


    const myCalendar = await this.modalCtrl.create({
      component: CalendarModal,
      componentProps: { options }
    });

    myCalendar.present();
    const event: any = await myCalendar.onDidDismiss();
    const date: any = event.data;
    if (event.role != 'cancel' && event.role != null) {
      this.dateRange.displayForm = moment(date.from.dateObj).format('L');
      this.dateRange.displayTo = moment(date.to.dateObj).format('L');
      this.getTransaction(date.from.dateObj, date.to.dateObj);
    }
  }
  getFilter(items, payChecks) {
    let start = new Date(this.dateRange.displayForm);
    let end = new Date(this.dateRange.displayTo);
    return items.filter(item => {
      let plaid_type = false;
      let amount = 0;
      let paycheck = [];
      let date = new Date(item.transactionDateTimeStamp);
      if (item.plaidTransId) {
        item.assignment.forEach(el => {
          var pa = payChecks.find(o => o.id == el.paycheckId);
          if (pa) {
            pa.amount = el.amount;
            paycheck.push(pa);
          }
          amount = amount + el.amount;
        });
        plaid_type = true;
        item.showDetails = true;
        item.paycheck = [paycheck];
        item.amount = amount;
      }
      else {
        item.assignment.forEach(el => {
         var pa = payChecks.find(o => o.id == el.paycheckId);
         if (pa) {
          pa.amount = el.amount;
          paycheck.push(pa);
        }
        });
        item.showDetails = true;
        item.paycheck = [paycheck];
      }

      item.plaid_type = plaid_type;
      //86340000 this for 23:59 min add in the last date
      return item.transactionDateTimeStamp >= (start.getTime()) && item.transactionDateTimeStamp <= (end.getTime() + 86340000);
    })
  }
  plaid(trans) {
    this.cp.presentLoading();
    this.api.unAssignTransaction(trans.id).then((res) => {
      if (res['success']) {

        this.api.getTransaction().then((res) => {
          this.storage.remove("incomeSource");
          this.api.getIncomeSource();
          this.events.publish('delete:transaction', { time: new Date() });
          if (trans.plaid_type) {
            this.api.getPlaidTransactionById(trans.plaidTransId).then(resolve => {
              this.cp.dismissLoading();
              this.getTransaction(this.dateRange.from, this.dateRange.to);
            }).catch(err => {
              this.cp.dismissLoading();
              this.cp.presentToast(err);
            });
          }
          else {
            this.cp.dismissLoading();
            this.api.getGoal();
            this.getTransaction(this.dateRange.from, this.dateRange.to);
          }

        });

      }
    }).catch(err => {
      this.cp.dismissLoading();

    });
  }
  async unAssignTransaction(trans) {
    swal({
      title: "Unassign Transaction",
      text: "Are you sure you want to unassign this transaction?",
      icon: "error",
      buttons: ["Cancel","Confirm"],
      closeOnClickOutside: false
    })
    .then((value) => {
      if(value){
        this.plaid(trans);
      }
    })
  }
  ionViewWillLeave() {
    var me = this;
    me.transactions = [];
  }
  async optionChoose(ev,trans){
    const popover = await this.popoverController.create({
      component: DetailsPage,
      componentProps: {},
      cssClass: 'my-custom-class',
      event: ev,
      translucent: true
    });
    popover.onDidDismiss()
    .then((result) => {
      var data=result['data'];
     if(data=="edit"){
      this.changeCategory(trans);
    }
     if(data=="delete"){
      this.unAssignTransaction(trans)
      }
    });
    return await popover.present();
  }
  changeCategory(trans){
    let navigationExtras: NavigationExtras = {
      queryParams: {
        trans: JSON.stringify(trans)
      }, skipLocationChange: true
    };
    this.nav.navigateForward(['/tabs/tabs/home/change-category'], navigationExtras);
  }
  goToProfile() {
    this.nav.navigateForward(["tabs/tabs/home/profile"]);
  }
}
