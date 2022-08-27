import { NavController, ModalController, IonSelect } from '@ionic/angular';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { Component, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Events } from '../services/Events.service';
import { Storage } from '@ionic/storage';
import { CalendarModal, CalendarModalOptions } from 'ion2-calendar';
import { ChangePaycheckPopupPage } from '../transaction-details/change-paycheck-popup/change-paycheck-popup.page';
import { TransactionService } from '../services/transaction/transaction.service';
import * as firebase from 'firebase';
import { CommonProvider } from 'src/providers/common';
import { ApiService } from '../services/api/api.service';
import introJs from 'intro.js/intro.js';

@Component({
  selector: 'app-paycheck-details',
  templateUrl: 'paycheck-details.page.html',
  styleUrls: ['paycheck-details.page.scss']
})
export class PaycheckDetailsPage implements OnInit {
  payPeriods: any;
  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
    displayForm: moment(new Date(new Date().setDate(new Date().getDate() - 7))).format('L'),
    displayTo: moment(new Date()).format('L'),
  };
  recurring: any;
  nonRecurring: any;
  transaction = 'payDetails';
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
  incomePaychecks: any = [];
  IncomeSources: any = [];
  item = [];
  allIncomeandExp = [];
  filterIncome = [];
  calendar_dates = [];
  sorting = "date";
  filter = "all";
  month: string;
  year: number;
  m: number;
  currentMonthPaychecks = [];
  incomeReceivedPaychecks = [];
  totalReceivedamt: number = 0;
  Cal_date: string;
  filterIncomes = "all";
  monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  @ViewChild('filtered') filtered: IonSelect;
  @ViewChild('calendarDate') calendarDate: IonSelect;
  paycheckDetails: boolean = false;
  paycheckId: any;
  lastroute;
  totalReceived_amt: any = 0;
  totalExpected_amt: any = 0;
  budgetsToBeBudgeted_amt: any = 0;
  budgetsCurrent_amt: any = 0;
  budgetsAvailable_amt: any = 0;
  totalSurplusAmount: any = 0;
  transactionRecord = [];
  expand: boolean = false;
  add_incomes = [];
  _wordBreaker: boolean = false;
  public loaderStatus = false;
  constructor(
    private transactionService: TransactionService,
    public events: Events,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    public logoutService: LogoutService,
    public cp: CommonProvider,
    public api: ApiService,
    private router: Router, private storage: Storage) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });

    events.subscribe('update:Income', () => {
      this.getIncome();
      this.getPaycheckDetail();
    });
    events.subscribe('delete:transaction', (res) => {
      this.getPaycheckDetail();
    });
  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic;
    this.getIncome();
    this.getPaycheckDetail();
    let date = new Date()
    this.currentDate(date);
    this.getDatePicker();
  }
  getPaycheckDetail() {
    if (!this.loaderStatus) {
      this.allpayChecks = [];
      this.defualtpayChecks = [];
      this.payPeriods = null;
      if (this.transactionService.getPaycheckDetails()) {
        let paydetail = this.transactionService.getPaycheckDetails().payPeriods;
        let incomeId = paydetail['incomeid'];
        let payId = paydetail['id'];
        if (this.transactionService.getPaycheckDetails().repeatingType) {
          this.repeating = this.transactionService.getPaycheckDetails().repeatingType;
        }
        else {
          this.repeating = "";
        }
        if (this.transactionService.getPaycheckDetails().lastroute) {
          this.lastroute = this.transactionService.getPaycheckDetails().lastroute;
        }
        this.storage.get('incomeSource')
          .then((res) => {
            this.incomeReceivedPaychecks = [];
            this.add_incomes = [];
            var surplusTotalBudget = 0;
            if (res) {
              this.IncomeSources = res;
              let element = res.find(o => o.id === incomeId);
              if (element) {
                let payEle = element.paychecks.find(o => o.id == payId);
                if (payEle) {
                  var me = this;
                  // me.cp.showLoading(1000);
                  this.loaderStatus = true;
                  me.api.getSurplus({
                    userId: firebase.auth().currentUser.uid,
                    incomeSourceId: incomeId,
                    payDateTimeStamp: payEle.payDateTimeStamp,
                    paycheckId: payId
                  }).then((surplusRes: any) => {
                    if (surplusRes.success) {
                      payEle.budgetsToBeBudgeted = surplusRes.budgetsToBeBudgeted;
                      payEle.surplusBudgetTemplate = surplusRes.surplusBudgetTemplate;
                      payEle.budgetsAvailable = surplusRes.budgetsAvailable;
                      payEle.isOverbudget = surplusRes.isOverbudget;
                      payEle.isOverspent = surplusRes.isOverspent;
                    }
                    loadPaycheck(payEle);
                    //  me.cp.hideLoading();
                    this.loaderStatus = false;
                  }).catch((err) => {
                    loadPaycheck(payEle);
                    // me.cp.hideLoading();
                    this.loaderStatus = false;
                  })
                  function loadPaycheck(pay) {
                    let incomeReceived = [];
                    if (pay.receivedPaycheckTransaction.length) {
                      me.storage.get('getTransaction')
                        .then((res) => {
                          if (res.transactions) {
                            pay.receivedPaycheckTransaction.forEach((received: any) => {
                              let receivedIncome = res.transactions.find(o => o.id === received);
                              if (receivedIncome) {
                                let assign = receivedIncome.assignment.find(o => o.paycheckId === pay.id);
                                if (assign) {
                                  me.incomeReceivedPaychecks.push({
                                    name: receivedIncome.name,
                                    amount: assign.amount,
                                    transaction: receivedIncome,
                                    payDate: receivedIncome.transactionDateTime
                                  })
                                }
                              }
                            })

                          }
                        })
                    }
                    if (pay.add_incomes && pay.add_incomes.length) {
                      // debugger;
                      me.add_incomes = pay.add_incomes;
                    }
                    surplusTotalBudget = pay.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                      return a + b;
                    }, 0);
                    var surplusTotalBudget1 = me.events.putThousandsSeparators(surplusTotalBudget.toFixed(2), ",");
                    me.totalSurplusAmount = surplusTotalBudget >= 0 ? surplusTotalBudget1 : "(" + surplusTotalBudget1.split("-")[1] + ")";
                    me.payPeriods = Object.assign(
                      { incomeid: element.id }, { budgetTemplate: element.budgetTemplate }, { isRepeating: element.isRepeating },
                      { incomeName: element.name }, { repeating: element.repeating }, { startDate: element.startDate }, { weeks: element.weeks },
                      { surplusTotalBudget: surplusTotalBudget }, { incomeAdded: (incomeReceived.length ? incomeReceived : []) }, { showIncomes: true },
                      { totalReceivedamt: element.budgetTemplate.totalExpected }, { type: "income" },
                      pay
                    );

                    me.defualtpayChecks = me.payPeriods;
                    me.payChecks = me.defualtpayChecks;
                    me.allpayChecks = me.defualtpayChecks;
                    me.totalReceived_amt = me.events.putThousandsSeparators(parseFloat(me.allpayChecks['totalReceived']).toFixed(2), ",");
                    me.totalExpected_amt = me.events.putThousandsSeparators(parseFloat(me.allpayChecks['totalExpected']).toFixed(2), ",");
                    me.budgetsToBeBudgeted_amt = me.events.putThousandsSeparators(parseFloat(me.allpayChecks['budgetsToBeBudgeted']).toFixed(2), ",");
                    me.budgetsCurrent_amt = me.events.putThousandsSeparators(parseFloat(me.allpayChecks['budgetsCurrent']).toFixed(2), ",");
                    me.budgetsAvailable_amt = me.events.putThousandsSeparators(parseFloat(me.allpayChecks['budgetsAvailable']).toFixed(2), ",");
                    me.budgetsAvailable_amt = checkHasNegative(me.budgetsAvailable_amt) ? '(' + me.budgetsAvailable_amt.split('-')[1] + ')' : me.budgetsAvailable_amt;
                    me.budgetsToBeBudgeted_amt = checkHasNegative(me.budgetsToBeBudgeted_amt) ? '(' + me.budgetsToBeBudgeted_amt.split('-')[1] + ')' : me.budgetsToBeBudgeted_amt;
                    me.budgetsCurrent_amt = checkHasNegative(me.budgetsCurrent_amt) ? '(' + me.budgetsCurrent_amt.split('-')[1] + ')' : me.budgetsCurrent_amt;
                    me.totalReceived_amt = checkHasNegative(me.totalReceived_amt) ? '(' + me.totalReceived_amt.split('-')[1] + ')' : me.totalReceived_amt;
                    me.totalExpected_amt = checkHasNegative(me.totalExpected_amt) ? '(' + me.totalExpected_amt.split('-')[1] + ')' : me.totalExpected_amt;
                    if (me.budgetsToBeBudgeted_amt.length > 12 || me.budgetsCurrent_amt.length > 12 || me.budgetsAvailable_amt.length > 12) {
                      me._wordBreaker = true;
                    }
                    me.categoryName(me.allpayChecks['budgetDetails']);
                  }
                  function checkHasNegative(p1) {
                    var patt = new RegExp("-");
                    return patt.test(p1);
                  }
                }
              }
            }
          })
      }
    }
  }
  ngOnInit() {
  }
  currentDate(date) {
    this.Cal_date = this.monthNames[date.getMonth()] + ' ' + date.getUTCFullYear();
    this.m = date.getMonth();
    this.year = date.getFullYear();
  }
  getIncome() {
    var Paychecks = [];
    var response = [];
    this.storage.get('getTransaction')
      .then((res) => {
        if (res.transactions) {
          this.transactionRecord = res.transactions;
          res.transactions.forEach(element => {
            element.assignment.forEach(pay => {
              let data = {
                incomeid: element.id,
                incomeName: element.name,
                id: pay.paycheckId,
                name: element.category,
                category_id: element.category_id,
                transaction: element,
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
                payDate: pay.payDate,
                payDateTimeStamp: pay.payDateTimeStamp,
                receivedPaycheckTransaction: pay.receivedPaycheckTransaction,
                totalExpected: pay.totalExpected,
                totalReceived: pay.totalReceived,
                totalReceivedamt: element.budgetTemplate.totalExpected,
                type: "income"
              };
              // response.push(data);
              Paychecks.push(data);
            })
          })
          this.incomePaychecks = Paychecks;
          this.filterIncome = this.incomePaychecks.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp });
          // this.getCurrentMonthIncome(response);
        }

      })

  }
  getCurrentMonthIncome(arg) {
    this.currentMonthPaychecks = [];
    this.allIncomeandExp = []
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
      this.getIncome();
    }
  }
  chooseFilter(ev) {
    let that = this;
    if (ev.detail.value) {
      that.currentMonthPaychecks = [];
      that.filterIncomes = ev.detail.value;
      that.getFilterArray(ev.detail.value);
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
  onSelectChange(event) {
    this.selectedPaycheckID = event.detail.value;
    var result = this.defualtpayChecks.find(o => o.id === event.detail.value);
    this.allpayChecks = result;
    // this.categoryName(result.budgetDetails)
  }
  back() {
    this.transaction = 'payDetails';
    this.navCtrl.navigateBack('tabs/tabs/paycheck');
  }
  async addBudget() {
    if (this.allpayChecks['incomeid']) {
      this.transactionService.setBudgetDetails({
        payPeriods: this.allpayChecks,
        incomeSourceId: this.allpayChecks['incomeid'],
        repeating: this.repeating
      });
      this.navCtrl.navigateRoot("tabs/tabs/paycheck/budget-allocation");
    }
  }
  totalExpected() {
    let value = this.payPeriods.paychecks.reduce(function (acc, val) { return acc + val.totalExpected; }, 0)
    return "$" + parseFloat(value).toFixed(2);
  }
  getBudgeted(v) {
    return this.events.putThousandsSeparators(v);
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
  currentBalance() {
    let value = this.allpayChecks['totalReceived'];
    if (isNaN(value)) {
      value = 0;
    }
    return "$" + parseFloat(value).toFixed(2);
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
    this.overSpend = 0;
    this.budgetDetails = [];
    if (items.length > 0) {
      items.forEach(element => {
        var transaction = [];
        if (element.transactions.length > 0) {
          for (let me of element.transactions) {
            let find = this.transactionRecord.find(o => o.id == me);
            if (find && find.assignment) {
              let assignArray = find.assignment.find(o => o.paycheckId == this.allpayChecks['id'])
              if (assignArray) {
                let require = {
                  name: find.name,
                  id: find.id,
                  date: new Date(find.transactionDateTimeStamp),
                  type: find.type,
                  amount: find.amount,
                  assignamount: assignArray.amount
                }
                transaction.push(require);
              }
            }
          }
        }
        var budgeted = 0, spend = 0, available = 0;
        budgeted = budgeted + element.budgeted;
        spend = spend + element.spent;
        available = available + element.available;
        if (available < 0) {
          this.overSpend++;
        }
        category.push({
          category: element.category,
          category_id: element.category_id,
          transactions: transaction,
          showDetails: true,
          budgeted: (Number.isInteger(budgeted) ? budgeted : budgeted),
          spend: (Number.isInteger(spend) ? spend : spend),
          available: (Number.isInteger(available) ? available : available)
        })
        this.budgetDetails = category;
      });

    }
  }
  numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  transactionExpand(data) {
    if (data.showDetails) {
      data.showDetails = false;
    } else {
      data.showDetails = true;
    }
  }
  incomeExpandd(allpayChecks) {
    if (allpayChecks.showIncomes) {
      allpayChecks.showIncomes = false;
    } else {
      allpayChecks.showIncomes = true;
    }
  }
  async changePaycheck(income) {
    this.transactionService.settransactionDetails({
      transaction: income.transaction,
      lastRoute: '/tabs/tabs/paycheck/paycheck-details'
    })
    const modal = await this.modalCtrl.create({
      component: ChangePaycheckPopupPage,
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        this.getIncome();
        this.getPaycheckDetail();
        let date = new Date()
        this.currentDate(date);
        this.getDatePicker();
      })
  }
  ionViewWillLeave() {
    this.incomeReceivedPaychecks = [];
    this.budgetsAvailable_amt = 0;
    this.budgetsCurrent_amt = 0;
    this.budgetsToBeBudgeted_amt = 0;
    this.allpayChecks = [];
    this.add_incomes = [];
    this.totalReceived_amt = 0;
    this.totalExpected_amt = 0;
    this.budgetDetails = [];
  }
  ionViewDidEnter() {
    this.cp.showLoading(1500);
  }
  //bhavna
  ngAfterViewInit() {
    if (!localStorage.getItem('transactionInfo')) {
      localStorage.setItem('transactionInfo', 'true');
      introJs().setOptions({
        steps: [{
          intro: 'This is your paycheck budget view.'
        },
        {
          element: '.allocate',
          intro: 'Let\'s create your budget by selecting Click to Allocate.'
        }]
      }).start();
    }
  }
}
