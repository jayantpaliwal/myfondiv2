import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChangePaycheckPopupPageRoutingModule } from './change-paycheck-popup-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, 
       ReactiveFormsModule,
    ChangePaycheckPopupPageRoutingModule
  ],
  declarations: []
})
export class ChangePaycheckPopupPageModule {}
