
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionSelectPage } from './transaction-select.page';





@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: TransactionSelectPage }])
  ],
  declarations: [TransactionSelectPage]
})
export class TransactionSelectPageModule {}
