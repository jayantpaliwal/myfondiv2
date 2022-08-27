import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChangePaycheckPageRoutingModule } from './change-paycheck-routing.module';

import { ChangePaycheckPage } from './change-paycheck.page';
import { PipeModule } from 'src/app/pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,PipeModule,
    ChangePaycheckPageRoutingModule
  ],
  declarations: [ChangePaycheckPage]
})
export class ChangePaycheckPageModule {}
