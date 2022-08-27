import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { CategoriesPage } from 'src/app/categories/categories.page';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationExtras } from '@angular/router';
import { TransactionService } from 'src/app/services/transaction/transaction.service';
import { ApiService } from 'src/app/services/api/api.service';
import { Events } from 'src/app/services/Events.service';
import { CommonProvider } from 'src/providers/common';
import * as firebase from 'firebase';

@Component({
  selector: 'app-change-category',
  templateUrl: './change-category.page.html',
  styleUrls: ['./change-category.page.scss'],
})
export class ChangeCategoryPage implements OnInit {
  incomeForm: FormGroup;
  subscribe: any;
  transaction: any = [];
  plaidcategoriesUpdate: boolean = false;
  CategoryChange: boolean = false;
  category_id;
  changed_category_id;
  category = [];
  constructor(private modalCtrl: ModalController, private cp: CommonProvider,
    private route: ActivatedRoute, public events: Events,
    public api: ApiService, public navCtrl: NavController,
    private formBuilder: FormBuilder, public tranService: TransactionService) {
    this.incomeForm = this.formBuilder.group({
      categoryName: new FormControl('', [Validators.required]),
    });
    this.subscribe = this.route.queryParams.subscribe((params: any) => {
      if (params.trans) {
        this.transaction = JSON.parse(params.trans);
        if (this.transaction.amount) {
          this.transaction.amount = parseFloat(this.transaction.amount).toFixed(2)
        }
      }
      if (this.transaction.category) {
        this.category_id = this.transaction.category_id;
        this.incomeForm.controls.categoryName.setValue(this.transaction.category);
      }
      this.plaidcategoriesUpdate = params.onlyplaid ? true : false;
      this.CategoryChange = params.CategoryChange ? true : false;
    })
  }

  ngOnInit() {

  }
  async openCategory() {
    let me = this;
    me.cp.showLoading(3000);
    const modal = await this.modalCtrl.create({
      component: CategoriesPage,
      componentProps: {
        category: true
      }
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        if (value.data && value.data.category_id != me.category_id) {
          me.changed_category_id = value.data.category_id;
          me.category = value.data.hierarchy
          me.incomeForm.controls.categoryName.setValue(value.data.categoryName);
        }
      });
  }

  submit() {
    var me = this;
    if (me.category_id != me.changed_category_id) {
      if (me.plaidcategoriesUpdate) {
        firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions').doc(me.transaction['id']).update({ category: [me.incomeForm.controls.categoryName.value], category_id: me.category_id });
        me.api.getPlaidTransaction().then(res => {
          me.events.publish("refresh:plaidtransaction", { time: new Date() });
          if (me.CategoryChange) {
            me.transaction['category'] = me.incomeForm.controls.categoryName.value;
            me.transaction['category_id'] = me.category_id;
            let lastroute = '/tabs/tabs/home';
            if (this.tranService.gettransactionDetails() && this.tranService.gettransactionDetails().lastRoute) {
              lastroute = this.tranService.gettransactionDetails().lastRoute;
            }
            this.tranService.settransactionDetails({
              transaction: me.transaction,
              lastRoute: lastroute
            })
            me.navCtrl.navigateForward(['/tabs/tabs/home/change-paycheck']);
          }
          else {
            me.navCtrl.pop();
          }
        })
      }
      else {
        me.cp.presentLoading();
        let argmnt = {
          transaction: me.transaction,
          new_category: {
            category: me.category,
            categoryName: me.incomeForm.controls.categoryName.value,
            category_id: me.changed_category_id
          }
        }
        me.api.updateCategory(argmnt).then(function (res: any) {
          if (res.success) {
            me.api.getTransaction();
            me.api.getIncomeSource();
            me.api.getPlaidTransaction();
            me.api.getGoal();
            setTimeout(() => {
              me.events.publish("delete:transaction", { time: new Date() });
              if (me.CategoryChange) {
                me.transaction['category'] = me.incomeForm.controls.categoryName.value;
                me.transaction['category_id'] = me.category_id;
                me.cp.dismissLoading();
                let navigationExtras: NavigationExtras = {
                  queryParams: {
                    transaction: JSON.stringify(me.transaction)
                  }, skipLocationChange: true
                };
                me.navCtrl.navigateForward(['/tabs/tabs/home/change-paycheck'], navigationExtras);
              }
              else {
                me.cp.dismissLoading();
                me.navCtrl.pop();
              }
            }, 1000)
          }
          else {
            me.cp.dismissLoading();
          }
        }).catch(err => {
          me.cp.dismissLoading();
        })
      }
    }

  }

}
