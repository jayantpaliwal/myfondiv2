import { Component, OnInit } from '@angular/core';
import { NavController, PopoverController} from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { Events } from '../services/Events.service';
import { Router, NavigationExtras } from '@angular/router';
import { Storage } from '@ionic/storage';
import { LogoutService } from '../services/logout/logout.service';
import { DetailsPage } from '../transaction-details/more-option/more-option.page';
import swal from 'sweetalert';
import { ApiService } from '../services/api/api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.page.html',
  styleUrls: ['./transaction-list.page.scss'],
})
export class TransactionListPage implements OnInit {
  plaidTransaction = [];
  filterTrans = [];
  sorting = "date";
  filter = "all";
  userPic: any;
  constructor(private cp: CommonProvider,
    public logoutService: LogoutService,
    public events: Events,
    private navCtrl: NavController,
    private router: Router, private api: ApiService,
    private storage: Storage,
    public popoverController: PopoverController) {
    events.subscribe('refresh:plaidtransaction', () => {
      this.getPlaidTransations();
    });
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });

  }
  ionViewWillEnter() {
    this.userPic = this.logoutService.userPic;
    this.getPlaidTransations();
  }

  getPlaidTransations() {
   var that = this;
    that.filterTrans = [];
    that.plaidTransaction = [];
    that.storage.get('plaidTransaction')
      .then((res) => {
        if (res) {
          var res2 = res;
          var d =[]; var e =[];
          res.forEach((v, i) => {
            res2.forEach((t, _index)=> {
              if((t.account_id != v.account_id && t.amount != v.amount &&t.name != v.name && t.date != v.date && t.category_id != v.category_id && t.transaction_type != v.transaction_type)){
                d.push(t);
              }
              else{
                if(_index == (res2.length - 1)){
                  e.push(v);
                }
               
              }
             });
            })
          var plaidtransaction = res.filter(o => o.active_transaction == true);
          that.plaidTransaction = plaidtransaction;
          that.filterTrans = that.plaidTransaction;
        }
        if (that.sorting = "date") {
          that.filterTrans = that.filterTrans.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() });
          that.filterTrans = [...new Map(that.filterTrans.map(item =>
            [item['id'], item])).values()];
        }
        else {
          that.filterTrans = that.filterTrans.sort((a, b) => a.name.localeCompare(b.name));
          that.filterTrans = [...new Map(that.filterTrans.map(item =>
            [item['id'], item])).values()];
        }

      })

  }
  openPayPeriod(trans) {
    if(trans.id){
      this.api.setPlaidTransactionParam({
        id: trans.id,
        amount: trans.amount,
        name: trans.name,
        remainingAmount: trans.TransAmount,
        category: trans.CategoryName,
        category_id: trans.category_id,
        date: trans.date,
        plaidTransId: trans.id,
        assignment: trans.assignment,
        IncomeType: trans.IncomeType,
        plaid: true,
        paycheck: []
      });
      this.router.navigate(['tabs/tabs/transaction-select/transaction-upload']);
    }

  }
  ngOnInit() {
  }
  back() {
    this.navCtrl.navigateForward('tabs/tabs/transaction-select');
  }
  sort(ev) {
    if (ev.detail.value == "date") {
      this.sorting = ev.detail.value;
      var result = this.filterTrans.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() });
      this.filterTrans = result;
    }
    if (ev.detail.value == "name") {
      this.sorting = ev.detail.value;
      var result = this.filterTrans.sort((a, b) => a.name.localeCompare(b.name));
      this.filterTrans = result;
    } 
  }
  fliter(ev) {
    let that = this;
    if (ev.detail.value != "all") {
      var result = that.plaidTransaction.filter(element => element.incomeid == ev.detail.value)
      if (that.sorting == "date") {
        that.filterTrans = result.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() });
      }
      else if (that.sorting == "name") {
        that.filterTrans = result.sort((a, b) => a.name.localeCompare(b.name));
      }
      else {
        that.filterTrans = result;
      }
    }
    else {
      if (that.sorting == "date") {
        that.filterTrans = that.plaidTransaction.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() });

      }
      else if (that.sorting == "name") {
        that.filterTrans = that.plaidTransaction.sort((a, b) => a.name.localeCompare(b.name));

      }
      else {
        that.filterTrans = that.plaidTransaction.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() });
      }
    }
  }
  gotoProfile() {
    this.router.navigate(["/tabs/tabs/home/profile"]);
  }
  async optionChoose(ev, trans) {
    const popover = await this.popoverController.create({
      component: DetailsPage,
      componentProps: {
        itemList: true
      },
      cssClass: 'my-custom-class',
      event: ev,
      translucent: true
    });
    popover.onDidDismiss()
      .then((result) => {
        var data = result['data'];
        // if (data == "edit") {
        //   this.changeCategory(trans);
        // }
        if (data == "delete") {
          this.unAssignTransaction(trans)
        }
      });
    return await popover.present();
  }
  changeCategory(trans) {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        trans: JSON.stringify(trans),
        onlyplaid: true
      }, skipLocationChange: true
    };
    this.navCtrl.navigateForward(['/tabs/tabs/home/change-category'], navigationExtras);
  }
  async unAssignTransaction(trans) {
    swal({
      title:  "Delete Transaction",
      text:  "Are you sure you want to delete this transaction?",
      icon: "error",
      buttons: ["Cancel","Confirm"],
      closeOnClickOutside: false
    })
    .then((value) => {
      if(value){
        this.deletePlaid(trans);
      }
    })
  }
  deletePlaid(ev) {
    var me = this;
    me.cp.presentLoading();
    me.api.deletePlaidtransaction(ev.transaction_id).then(res => {
      if (res['success']) {
        me.api.getPlaidTransaction().then(() => {
          me.cp.dismissLoading();
          me.events.publish("refresh:plaidtransaction", { time: new Date() });
          me.getPlaidTransations();
          me.api.getIncomeSource();
          me.api.getGoal();
          me.api.getTransaction();
        }).catch((err) => {
          this.cp.dismissLoading();
        });

      } else {
        this.cp.dismissLoading();
      }
    }).catch((err) => {
      this.cp.dismissLoading();
    });

  }

}
