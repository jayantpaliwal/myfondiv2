import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { Storage } from '@ionic/storage';
import * as moment from 'moment';
import { CalendarModal, CalendarModalOptions } from "ion2-calendar";
import { ModalController, NavController } from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { TransactionService } from '../services/transaction/transaction.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
})
export class TransactionsPage implements OnInit {
  payPeriods: any;
  subscribe: any;
  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
    displayForm: moment(new Date(new Date().setDate(new Date().getDate() - 7))).format('L'),
    displayTo: moment(new Date()).format('L'),
  };
  recurring: any;
  nonRecurring: any;
  transaction = 'paycheck';
  payChecks = [];
  allpayChecks: any = [];
  defualtpayChecks = [];
  paycheck = [];
  selectedPaycheck: any;
  selectedPaycheckID: any;
  budgetDetails = [];
  repeating: any;
  overSpend: number;
  userPic: any;
  constructor(private route: ActivatedRoute,  public events: Events,private transService: TransactionService,
    public logoutService: LogoutService, private router: Router,
    private modalCtrl: ModalController, private navCtrl: NavController,
    public storage: Storage) {
      events.subscribe('refresh:income', () => {
        this.getPaycheckDetail();
      });
      events.subscribe('update:profile', (profile) => {
        if (profile.userPic) {
          this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
        }
      });
  }
  ionViewWillEnter(){
    this.userPic = this.logoutService.userPic;
    this.getPaycheckDetail();
  }
  ngOnInit() {
  }
  getPaycheckDetail(){
    this.subscribe = this.route.queryParams.subscribe((params: any) => {
      this.allpayChecks=[];
      this.defualtpayChecks=[];
      this.payPeriods=[];
      if (params.payPeriods) {
        this.payPeriods = JSON.parse(params.payPeriods);
        if(params.repeatingType){
          this.repeating = params.repeatingType;
        }
        else{
          this.repeating ="";
        }
        this.defualtpayChecks = this.payPeriods;
        this.payChecks = this.defualtpayChecks;
        this.allpayChecks = this.defualtpayChecks;
        this.categoryName(this.allpayChecks['budgetDetails']);
      }
    });
  }
  onSelectChange(event) {
    this.selectedPaycheckID = event.detail.value;
    var result = this.defualtpayChecks.find(o => o.id === event.detail.value);
    this.allpayChecks = result;
  }


  ionViewWillLeave() {
    if (this.subscribe) {
      this.subscribe.unsubscribe();
    }
  }
  totalExpected() {
    let value = this.payPeriods.paychecks.reduce(function (acc, val) { return acc + val.totalExpected; }, 0)
    return "$" + parseFloat(value).toFixed(2);
  }
  totalReceived() {
    let value = this.payPeriods.paychecks.reduce(function (acc, val) { return acc + val.totalReceived; }, 0);
    return "$" + parseFloat(value).toFixed(0);
  }
  getFilter(items) {
    let start = new Date(this.dateRange.displayForm);
    let end = new Date(this.dateRange.displayTo);
    return items.filter(item => {
      let date = new Date(item.payDateTimeStamp);
      //86340000 this for 23:59 min add in the last date
      return date.getTime() >= (start.getTime()) && date.getTime() <= (end.getTime() + 86340000);
    })
  }
  back() {
    this.navCtrl.navigateBack('tabs/tabs/paycheck');
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
      this.defualtpayChecks = this.getFilter(this.defualtpayChecks);
      this.payChecks = this.defualtpayChecks[0];

    }
  }
  goToProfile() {
    this.router.navigate(["tabs/tabs/home/profile"]);
  }
  async addPaycheck() {
    this.transService.setBudgetDetails({
      payPeriods: this.allpayChecks,
      repeating:this.repeating,
      incomeSourceId: this.allpayChecks['incomeid']
    });
    this.navCtrl.navigateRoot("tabs/tabs/paycheck/budget-allocation");
  }
  currentBalance() {
    let value = this.allpayChecks['totalReceived'];
    if (isNaN(value)) {
      value = 0;
    }
    return "$" + parseFloat(value).toFixed(2);
  }
  openPayPeriod(paycheck) {
    this.transService.setPaycheckDetails({
      payPeriods: paycheck,
      repeatingType: (paycheck.isRepeating ? paycheck.repeating.type : null),
      lastroute: "/tabs/tabs/paycheck"
    });
    this.router.navigate(['tabs/tabs/paycheck/paycheck-details']);
  }
  categoryBudget(items) {
    let value = items.reduce(function (acc, item) { return acc + item.budgeted; }, 0)
    if (isNaN(value)) {
      value = 0;
    }
    return "$" + parseFloat(value).toFixed(2);
  }
  categorySpend(items) {
    let value = items.reduce(function (acc, item) { return acc + item.spend; }, 0)
    if (isNaN(value)) {
      value = 0;
    }
    return "$" + parseFloat(value).toFixed(2);
  }
  categoryAvailable(items) {
    let value = items.reduce(function (acc, item) { return acc + item.available; }, 0)
    if (isNaN(value)) {
      value = 0;
    }
    return "$" + parseFloat(value).toFixed(2);
  }
  categoryName(items) {
    var category = [];
    this.overSpend=0;
    if (items.length > 0) {
      items.forEach(element => {
        var result = items.find(o => o.category_id === element.category_id);
        var budgeted = 0, spend = 0, available = 0;
        budgeted = budgeted + result.budgeted;
        spend = spend + result.spent;
        available = available + result.available;
        if(available<0){
          this.overSpend++;
        }
        category.push({
          category: result.category,
          category_id : result.category_id,
          budgeted: (Number.isInteger(budgeted) ? budgeted : budgeted),
          spend:  (Number.isInteger(spend) ? spend: spend),
          available:  (Number.isInteger(available) ? available: available)
        })
      });
      this.budgetDetails = category;
    }
  }
  numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

}
