import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayPeriodsPage } from './pay-periods.page';
import { PipeModule } from '../pipes/pipe.module';



@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,PipeModule,
    RouterModule.forChild([{ path: '', component: PayPeriodsPage }])
  ],
  declarations: [PayPeriodsPage]
})
export class PayPeriodsPageModule {}
