import { Injectable } from '@angular/core';
import * as firebase from 'firebase';
import { InAppBrowser, InAppBrowserOptions } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { LogoutService } from '../logout/logout.service';
@Injectable({
  providedIn: 'root'
})
export class InappBrowserService {
  options: InAppBrowserOptions = {
    location: 'yes',//Or 'no' 
    hidden: 'no', //Or  'yes'
    clearcache: 'yes',
    clearsessioncache: 'yes',
    zoom: 'yes',//Android only ,shows browser zoom controls 
    beforeload: 'yes',
  };
  constructor(public logoutService: LogoutService, private iab: InAppBrowser) { }
  CreateBrowser() {
    var me = this;
    return new Promise((resolve, reject)=>{
      const browser = this.iab.create(` https://myfondi-v2.web.app?email=${firebase.auth().currentUser.email}&username=${me.logoutService.userName}`, "_self", this.options);
      browser.on('beforeload').subscribe(event => {
        const params = new URL(event.url).searchParams;
       let token  = params.get('token');
       let message =  params.get('message');
       if(token){
        browser.close();
        resolve({success: true, token: token})
       }
       else if(message){
        browser.close();
        resolve({success: false, message: message})
        }
      });
    })
 
  }

}
