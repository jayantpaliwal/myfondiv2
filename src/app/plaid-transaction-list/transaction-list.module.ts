import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TransactionListPageRoutingModule } from './transaction-list-routing.module';

import { TransactionListPage } from './transaction-list.page';
import { PipeModule } from '../pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,PipeModule,
    TransactionListPageRoutingModule
  ],
  declarations: [TransactionListPage]
})
export class TransactionListPageModule {}
