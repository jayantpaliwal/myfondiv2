import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { ModalController, NavController, AlertController, IonSelect } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Storage } from '@ionic/storage';
import swal from 'sweetalert';
import { CommonProvider } from 'src/providers/common';
import { AccountChoosePage } from '../account-choose/account-choose.page';
import { CategoriesPage } from '../categories/categories.page';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { TransactionService } from '../services/transaction/transaction.service';
@Component({
  selector: 'app-edit-goal',
  templateUrl: './edit-goal.page.html',
  styleUrls: ['./edit-goal.page.scss'],
})
export class EditGoalPage implements OnInit {
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
  @ViewChild('debtIncomesource') debtIncomesource: IonSelect;
  @ViewChild('savingIncomesource') savingIncomesource: IonSelect;
  targetyear: number = 0;
  targetMonth: number = 0;
  subscribe: any;
  goalId: any;
  goalType_update: any;
  previous_goalname: String = "";
  accountlength: number = 0;
  oldSavingCategory: string;
  oldSavingAmount: number = 0;
  savingIncomeSelected: any;
  old_incomeID: string = "";
  debtIncomeSelected = [];
  goalName: boolean = false;
  bankCurrentBalance = 0;
  goalRec: any;
  paid_amount: number = 0;
  left_amount: number = 0;
  isExistingCategory: boolean = false;
  category_Id: any;
  goal_oldcategoryId: any;
  _incomeSourceBudgetcategories = [];
  constructor(
    private modalCtrl: ModalController,
    public events: Events,
    public transService: TransactionService,
    private alertCtrl: AlertController,
    private _ngZone: NgZone,
    private cp: CommonProvider,
    private api: ApiService,
    public storage: Storage,
    private route: ActivatedRoute,
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
      goal_amount: new FormControl('', [Validators.required, Validators.min(1)]),
      range_val: new FormControl('')
    });
    this.createdebtForm = this.formBuilder.group({
      category: new FormControl(''),
      goal_name: new FormControl('', [Validators.required]),
      attached_account: new FormControl("yes", [Validators.required]),
      goal_amount: new FormControl('', [Validators.required, Validators.min(1)]),
      target_amount: new FormControl('', [Validators.required, Validators.min(1)]),
      incomesource: new FormControl('')
    });
    this.createGoalForm.controls["goal_amount"].valueChanges.subscribe(val => {
      this.goal_amount = val;
      this.calculateDate(this.monthly_amt);
    });
    this.createGoalForm.controls["attached_account"].valueChanges.subscribe(val => {
      this.attached_account = (val == "yes" ? true : false);
      if (!this.attached_account) {
        this.calculateDate(this.monthly_amt);
        this.createGoalForm.get("category").setValidators([Validators.required]);
        this.createGoalForm.get("category").updateValueAndValidity();
      }
      else {
        this.calculateDate(this.monthly_amt);
        this.createGoalForm.get("category").clearValidators();
        this.createGoalForm.get("category").updateValueAndValidity();
      }
    });
    this.createdebtForm.controls["goal_amount"].valueChanges.subscribe(val => {
      this.goal_amount = val;
      this.calculateTarget(this.target_amount);
    });

    this.createdebtForm.controls["target_amount"].valueChanges.subscribe(val => {
      this.target_amount = val;
      if (this.goal_amount > 0) {
        this.calculateTarget(val);
      }
    });
    this.createdebtForm.controls["attached_account"].valueChanges.subscribe(val => {
      this.attached_account = (val == "yes" ? true : false);
      if (!this.attached_account) {
        this.calculateTarget(this.target_amount);
        this.createdebtForm.get("category").setValidators([Validators.required]);
        this.createdebtForm.get("category").updateValueAndValidity();
      }
      else {
        this.calculateTarget(this.target_amount);
        this.createdebtForm.get("category").clearValidators();
        this.createdebtForm.get("category").updateValueAndValidity();
      }
    });
    this.createGoalForm.controls["range_val"].valueChanges.subscribe(val => {
      this.monthly_amt = val;
      this.calculateDate(val);
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
          this.subscribe = this.route.queryParams.subscribe((params: any) => {
            if (params.goal) {
              let data = JSON.parse(params.goal);
              this.goalRec = data;
              this.goalId = data.id
              this.goalType_update = data.goal_type;
              if (data.goal_type == "saving") {
                this.account = 'saving';
                this.oldSavingAmount = data.goal_monthly_amount;
                this.oldSavingCategory = data.goal_category;
                this.bank = data.bank_detail;
                this.bankCurrentBalance = data.bank_detail.map(o => o.balance).reduce(function (a, b) { return a + b; }, 0);
                this.paid_amount = data.paid_amount;
                this.previous_goalname = data.goal_name;
                this.goal_oldcategoryId = data.category_id
                this.attached_account = (data.goal_attached == "yes" ? true : false);
                this.createGoalForm.controls['category'].setValue(data.goal_category);
                this.createGoalForm.controls['goal_name'].setValue(data.goal_name);
                this.createGoalForm.controls['incomesource'].setValue(data.goal_income_name);
                this.createGoalForm.controls['goal_amount'].setValue(data.goal_amount);
                this.createGoalForm.controls['range_val'].setValue(data.goal_monthly_amount);
                this.createGoalForm.controls['attached_account'].setValue(data.goal_attached);
                this.monthly_amt = data.goal_monthly_amount;
                this.incomeSourceId = data.goal_incomeSource_Id;
                this.old_incomeID = data.goal_incomeSource_Id;
                let dataFind = this.IncomeSources.find(o => o.id == data.goal_incomeSource_Id);
                if (dataFind) {
                  this.savingIncomeSelected = dataFind;
                  if (dataFind.paychecks && dataFind.paychecks.length) {
                    var categories = [];
                    var paycheck = (dataFind.paychecks.map(o => o.budgetDetails)).filter(element => {
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
                this.achiveDate = new Date((data.goal_endDate._seconds ? data.goal_endDate._seconds * 1000 : data.goal_endDate));

              }
              else {
                this.account = 'debt_reduction';
                this.goal_oldcategoryId = data.category_id
                this.attached_account = (data.goal_attached == "yes" ? true : false);
                this.createdebtForm.controls['category'].setValue(data.goal_category);
                this.createdebtForm.controls['goal_name'].setValue(data.goal_name);
                this.createdebtForm.controls['incomesource'].setValue(data.goal_income_name);
                this.createdebtForm.controls['goal_amount'].setValue(data.goal_amount);
                this.createdebtForm.controls['target_amount'].setValue(data.goal_target_amount);
                this.createdebtForm.controls['attached_account'].setValue(data.goal_attached);
                this.bankCurrentBalance = data.bank_detail.map(o => o.balance).reduce(function (a, b) { return a + b; }, 0);
                this.left_amount = data.paid_amount;
                this.previous_goalname = data.goal_name;
                this.monthly_amt = data.goal_monthly_amount;
                this.incomeSourceId = data.goal_incomeSource_Id;
                this.achiveDebtDate = new Date((data.goal_endDate._seconds ? data.goal_endDate._seconds * 1000 : data.goal_endDate));
                this.oldSavingAmount = data.goal_target_amount;
                this.oldSavingCategory = data.goal_category;
                this.old_incomeID = data.goal_incomeSource_Id;
                this.debt_reduction_banks = data.bank_detail;
                let dataFind = this.IncomeSources.find(o => o.id == data.goal_incomeSource_Id);
                if (dataFind) {
                  this.debtIncomeSelected = dataFind;
                  if (dataFind.paychecks && dataFind.paychecks.length) {
                    var categories = [];
                    var paycheck = (dataFind.paychecks.map(o => o.budgetDetails)).filter(element => {
                      if (element.length) {
                        var allbudgetLine = element.map(o => new Object({ "category_id": o.category_id.toString(), "hierarchy": [o.category], "categoryName": o.category }));
                        categories = categories.concat(allbudgetLine);
                        return element;
                      }
                    });
                    this._incomeSourceBudgetcategories = categories.filter((v, i, a) => a.findIndex(t => (t.category_id === v.category_id)) === i)
                  }
                }
              }
              var me = this;
              setTimeout(() => {
                callEndateCalc();
              }, 500);
              function callEndateCalc() {
                if (data) {
                  if (data.goal_type == "saving") {
                    me.calculateDate(data.goal_monthly_amount)
                  }
                  else {
                    me.calculateTarget(data.goal_monthly_amount);
                  }
                }

              }
            }
          })
        }
      });
    // var input = document.querySelector("#monthly_amt_id");
    // input.value = this.oldSavingAmount.toString();
  }
  ngOnInit() {

  }
  async browseAccount() {
    this.storage.get('accounts').then(async res => {
      if (res.length > 0) {
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
              me.createGoalForm.controls.goal_amount.setValue( me.bankCurrentBalance.toFixed(2));
              me.calculateDate(me.monthly_amt);
              this.bank = data.bank;
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
              if (data) {
                this.debtIncomeSelected = data;
                this._incomeSourceBudgetcategories = [];
                if (data.paychecks && data.paychecks.length) {
                  var categories = [];
                  var paycheck = (data.paychecks.map(o => o.budgetDetails)).filter(element => {
                    if (element.length) {
                      var allbudgetLine = element.map(o => new Object({ "category_id": o.category_id, "hierarchy": [o.category], "categoryName": o.category }));
                      categories = categories.concat(allbudgetLine);
                      return element;
                    }
                  });
                  this._incomeSourceBudgetcategories = categories.filter((v, i, a) => a.findIndex(t => (t.category_id === v.category_id)) === i)
                  console.log(this._incomeSourceBudgetcategories);
                }
              }
              this.createdebtForm.controls["incomesource"].setValue(data.name);
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
              if (data) {
                this.savingIncomeSelected = data;
                this._incomeSourceBudgetcategories = [];
                if (data.paychecks && data.paychecks.length) {
                  var categories = [];
                  var paycheck = (data.paychecks.map(o => o.budgetDetails)).filter(element => {
                    if (element.length) {
                      var allbudgetLine = element.map(o => new Object({ "category_id": o.category_id, "hierarchy": [o.category], "categoryName": o.category }));
                      categories = categories.concat(allbudgetLine);
                      return element;
                    }
                  });
                  this._incomeSourceBudgetcategories = categories.filter((v, i, a) => a.findIndex(t => (t.category_id === v.category_id)) === i)
                  console.log(this._incomeSourceBudgetcategories);
                }
              }
              this.createGoalForm.controls["incomesource"].setValue(data.name);
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
                me.bankCurrentBalance = me.bankCurrentBalance + bank.balance;
                me.createdebtForm.controls.goal_amount.setValue( me.bankCurrentBalance.toFixed(2));
              });
            }
            me.debt_reduction_banks = data.bank;
            me.calculateTarget(me.target_amount);
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
  back() {
    this.navCtrl.pop();
  }
  async openCategory(type) {
    var that = this;
    let incomeSource = type === 'debt' ? that.debtIncomeSelected : that.savingIncomeSelected;
    if (incomeSource.paychecks && incomeSource.paychecks.length) {
      this.cp.showLoading(3000);
      const modal = await that.modalCtrl.create({
        component: CategoriesPage,
        componentProps: {
          category: true,
          categories: that._incomeSourceBudgetcategories.length ? that._incomeSourceBudgetcategories : [],
          goals: true
        }
      });
      await modal.present();
      modal.onDidDismiss()
        .then(async (value: any) => {
          if (value.data) {
            that.category = value.data;
            if (value.data.GoalName) {
              that.goalName = value.data.GoalName
            }
            that.category_Id = value.data.category_id;
            that.account == "saving" ? that.createGoalForm.controls['category'].setValue(value.data.categoryName) : that.createdebtForm.controls['category'].setValue(value.data.categoryName);
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
  onInputTime(event) {
    if (isNaN(event)) {
      this.monthly_amt = 0;
    }
    else {
      this.monthly_amt = event;
      this.createGoalForm.controls['range_val'].setValue(this.monthly_amt);
      this.calculateDate(event);
    }
  }
  Change(event) {
    document.getElementById('monthly_amt_id')['value'] = event.detail.value
  }
  createGoal() {
    var me = this;
    let goal;
    if (me.createGoalForm.valid && me.monthly_amt > 0) {
      var value = me.createGoalForm.value;
      if (me.attached_account && me.bank.length == 0) {
        me.cp.presentAlert("", "Please Add A Bank Account");
        return;
      }
      if (me.attached_account && me.bank.length) {
        goal = {
          "goal_name": value.goal_name,
          "accounts": me.bank.map(o => o.account_id),
          "goal_oldcategory": me.oldSavingCategory,
          "goal_oldcategoryId": me.goal_oldcategoryId,
          "category_id": (me.category_Id != undefined) ? me.category_Id : me.goal_oldcategoryId,
          "goal_oldamount": me.oldSavingAmount,
          "goal_category": value.category,
          "goal_amount": parseFloat(value.goal_amount),
          "goal_monthly_amount": me.monthly_amt,
          "bank_detail": me.bank,
          "left_amount": (parseFloat(value.goal_amount) - me.bankCurrentBalance),
          "paid_amount": me.bankCurrentBalance,
          "goal_endDate": me.achiveDate,
          "goal_attached": value.attached_account,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "prev_goal": me.previous_goalname,
          "id": me.goalId,
          "incomesourcechanged": me.old_incomeID != me.incomeSourceId ? me.old_incomeID : null,
          "goal_type": "saving"//when algo read
        }
        me.updateGoals(goal)
      }
      else {
        goal = {
          "goal_name": value.goal_name,
          "accounts": [],
          "goal_category": value.category,
          "goal_oldcategory": me.oldSavingCategory,
          "goal_oldcategoryId": me.goal_oldcategoryId,
          "category_id": (me.category_Id != undefined) ? me.category_Id : me.goal_oldcategoryId,
          "goal_oldamount": me.oldSavingAmount,
          "goal_amount": parseFloat(value.goal_amount),
          "goal_monthly_amount": me.monthly_amt,
          "paid_amount": me.paid_amount,
          "left_amount": (parseFloat(value.goal_amount) - me.paid_amount),
          "bank_detail": [],
          "goal_endDate": me.achiveDate,
          "goal_attached": value.attached_account,
          "goal_income_name": value.incomesource,
          "goal_incomeSource_Id": me.incomeSourceId,
          "incomesourcechanged": me.old_incomeID != me.incomeSourceId ? me.old_incomeID : null,
          "prev_goal": me.previous_goalname,
          "id": me.goalId,
          "goal_type": "saving" //when algo read
        }
        me.updateGoals(goal);
      }
    }
    else {
      me.cp.presentAlert("", "Monthly Amount is always greater then 0");
      return;
    }
  }
  debtGoal() {
    var me = this;
    let goal;
    if (me.createdebtForm.valid) {
      var value = me.createdebtForm.value;
      if (me.attached_account && me.debt_reduction_banks.length == 0) {
        me.cp.presentAlert("", "Please Add A Bank Account")
        return;
      }
      if (me.attached_account && me.debt_reduction_banks.length) {
        goal = {
          "goal_name": value.goal_name,
          "accounts": me.debt_reduction_banks.map(o => o.account_id),
          "goal_category": value.category,
          "goal_amount": value.goal_amount,
          "goal_oldcategoryId": me.goal_oldcategoryId,
          "category_id": (me.category_Id != undefined) ? me.category_Id : me.goal_oldcategoryId,
          "goal_oldcategory": me.oldSavingCategory,
          "goal_oldamount": me.oldSavingAmount,
          "goal_target_amount": value.target_amount,
          "bank_detail": me.debt_reduction_banks,
          "left_amount": (parseFloat(value.goal_amount) - (parseFloat(value.goal_amount) - me.bankCurrentBalance)),
          "paid_amount": (parseFloat(value.goal_amount) - me.bankCurrentBalance),
          "goal_endDate": me.achiveDebtDate,
          "goal_attached": value.attached_account,
          "goal_income_name": value.incomesource,
          "incomesourcechanged": me.old_incomeID != me.incomeSourceId ? me.old_incomeID : null,
          "goal_incomeSource_Id": me.incomeSourceId,
          "prev_goal": me.previous_goalname,
          "id": me.goalId,
          "goal_type": "debt-Reduction"//when algo read
        }
        me.updateGoals(goal);
      }
      else {
        goal = {
          "goal_name": value.goal_name,
          "accounts": [],
          "goal_category": value.category,
          "goal_oldcategory": me.oldSavingCategory,
          "goal_oldcategoryId": me.goal_oldcategoryId,
          "category_id": (me.category_Id != undefined) ? me.category_Id : me.goal_oldcategoryId,
          "goal_oldamount": me.oldSavingAmount,
          "goal_amount": value.goal_amount,
          "goal_target_amount": value.target_amount,
          "bank_detail": [],
          "paid_amount": (me.left_amount),
          "left_amount": (parseFloat(value.goal_amount) - me.left_amount),
          "goal_endDate": me.achiveDebtDate,
          "goal_attached": value.attached_account,
          "goal_income_name": value.incomesource,
          "incomesourcechanged": me.old_incomeID != me.incomeSourceId ? me.old_incomeID : null,
          "goal_incomeSource_Id": me.incomeSourceId,
          "prev_goal": me.previous_goalname,
          "id": me.goalId,
          "goal_type": "debt-Reduction" //when algo read
        }
        me.updateGoals(goal);
      }
    }
  }
  updateGoals(goal) {
    var me = this;
    me.cp.presentLoading();
    goal = Object.assign({ isAccomplished: false }, { isRemoved: false }, goal);
    if (goal.goal_incomeSource_Id) {
      var income = this.IncomeSources.find(o => o.id === goal.goal_incomeSource_Id);
      if (income) {
        goal = Object.assign({ isRepeating: income.isRepeating }, { repeating: income.repeating },
          { goal_monthly_amount: goal.goal_type === "saving" ? goal.goal_monthly_amount : goal.goal_target_amount },
          { isAccomplished: false },
          { isRemoved: false },
          goal);
      }
    }
    me.api.updateGoals(goal).then((res: any) => {
      if (res.success) {
        me._ngZone.run(() => {
          me.api.getIncomeSource();
          me.api.getGoal();
          me.cp.dismissLoading();
          me.congratulations(goal.goal_income_name);
        })
      }
      else {
        me.cp.presentAlert("Error", res.error)
      }
    }).catch(err => {
      me.cp.dismissLoading();
    })
  }
  async congratulations(args) {
    swal({
      title: "Congratulations on update goal!",
      text: "You’ll see the goal has been updated to your ongoing paychecks for " + args + ". Good luck!",
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
    if (this.savingIncomeSelected && this.savingIncomeSelected['isRepeating']) {
      if (this.savingIncomeSelected['repeating'].type == "biweekly") {
        this.getAchiveDateFormula(val, this.goal_amount, 14);
      }
      else if (this.savingIncomeSelected['repeating'].type == "weekly") {
        this.getAchiveDateFormula(val, this.goal_amount, 7);
      }
      else if (this.savingIncomeSelected['repeating'].type == "semimonthly") {
        this.getAchiveDateFormula(val, this.goal_amount, 15);
      }
      else if (this.savingIncomeSelected['repeating'].type == "monthly") {
        this.getAchiveDateFormula(val, this.goal_amount, 30);
      }
    }
    else {

      this.getAchiveDateFormula(val, this.goal_amount, 30);
    }

  }
  getAchiveDateFormula(val, totalAmount, type) {
    if (val && totalAmount) {

      totalAmount = (this.attached_account && this.bank.length) ? totalAmount - this.bankCurrentBalance : totalAmount - this.paid_amount;
      let totalTime = totalAmount / val;
      let typeRecurresion = Math.floor(totalTime);
      if (totalTime - typeRecurresion != 0) {
        typeRecurresion = typeRecurresion + 1;
      }
      var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
      this.achiveDate = date > 0 ? new Date(date) : new Date(new Date().setDate(new Date().getDate() + ((1 * type))));
    }
  }
  getAchiveDebtDateFormula(val, totalAmount, type) {
    if (val && totalAmount) {
      if (this.attached_account && this.debt_reduction_banks.length) {
        if ((this.bankCurrentBalance) > 0) {
          totalAmount = totalAmount - (totalAmount - this.bankCurrentBalance)
        }
      }
      let totalTime = totalAmount / val;
      let typeRecurresion = Math.floor(totalTime);
      if (totalTime - typeRecurresion != 0) {
        typeRecurresion = typeRecurresion + 1;
      }
      var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
      this.achiveDebtDate = date > 0 ? new Date(date) : new Date(new Date().setDate(new Date().getDate() + ((1 * type))));
    }
  }
  calculateTarget(val) {
    val = parseFloat(val);
    if (this.debtIncomeSelected && this.debtIncomeSelected['isRepeating']) {
      if (this.debtIncomeSelected['repeating'].type == "biweekly") {
        this.getAchiveDebtDateFormula(val, this.goal_amount, 14);
      }
      else if (this.debtIncomeSelected['repeating'].type == "weekly") {
        this.getAchiveDebtDateFormula(val, this.goal_amount, 7);
      }
      else if (this.debtIncomeSelected['repeating'].type == "semimonthly") {
        this.getAchiveDebtDateFormula(val, this.goal_amount, 15);
      }
      else if (this.debtIncomeSelected['repeating'].type == "monthly") {
        this.getAchiveDebtDateFormula(val, this.goal_amount, 30);
      }
    }
    else {
      this.getAchiveDebtDateFormula(val, this.goal_amount, 30);
    }
  }
  ChangeDebt(ev) {
    console.log(ev)
    this.createdebtForm.get('target_amount').setValue(ev);

  }
}
