import { AlertController, ModalController } from '@ionic/angular';
import { CommonProvider } from './../../providers/common';
import { Component, NgZone } from '@angular/core';
import * as firebase from "firebase";
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';

@Component({
  selector: 'app-add-categories',
  templateUrl: 'add-categories.page.html',
  styleUrls: ['add-categories.page.scss']
})
export class AddCategoriesPage {
  public items: any = [];
  showCategory = false;
  public categoryForm: FormGroup;
  constructor(private _ngZone: NgZone, private formBuilder: FormBuilder, private modalCtrl: ModalController, 
    private alertController: AlertController, private cp: CommonProvider) {
    let that = this;
    this.categoryForm = this.formBuilder.group({
      categoryName: new FormControl('', [Validators.required]),
      parentCategory: new FormControl(''),
      chooseCategory: new FormControl('category'),

    });

    if (firebase.auth().currentUser != null) {
      const userCategories = firebase.firestore().collection('user_categories').doc(firebase
        .auth().currentUser.uid);
      userCategories.get().then(snap => {
        const data = snap.data();
        that.items = Object.entries(data);
      }).catch((error) => {

      });
    }
  }

  addItem(groupName, categoryName) {
    this.modalCtrl.dismiss({ 'groupName': groupName, 'categoryName': categoryName });
  }
  close() {
    this.modalCtrl.dismiss();
  }

  addCategory(values) {
    let that = this;
    const userCategories = firebase.firestore().collection('user_categories').doc(firebase
      .auth().currentUser.uid);
    that.cp.presentLoading();
    if (values.chooseCategory != "category") {
      let parentCategory = values.parentCategory;
      let categories: any = [];
      let selectItems = that.items.filter(o => o[0] == parentCategory)[0][1];   // 0 represent parent 1 represent category
      if (selectItems != "") {
        categories = selectItems;
      }
      categories.push(values.categoryName)
      let obj = { [parentCategory]: categories };
      userCategories.update(obj).then(() => {
        that.cp.dismissLoading();
        this.modalCtrl.dismiss({ success: true });
      });

    } else {
      let obj = { [values.categoryName]: "" };
      userCategories.update(obj).then(() => {
        that.cp.dismissLoading();
        this.modalCtrl.dismiss({ success: true });
      });

    }
  }
  selected(value) {
    if (value == 'category') {
      this.showCategory = false;
      this.categoryForm.controls["parentCategory"].clearValidators()
    } else {
      this.showCategory = true;
      this.categoryForm.controls["parentCategory"].setValidators(Validators.required)
    }
    this.categoryForm.controls["parentCategory"].updateValueAndValidity();
  }

}