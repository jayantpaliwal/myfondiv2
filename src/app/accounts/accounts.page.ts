import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform, PopoverController } from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { TransactionService } from '../services/transaction/transaction.service';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { ApiService } from '../services/api/api.service';
import { plad_public_key } from 'src/config/config';
import { Storage } from '@ionic/storage';
import { ChooseAccountPopupPage } from '../choose-account/choose-account-popup.page';
declare var Plaid: any;
declare var inAPP: any;
import swal from 'sweetalert';
import * as firebase from 'firebase';
import { InappBrowserService } from '../services/inapp-browser/inapp-browser.service';
import { browser } from 'protractor';
import introJs from 'intro.js/intro.js';
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.page.html',
  styleUrls: ['./accounts.page.scss'],
})
export class AccountsPage implements OnInit {
  account: any;
  userPic: any;
  accounts = [];
  dateRange = {
    displayForm: "",
    displayTo: "",
  };
  accountArray = [];
  constructor(private cp: CommonProvider,
    private platform: Platform,
    private router: Router,
    public transService: TransactionService,
    public events: Events,
    private alertController: AlertController,
    public popoverController: PopoverController,
    public storage: Storage,
    private iab: InappBrowserService,
    public logoutService: LogoutService,
    private api: ApiService) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
    this.userPic = this.logoutService.userPic;
    events.subscribe('refresh:accounts', (rs) => {
      this.get();
    });
  }

  ngOnInit() {

  }
  ionViewWillEnter() {
    this.get();
  }
  get() {
    this.accounts = [];
    let res = this.cp.getsavedAccounts()
    var account: any = [...new Map(res.map((x) => [x['id'], x])).values()];
    account.forEach(async (element, i) => {
      let status: any = await this.transService.accountStatus(element.accounts_tokens);
      element.flag = status.flag;
      this.accounts.push(element);
    });
    // console.log(this.accounts);
  }
  goToProfile() {
    this.router.navigate(["tabs/tabs/home/profile"]);
  }
  async moreItem(ev, account_id) {
    const popover = await this.popoverController.create({
      component: ChooseAccountPopupPage,
      componentProps: {
        "account_id": account_id,
        "accounts": true,
      },
      cssClass: 'my-custom-class',
      event: ev,
      translucent: true
    });
    popover.onDidDismiss().then(data => {
      if (data != null) {
        this.accounts = [];
        this.api.getAccounts().then((res: any) => {
          var account: any = [...new Map(res.map((x) => [x['id'], x])).values()];
          this.accounts = account;
        })
      }
    });
    return await popover.present();
  }
  Connect() {
    var me = this;
    if (this.platform.is('ios')) {
      this.iab.CreateBrowser().then((browser : any) => {
        if (browser.success) {
          me.cp.presentLoading();
          me.transService.exchangeToken(browser.token).then(function (result: any) {
            if (result.success) {
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
                          if (me.accounts.length) {
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
                              });

                              if (acc_index === me.accountArray.length - 1) {
                                me.saveAccounts(array, result.access_token)
                              }

                            })
                          }
                          else {
                            me.saveAccounts(me.accountArray, result.access_token)
                          }
                        }
                      },
                      {
                        text: 'Done',
                        handler: async (data: any) => {
                          var array = [], accountsSelected = [];
                          data.forEach((i, acc_index) => {
                            let index = me.accountArray.findIndex(o => o.account_id == i);
                            if (index != -1) {
                              let count = 0;
                              accountsSelected.push(me.accountArray[index])
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
                              array = array.length ? array : accountsSelected;
                              me.saveAccounts(array, result.access_token)
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
        else {
          me.cp.presentAlert("Error", browser.message);
        }
      });
    }
    else {
      // android
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
                          if (me.accounts.length) {
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
                              });

                              if (acc_index === me.accountArray.length - 1) {
                                me.saveAccounts(array, result.access_token)
                              }

                            })
                          }
                          else {
                            me.saveAccounts(me.accountArray, result.access_token)
                          }
                        }
                      },
                      {
                        text: 'Done',
                        handler: async (data: any) => {
                          var array = [], accountsSelected = [];
                          data.forEach((i, acc_index) => {
                            let index = me.accountArray.findIndex(o => o.account_id == i);
                            if (index != -1) {
                              let count = 0;
                              accountsSelected.push(me.accountArray[index])
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
                              array = array.length ? array : accountsSelected;
                              me.saveAccounts(array, result.access_token)
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
          console.log("err:", err);
          console.log(metadata);
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
        me.get();
        me.proceedToSave(acc, access_token)
      } else {
        me.get();
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
                  me.get();
                  swal({
                    icon: 'success',
                    title: 'Account Authentication Successfully'
                  })
                }, 500);
                return;
              }
              else {
                me.cp.dismissLoading();
                me.get();
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

  ngAfterViewInit() {
    if (!localStorage.getItem('accountsInfo')) {
      localStorage.setItem('accountsInfo', 'true')
      introJs().setOptions({
        exitOnOverlayClick: false,
        showBullets: false,
        steps: [{
          intro: 'Accounts is where you can add your financial institution.'
        }]
      }).start();
    }
}
}
