import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';
import { QuestionsNextStepPage } from './questions-next-step.page';



const routes: Routes = [
  {
    path: '',
    component: QuestionsNextStepPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [QuestionsNextStepPage]
})
export class QuestionsNextStepPageModule {}
