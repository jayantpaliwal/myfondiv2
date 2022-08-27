import { Component, OnInit } from '@angular/core';
import { NavParams, ModalController, NavController, AlertController } from '@ionic/angular';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonProvider } from 'src/providers/common';
import { Router } from '@angular/router';
import { TransactionService } from '../services/transaction/transaction.service';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { ApiService } from '../services/api/api.service';
import { Storage } from '@ionic/storage';
import { plad_public_key } from 'src/config/config';
import swal from 'sweetalert';
declare var Plaid: any;
@Component({
  selector: 'app-paycheck-allocation-popup',
  templateUrl: './paycheck-allocation-popup.page.html',
  styleUrls: ['./paycheck-allocation-popup.page.scss'],
})
export class PaycheckAllocationPopupPage implements OnInit {
  paycheckAllocation: boolean = true;
  dateForm: FormGroup;
  account = {
    accessToken: "",
    itemId: ""
  }
  accountArray = [];
  dateRange = {
    displayForm: "",
    displayTo: "",
  };
  accounts: any;
  constructor(public navParams: NavParams, private cp: CommonProvider, private formBuilder: FormBuilder,
    private modalCtrl: ModalController, private router: Router,
    public transService: TransactionService,
    private alertController: AlertController,
    public logoutService: LogoutService, private api: ApiService, public storage: Storage) {

    this.paycheckAllocation = navParams.get('PaycheckAllocation');
    if (!this.paycheckAllocation) {
      this.dateForm = this.formBuilder.group({
        dateFrom: new FormControl(this.fromDate(), [Validators.required]),
        dateTo: new FormControl(this.currentDate(), [Validators.required]),
      });
    }
  }
  currentDate() {
    const currentDate = new Date();
    return currentDate.toISOString().substring(0, 10);
  }
  fromDate() {
    const currentDate = new Date(new Date().setDate(new Date().getDate() - 30));
    return currentDate.toISOString().substring(0, 10);
  }
  ngOnInit() {

  }
  close() {
    this.modalCtrl.dismiss();
  }
  Retrive() {
    if (this.dateForm.valid) {
      const data = this.dateForm.value;
      if (data.dateFrom <= data.dateTo) {
        this.dateRange.displayForm = data.dateFrom;
        this.dateRange.displayTo = data.dateTo;
        // this.modalCtrl.dismiss({ 'from':data.dateFrom , 'to':data.dateTo});
        this.Connect();
      }
      else {
        this.cp.presentAlert('', 'Date Invalid. Please choose correct Date');
        return;
      }
    }
  }
  Connect() {
    let me = this;
    var handler = Plaid.create({
      clientName: 'MyFondi',

      countryCodes: ['US'],
      env: 'production',
      key: plad_public_key,
      product: ['transactions'],
      language: 'en',
      // Optional, specify userLegalName and userEmailAddress to
      // enable all Auth features
      userLegalName: me.logoutService.userName, // yha user name
      userEmailAddress: me.logoutService.email,  // user email lo
      onLoad: function () {
        // Optional, called when Link loads
      },
      onSuccess: function (public_token, metadata) {
        me.cp.presentLoading();
        me.transService.exchangeToken(public_token).then(function (result: any) {
          if (result.success) {
            let account_token = [];
            me.transService.getAccounts(result.access_token).then(function (accountsResult: any) {
              if (accountsResult.success && accountsResult.accounts.length > 0) {
                var input = []
                me.accountArray = accountsResult.accounts;
                accountsResult.accounts.forEach(element => {
                  let name = element.official_name != null ? element.official_name : element.name;
                  input.push({
                    type: 'checkbox',
                    label: name + " : " + element.subtype,
                    value: element.account_id,
                  })
                });
                me.alertController.create({
                  header: 'Plaid Account',
                  message: 'Please select the account that you do not want to add to it in MyFondi.',
                  backdropDismiss: false,
                  inputs: input,
                  buttons: [
                    {
                      text: 'Cancel',
                      handler: (data: any) => {

                        me.saveAccounts(me.accountArray, result.access_token)
                      }
                    },
                    {
                      text: 'Done',
                      handler: (data: any) => {
                        data.forEach(i => {
                          let index = me.accountArray.findIndex(o => o.account_id == i);
                          if (index != -1) {
                            me.accountArray.splice(index, 1)
                          }
                        });
                        me.saveAccounts(me.accountArray, result.access_token)
                      }
                    }
                  ]
                }).then(res => {
                  res.present();
                });
              }
              me.cp.dismissLoading()
            }).catch(err => {
              me.cp.dismissLoading()
              me.cp.presentAlert("Error", JSON.stringify(err));
            });
          }
        }).catch(err => {
          me.cp.dismissLoading()
          me.cp.presentAlert("Error", JSON.stringify(err));
        });

      },
      onExit: function (err, metadata) {
        if (err != null) {
        }

      },
      onEvent: function (eventName, metadata) {

      }
    })
    handler.open();
  }
  async forRequestTransaction(acc, access_token) {
    var me = this;
    me.accounts = me.accounts.concat(acc);
    swal({
      title: "Allow access to your account transactions?",
      text: "Would you like for MyFondi to retrieve transactions from this account?",
      icon: "warning",
      buttons: ["No", "Access"],
      closeOnClickOutside: false
    })
      .then((willDelete) => {
        if (willDelete) {
          me.dateRange.displayForm = new Date().toISOString().substring(0, 10);
          var recurrTillDate = new Date().setMonth(new Date().getMonth() - 1);
          me.dateRange.displayTo = new Date(recurrTillDate).toISOString().substring(0, 10);
          me.cp.presentLoading();
          var count = 0;
          saveTransaction(acc[count].account_id)
          function saveTransaction(id) {
            count++;
            me.transService.saveTransaction(access_token, id, acc[count].type, me.dateRange).then((res) => {
              if (res['success'] && count === acc.length) {
                me.cp.dismissLoading();
                me.congratulations();
                me.api.getPlaidTransaction().then((res) => {
                  if (res) {
                    me.api.getIncomeSource();
                    me.api.getTransaction();
                  }
                });
              }
              else if (count === acc.length) {
                me.cp.dismissLoading();
              }
              else {
                saveTransaction(acc[count].account_id);
              }
            }).catch(err => {
              me.cp.dismissLoading();
            })
          }
        } else {
          acc.forEach(account => {
            account.hasPermission = false;
            this.transService.updateAccount(acc.account_id, false);
          });
        }
      });
  }
  async congratulations() {
    swal({
      title: "Congratulations on connecting your new account!",
      text: "Are you ready to assign your transactions to a paycheck budget?",
      icon: "success",
      buttons: ["Maybe Later", "Yes"],
      closeOnClickOutside: false
    })
      .then((willDelete) => {
        if (willDelete) {
          this.router.navigate(['tabs/tabs/transaction-select/transaction-list']);
        } else {
          swal("You can assign your transactions by pressing the + button at the bottom menu", {
            icon: "success",
          });
        }
      });
  }
  saveAccounts(accounts, access_token) {
    var me = this;
    me.cp.presentLoading();
    me.transService.saveAccounts(accounts, access_token).then(function (response: any) {
      if (response.success) {
        me.api.getAccounts();
        me.forRequestTransaction(accounts, access_token);
        me.cp.dismissLoading();
      }
      else {
        me.cp.dismissLoading();
        me.cp.presentToast(response.error)
      }
    }).catch(err => {
      me.cp.dismissLoading()
      me.cp.presentAlert("Error", JSON.stringify(err));
    });

  }
}
