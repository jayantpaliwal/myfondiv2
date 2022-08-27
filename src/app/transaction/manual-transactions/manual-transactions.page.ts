import { ModalController, NavController, LoadingController, AlertController } from '@ionic/angular';
import { Component } from '@angular/core';
import { CategoriesPage } from 'src/app/categories/categories.page';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { messages } from 'src/validation/messages';
import { CommonProvider } from 'src/providers/common';
import { Events } from 'src/app/services/Events.service';
import { ApiService } from 'src/app/services/api/api.service';
import { Storage } from '@ionic/storage';
import { Router } from '@angular/router';
import swal from 'sweetalert';
import { TransactionService } from 'src/app/services/transaction/transaction.service';
import { LogoutService } from 'src/app/services/logout/logout.service';
@Component({
  selector: 'app-manual-transactions',
  templateUrl: './manual-transactions.page.html',
  styleUrls: ['./manual-transactions.page.scss'],
})
export class ManualTransactionsPage {
  validation_messages = messages;
  public incomeForm: FormGroup;
  category = {
    categoryName: '',
    subCategoryName: '',
    category_id: ""
  }
  transactionType = 'expense';
  payPeriod = [];
  paychecks = [];
  loading = false;
  date = new Date();
  incomeSourceId: string;
  firstDay = new Date(this.date.getFullYear(), this.date.getMonth(), 1).setHours(0, 0, 0, 0);
  lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).setHours(0, 0, 0, 0);
  currentMonth: string = this.date.getMonth() + 1 + "_" + this.date.getFullYear();
  item = [];
  IncomeSources = [];
  selectedincomeSource: string = "";
  paycheckId: any;
  addMoreItem = [];
  addmoreIncome: boolean = false;
  addmoreExpense: boolean = false;
  public loadingCtrl: any;
  incomeSource: any;
  userPic;
  lastIncomeAdded: { id: string; type: string; name: any; category_id: any; category: any; transactionDateTime: any; amount: any; paycheckName: any; assignment: { "paycheckId": any; "amount": any; "paycheckName": any; }[]; };
  lastExpenseAdded: { id: string; type: string; name: any; category_id: any; category: any; transactionDateTime: any; amount: any; paycheckName: any; assignment: { "paycheckId": any; "amount": any; "paycheckName": any; }[]; };
  constructor(private formBuilder: FormBuilder, private transService: TransactionService,
    private storage: Storage,
    public events: Events,
    private cp: CommonProvider,
    public loadingController: LoadingController,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    public logoutService: LogoutService,
    private api: ApiService,
    public alertController: AlertController,) {
    this.incomeForm = this.formBuilder.group({
      incomeName: new FormControl('', [Validators.required]),
      categoryName: new FormControl('', [Validators.required]),
      date: new FormControl(this.currentDate(), [Validators.required]),
      amount: new FormControl('', [Validators.required, Validators.min(1)]),
      // incomeSource: new FormControl('', [Validators.required]),
      payCheckName: new FormControl('', [Validators.required]),
      assignAmount: new FormControl('', [Validators.required, Validators.min(1)]),
    });
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
  }
  back() {
    this.navCtrl.navigateForward('tabs/tabs/transaction-select');
  }
  currentDate() {
    const currentDate = new Date();
    return currentDate.toISOString().substring(0, 10);
  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic;
    this.storage.get('incomeSource')
      .then((res) => {
        if (res) {
          this.IncomeSources = res;
        }
      })
  }
  delete(i, index) {
    let data = this.addMoreItem[i];
    if (index !== -1) {
      if (data.assignment) {
        data.assignment.splice(index, 1);
        if(data.assignment.length=== 0){
          this.incomeForm.controls["incomeName"].enable();
          this.incomeForm.controls["categoryName"].enable();
          this.incomeForm.controls["date"].enable();
          this.incomeForm.controls["amount"].enable();
        }
      }
    }
   
  }
  goToProfile() {
    this.navCtrl.navigateForward(["tabs/tabs/home/profile"]);
  }
  async openPayCheck() {
    var that = this;
    var paychecks = [];
    var modal;
    if (that.IncomeSources.length) {
      that.cp.showLoading(3000);
      modal = await that.modalCtrl.create({
        component: CategoriesPage,
        componentProps: {
          category: false,
        }
      });
      await modal.present();
      modal.onDidDismiss()
        .then((value: any) => {
          if (value.data) {
            that.paycheckId = value.data.payCheck['paycheckId'];
            that.incomeSourceId = value.data.payCheck['incomeSourceId'];
            that.incomeForm.controls["payCheckName"].setValue(value.data.payCheck['name']);
          }
        })
    }
    else {
      swal({
        title: "Error",
        icon: "error",
        text: "Please Add a Income source to Assign Transactions Amount."
      });
      that.back();
    }
  }
  async openCategory() {
    let me = this;
    me.cp.showLoading(3000);
    const modal = await this.modalCtrl.create({
      component: CategoriesPage,
      componentProps: {
        category: true
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        if (value.data) {
          me.category.categoryName = value.data.categoryName;
          me.category.category_id = value.data.category_id;
          me.incomeForm.controls["categoryName"].setValue(value.data.categoryName);
        }
      });
  }

  submit() {
    let me = this;
    if (me.addMoreItem.length > 0) {
      const Form = me.incomeForm;
      const name = Form.value.incomeName;
      if (Form.valid) {
        if (me.lastIncomeAdded) {
          var index = index = this.addMoreItem.findIndex(x => x.name === me.lastIncomeAdded.name && x.category === me.lastIncomeAdded.category);
          if (index != -1) {
            var newFirstElement = { "paycheckId": this.paycheckId, "amount": Form.value.assignAmount, "paycheckName": Form.value.payCheckName }
            const newArray = [newFirstElement].concat(this.addMoreItem[index].assignment);
            this.addMoreItem[index].assignment = newArray;
          }
        }
      }
      var counter = 0;
      me.addMoreItem.forEach(element => {
        if (element.assignment.length > 0) {
          me.loadingCtrl = me.loadingController.create({
            message: "Transaction in progress...",
          });
          me.loadingCtrl.then(prompt => {
            prompt.present();
          });
          var totalAssigned = element.assignment.map(o => o.amount).reduce(function (a, b) {
            return a + b;
          }, 0);
          if (totalAssigned > element.amount) {
            me.cp.presentToast("You don't have enough amount to settle down your assignment amount");
            me.loadingCtrl.then(prompt => {
              prompt.dismiss();
            });
            return;
          }
          me.api.transaction(element).then((res) => {
            if (res['success'] == true) {
              counter++;
              if (counter == me.addMoreItem.length) {
                element.assignment.forEach(w => {
                  me.transService.markPaycheck(w.paycheckId);
                });
                me.refreshStorage().then(() => {
                  me.loadingCtrl.then(prompt => {
                    prompt.dismiss();
                  });
                });
              }
            }
          }).catch((err) => {
            me.loadingCtrl.then(prompt => {
              prompt.dismiss();
            });
            if (err.error) {
              me.cp.presentToast(err.error.error);
            }
            else {
              if (err.error) {
                me.cp.presentToast(err.error.error);
              }
              else {
                me.cp.presentToast("something is wrong...");
              }
            }
          })
        }
        else {
          me.cp.presentAlert("", "please add one assignment for submit");
          return;
        }
      });



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
          type: me.transactionType,
          name: data.incomeName,
          category: data.categoryName,
          category_id: me.category.category_id,
          transactionDateTime: data.date,
          amount: data.amount,
          assignment: [{ "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }]
        };
        var totalAssigned = incomeTrans.assignment.map(o => o.amount).reduce(function (a, b) {
          return a + b;
        }, 0);
        if (totalAssigned > incomeTrans.amount) {
          me.cp.presentToast("You don't have enough amount to settle down your assignment amount");
          me.loadingCtrl.then(prompt => {
            prompt.dismiss();
          });
          return;
        }
        me.api.transaction(incomeTrans).then((res) => {
          if (res['success'] == true) {
            me.transService.markPaycheck(me.paycheckId);
            me.refreshStorage().then(() => {
              me.loadingCtrl.then(prompt => {
                prompt.dismiss();
              });
            });
          }
        }).catch((err) => {
          me.loadingCtrl.then(prompt => {
            prompt.dismiss();
          });
          if (err.error) {
            me.cp.presentToast(err.error.error);
          }
          else {
            if (err.error) {
              me.cp.presentToast(err.error.error);
            }
            else {
              me.cp.presentToast("something is wrong...");
            }
          }
        })


      } else {
        me.cp.presentAlert("", "Please Fill all details")
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
        index = me.addMoreItem.findIndex(x => x.name === me.lastIncomeAdded.name && x.category_id === me.lastIncomeAdded.category_id);
      }
      if (index !== -1) {
        var newFirstElement = { "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }
        const newArray = [newFirstElement].concat(me.addMoreItem[index].assignment);
        me.addMoreItem[index].assignment = newArray;
      }
      else {
        let incomeTrans = {
          id: me.incomeSourceId,
          type: me.transactionType,
          name: data.incomeName,
          category: data.categoryName,
          category_id: me.category.category_id,
          transactionDateTime: data.date,
          amount: data.amount,
          paycheckName: data.payCheckName,
          assignment: [{ "paycheckId": me.paycheckId, "amount": data.assignAmount, "paycheckName": data.payCheckName }]
        };
        me.lastIncomeAdded = incomeTrans;
        me.addMoreItem.push(incomeTrans);
      }

      me.incomeForm.controls["incomeName"].disable();
      me.incomeForm.controls["categoryName"].disable();
      me.incomeForm.controls["date"].disable();
      me.incomeForm.controls["amount"].disable();
      me.incomeForm.controls["incomeName"].clearValidators();
      me.incomeForm.controls["categoryName"].clearValidators();
      me.incomeForm.controls["date"].clearValidators();
      me.incomeForm.controls["amount"].clearValidators();
      me.incomeForm.controls["payCheckName"].reset();
      me.incomeForm.controls["assignAmount"].reset();
      me.item = [];
      // this.cp.presentAlert("", "Please Fill all details")
      for (let i in me.incomeForm.controls)
        me.incomeForm.controls[i].markAsTouched();

    }
  }
  selected(value) {
    if (value == 'income') {
      this.transactionType = 'income';
    } else {
      this.transactionType = 'expense';
    }

  }
  refreshStorage() {
    var me = this;
    return new Promise<any>((resolve, reject) => {
      me.storage.remove("incomeSource");
      me.api.getIncomeSource().then(res => {
        if (res) {
          me.api.getTransaction().then(async (req) => {
            if (req) {
              resolve({});
              swal({
                title: "",
                text: "The transaction was added successfully.",
                icon: "success",
                closeOnClickOutside: false
              })
                .then((value) => {
                  if (value) {
                    me.events.publish("refresh:transaction", { time: new Date() });
                    me.api.getGoal();
                    me.events.publish("refresh:savedgoals", { time: new Date() });
                    me.backToView()
                  }
                })
            }

          }).catch((err) => {
            me.cp.presentToast("Something is Wrong..");
            reject();
          })
        }
      }).catch((err) => {
        me.cp.presentToast("Something is Wrong..");
        reject();
      });
    })
  }
  backToView() {
    var me = this;
    me.addMoreItem = [];
    me.incomeForm.reset();
    me.navCtrl.navigateForward('tabs/tabs/home');
  }
  ionViewWillLeave() {
    console.log("view destroy");
    var me = this;
    me.addMoreItem = [];
    me.incomeForm.controls["incomeName"].enable();
    me.incomeForm.controls["categoryName"].enable();
    me.incomeForm.controls["date"].enable();
    me.incomeForm.controls["amount"].enable();
    me.incomeForm.controls["incomeName"].setValidators([Validators.required]);
    me.incomeForm.controls["categoryName"].setValidators([Validators.required]);
    me.incomeForm.controls["date"].setValidators([Validators.required]);
    me.incomeForm.controls["amount"].setValidators([Validators.required]);
    me.incomeForm.reset();
  }
}