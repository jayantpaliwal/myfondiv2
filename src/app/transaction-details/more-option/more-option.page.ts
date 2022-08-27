import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, NavController, AlertController, PopoverController, NavParams } from '@ionic/angular';
import { CommonProvider } from 'src/providers/common';
import { FormBuilder } from '@angular/forms';
import { Storage } from '@ionic/storage';
@Component({
  selector: 'app-details',
  templateUrl: './more-option.page.html',
  styleUrls: ['./more-option.page.scss'],
})
export class DetailsPage implements OnInit {
  accounts = [];
  account_id: string = "";
  boolean: boolean=false;
  constructor(public popoverController: PopoverController,
    public storage: Storage) {

  }

  ngOnInit() {}
  edit() {
    this.popoverController.dismiss('edit');
  }

  confirm(){
    this.popoverController.dismiss('delete');
  }
}
