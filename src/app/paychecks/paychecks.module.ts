import { PaychecksPage } from './paychecks.page';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PipeModule } from '../pipes/pipe.module';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,PipeModule,
    RouterModule.forChild([{ path: '', component: PaychecksPage }])
  ],
  declarations: [PaychecksPage]
})
export class PaychecksPageModule {}
