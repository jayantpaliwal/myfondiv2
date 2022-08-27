import { Injectable } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import * as moment from 'moment';
const rangeMoment = extendMoment(moment);
import { extendMoment } from "moment-range";
import swal from 'sweetalert';
@Injectable({
  providedIn: 'root'
})
export class CommonProvider {
  public loading: any;
  timeout;
  public accounts;
  public goals;
  public loaderRunning;
  loading2: any;

  constructor(public alertController: AlertController, private toastCtrl: ToastController, public loadingController: LoadingController) {
  }
  // -------------------------setter and getter---------
  setsavedAccounts(items) {
    // console.log("accounts", items);
    this.accounts = [];
    this.accounts = items;
  }
  getsavedAccounts() {
    // console.log("accounts", this.accounts);
    return this.accounts;
  }

  setGoals(items) {
    // console.log("goals", items);
    this.goals = items;
  }
  getGoals() {
    // console.log("accounts", this.goals);
    return this.goals;
  }
  clearAllAccounts() {
    this.accounts = [];
    this.goals = [];
  }

  // -------------------------setter and getter---------



  presentLoading() {
    this.loading = this.loadingController.create({
      message: "Please wait...",
    });
    this.loading.then(prompt => {
      prompt.present();
    });
    this.timeout = setTimeout(() => {
      this.loading.then(prompt => {
        prompt.dismiss();
        clearTimeout(this.timeout);
      });
    }, 120000);
  }
  presentLoadingMint() {
    this.loading = this.loadingController.create({
      message: "Please wait for a minute!",
    });
    this.loading.then(prompt => {
      prompt.present();
    });
  }
  showLoading(duration) {
    duration = duration ? duration : 3000;
    this.loaderRunning = this.loadingController.create({
      message: 'Loading',
      spinner: "dots",
      duration: duration
    });
    this.loaderRunning.then(prompt => {
      prompt.present();
    });
  }
  hideLoading() {
    this.loaderRunning.then(prompt => {
      prompt.dismiss();
    });
  }
  dismissLoading() {
    this.loading.then(prompt => {
      prompt.dismiss();
      clearTimeout(this.timeout);
    });
  }
  async presentToast(msg: string) {
    let toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }
  async presentAlert(header, message) {
    swal({
      title: header,
      text: message,
      icon: "error"
    })
  }

  async presentAlertInfo(header, message) {
    swal({
      title: header,
      text: message,
      icon: "info"
    })
  }
  dateFormat(date) {
    return date.replace(/-/g, '\/');
  }
  guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

  getWeekNumber(year, month, date) {
    let count = 0;
    var startDate = moment([year, month])
    // // Get the first and last day of the month
    var firstDay = moment(startDate).startOf('month')
    var endDay = moment(startDate).endOf('month')
    // // Create a range for the month we can iterate through
    var monthRange = rangeMoment.range(firstDay, endDay);
    // // Get all the weeks during the current month
    var weeks = []
    for (let mday of monthRange.by('days')) {
      if (weeks.indexOf(mday.week()) === -1) {
        weeks.push(mday.week());
      }
    }
    for (let index = 0; index < weeks.length; index++) {
      var weeknumber = weeks[index];
      var firstWeekDay = moment(firstDay).week(weeknumber).day(0);
      if (firstWeekDay.isBefore(firstDay)) {
        firstWeekDay = firstDay;
      }
      var lastWeekDay = moment(endDay).week(weeknumber).day(6);
      if (lastWeekDay.isAfter(endDay)) {
        lastWeekDay = endDay;
      }
      var weekRange = rangeMoment.range(firstWeekDay, lastWeekDay);
      if (weekRange.contains(new Date(date.replace(/-/g, '\/')))) {
        count = index + 1;
      }
    }
    return count;
  }

}
