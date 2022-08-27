import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PaycheckAllocationPopupPageRoutingModule } from './paycheck-allocation-popup-routing.module';

import { PaycheckAllocationPopupPage } from './paycheck-allocation-popup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PaycheckAllocationPopupPageRoutingModule
  ],
  declarations: [PaycheckAllocationPopupPage]
})
export class PaycheckAllocationPopupPageModule {}
