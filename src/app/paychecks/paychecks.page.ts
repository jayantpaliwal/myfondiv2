import {  ModalController, IonSelect } from '@ionic/angular';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { Component, ViewChild,  OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Events } from '../services/Events.service';
import { Storage } from '@ionic/storage';
import { ChangePaycheckPopupPage } from '../transaction-details/change-paycheck-popup/change-paycheck-popup.page';
import { TransactionService } from '../services/transaction/transaction.service';
import { ApiService } from '../services/api/api.service';
import introJs from 'intro.js/intro.js';
import swal from 'sweetalert';
import { $ } from 'protractor';
@Component({
  selector: 'app-paychecks',
  templateUrl: 'paychecks.page.html',
  styleUrls: ['paychecks.page.scss']
})
export class PaychecksPage implements OnInit {
  incomePaychecks: any = [];
  IncomeSources: any = [];
  item = [];
  allIncomeandExp = [];
  filterIncome = [];
  calendar_dates = [];
  sorting = "date";
  filter = "all";
  transaction = 'paycheck';
  month: string;
  year: number;
  m: number;
  currentMonthPaychecks = [];
  totalReceivedamt: number = 0;
  Cal_date: string;
  filterIncomes = "all";
  monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  @ViewChild('filtered') filtered: IonSelect;
  @ViewChild('calendarDate') calendarDate: IonSelect;
  userPic: any;
  constructor(
    public events: Events,
    private transService: TransactionService,
    private modalCtrl: ModalController,
    public logoutService: LogoutService,
    private router: Router,
    private storage: Storage,
    private api: ApiService
  ) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
    events.subscribe('change:paycheck', (rr) => {
      this.getIncome();
      this.getTransaction();
    });
  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic;
    this.getIncome();
    this.getTransaction();
    let date = new Date()
    this.currentDate(date);
    this.getDatePicker();
  }
  ngOnInit() { }
  currentDate(date) {
    this.Cal_date = this.monthNames[date.getMonth()] + ' ' + date.getUTCFullYear();
    this.m = date.getMonth();
    this.year = date.getFullYear();
  }
  addIncome() {
    this.router.navigate(['/tabs/tabs/home/add-income'], { replaceUrl: true });
  }
  getTransaction() {
    var response = [];
    this.storage.get('getTransaction')
      .then((res) => {
        if (res.transactions) {
          res.transactions.forEach(element => {
            element.assignment.forEach(pay => {
              let data = {
                incomeid: element.id,
                transaction: element,
                incomeName: element.name,
                id: pay.paycheckId,
                name: element.category,
                category_id: element.category_id,
                payDate: element.transactionDateTime,
                payDateTimeStamp: element.transactionDateTimeStamp,
                totalReceivedamt: pay.amount,
                type: element.type
              }
              response.push(data);
            })
          });
        }
        this.getCurrentMonthIncome(response);
      })
  }
  getIncome() {
    var Paychecks = [];
    this.storage.get('incomeSource')
      .then((res) => {
        if (res) {
          this.IncomeSources = res;
          res.forEach(element => {
            element.paychecks.forEach(pay => {
              let data = {
                incomeid: element.id,
                budgetTemplate: element.budgetTemplate,
                isRepeating: element.isRepeating,
                incomeName: element.name,
                repeating: element.repeating,
                startDate: element.startDate,
                weeks: element.weeks,
                budgetDetails: pay.budgetDetails,
                budgetsAvailable: pay.budgetsAvailable,
                budgetsCurrent: pay.budgetsCurrent,
                budgetsToBeBudgeted: pay.budgetsToBeBudgeted,
                id: pay.id,
                isOverbudget: pay.isOverbudget,
                isOverspent: pay.isOverspent,
                name: pay.name,
                markedToLatestAssign: pay.markedToLatestAssign,
                payDate: pay.payDate,
                payDateTimeStamp: pay.payDateTimeStamp,
                receivedPaycheckTransaction: pay.receivedPaycheckTransaction,
                totalExpected: pay.totalExpected,
                totalReceived: pay.totalReceived,
                totalReceivedamt: element.budgetTemplate.totalExpected,
                type: "income"
              };
              Paychecks.push(data);
            })
          })
          this.incomePaychecks = Paychecks;
          this.filterIncome = this.incomePaychecks.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
        }

      })

  }
  getCurrentMonthIncome(arg) {
    this.currentMonthPaychecks = [];
    this.allIncomeandExp = [];
    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = new Date(this.year, this.m, 1).getTime();
    var lastDay = new Date(this.year, this.m + 1, 0, 23, 59, 59).getTime();
    var income = 0;
    var expense = 0;
    arg.forEach(element => {
      if (firstDay <= element.payDateTimeStamp && element.payDateTimeStamp <= lastDay) {
        if (element.type == "income") {
          income = income + (element.totalReceivedamt > 0 ? element.totalReceivedamt : -(element.totalReceivedamt));
        }
        else {
          expense = expense + (-(element.totalReceivedamt));
        }
        this.currentMonthPaychecks.push(element);
        this.currentMonthPaychecks = this.currentMonthPaychecks.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
        this.allIncomeandExp = this.currentMonthPaychecks;
      }
    });
    if ((income + expense) < 0) {
      this.totalReceivedamt = (income + expense);
    }
    else {
      this.totalReceivedamt = (income + expense);
    }
    this.getFilterArray(this.filterIncomes);
  }
  goToProfile() {
    this.router.navigate(["tabs/tabs/home/profile"]);
  }
  openPayPeriod(pay) {
    let paychecks = {
      budgetDetails: pay.budgetDetails,
      budgetsAvailable: pay.budgetsAvailable,
      budgetsCurrent: pay.budgetsCurrent,
      budgetsToBeBudgeted: pay.budgetsToBeBudgeted,
      id: pay.id,
      isOverbudget: pay.isOverbudget,
      isOverspent: pay.isOverspent,
      name: pay.name,
      incomeid: pay.incomeid,
      incomeName: pay.incomeName,
      payDate: pay.payDate,
      payDateTimeStamp: pay.payDateTimeStamp,
      receivedPaycheckTransaction: pay.receivedPaycheckTransaction,
      totalExpected: pay.totalExpected,
      totalReceived: pay.totalReceived
    }

    this.transService.setPaycheckDetails({
      payPeriods: paychecks,
      repeatingType: (pay.isRepeating ? pay.repeating.type : null),
      lastroute: "/tabs/tabs/paycheck"
    });
    this.router.navigate(['/tabs/tabs/paycheck/paycheck-details']);
  }
  back() {
    this.router.navigate(['tabs/tabs/budgets'], { replaceUrl: true });
  }
  sort(ev) {
    if (ev.detail.value == "date") {
      this.sorting = ev.detail.value;
      var result = this.filterIncome.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
      this.filterIncome = [];
      this.filterIncome = result;
    }
    if (ev.detail.value == "name") {
      this.sorting = ev.detail.value;
      var result = this.filterIncome.sort((a, b) => a.name.localeCompare(b.name));
      this.filterIncome = [];
      this.filterIncome = result;
    }
  }
  Openfilter() {
    // this.filtered.value = null;
    this.filtered.open();
  }
  OpenCalendar() {
    // this.filtered.value = null;
    this.calendarDate.open();
  }
  chooseDate(event) {
    if (event.detail.value && this.calendar_dates[event.detail.value]) {
      this.Cal_date = this.calendar_dates[event.detail.value].value;
      this.m = this.calendar_dates[event.detail.value].m;
      this.year = this.calendar_dates[event.detail.value].year;
      this.getTransaction();
    }
  }
  chooseFilter(ev) {
    let that = this;
    var income = 0;
    var expense = 0;
    if (ev.detail.value) {
      that.currentMonthPaychecks = [];
      that.filterIncomes = ev.detail.value;
      that.getFilterArray(that.filterIncomes);
    }

  }

  getFilterArray(opt) {
    let that = this;
    var income = 0;
    var expense = 0;
    this.currentMonthPaychecks = [];
    if (opt === 'all') {
      that.currentMonthPaychecks = that.allIncomeandExp;
      that.allIncomeandExp.forEach(element => {
        if (element.type == "income") {
          income = income + (element.totalReceivedamt > 0 ? element.totalReceivedamt : -(element.totalReceivedamt));
        }
        else {
          expense = expense + (-(element.totalReceivedamt));
        }
      });
      if ((income + expense) < 0) {
        this.totalReceivedamt = (income + expense);
      }
      else {
        this.totalReceivedamt = (income + expense);
      }
    }
    if (opt === 'income') {
      that.allIncomeandExp.forEach(element => {
        if (element.type == 'income') {
          income = income + (element.totalReceivedamt > 0 ? element.totalReceivedamt : -(element.totalReceivedamt));
          that.currentMonthPaychecks.push(element);
        }
      });
      this.totalReceivedamt = income;
    }
    if (opt === 'expense') {
      that.allIncomeandExp.forEach(element => {
        if (element.type == 'expense') {
          expense = expense + element.totalReceivedamt;
          that.currentMonthPaychecks.push(element);
        }
      });
      this.totalReceivedamt = -(expense);
    }
  }
  setClasses(p, a, i) {
    return p.markedToLatestAssign ? a : i;
  }
  fliter(ev) {
    let that = this;
    if (ev.detail.value != "all") {
      var result = [];
      that.incomePaychecks.forEach(element => {
        if (element.incomeid == ev.detail.value) {
          result.push(element);
        }
      })
      that.filterIncome = [];
      var st = [];
      if (that.sorting == "date") {
        st = result.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
        that.filterIncome = st;
      }
      else if (that.sorting == "name") {
        st = result.sort((a, b) => a.name.localeCompare(b.name));
        that.filterIncome = st;
      }
      else {
        that.filterIncome = result;
      }
    }
    else {
      that.filterIncome = [];
      var st = [];
      if (that.sorting == "date") {
        st = that.incomePaychecks.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
        that.filterIncome = st;
      }
      else if (that.sorting == "name") {
        st = that.incomePaychecks.sort((a, b) => a.name.localeCompare(b.name));
        that.filterIncome = st;
      }
      else {
        that.filterIncome = that.incomePaychecks.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
      }
    }
  }
  getDatePicker() {
    var dates = [];
    var now = new Date();
    var future = now.setMonth(now.getMonth() + 1);
    let month_num = new Date().getMonth() + 1;
    let year_num = new Date(future).getFullYear();
    let month_name = this.monthNames[month_num];
    dates.push({ m: month_num, year: new Date(future).getFullYear(), value: this.monthNames[month_num] + ' ' + new Date(future).getUTCFullYear() });
    dates.push({ m: new Date().getMonth(), year: new Date().getFullYear(), value: this.monthNames[(new Date().getMonth())] + ' ' + new Date().getUTCFullYear() })
    let current = new Date();
    for (var i = 0; i < 11; i++) {
      var past = current.setMonth(current.getMonth() - 1, 1);
      let preDate = { m: new Date(past).getMonth(), year: new Date(past).getFullYear(), value: this.monthNames[(new Date(past).getMonth())] + " " + new Date(past).getUTCFullYear() };
      dates.push(preDate);
    }
    this.calendar_dates = dates;
  }
  ionViewWillLeave() {
    this.sorting = "date";
    this.filter = "all";
  }
  async gotoTransactionCard(ele) {
    var that = this;
    that.transService.settransactionDetails({
      transaction: ele.transaction,
      lastRoute: '/tabs/tabs/home'
    })
    const modal = await that.modalCtrl.create({
      component: ChangePaycheckPopupPage,
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        that.getTransaction();
      })
  }
  // setAsMostrecent(date){
  //   this.api.budgetCustomAPi(new Date(date).toLocaleDateString())
  // }

  //bhavna
  ngAfterViewInit() {
    setTimeout(() => {
      if (!localStorage.getItem('paychecksInfo')) {
        localStorage.setItem('paychecksInfo', 'true');
        introJs().setOptions({
          exitOnOverlayClick: false,
          showBullets: false,
          steps: [{
            intro: 'Paychecks is where you create and view your paycheck budgets.'
          },
          {
            element: '.paycheck',
            intro: 'This area is where you can view your paycheck budgets once created.'
          },
          {
            element: '.monthly',
            intro: 'This is where you can view all of your transactions in a monthly view or a defined range.'
          },
          {
            intro: 'Select the most recent paycheck'
          },
          {
            element: '.income',
            intro: 'Select Add Income Source to start your paycheck budget.'
          }]
        }).start();
      }
    }, 1000);
    
  }
}