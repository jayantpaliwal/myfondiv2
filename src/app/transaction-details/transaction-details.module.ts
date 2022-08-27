import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TransactionDetailsPage } from './transaction-details.page';
import { CalendarModule } from "ion2-calendar";
import { PipeModule } from '../pipes/pipe.module';


const routes: Routes = [
  {
    path: '',
    component: TransactionDetailsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CalendarModule,PipeModule,
    RouterModule.forChild(routes)
  ],
  declarations: [TransactionDetailsPage]
})
export class TransactionDetailsPageModule {}
