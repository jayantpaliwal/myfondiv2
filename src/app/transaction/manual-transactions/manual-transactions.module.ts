import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { ManualTransactionsPage } from './manual-transactions.page';
import { PipeModule } from 'src/app/pipes/pipe.module';

const routes: Routes = [
  {
    path: '',
    component: ManualTransactionsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,PipeModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ManualTransactionsPage]
})
export class ManualTransactionsPageModule {}
