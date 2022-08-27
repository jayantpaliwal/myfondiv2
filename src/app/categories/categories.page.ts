import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { CommonProvider } from './../../providers/common';
import { Component, NgZone } from '@angular/core';
import { Storage } from '@ionic/storage';
import * as firebase from "firebase";
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/Events.service';

@Component({
  selector: 'app-categories',
  templateUrl: 'categories.page.html',
  styleUrls: ['categories.page.scss']
})
export class CategoriesPage {
  public items: any = [];
  public filterItems: any = [];
  category: boolean = true;
  paychecks: any = [];
  addNew: boolean = false;
  localCategories = [];
  paycheckId: string;
  goals: boolean = false;
  categories = [];
  uniqueCat = [];

  constructor(
    private storage: Storage,
    public navParams: NavParams,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private cp: CommonProvider,
    private api: ApiService,
    private events: Events
  ) {
    this.events.subscribe('added:category', () => {
      this.loadCategories();
    });
    this.category = navParams.get('category');
    this.paycheckId = navParams.get('paycheck');
    if (navParams.data.goals) {
      this.goals = navParams.data.goals;
    }
  }
  ionViewWillEnter() {
    this.loadCategories();
  }
  loadCategories() {
    let me = this;
    if (me.category) {
      me.storage.get('plaidCategories').then((res) => {
        if (res && res.categories) {
          me.categories = res.categories;
          me.items = me.filterItems = res.categories;
          if (me.goals && me.navParams.data.categories) {
            for (let i of me.navParams.data.categories) {
              me.filterItems = me.filterItems.filter((cat) => {
                return !cat.category_id.includes(i.category_id.toLowerCase())
              })
              me.items = me.filterItems = [i].concat(me.filterItems);
              me.cp.hideLoading();
            }
          }
        }
      })
    }
    else {
      me.storage.get('incomeSource').then((incomeSource) => {
        me.filterItems = [];
        if (incomeSource && incomeSource.length) {
          incomeSource.forEach(income => {
            income.paychecks.forEach(paycheck => {
              me.filterItems.push({
                name: paycheck.name + "-" + income.name,
                incomeSourceId: income.id,
                paycheckId: paycheck.id,
                payDateTimeStamp: paycheck.payDateTimeStamp
              })
              me.filterItems = me.filterItems.sort((a, b) => a.payDateTimeStamp - b.payDateTimeStamp)
              me.items = me.filterItems;
              me.cp.hideLoading();
            });
          });
        }
      });
    }
  }
  setClasses(p, a, b) {
    if (this.paycheckId) {
      return p === this.paycheckId ? a : b;
    }
    else {
      return b;
    }
  }
  setCategory(data, class1, class2) {
    if (this.navParams.data.categories) {
      let index = this.navParams.data.categories.findIndex(o => o.category_id == data.category_id);
      if (index != -1) {
        return class1;
      }
      else {
        return class2;
      }
    }
    else {
      return class2;
    }
  }
  setFilteredItems(searchTerm) {
    if (!searchTerm) {
      this.filterItems = this.items;
      return;
    }
    if (this.category) {
      this.filterItems = this.items.filter(item => {
        if (searchTerm) {
          if ((item.categoryName.toLowerCase()).indexOf(searchTerm.toLowerCase()) > -1) {
            return true;
          }
          return false;
        }
      }).sort();

    } else {
      this.filterItems = this.items.filter(item => {
        if (searchTerm) {
          if ((item.name.toLowerCase()).indexOf(searchTerm.toLowerCase()) > -1) {
            return true;
          }
          return false;
        }
      }).sort();

    }

  }
  addItem(categoryName) {
    this.modalCtrl.dismiss(categoryName);
  }
  addpaycheck(paycheck) {
    this.modalCtrl.dismiss({ 'payCheck': paycheck });
  }
  async addnewCategory() {
    var alreadyexist = false;
    let alert = await this.alertCtrl.create({
      header: 'Add New Category',
      inputs: [
        {
          name: 'category_name',
          placeholder: 'Enter Category Name'
        },

      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Add',
          handler: data => {
            if (data.category_name) {

              var newOne = data.category_name;
              const newItem = this.items.map(item => {
                if (item.categoryName.replace(/[^\w\s]/gi, '') === newOne.replace(/[^\w\s]/gi, '')) {
                  alreadyexist = true;
                }
              });
              if (!alreadyexist) {
                console.log((Math.max(...this.categories.map(o => o.category_id), 0) + 1).toString());
                const categoryItem = {
                  "category_id": (Math.max(...this.categories.map(o => o.category_id), 0) + 1).toString(),
                  "group": "Unique",
                  "hierarchy": [data.category_name]
                };
                this.cp.presentLoading();
                let uniqueRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('uniqueCategories')
                uniqueRef.get().then((snapShot) => {
                  if (snapShot.docs.length) {
                    var highestCategoryId: any = 0
                    snapShot.docs.forEach((ele, index) => {
                      if (ele.data().category_id > highestCategoryId) {
                        highestCategoryId = ele.data().category_id
                      }
                      if (index === (snapShot.docs.length - 1)) {
                        categoryItem.category_id = highestCategoryId + 1
                        uniqueRef.add(categoryItem).then(() => {
                          this.categories.push(categoryItem);
                          this.items = this.filterItems = this.categories.sort((a, b) => a.categoryName > b.categoryName && 1 || -1)
                          setTimeout(() => {
                            this.cp.dismissLoading();
                            this.api.getPlaidCategories();
                            this.storage.get('plaidCategories').then((res) => {
                              if (res && res.categories) {
                                res.categories.push({
                                  "category_id": categoryItem.category_id,
                                  "group": "Unique",
                                  "hierarchy": [data.category_name],
                                  "categoryName": data.category_name
                                });
                                this.storage.set('plaidCategories', res);
                                this.events.publish("added:category", { time: new Date() });
                              }
                              else {
                                res['categories'] = [{
                                  "category_id": categoryItem.category_id,
                                  "group": "Unique",
                                  "hierarchy": [data.category_name],
                                  "categoryName": data.category_name
                                }]
                                this.storage.set('plaidCategories', res);
                                this.events.publish("added:category", { time: new Date() });
                              }
                            });
                            this.modalCtrl.dismiss({
                              "category_id": categoryItem.category_id,
                              "group": "Unique",
                              "hierarchy": [data.category_name],
                              "categoryName": data.category_name
                            });
                          }, 1000);
                        })
                      }
                    })
                  }
                  else {
                    uniqueRef.add(categoryItem).then(() => {
                      this.categories.push(categoryItem);
                      this.items = this.filterItems = this.categories.sort((a, b) => a.categoryName > b.categoryName && 1 || -1)
                      setTimeout(() => {
                        this.cp.dismissLoading();
                        this.api.getPlaidCategories();
                        this.storage.get('plaidCategories').then((res) => {
                          if (res && res.categories) {
                            res.categories.push({
                              "category_id": categoryItem.category_id,
                              "group": "Unique",
                              "hierarchy": [data.category_name],
                              "categoryName": data.category_name
                            });
                            this.storage.set('plaidCategories', res);
                            this.events.publish("added:category", { time: new Date() });
                          }
                          else {
                            res['categories'] = [{
                              "category_id": categoryItem.category_id,
                              "group": "Unique",
                              "hierarchy": [data.category_name],
                              "categoryName": data.category_name
                            }]
                            this.storage.set('plaidCategories', res);
                            this.events.publish("added:category", { time: new Date() });
                          }
                        });
                        this.modalCtrl.dismiss({
                          "category_id": categoryItem.category_id,
                          "group": "Unique",
                          "hierarchy": [data.category_name],
                          "categoryName": data.category_name
                        });
                      }, 1000);
                    })
                  }
                }).catch(err => {
                  console.log(err)
                })
              }
              else {
                this.cp.presentToast("This Category is Already Exists!");
              }
            }
          }
        }
      ]
    });
    alert.present();
  }
  async addCategory() {
    var alreadyexist = false;
    let alert = await this.alertCtrl.create({
      header: 'Create Unique Category',
      inputs: [
        {
          name: 'category_name',
          placeholder: 'Enter Category Name'
        },

      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Add',
          handler: data => {
            if (data.category_name) {
              var newOne = data.category_name;
              const usersCategories = this.items.map(item => {
                if (item.categoryName.replace(/[^\w\s]/gi, '') === newOne.replace(/[^\w\s]/gi, '')) {
                  alreadyexist = true;
                }
              });
              if (!alreadyexist) {
                firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('uniqueCategories').add({
                  "category_id": Math.max(...this.categories.map(o => o.category_id), 0) + 1,
                  "group": "Unique",
                  "hierarchy": [data.category_name]
                });
                this.api.getPlaidCategories();
                this.categories.push({
                  "category_id": Math.max(...this.categories.map(o => o.category_id), 0) + 1,
                  "group": "Unique",
                  "hierarchy": [data.category_name],
                  "categoryName": data.category_name
                });
                this.items = this.filterItems = this.categories.sort((a, b) => a.categoryName > b.categoryName && 1 || -1)
                this.modalCtrl.dismiss({ 'categoryName': data.category_name, "category_id": this.categories[this.categories.length - 1].category_id + 1, 'GoalName': true });
              }
              else {
                this.cp.presentToast("This Category is Already Exists!");
              }
            }
          }
        }
      ]
    });
    alert.present();
  }
  close() {
    this.modalCtrl.dismiss();
  }
}
