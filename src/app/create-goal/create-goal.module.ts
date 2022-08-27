import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreateGoalPageRoutingModule } from './create-goal-routing.module';

import { CreateGoalPage } from './create-goal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    CreateGoalPageRoutingModule
  ],
  declarations: [CreateGoalPage]
})
export class CreateGoalPageModule {}
