import { NgModule, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import * as firebase from 'firebase';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonProvider } from 'src/providers/common';
import { ReactiveFormsModule } from '@angular/forms';
import { firebase_config } from './../config/config';
import { CategoriesPage } from './categories/categories.page';
import { AddCategoriesPage } from './add-categories/add-categories.page';
import { HttpClientModule } from '@angular/common/http';
import { IonicStorageModule } from '@ionic/storage';
import { CalendarModule } from 'ion2-calendar';
import { CommonModule } from '@angular/common';
import { GooglePlus } from '@ionic-native/google-plus/ngx';
import { Facebook } from '@ionic-native/facebook/ngx';
import { FCM } from 'cordova-plugin-fcm-with-dependecy-updated/ionic/ngx/FCM';
import { ChangePaycheckPopupPage } from './transaction-details/change-paycheck-popup/change-paycheck-popup.page';
import { ChooseAccountPopupPage } from './choose-account/choose-account-popup.page';
import { AccountChoosePage } from './account-choose/account-choose.page';
import { Stripe } from '@ionic-native/stripe/ngx';
import { PipeModule } from './pipes/pipe.module';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';


firebase.initializeApp(firebase_config);
@NgModule({
  declarations: [AppComponent,AddCategoriesPage,AccountChoosePage, CategoriesPage, ChangePaycheckPopupPage,ChooseAccountPopupPage],
  entryComponents: [CategoriesPage,AddCategoriesPage,AccountChoosePage,ChangePaycheckPopupPage,ChooseAccountPopupPage],
  imports: [BrowserModule,
    CalendarModule,
    IonicModule.forRoot({ scrollPadding: true, scrollAssist: false }),
    IonicStorageModule.forRoot({
      name: '__LocalData',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    }),
    AppRoutingModule, 
    ReactiveFormsModule, 
    HttpClientModule,
     CommonModule,
     PipeModule],
  providers: [
    StatusBar,
    Facebook,
    FCM,
    GooglePlus,
    SplashScreen, Storage,
    Stripe,
    InAppBrowser,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    CommonProvider
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA ],
  bootstrap: [AppComponent]
})
export class AppModule { }
