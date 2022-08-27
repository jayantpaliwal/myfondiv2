import { LogoutService } from 'src/app/services/logout/logout.service';
import { Component } from '@angular/core';
import { NavController, AlertController, IonTabs } from '@ionic/angular';
import * as firebase from "firebase";
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { Events } from '../services/Events.service';


@Component({
  selector: 'app-pay-periods',
  templateUrl: 'pay-periods.page.html',
  styleUrls: ['pay-periods.page.scss']
})
export class PayPeriodsPage {
  type: string = "income";
  overSpent = 0;
  expenses = [];
  payPeriods: any=[];
  budgets = {
    toBeBudgeted: 0,
    budgeted: 0,
    available: 0,
    spend: 0
  }
  loading = false;
  surplus = '';
  subscribe:any;
  circleColor = ["#D8D8D8", "#2D82C2", "#55A7E1", "#7ADDFD", "#8e3e6e", "#1d0011", "#03001d", "#001d04", "#1b1d00", "#2b2b26", "#d6d69c", "#007eff"];
  currentDate = moment(new Date()).format(' MMM YYYY');
  date = new Date();
  currentMonth = this.date.getMonth() + 1 + "_" + this.date.getFullYear();
  constructor(private navCtrl: NavController, private route: ActivatedRoute,
     public events: Events, private alertController: AlertController, public logoutService: LogoutService) {
 
  }
  ionViewWillEnter(){
    this.subscribe=  this.route.queryParams.subscribe((params:any) => {
      if(params.payPeriods){
      this.payPeriods = JSON.parse(params.payPeriods);
      this.getExpense(this.payPeriods.income, this.payPeriods.weekNo);
      this.getSurPlus();
      }
    });
  }

  ionViewWillLeave() {
    if (this.subscribe) {
      this.subscribe.unsubscribe();
    }
    this.overSpent = 0;
    this.expenses = [];
    this.payPeriods=[];
    this.budgets = {
      toBeBudgeted: 0,
      budgeted: 0,
      available: 0,
      spend: 0
    }
    this.surplus = '';
  }

  getBudgetData(data) {
    let available = 0;
    let negativeAbsValue = 0;
    data.forEach(element => {
      element.forEach(dt => {
        this.budgets.spend = this.budgets.spend + dt.spend;
        this.budgets.budgeted = this.budgets.budgeted + dt.budgeted;
        available = available + dt.available;
        if (dt.available < 0) {
          negativeAbsValue = negativeAbsValue + Math.abs(dt.available)
        }
      });
    });
    this.budgets.available = available;
    this.calculaeToBeBudgeted(negativeAbsValue);
  }

  getSurPlus() {
    let me = this;
    let getDate = new Date(this.payPeriods.startDate);
    let endDate = new Date(this.payPeriods.endDate).getTime();
    const surplus = firebase.firestore().collection('surplus').doc(firebase
      .auth().currentUser.uid).collection("user_surplus").where("dateTimeStamp", "<=", endDate);
    surplus.get().then(snap => {
      let counter = 0;
      let amount = 0;
      snap.forEach(function (doc) {
        const data = doc.data();
        amount = amount + data.amount;
        counter++;
        if (counter == snap.docs.length) {
          me.surplus = amount.toFixed(2);
        }
      })
    });
  }


  calculaeToBeBudgeted(negativeAbsValue) {
    let totalIncome = 0;
    this.payPeriods.perPayCheck.forEach(element => {
      let text = "week" + this.payPeriods.weekNo + "Income";
      let transIncome = element[text];
      if (transIncome != 0) {
        /* let absIncome = element.payAmount - transIncome;
         if(absIncome < 0){
           totalIncome = totalIncome + element.payAmount + Math.abs(absIncome);
         }else{
           totalIncome = totalIncome + Math.abs(transIncome);
         }*/
        totalIncome = totalIncome + Math.abs(transIncome);

      } else {
        totalIncome = totalIncome + element.payAmount;
      }
    });
    this.budgets.toBeBudgeted = totalIncome - this.budgets.budgeted-negativeAbsValue;
  }

