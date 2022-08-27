import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TransactionsPageRoutingModule } from './transactions-routing.module';
import { CalendarModule } from "ion2-calendar";
import { TransactionsPage } from './transactions.page';
import { PipeModule } from '../pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CalendarModule,PipeModule,
    TransactionsPageRoutingModule
  ],
  declarations: [TransactionsPage]
})
export class TransactionsPageModule {}
