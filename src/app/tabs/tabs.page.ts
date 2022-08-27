import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  home: boolean = true;
  paycheck: boolean = false;
  accounts: boolean = false;
  transaction: boolean = false;
  labs: boolean = false;
  constructor(private router: Router) {}

  change(evt){
    if(evt.detail.tab=="home"){
      this.resetAll();
      this.home=true;
    }
    else if(evt.detail.tab=="paycheck"){
      this.resetAll();
      this.paycheck=true;
    }
    else if(evt.detail.tab=="transaction-select"){
      this.resetAll();
      this.transaction=true;
    }
    else if(evt.detail.tab=="accounts"){
      this.resetAll();
      this.accounts=true;
    }
    else if(evt.detail.tab=="labs"){
      this.resetAll();
      this.labs=true;
    }
    else{
      this.resetAll();
    }
  }
  gohome(){
    this.router.navigateByUrl('tabs')
  }
  resetAll(){
    this.home=false;
    this.paycheck=false;
    this.accounts=false;
    this.labs=false;
    this.transaction=false;
  }
}
