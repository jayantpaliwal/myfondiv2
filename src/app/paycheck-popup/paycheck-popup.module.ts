import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PaycheckPopupPageRoutingModule } from './paycheck-popup-routing.module';

import { PaycheckPopupPage } from './paycheck-popup.page';
import { CalendarModule } from 'ion2-calendar';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CalendarModule,
    IonicModule,
    PaycheckPopupPageRoutingModule
  ],
  declarations: [PaycheckPopupPage]
})
export class PaycheckPopupPageModule {}
