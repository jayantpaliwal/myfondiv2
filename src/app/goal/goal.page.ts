import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { NavController, PopoverController } from '@ionic/angular';
import { Events } from '../services/Events.service';
import { LogoutService } from '../services/logout/logout.service';
import { Storage } from '@ionic/storage';
import { ApiService } from '../services/api/api.service';
import { CommonProvider } from 'src/providers/common';
import swal from 'sweetalert';

@Component({
  selector: 'app-goal',
  templateUrl: './goal.page.html',
  styleUrls: ['./goal.page.scss'],
})
export class GoalPage implements OnInit {
  account = 'saving';
  userPic: any;
  goals = [];
  debt_goals = [];
  constructor(private nav: NavController, private route: Router,
    public popoverController: PopoverController,
    public logoutService: LogoutService,
    public events: Events,
    private api: ApiService,
    private cp: CommonProvider,
    public storage: Storage,) {
    events.subscribe('update:profile', (profile) => {
      if (profile.userPic) {
        this.userPic = profile.userPic ? profile.userPic : "assets/image/default.png";
      }
    });
    events.subscribe('refresh:savedgoals', (res) => {
      this.getGoals();
    });
    this.userPic = this.logoutService.userPic;
  }
  ionViewWillEnter() {
    this.getGoals();
  }
  async moreItem(ev, goals) {
    // const popover = await this.popoverController.create({
    //   component: ChooseAccountPopupPage,
    //   componentProps: {
    //     "account_id": null,
    //     "accounts": false,
    //   },
    //   cssClass: 'my-custom-class',
    //   event: ev,
    //   translucent: true
    // });
    // popover.onDidDismiss()
    //   .then((result) => {
    //     var data = result['data'];
    //     if (data == "edit") {
    //       this.editGoal(goals);
    //     }
    //     if (data == "delete") {
    //       this.api.deleteGoals(goals.id).then(res => {
    //         if (res['success']) {
    //           this.getGoals();
    //           this.api.getIncomeSource();
    //         }
    //       });
    //     }
    //   });
    // return await popover.present();
  }
  editGoal(goal) {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        goal: JSON.stringify(goal)
      }, skipLocationChange: true
    };
    this.nav.navigateForward(['/tabs/tabs/home/edit-goal'], navigationExtras);
  }
  getGoals() {
    this.goals = [];
    this.debt_goals = [];
    // this.storage.get('savedgoals').then((res) => {
    var res = this.cp.getGoals();
    if (res) {
      res.forEach(element => {
        if (element.isRemoved == false) {
          if (element.goal_type === "saving") {
            element.progress = element.paid_amount > 0 ? ((element.paid_amount) / element.goal_amount) : 0.0;
          }
          else {
            element.progress = element.left_amount > 0 ? ((element.paid_amount) / element.goal_amount) : 1.0;
          }
          (element.goal_type == "saving") ? this.goals.push(element) : this.debt_goals.push(element);
        }
      });
    }
    // })
  }
  ngOnInit() { }
  CreateGoalPage() {
    this.route.navigate(['/tabs/tabs/home/create-goal']);

  }
  goToProfile() {
    this.route.navigate(["/tabs/tabs/home/profile"]);
  }
  back() {
    this.nav.pop();
  }
  deleteGoal(goal) {
    var me = this;
    me.cp.presentLoading();
    if (goal.paid_amount >= goal.goal_amount && goal.isRemoved == false) {
      swal({
        title: "Congratulations!",
        icon: "success",
        text: `You've successfully reached your ${goal.goal_name} goal! Do you want to remove this goal from your goal list.`,
        buttons: ["No", "Yes"],
        dangerMode: false,
        closeOnClickOutside: false
      })
        .then((isremove) => {
          if (isremove) {
            me.api.removeGoal(goal.id).then(() => {
              me.api.getIncomeSource();
              me.api.getGoal();
              me.cp.dismissLoading();
              swal({
                title: 'SuccessFully Removed The Goal!!',
                icon: 'success'
              })
              setTimeout(() => {
                me.getGoals();
              }, 500);
            }).catch((error) => {
              me.cp.dismissLoading();
              console.log(error)
            }
            )

          }
        });
    }
    else {
      me.cp.dismissLoading();
      if (goal.paid_amount < goal.goal_amount) {
        me.cp.presentToast("Goal is not reached yet?")
      }
    }
  }
}