  getExpense(income, weekNo) {
    let me = this;
    me.loading = true;

    /*const budget = firebase.firestore().collection("user_budget").doc(firebase
      .auth().currentUser.uid).collection("month").doc(me.currentMonth + "_Week_" + weekNo);
    budget.get().then(snap => {
      if (snap.exists) {
        me.budgets.toBeBudgeted = income + snap.data().budgeted;
        //   me.budgets.available = income + snap.data().budgeted;

      } else {
        me.budgets.toBeBudgeted = income;
        //   me.budgets.available = income;
      }
    })*/
    me.expenses = [];
    me.overSpent = 0;
    const expense = firebase.firestore().collection('paychecks').doc(firebase
      .auth().currentUser.uid).collection("Expenses_" + me.currentMonth + "_Week_" + weekNo);
    expense.get().then(snap => {
      let i = 0;
      if (snap.docs.length == 0) {
        me.loading = false;
        me.calculaeToBeBudgeted(0);
      }
      snap.forEach(function (doc) {
        let categoryId = doc.id;
        me.getCategoryData(categoryId, weekNo).then((response) => {
          i++;
          me.expenses.push(response);
          if (snap.docs.length == i) {
            me.getBudgetData(me.expenses);
            me.loading = false;
            const groups = me.expenses.reduce((groups, values) => {
              const date = values.categoryId;
              if (!groups[categoryId]) {
                groups[categoryId] = [];
              }
              groups[categoryId].push(values);
              return groups;
            }, {});

            // Edit: to add it in the array format instead
            Object.keys(groups).map((categoryId) => {
              return {
                categoryId,
                items: groups[categoryId]
              };
            });
          }

        });
      });
    })
  }

  getCategoryData(categoryId, weekNo): Promise<any> {
    let expensesData = [];
    let me = this;
    return new Promise((resolve, reject) => {
      const category = firebase.firestore().collection('paychecks').doc(firebase
        .auth().currentUser.uid).collection("Expenses_" + me.currentMonth + "_Week_" + weekNo).doc(categoryId).collection('subCategory');
      category.get().then(snapCategory => {
        let i = 0;
        snapCategory.forEach(function (docCategory) {
          i++;
          let subcategoryData = docCategory.data();
          expensesData.push({
            categoryId: subcategoryData.categoryId,
            category: subcategoryData.category,
            subCategoryId: docCategory.id,
            subCategory: subcategoryData.subCategory,
            spend: subcategoryData.spend,
            budgeted: subcategoryData.budgeted,
            available: subcategoryData.budgeted - subcategoryData.spend

          })
          if ((subcategoryData.budgeted - subcategoryData.spend) < 0) {
            me.overSpent++;
          }
          if (snapCategory.docs.length == i) {
            resolve(expensesData);
          }
        });
      });
    });
  }

  categoryBudget(items) {
    let value = items.reduce(function (acc, item) { return acc + item.budgeted; }, 0)
    return "$" + parseFloat(value).toFixed(2);
  }
  categorySpend(items) {
    let value = items.reduce(function (acc, item) { return acc + item.spend; }, 0)
    return "$" + parseFloat(value).toFixed(2);
  }
  categoryAvailable(items) {
    let value = items.reduce(function (acc, item) { return acc + item.available; }, 0)
    return "$" + parseFloat(value).toFixed(2);
  }
  categoryName(items) {
    return items[0].category;
  }

  showPaycheckName(period) {
    if (period.payAmount > 0) {
      return period.paycheckName + "-" + period.date;
    }
    else {
      return period.paycheckName;
    }
  }
  getIncome(period) {
    let text = "week" + this.payPeriods.weekNo + "Income";
    return "$" + period[text];
  }
}
