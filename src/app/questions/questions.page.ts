import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { messages } from 'src/validation/messages';
import * as firebase from "firebase";
import { CommonProvider } from '../../providers/common';
import { Router } from '@angular/router';
import { Platform, AlertController,  NavController } from '@ionic/angular';

@Component({
  selector: 'app-questions',
  templateUrl: './questions.page.html',
  styleUrls: ['./questions.page.scss'],
})
export class QuestionsPage implements OnInit {
  validation_messages = messages;
  financially_feel = "3";
  willing_to_achieve = "3";
  financial_goals = [];
  public numbers = [
    { name: 1, value: 1, label: "Secure" },
    { name: 2, value: 2, label: "" },
    { name: 3, value: 3, label: "Somewhat" },
    { name: 4, value: 4, label: "" },
    { name: 5, value: 5, label: "Very Secure" }
  ];
  public strict = [
    { name: 1, value: 1, label: "Not strict" },
    { name: 2, value: 2, label: "" },
    { name: 3, value: 3, label: "Somewhat" },
    { name: 4, value: 4, label: "" },
    { name: 5, value: 5, label: "Very strict" }
  ];
  constructor(private _ngZone: NgZone, private navCtrl: NavController, private alertController: AlertController, 
    private platform: Platform, private cp: CommonProvider, private router: Router) {
    this.financial_goals.push({ value: '' });
  }

  ngOnInit() {
  }

  addNewGoal() {
    this.financial_goals.push({ value: '' });
  }

  next() {

    this._ngZone.run(() => {
      let goals = [];
      this.financial_goals.forEach(element => {
        goals.push(element.value);
      });
      let data = {
        financially_feel: this.financially_feel,
        willing_to_achieve: this.willing_to_achieve,
        financial_goals: goals
      }
      this.navCtrl.navigateForward(["questions-next-step"], {
        queryParams: {
          data: JSON.stringify(data),
        }, skipLocationChange: true
      });
    }
    );


  }
}


