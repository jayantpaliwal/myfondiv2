import { ChangeDetectorRef, Component } from '@angular/core';
import * as firebase from "firebase";
import { Router, NavigationExtras } from '@angular/router';
import { NavController, IonTabs, PopoverController, ModalController, Platform } from '@ionic/angular';
import { LogoutService } from "../services/logout/logout.service";
import * as moment from 'moment';
import { Events } from '../services/Events.service';
import { ApiService } from '../services/api/api.service';
import { Storage } from '@ionic/storage';
import { CommonProvider } from 'src/providers/common';
import { DetailsPage } from '../transaction-details/more-option/more-option.page';
import swal from 'sweetalert';
import { TransactionService } from '../services/transaction/transaction.service';
import { ChangePaycheckPopupPage } from '../transaction-details/change-paycheck-popup/change-paycheck-popup.page';
import { FirebaseFunctionLocal } from '../services/firebase-api-local/firebase-api-local';
import * as introJs from 'intro.js/intro.js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {
  unsubscribe: any;
  userName: string = "";
  userPic: string = "";
  goals = [];
  noPaychecks: boolean = true;
  noTransaction: boolean = true;
  transactions = [];
  budget = {
    budgeted: 0,
    value: 0,
    remaining: 0
  };
  currentDate = moment(new Date()).format(' MMM YYYY');
  date = new Date();
  firstDay = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
  lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);
  currentMonth = this.date.getMonth() + 1 + "_" + this.date.getFullYear();
  listPaychceck: any = [];
  bar_percent = 0;
  spend: number = 0;
  isAchivedGoals = [];
  backbutton: any;
  constructor(private router: Router,
    public events: Events,
    private tabs: IonTabs,
    public popoverController: PopoverController,
    private navCtrl: NavController,
    private changeDetector: ChangeDetectorRef,
    private cp: CommonProvider,
    private modalCtrl: ModalController,
    public logoutService: LogoutService,
    private api: ApiService,
    private firebaseService: FirebaseFunctionLocal,
    private platform: Platform,
    private transactionService: TransactionService,
    public storage: Storage) {
    events.subscribe('refresh:savedgoals', (res) => {
      this.getGoals();
    });
    events.subscribe('delete:transaction', (res) => {
      this.getTransaction();
    });
    events.subscribe('update:profile', (profile) => {
      if (profile.name) { this.userName = profile.name; }
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
  }
  getTransaction() {
    let me = this;
    var response = [];
    var payChecks = [];
    me.transactions = [];
    me.storage.get('incomeSource')
      .then((res) => {
        if (res && res.length) {
          res.forEach(inc => {
            inc.paychecks.forEach(pay => {
              payChecks.push({
                incomeid: inc.id,
                isRepeating: inc.isRepeating,
                incomeName: inc.name,
                repeating: inc.repeating,
                id: pay.id,
                payDate: new Date(pay.payDateTimeStamp),
                name: pay.name,
              });
            })
          })
        }
      })
    me.storage.get('getTransaction').then((res) => {
      if (res && res['transactions']) {
        response = res['transactions'];
        if (response.length) {
          me.noTransaction = false;
          response = response.sort(function (a, b) { return b.transactionDateTimeStamp - a.transactionDateTimeStamp });
          response.forEach(element => {
            var paycheck;
            element.assignment.forEach(assign => {
              paycheck = payChecks.find(o => o.id == assign.paycheckId);
              if (paycheck) {
                paycheck = Object.assign({ amount: assign.amount }, paycheck);
              }
            });
            var amount = element.assignment.map(o => o.amount).reduce(function (a, b) {
              return a + b;
            }, 0);
            element.amount = amount.toFixed(2);
            element.paycheck = paycheck ? paycheck : [];
            element.plaid_type = element.plaidTransId ? true : false;
            element.showDetails = true;
            me.transactions.push(element);
            me.transactions = me.transactions.splice(0, 4).map(_data => {
              return _data;
            });
            me.transactions = [...new Map(me.transactions.map(item =>
              [item['id'], item])).values()];
          });
        }
      }
      else {
        me.noTransaction = true;
      }
    });
  }
  goToProfile() {
    this.router.navigate(["/tabs/tabs/home/profile"]);
  }
  viewAllGoals() {
    this.navCtrl.navigateForward('/tabs/tabs/home/goal');
  }
  CreateGoalPage() {
    this.navCtrl.navigateForward('/tabs/tabs/home/create-goal');
  }
  getGoals() {
    let me = this;
    me.goals = [];
    var res = me.cp.getGoals();
    // me.storage.get('savedgoals').then((res) => {
    if (res && res.length) {
      let array = [];
      var archived = [];

      res.forEach((element, index) => {
        if (element.isRemoved == false && element.paid_amount >= element.goal_amount) {
          archived.push({ id: element.id, name: element.goal_name });
        }
        else if (element.isRemoved == false) {
          if (element.goal_type === "saving") {
            element.progress = element.paid_amount > 0 ? ((element.paid_amount) / element.goal_amount) : 0.0;
          }
          else {
            element.progress = element.left_amount > 0 ? ((element.paid_amount) / element.goal_amount) : 1.0;
          }
          me.goals.push(element)
        }

        if (index === res.length - 1 && archived.length) {
          function goalAlert() {
            swal({
              title: "Congratulations!",
              icon: "success",
              text: `You've successfully reached your ${archived[0].name} goal! Do you want to remove this goal from your goal list.`,
              buttons: ["No", "Yes"],
              dangerMode: false,
              closeOnClickOutside: false
            })
              .then((isremove) => {
                if (isremove) {
                  me.cp.presentLoading();
                  archived.forEach((ele, eleindex) => {
                    me.api.removeGoal(ele.id).then(() => {
                      me.api.getIncomeSource();
                      me.api.getGoalbyId(ele.id);
                      if (eleindex === (archived.length - 1)) {
                        setTimeout(() => {
                          archived = [];
                          me.cp.dismissLoading();
                        }, 500);
                        swal({
                          title: 'SuccessFully Removed The Goal!!',
                          icon: 'success'
                        })
                      }
                    }).catch((error) => {
                      me.cp.dismissLoading();
                      console.log(error)
                    }
                    )
                  })

                }
                else {
                  var deniedgoalsList = JSON.parse(localStorage.getItem("deniedgoalsList"));
                  if (deniedgoalsList) {
                    archived.forEach((ele, eleIndex) => {
                      var index = deniedgoalsList.findIndex(o => o === ele.id);
                      if (index == -1) {
                        deniedgoalsList.push(ele.id);
                        if (eleIndex === (archived.length - 1)) {
                          localStorage.setItem('deniedgoalsList', JSON.stringify(deniedgoalsList))
                        }
                      }
                    })
                  }
                  else {
                    localStorage.setItem('deniedgoalsList', JSON.stringify(archived.map(o => o.id)))
                  }
                }
              });
          }
          var deniedgoalsList = JSON.parse(localStorage.getItem("deniedgoalsList"));
          if (deniedgoalsList) {
            var index = deniedgoalsList.findIndex(o => o === archived[0].id);
            if (index == -1) {
              goalAlert();
            }
          }
          else {
            goalAlert();
          }
        }
      });
     me.goals = me.goals.length > 5 ?  me.goals.slice(0,5) : me.goals;
    }
    // })
  }
  ionViewWillEnter() {
    let me = this;
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        me.getGoals();
        me.getTransaction();
        me.getPaycheck();
        me.changeDetector.detectChanges();
        const user = firebase.firestore().collection('users').doc(firebase
          .auth().currentUser.uid);
        user.get().then(snap => {
          if (snap.exists) {
            const data = snap.data();
            me.userName = data.name;
            me.userPic = (data.userPic) ? data.userPic : "assets/image/default.png";
            me.logoutService.userName = data.name;
            me.logoutService.userPic = (data.userPic) ? data.userPic : "assets/image/default.png";
          }
        });
      } else {
        if (me.unsubscribe) {
          me.unsubscribe();
        }
      }
    });
    this.backbutton = this.platform.backButton.observers.pop();
  }

  ngOnInit() {
  }
  ionViewWillLeave() {
    this.transactions = [];
    this.listPaychceck = [];
    this.goals = [];
    this.platform.backButton.observers.push(this.backbutton);
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
  addNewBudget() {
    this.tabs.select("budgets");
  }
  addTransaction() {
    this.tabs.select("transaction-select");
  }
  viewBudget() {
    this.transactionService.setPaycheckDetails({
      payPeriods: this.listPaychceck,
      repeatingType: this.listPaychceck['repeating'],
      lastroute: "/tabs/tabs/home"
    });
    this.router.navigate(['/tabs/tabs/paycheck/paycheck-details']);

  }
  viewAll() {
    this.navCtrl.navigateForward('/tabs/tabs/transaction-select/transaction-details');
  }
  plaid(trans) {
    this.cp.presentLoading();
    this.api.unAssignTransaction(trans.id).then((res) => {
      if (res['success']) {
        this.api.getTransaction().then((res) => {
          this.api.getIncomeSource();
          if (trans.plaidTransId) {
            this.api.getPlaidTransactionById(trans.plaidTransId);
          }
          this.cp.dismissLoading();
          swal("Transaction Unassigned SuccessFully", {
            icon: "success",
          });
          this.getTransaction();
          this.getPaycheck();
          this.api.getGoal()
          this.getGoals();

        });

      }
    }).catch((err) => {
      this.cp.dismissLoading();
    });
  }
  async unAssignTransaction(trans) {
    swal({
      title: "Unassign Transaction",
      text: "Are you sure you want to unassign this transaction?",
      icon: "warning",
      buttons: ["Cancel", "Confirm"],
      dangerMode: true,
      closeOnClickOutside: false
    })
      .then((willDelete) => {
        if (willDelete) {
          this.plaid(trans);
        }
      });

  }
  async details(data) {
    var me = this;
    this.transactionService.settransactionDetails({
      transaction: data,
      lastRoute: '/tabs/tabs/home'
    })
    const modal = await this.modalCtrl.create({
      component: ChangePaycheckPopupPage,
    });
    await modal.present();
    modal.onDidDismiss()
      .then((value: any) => {
        me.getGoals();
        me.getTransaction();
        me.getPaycheck();
      })
  }
  getPaycheck() {
    var me = this;
    me.listPaychceck = [];
    me.storage.get('incomeSource')
      .then((res) => {
        var nearMe = [];
        if (res && res.length) {
          res.forEach(income => {
            income.paychecks.forEach(paycheck => {
              if (paycheck.payDateTimeStamp < (new Date().getTime())) {
                nearMe.push(Object.assign({ repeating: (income.isRepeating ? income.repeating.type : "") }, { incomeid: income.id }, paycheck));
                nearMe = nearMe.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp })
              }
            });
          });
          if (nearMe.length) {
            me.noPaychecks = false;
            // me.cp.presentLoading();
            me.api.getSurplus({
              userId: firebase.auth().currentUser.uid,
              incomeSourceId: nearMe[0].incomeid,
              payDateTimeStamp: nearMe[0].payDateTimeStamp,
              paycheckId: nearMe[0].id
            }).then((surplusRes: any) => {
              // me.cp.dismissLoading();
              if (surplusRes.success) {
                nearMe[0].budgetsToBeBudgeted = surplusRes.budgetsToBeBudgeted;
                nearMe[0].surplusBudgetTemplate = surplusRes.surplusBudgetTemplate;
                nearMe[0].budgetsAvailable = surplusRes.budgetsAvailable;
                nearMe[0].isOverbudget = surplusRes.isOverbudget;
                nearMe[0].isOverspent = surplusRes.isOverspent;
              }
              loadLatestPaycheck(nearMe[0])
            }).catch(() => {
              // me.cp.dismissLoading();
              loadLatestPaycheck(nearMe[0])
            })
            function loadLatestPaycheck(latest) {
              var spent = latest.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                return a + b;
              }, 0);
              var receivedIncome = latest.totalReceived === 0 ? latest.totalExpected : latest.totalReceived;
              me.bar_percent = (spent * 100 / receivedIncome) / 100;
              me.bar_percent = me.bar_percent < 0 ? 1.0 : me.bar_percent;
              me.listPaychceck = Object.assign({ receivedIncome: receivedIncome }, { spend: spent }, latest);
            }

          }
        }
      })

  }
  editGoal(goal) {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        goal: JSON.stringify(goal)
      }, skipLocationChange: true
    };
    this.navCtrl.navigateForward(['/tabs/tabs/home/edit-goal'], navigationExtras);
  }
  async optionChoose(ev, trans) {
    const popover = await this.popoverController.create({
      component: DetailsPage,
      componentProps: {},
      cssClass: 'my-custom-class',
      event: ev,
      translucent: true
    });
    popover.onDidDismiss()
      .then((result) => {
        var data = result['data'];
        if (data == "edit") {
          this.changeCategory(trans);
        }
        if (data == "delete") {
          this.unAssignTransaction(trans)
        }
      });
    return await popover.present();
  }
  changeCategory(trans) {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        trans: JSON.stringify(trans)
      }, skipLocationChange: true
    };
    this.navCtrl.navigateForward(['/tabs/tabs/home/change-category'], navigationExtras);
  }
  // bhavna
  ngAfterViewInit() {
    setTimeout(() => {
      if (!localStorage.getItem('homeInfo')) {
        localStorage.setItem('homeInfo', 'true')
        introJs().setOptions({
          exitOnOverlayClick: false,
          showBullets: false,
          steps: [{
            title: 'Welcome to MyFondi!',
            intro: 'We are so excited to start you on your budgeting journey. Lets learn more'
          },
          {
            intro: ' This is the homepage that gives you a summary of your budget and goals.'
          },
          {
            element: '.user-button',
            intro: 'Selecting the picture will take you to your User Information. You can change your email, add a photo, and subscribe!'
          },
          {
            element: '.progress-bar',
            intro: 'The Budget Bar provides you with a summary of your current paycheck.',
            seq: 1
          },
          {
            element: '.your-goals',
            intro: 'My Goals is where you can create and edit your goals.'
          },
          {
            element: '.user-transaction',
            intro: 'Latest Transactions shows a summary of the first 5 most recent transactions. Select View All Transactions to see your latest Transactions.'
          }]
        }).start();
        // .onexit(function () {
        //   alert('onexit triggered');
        //   this.router.push(["/tabs/tabs"]);
        //   // router.push('/');
        // })
      }
    }, 2000);
  }
}

