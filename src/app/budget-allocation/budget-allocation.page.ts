import { Component, OnInit, ViewChild } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { ModalController, NavController, IonSelect } from '@ionic/angular';
import { CategoriesPage } from '../categories/categories.page';
import { ApiService } from '../services/api/api.service';
import { FormBuilder, FormControl, Validators, FormGroup } from '@angular/forms';
import * as firebase from 'firebase';
import { CommonProvider } from 'src/providers/common';
import { messages } from 'src/validation/messages';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { TransactionService } from '../services/transaction/transaction.service';
import { FirebaseFunctionLocal } from '../services/firebase-api-local/firebase-api-local';
import introJs from 'intro.js/intro.js';

// import { BudgetsPage } from '../budgets/budgets.page';
declare var swal;
@Component({
  selector: 'app-budget-allocation',
  templateUrl: 'budget-allocation.page.html',
  styleUrls: ['budget-allocation.page.scss']
})

export class BudgetAllocationPage implements OnInit {

  validation_messages = messages;
  categories = [];
  transaction = 'paycheck';
  paycheckForm: FormGroup;
  category = null;
  IncomeSources = [];
  loading: boolean = false;
  item = [];
  paycheck = [];
  budgetTemplateUpdate: boolean = false;
  disableFuture: boolean = false;
  disablePaycheck: boolean = false;
  @ViewChild('incomeSourceId', { static: false }) incomeSourceId: IonSelect;
  selectedincomeSource = null;
  subscribe: any;
  allpayChecks;
  repeating = ""
  budgetDetails = [];
  returnArray = [];
  userPic: any;
  category_id;
  listItem;
  date = new Date();
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private cp: CommonProvider,
    private storage: Storage,
    public events: Events,
    public transService: TransactionService,
    private api: ApiService,
    private logoutService: LogoutService,
    private firebaseService: FirebaseFunctionLocal,
    private modalCtrl: ModalController,
    private navCtrl: NavController, private router: Router
  ) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
    this.paycheckForm = this.formBuilder.group({
      categoryName: new FormControl('', [Validators.required]),
      applyforAll: new FormControl(false),
      price: new FormControl('', [Validators.required, Validators.min(1)])
    });
  }
  ngOnInit() {

  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic
    if (this.transService.getBudgetDetails() && this.transService.getBudgetDetails().payPeriods) {
      this.returnArray = this.transService.getBudgetDetails().payPeriods;
      this.allpayChecks = this.transService.getBudgetDetails().payPeriods;
      this.repeating = this.transService.getBudgetDetails().repeating;
      this.selectedincomeSource = this.transService.getBudgetDetails().incomeSourceId;
    }
    this.storage.get('incomeSource')
      .then((res) => {
        this.IncomeSources = res;
      });
  }

  async addCategory() {
    var that = this;
    that.cp.showLoading(3000);
    const modal = await that.modalCtrl.create({
      component: CategoriesPage,
      componentProps: {
        category: true
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        that.category = value.data ? value.data.categoryName : null;
        that.category_id = value.data ? value.data.category_id : null;
        that.paycheckForm.controls["categoryName"].setValue(that.category);
      })
  }

  addMore() {
    if (this.paycheckForm.valid) {
      if (this.listItem && this.listItem.budgetTemplate.length) {
        let index = this.listItem.budgetTemplate.findIndex(o => o.category === this.category);
        if (index != -1) {
          this.listItem.budgetTemplate[index].budgeted = this.listItem.budgetTemplate[index].budgeted + this.paycheckForm.value.price;
        }
        else {
          this.listItem.budgetTemplate = [{
            "category": this.category,
            "category_id": this.category_id,
            "budgeted": this.paycheckForm.value.price
          }].concat(this.listItem.budgetTemplate);
        }
      }
      else {
        this.listItem = {
          "id": this.selectedincomeSource,
          "userId": firebase.auth().currentUser.uid,
          "incomeSourceId": this.paycheckForm.value.applyforAll ? this.selectedincomeSource : null,
          "applyForAllPaycheks": this.paycheckForm.value.applyforAll,
          "budgetTemplateUpdate": this.budgetTemplateUpdate,
          "paycheckId": this.allpayChecks.id,
          "paycheckPayTimeStamp": this.paycheckForm.value.applyforAll ? this.allpayChecks.payDateTimeStamp : null,
          "overrideTemplateCategories": this.allpayChecks['budgetDetails'],
          "budgetTemplate": [{
            "category": this.category,
            "category_id": this.category_id,
            "budgeted": this.paycheckForm.value.price
          }]
        };
      }
      this.paycheckForm.controls["price"].reset("");
      this.paycheckForm.controls["categoryName"].reset("");
      this.paycheckForm.controls["categoryName"].setValidators([Validators.required])
      this.paycheckForm.controls["price"].setValidators([Validators.required, Validators.min(1)])
    }
  }

  deleteItem(index) {
    if (index !== -1) {
      this.listItem.budgetTemplate.splice(index, 1);
    }
  }

  Save() {
    var me = this;
    if (me.listItem && me.listItem.budgetTemplate.length) {
      me.cp.presentLoading();
      if (me.paycheckForm.valid) {
        me.listItem.applyForAllPaycheks = this.paycheckForm.value.applyforAll;
        me.listItem.budgetTemplate = [{
          "category": me.category,
          "category_id": me.category_id,
          "budgeted": me.paycheckForm.value.price
        }].concat(me.listItem.budgetTemplate);
      }
      me.api.budgetAllocation(me.listItem).then((res) => {
        if (res['success'] && me.selectedincomeSource) {
          me.api.getIncomeSourceById(me.listItem.id).then(() => {
            setTimeout(() => {
              me.cp.dismissLoading();
              me.events.publish("update:Income", { time: new Date() });
              me.transService.setPaycheckDetails({
                payPeriods: me.returnArray,
                repeatingType: me.repeating,
                paychecklist: false
              });
              this.paycheckForm.reset();
              this.listItem.budgetTemplate = [];
              me.navCtrl.navigateForward("/tabs/tabs/paycheck/paycheck-details")
            }, 500);
          }).catch((err) => {
            me.cp.dismissLoading();
          })
        }
        else {
          me.cp.presentToast("Something went to wrong.Try Again")
          me.cp.dismissLoading();
        }
      }).catch((err) => {
        me.cp.dismissLoading();

      })
    }
    else {
      if (me.paycheckForm.valid) {
        me.cp.presentLoading();
        me.api.budgetAllocation({
          "id": me.selectedincomeSource,
          "userId": firebase.auth().currentUser.uid,
          "incomeSourceId": me.paycheckForm.value.applyforAll == true ? me.selectedincomeSource : null,
          "applyForAllPaycheks": me.paycheckForm.value.applyforAll,
          "overrideTemplateCategories": this.allpayChecks['budgetDetails'],
          "paycheckId": me.allpayChecks.id,
          "paycheckPayTimeStamp": this.paycheckForm.value.applyforAll ? this.allpayChecks.payDateTimeStamp : null,
          "budgetTemplate": [{
            "category": me.category,
            "category_id": me.category_id,
            "budgeted": me.paycheckForm.value.price
          }]
        }).then((res) => {
          if (res['success'] && me.selectedincomeSource) {
            me.api.getIncomeSourceById(me.selectedincomeSource).then((response) => {
              me.cp.dismissLoading();
              me.events.publish("update:Income", { time: new Date() });
              me.events.publish('change:paycheck', { time: new Date() });
              me.transService.setPaycheckDetails({
                payPeriods: me.returnArray,
                repeatingType: me.repeating,
                paychecklist: false
              });
              me.navCtrl.navigateForward("/tabs/tabs/paycheck/paycheck-details")

            }).catch((err) => {
              me.cp.presentToast("Something went to wrong.Try Again!")
              me.cp.dismissLoading();
            })
          }
          else {
            me.cp.presentToast("Something went to wrong.Try Again!")
            me.cp.dismissLoading();
          }
        }).catch((err) => {
          me.cp.presentToast("Something went to wrong.Try Again!");
          me.cp.dismissLoading();
        })
      }
    }
  }

  back() {
    this.transService.setPaycheckDetails({
      payPeriods: this.allpayChecks,
      repeatingType: this.repeating,
      paychecklist: false
    });
    this.navCtrl.navigateRoot("/tabs/tabs/paycheck/paycheck-details")
  }

  goToProfile() {
    this.router.navigate(["tabs/tabs/home/profile"]);
  }
  async budgetedit(paycheck, budgetLine, i) {
    var me = this;
    var income_Exists = me.IncomeSources.find(a => a.id === me.selectedincomeSource);
    var applyForAllPaycheks = false;
    if (income_Exists) {
      var existingBudgetDetails = income_Exists.budgetTemplate.budgetTemplateDetails;
      let index = existingBudgetDetails.findIndex(o => o.category === budgetLine.category);
      if (index != -1) {
        applyForAllPaycheks = true;
      }
    }
    swal({
      icon: 'warning',
      title: 'Edit Budget!',
      text: `Are you sure you want to change the amount of ${budgetLine.category}`,
      content: {
        element: "input",
        attributes: {
          placeholder: "Budget Amount..",
          type: "Numer",
          value: budgetLine.budgeted
        },
      },
      closeOnClickOutside: false,
      buttons: {
        cancel: {
          text: "Cancel",
          value: false,
          visible: true,
          className: "",
          closeModal: true,
        },
        confirm: {
          text: "Update",
          value: true,
          visible: true,
          className: "",
          closeModal: true
        }
      }
    }).then(results => {
      if (results) {
        let amount = parseFloat(results);
        console.log(amount);
        swal({
          icon: 'info',
          title: 'Edit Budget!',
          text: `Do you want to update this budget category ${budgetLine.category.toUpperCase()} to all future paychecks?`,
          closeOnClickOutside: false,
          buttons: {
            cancel: {
              text: "Only Current Paycheck",
              value: false,
              visible: true,
              className: "",
              closeModal: true,
            },
            confirm: {
              text: "Apply to All Future Paychecks",
              value: true,
              visible: true,
              className: "",
              closeModal: true
            }
          }
        }).then(results => {
          if (results) {
            let req = applyForAllPaycheks ? true : false;
            callUpdate(req);
          } else {
            callUpdate(false);
          }
        })

        function callUpdate(arg1) {
          me.cp.presentLoading();
          if (paycheck.rolloverBudgetTemplate) {
            let rolloverBudgetTemplate = paycheck.rolloverBudgetTemplate.find(o => o.category === budgetLine.category);
            if (rolloverBudgetTemplate) {
              budgetLine.budgeted = budgetLine.budgeted - rolloverBudgetTemplate.budgeted;
              budgetLine.available = budgetLine.available - rolloverBudgetTemplate.available;
            }
          }
          let params = {
            id: paycheck.id,
            paycheckType: paycheck.isRepeating,
            payDateTimeStamp: paycheck.payDateTimeStamp,
            incomesourceId: paycheck.incomeid,
            budgetline: budgetLine,
            amount: amount,
            applyForAllPaycheks: arg1
          };
          me.api.editAllocatedBudget(params).then((res: any) => {
            console.log(res);
            if (res.success) {
              me.api.getIncomeSourceById(paycheck.incomeid).then(() => {
                setTimeout(() => {
                  me.cp.dismissLoading();
                  me.events.publish("update:Income", { time: new Date() });
                  me.allpayChecks.budgetDetails[i].budgeted = amount;
                  me.back();
                }, 500);
              }).catch((err) => {
                me.cp.dismissLoading();
              })
            }
            else {
              me.cp.dismissLoading();
            }

          }).catch((err) => {
            console.log(err);
            me.cp.dismissLoading();
          })
        }
      }
      else {
        console.log("close");
      }
    })

  }
  ionViewWillLeave() {
    console.log("view destroy");
    this.listItem = null;
    this.allpayChecks = null;
    this.paycheckForm.reset();
  }
    //bhavna
    ngAfterViewInit(){
      if (!localStorage.getItem('transactionTypeInfo')) {
        localStorage.setItem('transactionTypeInfo', 'true');
        introJs().setOptions({
          showBullets: false,
          steps: [{
            intro: 'You have 4 features on this page.'
          },
          {
            element: '.transactioncategory',
            intro: 'Transaction Category is where you can select the budget category.'
          },
          {
            element: '.transactionamount',
            intro: 'Transaction Amount is the amount of your budget'
          },
          {
            element: '.addmore',
            intro: 'Add More is used to add more than one category at a time to a paycheck budget.'
          },
          {
            element: '.allpaychecks',
            intro: 'Apply to All Paychecks Like This One is to add the same category and amount to selected paycheck and future paycheck budgets.'
          },
          {
            intro: 'You can allocate your budget the following 2 ways:- Allocate your expenses by paycheck – example: rent within pay 1 and car note within pay 2 - Follow the MyFondi way by Budgeting One Paycheck at a Time – example: you are paid weekly and your budget for your groceries is $100 for the month. You would divide your expenses by 4 (number of weeks in a month) which comes out to $25 per pay.'
          }
        ]
        }).start();
      }
    }
}

