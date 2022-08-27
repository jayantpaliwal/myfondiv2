import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonProvider } from 'src/providers/common';
import { ModalController, NavParams } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { CalendarModal, CalendarModalOptions, CalendarResult } from "ion2-calendar";
@Component({
  selector: 'app-paycheck-popup',
  templateUrl: './paycheck-popup.page.html',
  styleUrls: ['./paycheck-popup.page.scss'],
})
export class PaycheckPopupPage implements OnInit {

  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
    displayForm: moment(new Date(new Date().setDate(new Date().getDate() - 7))).format('L'),
    displayTo: moment(new Date).format('L'),
  };
  dateFrom: string;
  dateTo: string;
  payChecks: any;
  allpaychecks: any;
  subscribe: any;
  payPeriods: any;
  defualtpayChecks = [];

  constructor(private route: ActivatedRoute, public navParams: NavParams, private cp: CommonProvider, 
    private router: Router, private modalCtrl: ModalController,
    public storage: Storage) {
    if (navParams.get('paychecks')) {
      this.payPeriods = JSON.parse(navParams.get('paychecks'));
    }
    this.defualtpayChecks = this.payPeriods.paychecks;
    this.payChecks = this.getFilter(this.defualtpayChecks);
    this.storage.get('incomeSource')
      .then((res) => {
        if (res) {
          var paycheck = [];
          if (res.length > 0) {
            res.forEach(element => {
              element.paychecks.forEach(el => {
                paycheck.push(el);
              });
            });
            this.defualtpayChecks = paycheck;
          }
        }
      })
  }
  close() {
    this.modalCtrl.dismiss();
  }
  ngOnInit() {
  }
  addpaycheck(paycheck) {
    this.modalCtrl.dismiss({ 'payCheck': paycheck });
  }
  async openCalendar() {
    const options: CalendarModalOptions = {
      pickMode: 'range',
      title: 'RANGE',
      canBackwardsSelected: true
    };


    const myCalendar = await this.modalCtrl.create({
      component: CalendarModal,
      componentProps: { options }
    });

    myCalendar.present();
    const event: any = await myCalendar.onDidDismiss();
    const date: any = event.data;
    if (event.role != 'cancel' && event.role != null) {
      this.dateRange.displayForm = moment(date.from.dateObj).format('L');
      this.dateRange.displayTo = moment(date.to.dateObj).format('L');
      this.payChecks = this.getFilter(this.defualtpayChecks);
    }
  }

  getFilter(items) {
    let start = new Date(this.dateRange.displayForm);
    let end = new Date(this.dateRange.displayTo);

    return items.filter(item => {
      let date = new Date(item.payDateTimeStamp);
      //86340000 this for 23:59 min add in the last date
      return date.getTime() >= (start.getTime()) && date.getTime() <= (end.getTime() + 86340000);
    })
  }

}
