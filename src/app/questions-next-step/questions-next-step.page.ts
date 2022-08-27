import { Component, OnInit, NgZone } from '@angular/core';
import * as firebase from "firebase";
import { CommonProvider } from '../../providers/common';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { Platform, AlertController, NavController } from '@ionic/angular';
import { Events } from '../services/Events.service';
@Component({
  selector: 'app-questions-next-step',
  templateUrl: './questions-next-step.page.html',
  styleUrls: ['./questions-next-step.page.scss'],
})
export class QuestionsNextStepPage implements OnInit {
  achievements_quickly = "3";
  financially_feel: string = '';
  willing_to_achieve: string = '';
  financial_goals = [];
  thankyou=false;
  terms = false;
  subscribe:any;
  public numbers = [
    { name: 1, value: 1, label: "Slowly" },
    { name: 2, value: 2, label: "" },
    { name: 3, value: 3, label: "No Opinion" },
    { name: 4, value: 4, label: "" },
    { name: 5, value: 5, label: "Quickly" }
  ];
  constructor(private _ngZone: NgZone,public events: Events, private route: ActivatedRoute, private navCtrl: NavController, private alertController: AlertController, private platform: Platform, private cp: CommonProvider, private router: Router) {
    this.subscribe=  this.route.queryParams.subscribe(params => {
      const data = JSON.parse(params["data"])
      this.financially_feel = data.financially_feel;
      this.financial_goals = data.financial_goals;
      this.willing_to_achieve = data.willing_to_achieve;

    });
  }

  
  ionViewWillLeave() {
    if (this.subscribe) {
      this.subscribe.unsubscribe();
    }
  }

  ngOnInit() {
  }

  submit() {
    let me =this;
    let users = firebase.firestore().collection('users').doc(firebase
      .auth().currentUser.uid);
    users.update({
      questionaire: true,
      financially_feel: parseInt(this.financially_feel),
      financial_goals: this.financial_goals,
      willing_to_achieve: parseInt(this.willing_to_achieve),
      achievements_quickly: parseInt(this.achievements_quickly)
    }).then(() => {
    
      this._ngZone.run(() => {
        me.thankyou=true;
        setTimeout(() => {
          this.events.publish('refresh:income',{time:new Date()});
          this.navCtrl.navigateRoot('tabs');
        }, 1500);
       
      })
    }).catch(function (error) {

      })

  }


}


