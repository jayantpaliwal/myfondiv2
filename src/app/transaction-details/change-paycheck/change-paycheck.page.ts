import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavController, AlertController, IonSelect } from '@ionic/angular';
import { FormBuilder} from '@angular/forms';
import { CommonProvider } from 'src/providers/common';
import {ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { Storage } from '@ionic/storage';
import { TransactionService } from 'src/app/services/transaction/transaction.service';
import { Events } from 'src/app/services/Events.service';
import { LogoutService } from 'src/app/services/logout/logout.service';
import { ApiService } from 'src/app/services/api/api.service';
import { CategoriesPage } from 'src/app/categories/categories.page';
import swal from 'sweetalert';
@Component({
  selector: 'app-change-paycheck',
  templateUrl: './change-paycheck.page.html',
  styleUrls: ['./change-paycheck.page.scss'],
})
export class ChangePaycheckPage implements OnInit {
  subscribe: any;
  transaction;
  lastRoutePath;
  incomeSource = [];
  constructor(private cp: CommonProvider,
    private modalCtrl: ModalController, 
    private router :Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
     public transService: TransactionService,
    public events: Events,
    public logoutService: LogoutService,
     private api: ApiService, 
     public storage: Storage) {
  }
  loadViewData() {

  }
  ngOnInit() {
      if (this.transService.gettransactionDetails()) {
        this.transaction = this.transService.gettransactionDetails().transaction;
        this.transaction.amount =parseFloat(this.transService.gettransactionDetails().transaction.amount);
        this.lastRoutePath = this.transService.gettransactionDetails().lastRoute;
      }
    this.storage.get('incomeSource')
      .then((res) => {
        if (res && res.length > 0) {
          this.incomeSource = res;
          var paychecksArray=[];
          res.forEach((income , index) => {
              income.paychecks.forEach(paycheck => {
                let data = {
                  incomeid: income.id,
                  isRepeating: income.isRepeating,
                  incomeName: income.name,
                  repeating: income.repeating,
                  id: paycheck.id,
                  payDate: new Date(paycheck.payDateTimeStamp),
                  name: paycheck.name,
                };
                paychecksArray.push(data);
              });
              if((index)==res.length-1 && this.transaction){
                var payckeck=[];
                this.transaction.assignment.forEach(assign => {
                  this.transaction.paycheck = [];
                  let pa = paychecksArray.find(o=>o.id==assign.paycheckId);
                  if(pa){
                    pa.amount=assign.amount;
                  }
                  payckeck.push(pa);
                  this.transaction.paycheck = payckeck;
                });
               
              }
            });
        }

      })
  }
  async remove(trans){
    swal({
      title: "Delete Transaction",
      text: "Are you sure you want to permanently delete this transaction from this app?",
      icon: "error",
      buttons: ["No","Yes"],
      closeOnClickOutside: false
    })
    .then((value) => {
      if(value){
        this.plaid(trans);
      }
    })
  }
  plaid(trans) {
    this.cp.presentLoading();
    this.api.unAssignTransaction(trans.id).then((res : any) => {
      if (res.success) {
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
  back() {
    this.navCtrl.navigateBack(this.lastRoutePath);
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
  async changeCategory(paycheck){
    swal({
      title: "Category Change",
      text: "Are you sure you want to change the Category of this transaction?",
      icon: "info",
      buttons: ["No","Yes"],
      closeOnClickOutside: false
    })
    .then((value) => {
      if(value){
        let navigationExtras: NavigationExtras = {
          queryParams: {
            trans: JSON.stringify(paycheck),
            CategoryChange: true
          }, skipLocationChange: true
        };
        this.navCtrl.navigateForward(['/tabs/tabs/home/change-category'], navigationExtras);
      }
    })
   
  }
  async changePaycheck(paycheck) {
    swal({
      title: "Paycheck Change",
      text: "Are you sure you want to change the paycheck assigned to this transaction?",
      icon: "info",
      buttons: ["No","Yes"],
      closeOnClickOutside: false
    })
    .then((value) => {
      if(value){
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
        paycheck : paycheck.id
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        if (value.data && value.data.payCheck) {
          that.cp.presentLoading();
          if(value.data.payCheck.paycheckId===paycheck.id){
            that.cp.dismissLoading();
          }
          else{
            that.transService.changePaychecks(paycheck, value.data.payCheck, this.transaction).then(function (response) {
               if (response.success) {
                that.transService.markPaycheck(value.data.payCheck.paycheckId);
                that.api.getTransaction();
                that.api.getIncomeSource();
                that.api.getPlaidTransaction();
               var refreshDetail = that.transaction;
                that.incomeSource.forEach(ele => {
                  ele.paychecks.forEach(new_p => {
                    let i_old = refreshDetail.paycheck.findIndex(o => o.id === paycheck.id);
                   
                    if (new_p.id === value.data.payCheck.paycheckId && i_old != -1) {
                      that.transaction =[];
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
                })
              }
              else {
                that.cp.presentToast("Not Update the All details properly..")
              }
            })
              .catch(function () {
                that.cp.dismissLoading();
              });
          }
         
        }
      })
  }
  
}

