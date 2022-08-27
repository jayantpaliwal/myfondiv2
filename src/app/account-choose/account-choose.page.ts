import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavParams, ModalController, NavController, AlertController, Platform } from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { FormBuilder } from '@angular/forms';
import { TransactionService } from '../services/transaction/transaction.service';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { ApiService } from '../services/api/api.service';
import { Storage } from '@ionic/storage';
import { plad_public_key } from 'src/config/config';
declare var Plaid: any;
import swal from 'sweetalert';
import { InappBrowserService } from '../services/inapp-browser/inapp-browser.service';
@Component({
  selector: 'app-account-choose',
  templateUrl: './account-choose.page.html',
  styleUrls: ['./account-choose.page.scss'],
})
export class AccountChoosePage implements OnInit {
  accounts = [];
  choose: boolean = true;
  dateRange = {
    displayForm: "",
    displayTo: "",
  };
  saving: boolean = false;
  debt: boolean = false;
  accountArray = [];

  constructor(private cp: CommonProvider,
    private modalCtrl: ModalController,
    private router: Router,
    public transService: TransactionService,
    private platform: Platform,
    private iab: InappBrowserService,
    public events: Events,
    private alertController: AlertController,
    public storage: Storage,
    private navParams: NavParams,
    public logoutService: LogoutService,
    private api: ApiService) {
    events.subscribe('refresh:accounts', (_rs) => {
      this.getAccounts();
    });
    this.getAccounts();
    if (this.navParams.data) {
      this.saving = this.navParams.data.saving;
      this.debt = this.navParams.data.debt;
    }
  }
  ngOnInit() {
  }
  Connect() {
    let me = this;
    if (me.platform.is('ios')) {
      me.iab.CreateBrowser().then((browser : any) => {
        if(browser.success){
          me.cp.presentLoading();
          me.transService.exchangeToken(browser.token).then(function (result: any) {
            if (result.success) {
              let account_token = [];
              me.transService.getAccounts(result.access_token).then(function (accountsResult: any) {
                if (accountsResult.success && accountsResult.accounts.length) {
                  var input = []
                  me.accountArray = accountsResult.accounts;
                  accountsResult.accounts.forEach(element => {
                    let name = element.official_name != null ? element.official_name : element.name;
                    input.push({
                      type: 'checkbox',
                      label: name + " : " + element.subtype,
                      value: element.account_id,
                      checked: true
                    })
                  });
                  me.alertController.create({
                    header: 'Plaid Account',
                    message: "We are going to add the following accounts. Please uncheck any account you don't want us to add to MyFondi",
                    backdropDismiss: false,
                    inputs: input,
                    buttons: [
                      {
                        text: 'Cancel',
                        handler: (data: any) => {
                          var array = [];
                          me.accountArray.forEach((e, acc_index) => {
                            let count = 0;
                            var c = me.accounts.map((o) => {
                              count++;
                              if (o.name != e.name && o.type != e.type && o.subtype != e.subtype && o.mask != e.mask && o.account_id != e.account_id) {
                                if (me.accounts.length === count) {
                                  array.push(e);
                                }
                              }
                              return o;
                            })
                            if (acc_index === me.accounts.length - 1) {
                              me.saveAccounts(array, result.access_token)
                            }
                          })
  
                        }
                      },
                      {
                        text: 'Done',
                        handler: async (data: any) => {
                          var array = [];
                          data.forEach((i, acc_index) => {
                            let index = me.accountArray.findIndex(o => o.account_id == i);
                            if (index != -1) {
                              let count = 0;
                              var c = me.accounts.map(o => {
                                count++;
                                if (o.name != me.accountArray[index].name && o.type != me.accountArray[index].type && o.subtype != me.accountArray[index].subtype && o.mask != me.accountArray[index].mask && o.account_id != me.accountArray[index].account_id) {
                                  if (me.accounts.length === count) {
                                    array.push(me.accountArray[index]);
                                  }
                                }
                                return o;
                              })
                            }
                            if (acc_index === data.length - 1) {
                              me.saveAccounts(array, result.access_token);
                            }
                          });
                        }
                      }
                    ]
                  }).then(res => {
                    res.present();
                  });
                }
                me.cp.dismissLoading()
              }).catch(err => {
                me.cp.presentAlert("Error", JSON.stringify(err));
              });
            }
          }).catch(err => {
            me.cp.dismissLoading()
            me.cp.presentAlert("Error", JSON.stringify(err));
          });
        }
     else{
      me.cp.presentAlert("Error", browser.message);
     }
      })
    }
    else{
      // android ---
      var handler = Plaid.create({
        clientName: 'MyFondi',
        countryCodes: ['US'],
        env: 'production',
        key: plad_public_key,
        product: ['transactions'],
        language: 'en',
        userLegalName: me.logoutService.userName, // yha user name
        userEmailAddress: me.logoutService.email,  // user email lo
        onLoad: function () {
        },
        onSuccess: function (public_token, metadata) {
          me.cp.presentLoading();
          me.transService.exchangeToken(public_token).then(function (result: any) {
            if (result.success) {
              let account_token = [];
              me.transService.getAccounts(result.access_token).then(function (accountsResult: any) {
                if (accountsResult.success && accountsResult.accounts.length) {
                  var input = []
                  me.accountArray = accountsResult.accounts;
                  accountsResult.accounts.forEach(element => {
                    let name = element.official_name != null ? element.official_name : element.name;
                    input.push({
                      type: 'checkbox',
                      label: name + " : " + element.subtype,
                      value: element.account_id,
                      checked: true
                    })
                  });
                  me.alertController.create({
                    header: 'Plaid Account',
                    message: "We are going to add the following accounts. Please uncheck any account you don't want us to add to MyFondi",
                    backdropDismiss: false,
                    inputs: input,
                    buttons: [
                      {
                        text: 'Cancel',
                        handler: (data: any) => {
                          var array = [];
                          me.accountArray.forEach((e, acc_index) => {
                            let count = 0;
                            var c = me.accounts.map((o) => {
                              count++;
                              if (o.name != e.name && o.type != e.type && o.subtype != e.subtype && o.mask != e.mask && o.account_id != e.account_id) {
                                if (me.accounts.length === count) {
                                  array.push(e);
                                }
                              }
                              return o;
                            })
                            if (acc_index === me.accounts.length - 1) {
                              me.saveAccounts(array, result.access_token)
                            }
                          })
  
                        }
                      },
                      {
                        text: 'Done',
                        handler: async (data: any) => {
                          var array = [];
                          data.forEach((i, acc_index) => {
                            let index = me.accountArray.findIndex(o => o.account_id == i);
                            if (index != -1) {
                              let count = 0;
                              var c = me.accounts.map(o => {
                                count++;
                                if (o.name != me.accountArray[index].name && o.type != me.accountArray[index].type && o.subtype != me.accountArray[index].subtype && o.mask != me.accountArray[index].mask && o.account_id != me.accountArray[index].account_id) {
                                  if (me.accounts.length === count) {
                                    array.push(me.accountArray[index]);
                                  }
                                }
                                return o;
                              })
                            }
                            if (acc_index === data.length - 1) {
                              me.saveAccounts(array, result.access_token);
                            }
                          });
                        }
                      }
                    ]
                  }).then(res => {
                    res.present();
                  });
                }
                me.cp.dismissLoading()
              }).catch(err => {
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

  }
  forRequestTransaction(acc, access_token) {
    var me = this;
    swal({
      title: "Allow access to your account transactions?",
      text: "Would you like for MyFondi to retrieve transactions from this account?",
      icon: "warning",
      buttons: ["No", "Access"],
      closeOnClickOutside: false
    }).then((willDelete) => {
      if (willDelete) {
        me.getAccounts();
        me.proceedToSave(acc, access_token)
      } else {
        me.getAccounts();
        acc.forEach(account => {
          account.hasPermission = false;
          me.transService.updateAccount(acc.account_id, false);
        });
      }
    });
  }
  proceedToSave(account, access_token) {
    var me = this;
    me.dateRange.displayForm = new Date().toISOString().substring(0, 10);
    var recurrTillDate = new Date().setMonth(new Date().getMonth() - 1);
    me.dateRange.displayTo = new Date(recurrTillDate).toISOString().substring(0, 10);
    me.cp.presentLoading();
    var count = 0;
    saveTransaction(account[count].account_id, account[count].type)
    function saveTransaction(id, type) {
      count++;
      me.transService.saveTransaction(access_token, id, type, me.dateRange).then((res) => {
        if (res['success'] && count === account.length) {
          me.cp.dismissLoading();
          me.congratulations();
          me.api.getPlaidTransaction().then((res) => {
            if (res) {
              me.api.getIncomeSource();
              me.api.getTransaction();
            }
          });
        }
        else if (count === account.length) {
          me.cp.dismissLoading();
        }
        else {
          saveTransaction(account[count].account_id, account[count].type);
        }
      }).catch(err => {
        me.cp.dismissLoading();
      })
    }
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
          this.storage.get('plaidTransaction')
            .then(async (trans) => {
              if (trans.length) {
                this.router.navigate(['tabs/tabs/transaction-select/transaction-list']);
              }
              else {
                swal("No Plaid Transaction found.", {
                  icon: "info",
                });
              }
            });
        } else {
          swal("You can assign your transactions by selecting the Transaction button in the bottom menu.", {
            icon: "success",
          });
        }
      });
  }
  saveAccounts(account, access_token) {
    var me = this;
    me.cp.presentLoading();
    me.transService.saveAccounts(account, access_token).then(function (response: any) {
      me.cp.dismissLoading();
      if (response.success) {
        me.api.getAccounts();
        me.forRequestTransaction(account, access_token);
      }
      else {
        me.cp.presentToast(response.error)
      }
    }).catch(err => {
      me.cp.dismissLoading()
      me.cp.presentAlert("Error", JSON.stringify(err));
    });

  }
  getAccounts() {
    this.accounts = [];
    let res = this.cp.getsavedAccounts()
    var account: any = [...new Map(res.map((x) => [x['id'], x])).values()];
    account.forEach(async element => {
      let status: any = await this.transService.accountStatus(element.accounts_tokens);
      element.flag = status.flag;
      this.accounts.push(element);
    });
  }
  addAccount(account) {
    if (account.checked) {
      account.checked = false;
      var index = this.accounts.findIndex(x => x.account_id === account.account_id);
      this.accounts[index] = account;
    }
    else {
      account.checked = true;
      var index = this.accounts.findIndex(x => x.account_id === account.account_id);
      this.accounts[index] = account;
    }
  }
  addOneAccount(account) {
    this.accounts.forEach((element, _index) => {
      this.accounts[_index].checked = false;
    });
    account.checked = true;
    var index = this.accounts.findIndex(x => x.account_id === account.account_id);
    this.accounts[index] = account;
  }
  close() {
    this.modalCtrl.dismiss();
  }
  attachedAccount(account) {
    this.modalCtrl.dismiss({
      'bank_name': account.name,
      'account_name': account.subtype,
      'last_four_digit': account.lastFour,
      'account_id': account.account_id,
      'balance': account.balances.current
    });
  }
  attached() {
    var array = [];
    this.accounts.forEach((account, index) => {
      if ((account.checked)) {
        if ((this.debt && account.type === 'depository')) {
          this.accounts[index].checked = false;
          swal({
            text: 'The ' + account.name + ' is a Deposit Account and not allowed for Debt Reduction Goal.',
            icon: 'warning'
          })
          return;
        }
        // else if ((this.debt && account.type === 'credit')) {
        //   this.accounts[index].checked = false;
        //   swal({
        //     text:'The '+account.name+' is a Liability Account and not allowed for Savings Goal.',
        //     icon:'warning'
        //   })
        //   return;
        // }
        else {
          array.push({
            'bank_name': account.name,
            'account_name': account.subtype,
            'last_four_digit': account.lastFour,
            'account_id': account.account_id,
            'balance': account.balances.current,
            'bankLogo': 'assets/icon/bank1.jpg'
          });
        }
      }
      if (index === this.accounts.length - 1 && array.length) {
        this.accounts = [];
        this.modalCtrl.dismiss({
          bank: array
        });
      }
    });

  }
  async checkAccountStatus(bankDetails) {
    let token = bankDetails.accounts_tokens;
    let status: any = await this.transService.accountStatus(token);
    if (status.flag == true) {
      this.refreshToken(bankDetails, status.lastSuccess);
    }
  }
  refreshToken(bank_Detail, lastSuccess) {
    let me = this;
    var handler = Plaid.create({
      clientName: 'MyFondi',
      countryCodes: ['US'],
      env: 'production',
      key: plad_public_key,
      product: ['transactions'],
      language: 'en',
      userLegalName: me.logoutService.userName, // yha user name
      userEmailAddress: me.logoutService.email,  // user email lo
      onLoad: function () {
      },
      onSuccess: function (public_token, metadata) {
        me.cp.presentLoading();
        me.transService.exchangeToken(public_token).then(function (result: any) {
          if (result.success) {
            me.transService.reAuthbyToken({
              curr_access_token: result.access_token,
              old_access_token: bank_Detail.accounts_tokens,
              lastConnectionDate: lastSuccess
            }).then(function (accountsResult: any) {
              if (accountsResult.success) {
                setTimeout(() => {
                  me.cp.dismissLoading();
                  me.getAccounts();
                  swal({
                    icon: 'success',
                    title: 'Account Authentication Successfully'
                  })
                }, 500);
                return;
              }
              else {
                me.cp.dismissLoading();
                me.getAccounts();
                swal({
                  icon: 'info',
                  title: "Account credientail not matched!!"
                })
                return;
              }
            })
          } else {
            me.cp.dismissLoading();
            swal({
              icon: 'info',
              title: 'Accounts not authentication.'
            })
          }
        })
      },
      onExit: function (err, metadata) {
        console.log(err);
        if (err != null) {
        }
      },
      onEvent: function (eventName, metadata) {
      }
    })
    handler.open();
  }
  getUniqueAccounts(accounts){
    return [...new Map(accounts.map((x) => [x['id'], x])).values()];
  }
}
