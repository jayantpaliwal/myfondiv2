import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { ModalController, NavController, AlertController, IonSelect } from '@ionic/angular';
import { Router } from '@angular/router';
import { CategoriesPage } from '../categories/categories.page';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { AccountChoosePage } from '../account-choose/account-choose.page';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonProvider } from 'src/providers/common';
import { ApiService } from '../services/api/api.service';
import { Storage } from '@ionic/storage';
import { TransactionService } from '../services/transaction/transaction.service';
import swal from 'sweetalert';

@Component({
  selector: 'app-create-goal',
  templateUrl: './create-goal.page.html',
  styleUrls: ['./create-goal.page.scss'],
})
export class CreateGoalPage implements OnInit {
  account = "";
  category: any;
  goal_amount: number = 0;
  monthly_amt: number = 0;
  target_amount: number = 0;
  bank = [];
  debt_reduction_banks = [];
  attached_account = true;
  userPic: any;
  createGoalForm: FormGroup;
  createdebtForm: FormGroup;
  incomeSourceId: any;
  achiveDate = new Date();
  achiveDebtDate = new Date();
  createdebtGoalForm: any;
  IncomeSources = [];
  isDisabled: boolean = false;
  loading: boolean = false;
  @ViewChild('debtIncomesource') debtIncomesource: IonSelect;
  @ViewChild('savingIncomesource') savingIncomesource: IonSelect;
  targetyear: number = 0;
  targetMonth: number = 0;
  debtIncomeSelected = [];
  savingIncomeSelected = [];
  _incomeSourceBudgetcategories = [];
  accountlength: number = 0;
  goalName: boolean = false;
  bankCurrentBalance = 0;
  isExistingCategory: boolean = false;
  category_Id;
  constructor(private modalCtrl: ModalController,
    public events: Events,
    public transService: TransactionService,
    private alertCtrl: AlertController,
    private _ngZone: NgZone,
    private cp: CommonProvider,
    private api: ApiService,
    public storage: Storage,
    public logoutService: LogoutService,
    private formBuilder: FormBuilder,
    private navCtrl: NavController,
    private router: Router) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
    this.userPic = this.logoutService.userPic
    this.createGoalForm = this.formBuilder.group({
      category: new FormControl(''),
      goal_name: new FormControl('', [Validators.required]),
      incomesource: new FormControl(''),
      attached_account: new FormControl("yes"),
      monthly_amt: new FormControl(0, [Validators.required, Validators.min(1)]),
      goal_amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    });
    this.createdebtForm = this.formBuilder.group({
      category: new FormControl(''),
      goal_name: new FormControl('', [Validators.required]),
      attached_account: new FormControl("yes", [Validators.required]),
      goal_amount: new FormControl(0, [Validators.required, Validators.min(1)]),
      target_amount: new FormControl(0, [Validators.required, Validators.min(1)]),
      incomesource: new FormControl('')
    });
    this.createGoalForm.controls["goal_amount"].valueChanges.subscribe(val => {
      this.goal_amount = val;
      this.calculateDate(this.monthly_amt);
    });
    this.createGoalForm.controls["monthly_amt"].valueChanges.subscribe(val => {
      this.monthly_amt = val;
      this.calculateDate(val);
    });
    this.createGoalForm.controls["attached_account"].valueChanges.subscribe(val => {
      if (val == "yes") {
        this.attached_account = true;
        this.createGoalForm.get("category").clearValidators();
        this.createGoalForm.get("incomesource").clearValidators();
        this.createGoalForm.get("category").updateValueAndValidity();
        this.createGoalForm.get("incomesource").updateValueAndValidity();
        this.calculateDate(this.monthly_amt);
      }
      else {
        this.attached_account = false;
        this.createGoalForm.get("category").setValidators([Validators.required]);
        this.createGoalForm.get("incomesource").setValidators([Validators.required]);
        this.createGoalForm.get("category").updateValueAndValidity();
        this.createGoalForm.get("incomesource").updateValueAndValidity();
        this.calculateDate(this.monthly_amt);
      }
    });
    this.createdebtForm.controls["goal_amount"].valueChanges.subscribe(val => {
      this.goal_amount = val;
      this.calculateTarget(this.target_amount)
    });
    this.createdebtForm.controls["target_amount"].valueChanges.subscribe(val => {
      this.target_amount = val;
      if (this.goal_amount > 0) {
        this.calculateTarget(val);
      }
    });
    this.createdebtForm.controls["attached_account"].valueChanges.subscribe(val => {
      if (val == "yes") {
        this.attached_account = true;
        this.createdebtForm.get("category").clearValidators();
        this.createdebtForm.get("category").updateValueAndValidity();
        this.calculateTarget(this.target_amount);
      }
      else {
        this.isDisabled = false;
        this.attached_account = false;
        this.createdebtForm.get("category").setValidators([Validators.required]);
        this.createdebtForm.get("category").updateValueAndValidity();
        this.calculateTarget(this.target_amount);
      }
    });
  }
  ionViewWillEnter() {
    this.storage.get('accounts').then(async res => {
      this.accountlength = res.length;
    });
    this.storage.get('incomeSource')
      .then((res) => {
        if (res) {
          this.IncomeSources = res;
        }
      })
  }
  ngOnInit() {
  }
  ChangeDebt(ev) {
    console.log(ev)
    this.createdebtForm.get('target_amount').setValue(ev);
  }
  onInputTime(ev) {
    if (isNaN(ev)) {
      this.monthly_amt = 0;
    }
    else {
      this.monthly_amt = ev;
      this.createGoalForm.controls.monthly_amt.setValue(ev);
      this.calculateDate(this.monthly_amt);
    }
  }
  async browseAccount() {
    this.storage.get('accounts').then(async res => {
      this.accountlength = res.length;
      if (res.length) {
        let me = this;
        const modal = await this.modalCtrl.create({
          component: AccountChoosePage,
          componentProps: {
            saving: true,
            debt: false
          }
        });
        await modal.present();
        modal.onDidDismiss()
          .then((value: any) => {
            let data = value.data;
            if (data && data.bank.length) {
              me.bank = [];
              me.bankCurrentBalance = data.bank.map(o => o.balance).reduce(function (a, b) {
                return a + b;
              }, 0);
              me.createGoalForm.controls.goal_amount.setValue(me.bankCurrentBalance.toFixed(2));
              me.bank = data.bank;
              me.calculateDate(me.monthly_amt);
            }
          })
      }
      else {
        swal({
          title: "",
          text: "You must have an account connected to view bank integrations!",
          icon: "warning",
          buttons: ["Maybe Later", "Take Me to Accounts"],
          closeOnClickOutside: false
        })
          .then((value) => {
            if (value) {
              this.navCtrl.navigateForward('tabs/tabs/accounts');
            }
          })
      }
    })

  }
  async debt_browseAccount() {
    let me = this;
    me.storage.get('accounts').then(async res => {
      if (res.length) {
        const modal = await this.modalCtrl.create({
          component: AccountChoosePage,
          componentProps: {
            saving: false,
            debt: true
          }
        });
        await modal.present();
        modal.onDidDismiss()
          .then((value: any) => {
            let data = value.data;
            if (data && data.bank.length) {
              me.goal_amount = 0;
              data.bank.forEach((bank, index) => {
                if (Number(me.goal_amount)) {
                  me.goal_amount = Number(me.goal_amount)
                }
                me.bankCurrentBalance = me.goal_amount + bank.balance;
                me.createdebtForm.controls.goal_amount.setValue(me.bankCurrentBalance.toFixed(2));
              });
              me.debt_reduction_banks = data.bank;
              me.calculateTarget(me.target_amount);
            }

          })
      }
      else {
        swal({
          title: "",
          text: "You must have an account connected to view bank integrations!",
          icon: "warning",
          buttons: ["Maybe Later", "Take Me to Accounts"],
          closeOnClickOutside: false
        })
          .then((value) => {
            if (value) {
              this.navCtrl.navigateForward('tabs/tabs/accounts');
            }
          })
      }
    })


  }
  openIncomePop(ev) {
    if (ev == "saving") {
      this.chooseSavingIncome();
    } else {
      this.chooseDebtIncome();
    }
  }
  async chooseDebtIncome() {
    var options = {
      inputs: [],
      header: "Select A Income Source",
      buttons: [
        {
          text: 'cancle',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'ok',
          handler: (ev) => {
            if (ev) {
              let data = this.IncomeSources.find(o => o.id == ev);
              this.incomeSourceId = ev
              this.debtIncomeSelected = data;
              this._incomeSourceBudgetcategories = [];
              if (data.paychecks && data.paychecks.length) {
                var categories = [];
                var paycheck = (data.paychecks.map(o => o.budgetDetails)).filter(element => {
                  if (element.length) {
                    var allbudgetLine = element.map(o => new Object({ "category_id": o.category_id.toString(), "hierarchy": [o.category], "categoryName": o.category }));
                    categories = categories.concat(allbudgetLine);
                    return element;
                  }
                });
                this._incomeSourceBudgetcategories = categories.filter((v, i, a) => a.findIndex(t => (t.category_id === v.category_id)) === i)
                console.log(this._incomeSourceBudgetcategories);
              }
              this.createdebtForm.controls.incomesource.setValue(data.name);
              this.createdebtForm.controls.target_amount.setValue(0);
            }
          }
        }
      ]
    };
    // add options here 
    options.inputs = [];
    for (let index = 0; index < this.IncomeSources.length; index++) {
      options.inputs.push({ name: 'options' + index, value: this.IncomeSources[index].id, label: this.IncomeSources[index].name + ' - ' + (this.IncomeSources[index].isRepeating ? this.IncomeSources[index].repeating.type : 'non-recurring'), type: 'radio' })
    }

    const alert = await this.alertCtrl.create(options);
    alert.present();

  }
  async chooseSavingIncome() {
    var options = {
      inputs: [],
      header: "Select A Income Source",
      buttons: [
        {
          text: 'cancle',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'ok',
          handler: (ev) => {
            if (ev) {
              let data = this.IncomeSources.find(o => o.id == ev);
              this.incomeSourceId = ev
              this.savingIncomeSelected = data;
              this.createGoalForm.controls.incomesource.setValue(data.name);
              this.createGoalForm.controls.monthly_amt.setValue(0);
              this._incomeSourceBudgetcategories = [];
              if (data.paychecks && data.paychecks.length) {
                var categories = [];
                var paycheck = (data.paychecks.map(o => o.budgetDetails)).filter(element => {
                  if (element.length) {
                    var allbudgetLine = element.map(o => new Object({ "category_id": o.category_id.toString(), "hierarchy": [o.category], "categoryName": o.category }));
                    categories = categories.concat(allbudgetLine);
                    return element;
                  }
                });
                this._incomeSourceBudgetcategories = categories.filter((v, i, a) => a.findIndex(t => (t.category_id === v.category_id)) === i)
                console.log(this._incomeSourceBudgetcategories);
              }
            }
          }
        }
      ]
    };
    options.inputs = [];
    for (let index = 0; index < this.IncomeSources.length; index++) {
      options.inputs.push({ name: 'options' + index, value: this.IncomeSources[index].id, label: this.IncomeSources[index].name + ' - ' + (this.IncomeSources[index].isRepeating ? this.IncomeSources[index].repeating.type : 'non-recurring'), type: 'radio' })
    }

    const alert = await this.alertCtrl.create(options);
    alert.present();
  }
  back() {
    this.navCtrl.pop();
  }

  async openCategory(type) {
    var that = this;
    let incomeSource: any = type === 'debt' ? that.debtIncomeSelected : that.savingIncomeSelected;
    if (incomeSource) {
      that.cp.showLoading(3000);
      const modal = await that.modalCtrl.create({
        component: CategoriesPage,
        componentProps: {
          category: true,
          categories: this._incomeSourceBudgetcategories.length ? this._incomeSourceBudgetcategories : [],
          goals: true
        }
      });
      await modal.present();
      modal.onDidDismiss()
        .then(async (value: any) => {
          if (value.data) {
            that.category = value.data;
            that.category_Id = value.data.category_id;
            that.account === "saving" ? that.createGoalForm.controls['category'].setValue(value.data.categoryName) : that.createdebtForm.controls['category'].setValue(value.data.categoryName);
            that.goalName = value.data.GoalName ? value.data.GoalName : that.goalName;
          }
          else {
            this.category = null;
          }
        })
    }
    else {
      that.cp.presentAlert("", "Please Choose A Income Source");
    }
  }

  goToProfile() {
    this.router.navigate(["/tabs/tabs/home/profile"]);
  }
  Change(event) {
    document.getElementById('monthly_amt_id')['value'] = event.detail.value
  }
  createGoal() {
    var me = this;
    let goal;
    me.loading = true;
    if (me.createGoalForm.valid && me.monthly_amt > 0) {
      var value = me.createGoalForm.value;
      if (me.attached_account && me.bank.length == 0) {
        me.cp.presentAlert("", "Please Add A Bank Account")
        me.loading = false;
        return;
      }
      if (me.attached_account && me.bank.length) {
        goal = {
          "goal_name": (value.goal_name),
          "accounts": me.bank.map(o => o.account_id),
          "goal_category": value.goal_name,
          "category_id": null,
          "goal_amount": parseFloat(value.goal_amount),
          "goal_monthly_amount": value.monthly_amt,
          "bank_detail": me.bank,
          "left_amount": (parseFloat(value.goal_amount) - me.bankCurrentBalance),
          "paid_amount": me.bankCurrentBalance,
          "goal_endDate": me.achiveDate,
          "goal_attached": value.attached_account,
          "id": null,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "goal_type": "saving"//when algo read
        }
        me.saveGoal(goal)
      }
      else {
        goal = {
          "goal_name": (value.goal_name),
          "accounts": [],
          "goal_category": value.category,
          "category_id": me.category_Id,
          "goal_amount": parseFloat(value.goal_amount),
          "goal_monthly_amount": me.monthly_amt,
          "paid_amount": 0,
          "left_amount": parseFloat(value.goal_amount),
          "bank_detail": [],
          "goal_attached": value.attached_account,
          "id": null,
          "goal_endDate": me.achiveDate,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "goal_type": "saving" //when algo read
        }
        me.saveGoal(goal);
      }
    }
    else {
      me.cp.presentAlert("", "Monthly Amount is always greater then 0");
      me.loading = false;
      return;
    }
  }
  debtGoal() {
    var me = this;
    let goal;
    me.loading = true;
    if (me.createdebtForm.valid) {
      var value = me.createdebtForm.value;
      if (me.attached_account && me.debt_reduction_banks.length == 0) {
        me.cp.presentAlert("", "Please Add A Bank Account")
        me.loading = false;
        return;
      }
      if (me.attached_account && me.debt_reduction_banks.length) {
        goal = {
          "goal_name": (value.goal_name),
          "accounts": me.debt_reduction_banks.map(o => o.account_id),
          "goal_category": value.goal_name,
          "category_id": null,
          "goal_amount": value.goal_amount,
          "goal_target_amount": value.target_amount,
          "bank_detail": me.debt_reduction_banks,
          "goal_attached": value.attached_account,
          "left_amount": (value.goal_amount - (value.goal_amount - me.bankCurrentBalance)),
          "paid_amount": (value.goal_amount - me.bankCurrentBalance),
          "goal_endDate": me.achiveDebtDate,
          "id": null,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "goal_type": "debt-Reduction"//when algo read
        }
        me.saveGoal(goal)
      }
      else {
        goal = {
          "goal_name": (value.goal_name),
          "accounts": [],
          "goal_category": value.category,
          "category_id": me.category_Id,
          "goal_amount": value.goal_amount,
          "goal_target_amount": value.target_amount,
          "bank_detail": [],
          "goal_attached": value.attached_account,
          "left_amount": (value.goal_amount),
          "paid_amount": 0,
          "id": null,
          "goal_endDate": me.achiveDebtDate,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "goal_type": "debt-Reduction" //when algo read
        }
        me.saveGoal(goal);
      }
    }
  }
  saveGoal(args) {
    var goal;
    this.cp.presentLoading();
    if (args.goal_incomeSource_Id) {
      var income = this.IncomeSources.find(o => o.id === args.goal_incomeSource_Id);
      if (income) {
        goal = Object.assign({ isAccomplished: false },
          { isRemoved: false }, { isRepeating: income.isRepeating }, { repeating: income.repeating },
          { goal_monthly_amount: args.goal_type === "saving" ? args.goal_monthly_amount : args.goal_target_amount },
          args);
      }
      else {
        this.cp.presentAlert("", "Incomsource Not Found please select a income source");
        this.loading = false;
        return;
      }
    }
    else {
      goal = Object.assign({ isAccomplished: false },
        { isRemoved: false }, args);
    }
    this.api.saveGoals(goal).then((res: any) => {
      if (res.success) {
        this.loading = false;
        this._ngZone.run(() => {
          this.api.getIncomeSource();
          this.api.getGoal();
          this.cp.dismissLoading();
          this.congratulations(goal.goal_income_name);
        })
      }
      else {
        this.loading = false;
        this.cp.presentAlert("Error", res.error)
      }

    }).catch(() => {
      this.loading = false;
      this.cp.dismissLoading();
    })
  }
  async congratulations(args) {
    let message = this.attached_account ? 'If not in your budget, please add this expense to your paychecks going forward. Good Luck!' : "You'll see the goal category was added or your existing category was updated for " + args + ". Good Luck!"
    swal({
      title: "Congratulations on setting a new goal!",
      text: message,
      icon: "success",
      closeOnClickOutside: false
    })
      .then((value) => {
        if (value) {
          this.back();
        }
      })
  }
  calculateDate(val) {
    val = parseFloat(val);
    if (this.savingIncomeSelected['isRepeating']) {
      if (this.savingIncomeSelected['repeating'].type == "biweekly") {
        this.getAchiveDateFormula(val, this.createGoalForm.value.goal_amount, 14);
      }
      else if (this.savingIncomeSelected['repeating'].type == "weekly") {
        this.getAchiveDateFormula(val, this.createGoalForm.value.goal_amount, 7);
      }
      else if (this.savingIncomeSelected['repeating'].type == "semimonthly") {
        this.getAchiveDateFormula(val, this.createGoalForm.value.goal_amount, 15);
      }
      else if (this.savingIncomeSelected['repeating'].type == "monthly") {
        this.getAchiveDateFormula(val, this.createGoalForm.value.goal_amount, 30);
      }
    }
    else {
      this.getAchiveDateFormula(val, this.createGoalForm.value.goal_amount, 30);
    }

  }
  getAchiveDateFormula(val, totalAmount, type) {
    if (val && totalAmount) {
      totalAmount = (this.attached_account && this.bank.length && this.bankCurrentBalance > 0 && this.bankCurrentBalance < totalAmount) ? totalAmount - this.bankCurrentBalance : totalAmount;
      let totalTime = totalAmount / val;
      let typeRecurresion = Math.floor(totalTime);
      if (totalTime - typeRecurresion != 0) {
        typeRecurresion = typeRecurresion + 1;
      }
      var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
      this.achiveDate = date > 0 ? new Date(date) : new Date(new Date(new Date().setDate(new Date().getDate() + ((1 * type)))));
    }
  }
  getAchiveDebtDateFormula(val, totalAmount, type) {
    if (val && totalAmount) {
      if (this.attached_account && this.debt_reduction_banks.length) {
        if ((this.bankCurrentBalance) > 0) {
          totalAmount = (totalAmount - (totalAmount - this.bankCurrentBalance))
        }
      }
      let totalTime = totalAmount / val;
      let typeRecurresion = Math.floor(totalTime);
      if (totalTime - typeRecurresion != 0) {
        typeRecurresion = typeRecurresion + 1;
      }
      var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
      this.achiveDebtDate = date > 0 ? new Date(date) : new Date(new Date(new Date().setDate(new Date().getDate() + ((1 * type)))));
    }
  }
  calculateTarget(val) {
    val = parseFloat(val);
    if (this.debtIncomeSelected['isRepeating']) {
      if (this.debtIncomeSelected['repeating'].type == "biweekly") {
        this.getAchiveDebtDateFormula(val, this.createdebtForm.value.goal_amount, 14);
      }
      else if (this.debtIncomeSelected['repeating'].type == "weekly") {
        this.getAchiveDebtDateFormula(val, this.createdebtForm.value.goal_amount, 7);
      }
      else if (this.debtIncomeSelected['repeating'].type == "semimonthly") {
        this.getAchiveDebtDateFormula(val, this.createdebtForm.value.goal_amount, 15);
      }
      else if (this.debtIncomeSelected['repeating'].type == "monthly") {
        this.getAchiveDebtDateFormula(val, this.createdebtForm.value.goal_amount, 30);
      }
    }
    else {
      this.getAchiveDebtDateFormula(val, this.createdebtForm.value.goal_amount, 30);
    }
  }
}
