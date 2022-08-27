
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BudgetAllocationPage } from './budget-allocation.page';
 
import { PipeModule } from 'src/app/pipes/pipe.module';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,ReactiveFormsModule,PipeModule,
    RouterModule.forChild([{ path: '', component: BudgetAllocationPage }])
  ],
  declarations: [BudgetAllocationPage]
})
export class BudgetAllocationPageModule {}
