import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonProvider } from 'src/providers/common';
import { Storage } from '@ionic/storage';
import { TransactionService } from 'src/app/services/transaction/transaction.service';
import { Events } from 'src/app/services/Events.service';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { ApiService } from 'src/app/services/api/api.service';
import { CategoriesPage } from 'src/app/categories/categories.page';
import * as firebase from 'firebase';
import swal from 'sweetalert';

@Component({
  selector: 'app-change-paycheck-popup',
  templateUrl: './change-paycheck-popup.page.html',
  styleUrls: ['./change-paycheck-popup.page.scss'],
})
export class ChangePaycheckPopupPage implements OnInit {
  subscribe: any;
  transaction;
  incomeSource = [];
  incomeForm: FormGroup;
  plaidcategoriesUpdate: boolean = false;
  CategoryChange: boolean = false;
  category_id;
  constructor(private cp: CommonProvider,
    private formBuilder: FormBuilder,
    private modalCtrl: ModalController,
    public tranService: TransactionService,
    private navCtrl: NavController,
    public transService: TransactionService,
    public events: Events,
    public logoutService: LogoutService,
    private api: ApiService, public storage: Storage) {
    this.incomeForm = this.formBuilder.group({
      categoryName: new FormControl('', [Validators.required]),
    });
    this.loadViewData();
  }
  loadViewData() {
    this.transaction = this.tranService.gettransactionDetails().transaction;
    this.transaction.amount = parseFloat(this.tranService.gettransactionDetails().transaction.amount);
    let user_transaction = [];
    this.storage.get('getTransaction')
      .then((local) => {
        user_transaction = local['transactions'];
      })
    this.storage.get('incomeSource')
      .then((res) => {
        if (res && res.length > 0) {
          this.incomeSource = res;
          var paychecksArray = [];
          res.forEach((income, index) => {
            income.paychecks.forEach(paycheck => {
              let data = {
                incomeid: income.id,
                isRepeating: income.isRepeating,
                incomeName: income.name,
                repeating: income.repeating,
                id: paycheck.id,
                budgetDetails: paycheck.budgetDetails,
                payDate: new Date(paycheck.payDateTimeStamp),
                name: paycheck.name,
              };
              paychecksArray.push(data);
            });
            if ((index) == res.length - 1 && this.transaction) {
              var payckeck = [];
              if (this.transaction.plaid) {
                this.transaction.assignment.forEach(assign => {
                  this.transaction.paycheck = [];
                  let pa = paychecksArray.find(o => o.id == assign);
                  if (pa) {

                    if (pa.budgetDetails.length > 0) {
                      pa.budgetDetails.forEach(element => {
                        if (element.category_id === this.transaction.category_id) {
                          for (let tId of element.transactions) {
                            let transMatch = user_transaction.find(o => o.id == tId && o.plaidTransId === this.transaction.id);
                            if (transMatch) {
                              this.transaction.plaidTransId = transMatch.plaidTransId;
                              this.transaction.id = transMatch.id;
                              let paycheckMatch = transMatch.assignment.find(o => o.paycheckId == pa.id);
                              pa.amount = paycheckMatch.amount;
                            }
                          }
                        }
                      });
                    }
                    payckeck.push(pa);
                    this.transaction.paycheck = payckeck;
                  }
                });
              }
              else {
                this.transaction.assignment.forEach(assign => {
                  this.transaction.paycheck = [];
                  let pa = paychecksArray.find(o => o.id == assign.paycheckId);
                  if (pa) {
                    pa.amount = assign.amount;
                  }
                  payckeck.push(pa);
                  this.transaction.paycheck = payckeck;
                });
              }


            }
          });
        }

      })
    if (this.transaction['category']) {
      this.category_id = this.transaction['category_id'];
      this.incomeForm.controls.categoryName.setValue(this.transaction['category']);
    }
  }
  ngOnInit() {

  }
  async changeCategory() {
    swal({
      title: "Category Change",
      text: "Are you sure you want to change the Category of this transaction?",
      icon: "info",
      buttons: ["No", "Yes"],
      closeOnClickOutside: false
    })
      .then((value) => {
        if (value) {
          this.CategoryChange = true;
        }
      })

  }
  back() {
    this.modalCtrl.dismiss();
  }
  gotoPaycheckDetails(paycheck) {
    var income = this.incomeSource.find(o => o.id === paycheck.incomeid)
    if (income) {
      var getPaycheck = income.paychecks.find(o => o.id === paycheck.id)
      if (getPaycheck) {
        getPaycheck.repeating = income.isRepeating ? income.repeating.type : "";
        getPaycheck.incomeid = income.id;
        this.transService.setPaycheckDetails({
          payPeriods: getPaycheck,
          repeatingType: income.isRepeating ? income.repeating.type : "",
          lastroute: "/tabs/tabs/paycheck"
        });
        this.navCtrl.navigateForward(['/tabs/tabs/paycheck/paycheck-details']);

      }
    }

  }
  async changePaycheck(paycheck) {
    swal({
      title: "Paycheck Change",
      text: "Are you sure you want to change the paycheck assigned to this transaction?",
      icon: "info",
      buttons: ["No", "Yes"],
      closeOnClickOutside: false
    })
      .then((value) => {
        if (value) {
          this.openCategory(paycheck);
        }
      });
  }
  async openCategory(paycheck) {
    var that = this;
    that.cp.showLoading(3000);
    const modal = await that.modalCtrl.create({
      component: CategoriesPage,
      componentProps: {
        category: false,
        paycheck: paycheck.id
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        if (value.data && value.data.payCheck) {
          that.cp.presentLoading();
          if (value.data.payCheck.paycheckId === paycheck.id) {
            that.cp.dismissLoading();
          }
          else {
            let argmnt = {
              old_paycheck: paycheck,
              new_paycheck: value.data.payCheck,
              transaction: this.transaction
            }
            that.api.changePaychecks(argmnt).then(function (response: any) {
              if (response.success) {
                that.transService.markPaycheck(value.data.payCheck.paycheckId);
                that.api.getTransaction();
                that.api.getIncomeSource();
                that.api.getPlaidTransaction();
                that.api.getGoal();
                that.events.publish('change:paycheck', { time: new Date() });
                var refreshDetail = that.transaction;
                that.incomeSource.forEach(ele => {
                  ele.paychecks.forEach(new_p => {
                    let i_old = refreshDetail.paycheck.findIndex(o => o.id === paycheck.id);

                    if (new_p.id === value.data.payCheck.paycheckId && i_old != -1) {
                      that.transaction = [];
                      refreshDetail.paycheck[i_old].name = new_p.name;
                      refreshDetail.paycheck[i_old].incomeName = ele.name;
                      refreshDetail.paycheck[i_old].isRepeating = ele.isRepeating;
                      refreshDetail.paycheck[i_old].incomeid = ele.id;
                      refreshDetail.paycheck[i_old].repeating = ele.repeating;
                      refreshDetail.paycheck[i_old].id = new_p.id;
                      refreshDetail.paycheck[i_old].payDate = new Date(new_p.payDateTimeStamp);
                      // that.loadViewData();
                      that.transaction = refreshDetail;
                      that.cp.dismissLoading();
                    }
                  });
                });
                swal({
                  title: "SuccessFully Changed the Paycheck Details",
                  icon: "success"
                })
              }
              else {
                swal({
                  title: "Something error occured while changing the paycheck.",
                  icon: "error"
                })
                that.cp.dismissLoading();
              }
            })
              .catch(function () {
                that.cp.dismissLoading();
              });
          }

        }
      })
  }
  async remove(trans) {
    swal({
      title: "Delete Transaction",
      text: "Are you sure you want to permanently delete this transaction from this app?",
      icon: "error",
      buttons: ["No", "Yes"],
      closeOnClickOutside: false
    })
      .then((value) => {
        if (value) {
          this.plaid(trans);
        }
      })
  }
  plaid(trans) {
    this.cp.presentLoading();
    this.api.unAssignTransaction(trans.id).then((res) => {
      if (res['success']) {
        this.api.getTransaction().then((res) => {
          this.storage.remove("incomeSource");
          this.api.getIncomeSource();
          if (trans.plaid_type) {
            this.api.getPlaidTransactionById(trans.plaidTransId).then(resolve => {
              this.events.publish('delete:transaction', { time: new Date() });
              this.cp.dismissLoading();
              this.back();
            }).catch(err => {
              this.cp.dismissLoading();
              this.cp.presentToast(err);
            });
          }
          else {
            this.events.publish('delete:transaction', { time: new Date() });
            this.cp.dismissLoading();
            this.back();
          }

        });

      }
    }).catch(err => {
      this.cp.dismissLoading();

    });
  }


  // --------------------------------------------category change---------------------------------------------
  async selectCategory() {
    let me = this;
    me.cp.showLoading(3000);
    const modal = await this.modalCtrl.create({
      component: CategoriesPage,
      componentProps: {
        category: true,
        goals: false
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        if (value.data) {
          me.category_id = value.data.category_id;
          me.incomeForm.controls.categoryName.setValue(value.data.categoryName);
        }
      });
  }

  submit() {
    var me = this;
    me.cp.presentLoading();
    let argmnt = {
      transaction: me.transaction,
      new_category: {
        category: me.incomeForm.controls.categoryName.value,
        categoryName: me.incomeForm.controls.categoryName.value,
        category_id: me.category_id
      }
    };
    me.api.updateCategory(argmnt).then(function (res) {
      if (res['success']) {
        me.api.getTransaction();
        me.api.getIncomeSource();
        me.api.getPlaidTransaction();
        me.api.getGoal()
        setTimeout(() => {
          me.events.publish("delete:transaction", { time: new Date() });
          if (me.CategoryChange) {
            me.transaction['category'] = me.incomeForm.controls.categoryName.value;
            me.transaction['category_id'] = me.category_id;
            me.CategoryChange = false;
            me.cp.dismissLoading();
          }
          else {
            me.cp.dismissLoading();
            me.navCtrl.pop();
          }
        }, 500)
      }
      else {
        me.cp.dismissLoading();
      }
    }).catch(() => {
      me.cp.dismissLoading();
    })
  }
}

