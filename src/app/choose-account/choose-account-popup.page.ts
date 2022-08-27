import { Component, OnInit } from '@angular/core';
import { AlertController, PopoverController, NavParams } from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { TransactionService } from '../services/transaction/transaction.service';
import { LogoutService } from '../services/logout/logout.service';
import { ApiService } from '../services/api/api.service';
import * as firebase from 'firebase';
import { Storage } from '@ionic/storage';
@Component({
  selector: 'app-choose-account-popup',
  templateUrl: './choose-account-popup.page.html',
  styleUrls: ['./choose-account-popup.page.scss'],
})
export class ChooseAccountPopupPage implements OnInit {
  accounts = [];
  account_id: string = "";
  boolean: boolean = true;
  icon: string;
  constructor(private cp: CommonProvider,
    private navParams: NavParams, private alertController: AlertController,
    public transService: TransactionService,
    public popoverController: PopoverController,
    public storage: Storage,
    public logoutService: LogoutService, private api: ApiService) {
  }

  ngOnInit() {
    this.account_id = this.navParams.data.account_id;
    this.boolean = this.navParams.data.accounts;
    this.icon = this.boolean ? 'close-circle' : 'create'
  }
  edit() {
    if (!this.boolean) {
      this.editGoal();
    }
    else {
      this.RemoveAllTransactions();
    }
  }
  delete(ev) {
    this.cp.presentLoading();
    this.api.accountDelete({
      "account_id": this.account_id,
      "event": ev
    }).then((res) => {
      if (res['success']) {
        this.api.getPlaidTransaction();
        this.api.getTransaction();
        this.api.getIncomeSource();
        this.api.getAccounts();
        this.cp.dismissLoading();
        this.popoverController.dismiss("delete");
      }
      else {
        this.cp.dismissLoading();
        this.cp.presentAlert("Error", res['message']);
      }
    }).catch((err) => {
      this.cp.dismissLoading();
      this.cp.presentAlert("Error", JSON.stringify(err));
    })
  }
  deleteAllTransaction(ev) {
    this.cp.presentLoading();
    this.transService.deleteAccountTransaction({
      "account_id": this.account_id,
      "uid": firebase.auth().currentUser.uid,
      "removeallDetail": ev
    }).then((res) => {
      if (res['success']) {

        setTimeout(() => {
          this.api.getPlaidTransaction().then(resolve => {
            this.api.getTransaction().then((res) => {
              this.api.getIncomeSource().then((req) => {
                if (req) {
                  this.cp.dismissLoading();
                  this.popoverController.dismiss("deleteTransaction");
                }
              })
            })
          })
        }, 5000);


      }
      else {
        this.cp.dismissLoading();
        this.cp.presentAlert("Error", res.message);
      }
    }).catch((err) => {
      this.cp.dismissLoading();
      this.cp.presentAlert("Error", JSON.stringify(err));
    })
  }
  async confirm() {
    if (!this.boolean) {
      this.deleteGoal();
    }
    else {
      const alert = await this.alertController.create({
        header: "CONFIRMATION!",
        message: "It looks like you're removing an account. Do you want to remove all of the transaction data we received from this account.",
        buttons: [{
          text: 'Yes',
          handler: async () => {
            this.warning();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.popoverController.dismiss();
          }
        }]
      });
      await alert.present();
    }

  }
  async warning() {
    const alert = await this.alertController.create({
      header: "Warning",
      message: "If you remove the transactions, it may affect your budget calculations.",
      buttons: [{
        text: 'Only remove the account',
        handler: async () => {
          this.delete(true);
        }
      },
      {
        text: 'Remove the account and all associated transactions',
        role: 'cancel',
        handler: () => {
          this.delete(false);
        }
      }]
    });
    await alert.present();
  }
  async RemoveAllTransactions() {
    const alert = await this.alertController.create({
      header: "CONFIRMATION",
      message: "Are you sure you want to remove all of the transaction data associated with this account? You can still keep the account balance for goals and other needs",
      buttons: [{
        text: 'Yes',
        handler: async () => {
          this.deleteAllTransaction(true);
        }
      },
      {
        text: 'No',
        role: 'cancel',
      }]
    });
    await alert.present();
  }
  editGoal() {
    this.popoverController.dismiss('edit');
  }
  async deleteGoal() {
    const alert = await this.alertController.create({
      header: "Confirm Alert",
      message: "If you remove the Goal, it may affect your budget calculations.",
      buttons: [{
        text: 'Delete',
        handler: async () => {
          this.popoverController.dismiss('delete');
        }
      },
      {
        text: 'cancel',
        role: 'cancel',
        handler: () => {
          this.popoverController.dismiss();
        }
      }]
    });
    await alert.present();
  }
}
