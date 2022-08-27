import { Router } from '@angular/router';
import { AlertController, IonSelect } from '@ionic/angular';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { messages } from 'src/validation/messages';
import { CommonProvider } from 'src/providers/common';
import * as firebase from "firebase";
import { Storage } from '@ionic/storage';
import { Events } from '../services/Events.service';
import { ApiService } from '../services/api/api.service';
import swal from 'sweetalert';
import { TransactionService } from '../services/transaction/transaction.service';
import { FirebaseFunctionLocal } from '../services/firebase-api-local/firebase-api-local';
import DateDiff from '../services/firebase-api-local/date-diff';
import introJs from 'intro.js/intro.js';

@Component({
  selector: 'app-add-income',
  templateUrl: './add-income.page.html',
  styleUrls: ['./add-income.page.scss'],
})
export class AddIncomePage implements OnInit {
  validation_messages = messages;
  public incomeForm: FormGroup;
  serverError: string = "";
  paychecks = [];
  date = new Date();
  Week_Num: any;
  week_Days = [{ id: 0, name: 'Sunday' }, { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' }, { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }];
  firstDay = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
  lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);
  recurring: boolean = true;
  weeknumberMsg: string;
  weekDaysMsg: string;
  weeknumberFlag: boolean = false;
  weekDaysFlag: boolean = false;
  checked: boolean = false;
  incomes_add = [];
  slectedIncome: any;
  constructor(private formBuilder: FormBuilder, private transService: TransactionService,
    private api: ApiService, public events: Events,
    private cp: CommonProvider, public storage: Storage, public alertController: AlertController,
    public fbService: FirebaseFunctionLocal,
    private router: Router,) { }
  currentDate() {
    const currentDate = new Date();
    return currentDate.toISOString().substring(0, 10);
  }
  ionViewWillEnter() {
    this.storage.get('incomeSource').then((res) => {
      if (res && res.length > 0) {
        this.incomes_add = res;
      }
    })
  }
  ngOnInit() {
    var date = new Date();
    var lastdate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().substring(0, 10);
    this.incomeForm = this.formBuilder.group({
      incomeType: new FormControl('recurring', [Validators.required]),
      paycheckName: new FormControl('', [Validators.required]),
      paycheckFrequency: new FormControl('monthly', [Validators.required]),
      payDate: new FormControl(this.currentDate(), [Validators.required]),
      payAmount: new FormControl('', [Validators.required, Validators.min(1)]),
      weekNumber: new FormControl(''),
      weekNumber2: new FormControl(''),
      payDatesFormat: new FormControl('weekly'),
      weekDay: new FormControl(''),
      firstPaycheckDate: new FormControl(''),
      secondPaycheckDate: new FormControl(''),
    });
  }
  submit() {
    let me = this;
    if (this.incomeForm.valid) {
      if (this.incomeForm.value.incomeType == 'recurring') {
        //    this.incomeForm.controls["payDate"].setValue(new Date().getMonth() + 1 + "/15/" + new Date().getFullYear());

        if (this.checked && this.incomeForm.value.paycheckFrequency == 'semimonthly' && this.incomeForm.value.payDatesFormat == 'weekly') {
          if (!this.incomeForm.value.weekNumber || !this.incomeForm.value.weekNumber2 || !this.incomeForm.value.weekDay) {
            this.cp.presentAlert('', 'fill the details of week');
            return;
          }
          if (this.incomeForm.value.weekNumber2 == this.incomeForm.value.weekNumber) {
            this.cp.presentAlert('', 'please choose different week number');
            return;
          }
        }
        if (this.checked && this.incomeForm.value.paycheckFrequency == 'semimonthly' && this.incomeForm.value.payDatesFormat == 'Date') {
          if (!this.incomeForm.value.firstPaycheckDate || !this.incomeForm.value.secondPaycheckDate) {
            this.cp.presentAlert('', 'fill the details of Days');
            return;
          }
          if (this.incomeForm.value.firstPaycheckDate == this.incomeForm.value.secondPaycheckDate) {
            this.cp.presentAlert('', 'please choose different Day number');
            return;
          }
        }
        if (this.checked && this.incomeForm.value.paycheckFrequency == 'monthly') {
          if (!this.incomeForm.value.weekNumber || !this.incomeForm.value.weekDay) {
            this.cp.presentAlert('', 'fill the details of week');
            return;
          }
        }
      }
      const data = this.incomeForm.value;
      let params = {
        "name": data.paycheckName,
        "isRepeating": data.incomeType == "recurring" ? true : false,
        "repeatingType": data.paycheckFrequency,
        "startDate": data.payDate,
        "income": data.payAmount,
        "userId": firebase.auth().currentUser.uid,
      };
      if (this.checked && data.incomeType == "recurring" && data.paycheckFrequency == 'semimonthly') {
        params["weeks"] = {
          "dateFormat": data.payDatesFormat,
          "weekNumber": data.payDatesFormat == 'weekly' ? [parseInt(data.weekNumber), parseInt(data.weekNumber2)] : [],
          "weekDays": data.payDatesFormat == 'weekly' ? parseInt(data.weekDay) : null, // [0-6 range  with sunday-saturday]
          "monthDays": data.payDatesFormat == 'Date' ? [parseInt(data.firstPaycheckDate), parseInt(data.secondPaycheckDate)] : []
        }
      }
      if (this.checked && data.incomeType == "recurring" && data.paycheckFrequency == 'monthly') {
        params["weeks"] = {
          "weekNumber": [parseInt(data.weekNumber)],
          "weekDays": parseInt(data.weekDay), // [0-6 range  with sunday-saturday]
        }
      }
      if (me.incomes_add.length) {
        me.askingforNew(params);
      }
      else {
        me.addNewOne(params)
      }
    } else {
      this.cp.presentAlert('', 'fill the required details');
      for (let i in me.incomeForm.controls)
        me.incomeForm.controls[i].markAsTouched();
    }

  }
  back() {
    this.router.navigate(['tabs/tabs/paycheck'], { replaceUrl: true });
  }
  selected(value) {
    if (value == 'recurring') {
      this.recurring = true;
      this.incomeForm.controls["paycheckFrequency"].setValidators(Validators.required);
    } else {
      this.recurring = false;
      this.incomeForm.controls["paycheckFrequency"].clearValidators();
      this.incomeForm.controls["paycheckFrequency"].setValue("monthly");
    }
    this.incomeForm.controls["paycheckName"].updateValueAndValidity();
  }
  onSegmentChanged(ev) {
    if (ev.detail.value === "semimonthly") {
      this.checked = true;
      this.incomeForm.controls["weekNumber"].setValidators(Validators.required);
      this.incomeForm.controls["weekDay"].setValidators(Validators.required);
      this.incomeForm.controls["weekNumber2"].setValidators(Validators.required);
      this.incomeForm.controls["weekNumber"].reset();
      this.incomeForm.controls["weekDay"].reset();
      this.incomeForm.controls["weekNumber2"].reset();
    }
    else if (ev.detail.value != "semimonthly") {
      this.checked = false;
      this.incomeForm.controls["weekNumber"].clearValidators();
      this.incomeForm.controls["weekDay"].clearValidators();
      this.incomeForm.controls["weekNumber2"].clearValidators();
      this.incomeForm.controls["firstPaycheckDate"].clearValidators();
      this.incomeForm.controls["secondPaycheckDate"].clearValidators();
      this.incomeForm.controls["weekNumber"].reset();
      this.incomeForm.controls["weekDay"].reset();
      this.incomeForm.controls["weekNumber2"].reset();
      this.incomeForm.controls["firstPaycheckDate"].reset();
      this.incomeForm.controls["secondPaycheckDate"].reset();
    }
  }
  verifyEvent(event) {
    this.checked = event.detail.checked;
    if (this.checked && this.incomeForm.value.paycheckFrequency == 'monthly') {
      this.incomeForm.controls["weekNumber"].setValidators(Validators.required);
      this.incomeForm.controls["weekDay"].setValidators(Validators.required);
      this.incomeForm.controls["weekNumber2"].clearValidators();
    }
    else {
      let data = this.incomeForm.value;
      this.incomeForm.reset();
      this.incomeForm.controls['incomeType'].setValue(data.incomeType)
      this.incomeForm.controls['paycheckName'].setValue(data.paycheckName);
      this.incomeForm.controls['paycheckFrequency'].setValue(data.paycheckFrequency);
      this.incomeForm.controls['payDate'].setValue(data.payDate);
      this.incomeForm.controls['payAmount'].setValue(data.payAmount);
    }
  }
  async congratulations(args) {
    this.incomeForm.reset();
    swal({
      title: "Congratulations on your new income source!",
      text: "Your new paychecks don’t have a budget. Would you like to set up your budget now?",
      icon: "success",
      buttons: ["Maybe Later", "Yes"],
      closeOnClickOutside: false
    })
      .then((willDelete) => {
        if (willDelete) {
          this.incomeForm.reset();
          this.transService.setPaycheckDetails({
            payPeriods: args,
            repeatingType: (args.isRepeating ? args.repeating.type : null),
            lastroute: "/tabs/tabs/paycheck"
          });
          this.router.navigate(['/tabs/tabs/paycheck/paycheck-details']);
        } else {
          swal("You can set your budgets by going to a paycheck and clicking ‘+Click To Allocate’", {
            icon: "success",
          });
          this.router.navigate(['tabs/tabs/paycheck'], { replaceUrl: true });
        }
      });
  }
  async askingforNew(params) {
    var me = this;
    swal({
      title: "Add New Income Source",
      text: "Is this a new budget or should we add this paycheck source into an existing budget plan?",
      icon: "info",
      buttons: ["This is a New Budget", "Add to an Existing Budget Plan"],
      closeOnClickOutside: false
    })
      .then((willDelete) => {
        if (willDelete) {
          // me.incomeSourceId.open();
          me.presentAlertIncome();
        } else {
          me.addNewOne(params)
        }
      });

  }
  async presentAlertIncome() {
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
          handler: (data) => {
            if (data) {
              this.slectedIncome = data;
              this.add_existing();
            }
          }
        }
      ]
    };
    // add options here 
    options.inputs = [];
    for (let index = 0; index < this.incomes_add.length; index++) {
      options.inputs.push({ name: 'options' + index, value: this.incomes_add[index].id, label: this.incomes_add[index].name + ' - ' + (this.incomes_add[index].isRepeating ? this.incomes_add[index].repeating.type : 'non-recurring'), type: 'radio' })
    }

    const alert = await this.alertController.create(options);
    alert.present();
  }
  add_existing() {
    var me = this;
    const data = me.incomeForm.value;
    /**
     * putting add to existing income formula here 
     *  -> generate paycheck --> find the most recent from the paycheck date -> assign the amount to the first index of most recent
     * client want that if a paycheck which is the range between the last paycheck date and recent paycheck then assign value.
     */
    let params = {
      "name": data.paycheckName,
      "isRepeating": data.incomeType == "recurring" ? true : false,
      "repeatingType": data.paycheckFrequency,
      "startDate": data.payDate,
      "payDate": data.payDate,
      "income": data.payAmount,
      "userId": firebase.auth().currentUser.uid,
    };
    if (this.checked && data.incomeType == "recurring" && data.paycheckFrequency == 'semimonthly') {
      params["weeks"] = {
        "dateFormat": data.payDatesFormat,
        "weekNumber": data.payDatesFormat == 'weekly' ? [parseInt(data.weekNumber), parseInt(data.weekNumber2)] : [],
        "weekDays": data.payDatesFormat == 'weekly' ? parseInt(data.weekDay) : null, // [0-6 range  with sunday-saturday]
        "monthDays": data.payDatesFormat == 'Date' ? [parseInt(data.firstPaycheckDate), parseInt(data.secondPaycheckDate)] : []
      }
    }
    if (this.checked && data.incomeType == "recurring" && data.paycheckFrequency == 'monthly') {
      params["weeks"] = {
        "weekNumber": [parseInt(data.weekNumber)],
        "weekDays": parseInt(data.weekDay), // [0-6 range  with sunday-saturday]
      }
    }
        me.cp.presentLoading();
        // for local function
        // me.fbService.addtoExistingIncomeSources({params : params,slectedIncome: me.slectedIncome, data: data, }).then((response: any)=>{
        //   me.cp.dismissLoading();
        //   if(response.success){
        //     me.api.getIncomeSourceById(me.slectedIncome).then((res) => {
        //       me.events.publish('change:paycheck', {});
        //       me.incomeForm.reset();
        //       me.router.navigate(['tabs/tabs/paycheck'], { replaceUrl: true });
        //     })
        //   }
        // }).catch((err) => {
        //   console.log(err)
        //   me.cp.dismissLoading();
        // });
        me.api.addtoExistingIncomeSource({params : params,data: data, slectedIncome: me.slectedIncome}).then((response: any)=>{
          me.cp.dismissLoading();
          if(response.success){
            me.api.getIncomeSourceById(me.slectedIncome).then((res) => {
              me.events.publish('change:paycheck', {});
              me.incomeForm.reset();
              me.router.navigate(['tabs/tabs/paycheck'], { replaceUrl: true });
            })
          }
        }).catch((err) => {
          console.log(err)
          me.cp.dismissLoading();
        });

  }
  addNewOne(params) {
    var me = this;
    me.cp.presentLoading();
    me.api.addIncomeSource(params).then((res) => {
      if (res) {
        me.api.getIncomeSourceById(res['incomeSourceId']).then((res) => {
          let newlyAddIncome = res['incomes'];
          var paychecks = newlyAddIncome.paychecks;
          let sortpaychecks = paychecks.sort((a, b) => a.payDateTimeStamp - b.payDateTimeStamp);
          let latestaddIncome = {
            incomeid: newlyAddIncome.id,
            budgetTemplate: newlyAddIncome.budgetTemplate,
            isRepeating: newlyAddIncome.isRepeating,
            incomeName: newlyAddIncome.name,
            repeating: newlyAddIncome.repeating,
            startDate: newlyAddIncome.startDate,
            weeks: newlyAddIncome.weeks,
            budgetDetails: sortpaychecks[0].budgetDetails,
            budgetsAvailable: sortpaychecks[0].budgetsAvailable,
            budgetsCurrent: sortpaychecks[0].budgetsCurrent,
            budgetsToBeBudgeted: sortpaychecks[0].budgetsToBeBudgeted,
            id: sortpaychecks[0].id,
            isOverbudget: sortpaychecks[0].isOverbudget,
            isOverspent: sortpaychecks[0].isOverspent,
            name: sortpaychecks[0].name,
            payDate: sortpaychecks[0].payDate,
            payDateTimeStamp: sortpaychecks[0].payDateTimeStamp,
            receivedPaycheckTransaction: sortpaychecks[0].receivedPaycheckTransaction,
            totalExpected: sortpaychecks[0].totalExpected,
            totalReceived: sortpaychecks[0].totalReceived,
            totalReceivedamt: newlyAddIncome.budgetTemplate.totalExpected,
            type: "income"
          }
          me.cp.dismissLoading();
          me.congratulations(latestaddIncome);
        }).catch((err) => {
          me.cp.dismissLoading();
        })
      }
    }).catch((err) => {
      me.cp.dismissLoading();
    })
  }
  selectedPayDatetype(event) {
    console.log(event.detail.value)
    this.incomeForm.controls["payDatesFormat"].setValue(event.detail.value);
    if (event.detail.value === "weekly") {
      this.incomeForm.controls["weekNumber"].setValidators(Validators.required);
      this.incomeForm.controls["weekDay"].setValidators(Validators.required);
      this.incomeForm.controls["weekNumber2"].setValidators(Validators.required);
      this.incomeForm.controls["firstPaycheckDate"].clearValidators();
      this.incomeForm.controls["secondPaycheckDate"].clearValidators();
      this.incomeForm.controls["weekNumber"].reset();
      this.incomeForm.controls["weekDay"].reset();
      this.incomeForm.controls["weekNumber2"].reset();
      this.incomeForm.controls["firstPaycheckDate"].reset();
      this.incomeForm.controls["secondPaycheckDate"].reset();
    } else {
      this.incomeForm.controls["weekNumber"].clearValidators();
      this.incomeForm.controls["weekDay"].clearValidators();
      this.incomeForm.controls["weekNumber2"].clearValidators();
      this.incomeForm.controls["firstPaycheckDate"].setValidators(Validators.required);
      this.incomeForm.controls["secondPaycheckDate"].setValidators(Validators.required);
      this.incomeForm.controls["weekNumber"].reset();
      this.incomeForm.controls["weekDay"].reset();
      this.incomeForm.controls["weekNumber2"].reset();
      this.incomeForm.controls["firstPaycheckDate"].reset();
      this.incomeForm.controls["secondPaycheckDate"].reset();
    }
  }
  getDaysInThisMonth() {
    var now = new Date(this.incomeForm.value.payDate);
    var totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return [...Array(totalDays).keys()]
  }
  ionViewWillLeave() {
    console.log("view destroy");
    var me = this;
    me.incomeForm.reset();
  }
  //bhavna 
  ngAfterViewInit() {
    if (!localStorage.getItem('incomeInfo')) {
      localStorage.setItem('incomeInfo', 'true')
      introJs().setOptions({
        steps: [{
          intro: 'There are 2 income types.'
        },
        {
          element: '.recurring',
          intro: 'Recurring Income is income that you are expecting to receive on a recurring basis.'
        },
        {
          element: '.nonrecurring',
          intro: 'Non-Recurring or Other Income is a one-time payment such as a tax refund or money received as a gift.'
        },
        {
          intro: 'You should always start with your recurring income first. If you have two recurring incomes and you want to make one budget, you must enter the most frequent income first.'
        },
        {
          element: '.chooseoption',
          intro: 'There are 4 pay frequencies you can select which are (going from most to least frequent:'
        },
        {
          element: '.weekly',
          intro: 'Weekly'
        },
        {
          element: '.biweekly',
          intro: 'Bi-Weekly which is every other week'
        },
        {
          element: '.semimonthly',
          intro: 'Semi-Monthly which is for example the 1st and 15th of the Month'
        },
        {
          element: '.monthly1',
          intro: 'Monthly'
        },
        {
          element: '.paycheckdate',
          intro: 'When selecting the start of your paycheck dates, select the most recent that has past or the next paycheck to begin.'
        }
      ]
      }).start();
    }
  }
}