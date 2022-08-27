import { CommonProvider } from './../../../providers/common';
import { Component, ViewChild, } from '@angular/core';
import { ModalController, NavController, LoadingController, IonSelect, AlertController } from '@ionic/angular';
import { Events } from 'src/app/services/Events.service';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { CategoriesPage } from 'src/app/categories/categories.page';
import { ApiService } from 'src/app/services/api/api.service';
import { Storage } from '@ionic/storage';
import { messages } from 'src/validation/messages';
import { PaycheckAllocationPopupPage } from 'src/app/paycheck-allocation-popup/paycheck-allocation-popup.page';
import { ActivatedRoute } from '@angular/router';
import { TransactionService } from 'src/app/services/transaction/transaction.service';
import swal from 'sweetalert';
@Component({
  selector: 'app-transaction-upload',
  templateUrl: 'transaction-upload.page.html',
  styleUrls: ['transaction-upload.page.scss']
})
export class TransactionUploadPage {
  IncomeSources = [];
  plaidTransaction = [];
  item: any[];
  validation_messages = messages;
  @ViewChild('incomeSourceId', { static: false }) incomeSourceId: IonSelect;
  @ViewChild('transactionSourceId', { static: false }) transactionSourceId: IonSelect;
  selectedincomeSource: any;
  incomeForm: any;
  addMoreItem = [];
  paycheckId: any;
  public loadingCtrl: any;
  lastIncomeAdded: any;
  selectedTransaction: any;
  subscribe: any;
  transaction: any;
  categoryName: any;
  amount: any;
  remainingAmount: any;
  name: any;
  date: any;
  parmsTranaction: any;
  category_id;
  IncomeType: any;
  constructor(public events: Events, private modalCtrl: ModalController, private transService: TransactionService,
    private api: ApiService, private cp: CommonProvider, private route: ActivatedRoute,
    public loadingController: LoadingController, public alertController: AlertController,
    private formBuilder: FormBuilder, private storage: Storage, private navCtrl: NavController) {
    var me = this;
    let params = me.api.getPlaidTransactionParam();
    if (params) {
      me.parmsTranaction = params;
      me.categoryName = params.category;
      me.category_id = params.category_id;
      me.selectedTransaction = params.id;
      me.IncomeType = params.IncomeType;
      me.amount = parseFloat(params.amount);
      me.remainingAmount = parseFloat(params.remainingAmount);
      if (me.remainingAmount < 0) {
        me.remainingAmount = -(me.remainingAmount);
      }
      me.name = params.name;
      me.date = params.date;
      let user_transaction = [];
      me.storage.get('getTransaction')
        .then((local) => {
          user_transaction = local['transactions'];
        })
      me.storage.get('incomeSource')
        .then((res) => {
          if (res && res.length) {
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
              if (index === (res.length - 1) && paychecksArray.length) {
                var payckeck = [];
                if (me.parmsTranaction.assignment) {
                  me.parmsTranaction.assignment.forEach(assign => {
                    let pa = paychecksArray.find(o => o.id == assign);
                    if (pa) {
                      if (pa.budgetDetails.length > 0) {
                        pa.budgetDetails.forEach(element => {
                          if (element.category === me.parmsTranaction.category) {
                            for (let tId of element.transactions) {
                              let transMatch = user_transaction.find(o => o.id == tId && o.plaidTransId === me.parmsTranaction.id);
                              if (transMatch) {
                                me.parmsTranaction.id = transMatch.id;
                                let paycheckMatch = transMatch.assignment.find(o => o.paycheckId == pa.id);
                                pa.amount = paycheckMatch.amount;
                              }
                            }
                          }
                        });
                      }
                      payckeck.push(pa);
                      me.parmsTranaction.paycheck = payckeck;
                    }
                  });
                }
              }
            });
          }

        })
    }
    me.incomeForm = me.formBuilder.group({
      payCheckName: new FormControl('', [Validators.required]),
      assignAmount: new FormControl('', [Validators.required, Validators.min(1)]),
    });
    me.getPlaidTransaction();
    me.getIncome();
  }
  loadViewData() {

  }
  getIncome() {
    this.storage.get('incomeSource')
      .then((res) => {
        if (res) {
          this.IncomeSources = res;
        }
      })
  }
  getPlaidTransaction() {

    this.storage.get('plaidTransaction')
      .then((res) => {
        if (res) {
          this.plaidTransaction = res['transactions'];
        }
      })
  }
  delete(i, index) {
    if (index !== -1) {
      this.addMoreItem[i].assignment.splice(index, 1);
    }
  }
  async addPaycheck() {
    let me = this;
    const modal = await this.modalCtrl.create({
      component: PaycheckAllocationPopupPage,
      componentProps: {
        PaycheckAllocation: false
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
      })
  }
  async openPayCheck() {
    var that = this;
    var paychecks = [];
    if(that.IncomeSources.length){
      that.cp.showLoading(3000);
      var modal = await that.modalCtrl.create({
        component: CategoriesPage,
        componentProps: {
          category: false,
          paychecks: JSON.stringify([paychecks])
  
        }
      });
      await modal.present();
      modal.onDidDismiss()
        .then((value: any) => {
          if (value.data) {
            that.paycheckId = value.data.payCheck['paycheckId'];
            that.selectedincomeSource = value.data.payCheck['incomeSourceId'];
            that.incomeForm.controls["payCheckName"].setValue(value.data.payCheck['name']);
  
  
  
          }
        })
    }
    else{
      swal({
        title:"Error",
        icon:"error",
        text:"Please Add a Income source to Assign Transactions Amount."
      });
      that.backToView();
    }

  }

  OpentransactionSource() {
    this.transactionSourceId.value = null;
    this.transactionSourceId.open();
  }
  submit() {
    let me = this;
    if (me.addMoreItem.length) {
      const Form = me.incomeForm;
      const name = Form.value.incomeName
      if (Form.valid || Form.value.incomeSource != "" && Form.value.payCheckName != "") {
        var index = -1;
        if (me.lastIncomeAdded) {
          index = me.addMoreItem.findIndex(x => x.id === me.lastIncomeAdded.id && x.category_id === me.lastIncomeAdded.category_id);
        }
        if (index != -1) {
          me.addMoreItem[index].assignment = [{ "paycheckId": me.paycheckId, "amount": Form.value.assignAmount, "paycheckName": Form.value.payCheckName }].concat(me.addMoreItem[index].assignment);
        }
        me.loadingCtrl = me.loadingController.create({
          message: "Transaction in progress...",
        });
        me.loadingCtrl.then(prompt => {
          prompt.present();
        });
        var counter = 0;
        me.addMoreItem.forEach(element => {
          if (element.assignment.length) {
            counter++;
            me.api.assignPlaidTransaction(element).then((res) => {
              if (res['success'] == true && counter == me.addMoreItem.length) {
                element.assignment.forEach(element => {
                  me.transService.markPaycheck(element.paycheckId);
                });
                me.refreshStorage().then(() => {
                  me.loadingCtrl.then((pr) => {
                    pr.dismiss();
                  })
                });
              }
            }).catch((err) => {
              me.loadingCtrl.then(prompt => {
                prompt.dismiss();
              });
            })
          }
          else {
            me.cp.presentToast("please assign a assignment to processed");
            return;
          }
        });
      }
      else {
        var counter = 0;
        me.addMoreItem.forEach(element => {
          if (element.assignment.length) {
            me.api.assignPlaidTransaction(element).then((res) => {
              counter++;
              if (res['success'] == true && counter == me.addMoreItem.length) {
                element.assignment.forEach(element => {
                  me.transService.markPaycheck(element.paycheckId);
                });
                me.refreshStorage().then(() => {
                  me.loadingCtrl.then((pr) => {
                    pr.dismiss();
                  })
                });
              }
            }).catch((err) => {
              me.loadingCtrl.then(prompt => {
                prompt.dismiss();
              });
            })
          }
          else {
            me.cp.presentToast("please assign a assignment to processed")
          }
        });
      }
    }
    else {
      if (me.incomeForm.valid) {
        const data = me.incomeForm.value;
        me.loadingCtrl = me.loadingController.create({
          message: "Transaction in progress...",
        });
        me.loadingCtrl.then(prompt => {
          prompt.present();
        });
        let incomeTrans = {
          id: me.selectedTransaction,
          category: me.categoryName,
          category_id: me.category_id,
          type: me.IncomeType ? "expense" : "income",
          assignment: [{ "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }]
        };
        me.api.assignPlaidTransaction(incomeTrans).then((res) => {
          if (res['success'] == true) {
            me.transService.markPaycheck(me.paycheckId);
            me.refreshStorage().then(() => {
              me.loadingCtrl.then((pr) => {
                pr.dismiss();
              })
            });
          }
        }).catch((err) => {
          me.loadingCtrl.then(prompt => {
            prompt.dismiss();
          });
          if (err.error) {
            me.cp.presentToast("something is wrong...");
          }
        })
      } else {
        for (let i in me.incomeForm.controls)
          me.incomeForm.controls[i].markAsTouched();
      }
    }
  }
  addMore() {
    let me = this;
    var index = -1;
    if (me.incomeForm.valid) {
      const data = me.incomeForm.value;
      if (me.lastIncomeAdded) {
        index = me.addMoreItem.findIndex(x => x.id === me.lastIncomeAdded.id && x.category_id === me.lastIncomeAdded.category_id);
      }
      if (index !== -1) {
        var newFirstElement = { "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }
        if (newFirstElement.amount != null) {
          const newArray = [newFirstElement].concat(me.addMoreItem[index].assignment);
          me.addMoreItem[index].assignment = newArray;
        }
      }
      else {
        let incomeTrans = {
          id: me.selectedTransaction,
          category: me.categoryName,
          category_id: me.category_id,
          type: me.IncomeType ? "expense" : "income",
          assignment: [{ "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }]
        };
        me.lastIncomeAdded = incomeTrans;
        me.addMoreItem.push(incomeTrans);
      }
      me.incomeForm.controls["payCheckName"].reset();
      me.incomeForm.controls["assignAmount"].reset();
      me.item = [];
      for (let i in me.incomeForm.controls)
        me.incomeForm.controls[i].markAsTouched();
    }
  }
  refreshStorage() {
    var me = this;
    return new Promise<any>((resolve, reject) => {
      me.api.getTransaction().then(res => {
        me.storage.remove("incomeSource");
        me.api.getIncomeSource().then(res => {
          if (res) {
            me.api.getPlaidTransaction().then(async (req) => {
              if (req) {
                resolve({});
                swal({
                  title: "",
                  text: "The Transaction has been added successfully.",
                  icon: "success",
                  closeOnClickOutside: false
                })
                  .then((value) => {
                    if (value) {
                      me.events.publish("refresh:plaidtransaction", { time: new Date() });
                      me.incomeForm.reset();
                      me.api.getGoal();
                      me.backToView()
                    }
                  })
              }
            }).catch((err) => {
              me.cp.presentToast("Something is Wrong..");
              reject();
            });
          }
        });
      });

    });

  }
  backToView() {
    var me = this;
    me.addMoreItem = [];
    me.incomeForm.reset();
    me.navCtrl.navigateForward('tabs/tabs/transaction-select/transaction-list');
  }
  ngOnDestroy() {
    console.log("view destroy");
    var me = this;
    me.addMoreItem = [];
    me.incomeForm.reset();
  }
}
