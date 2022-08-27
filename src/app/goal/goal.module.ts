import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GoalPageRoutingModule } from './goal-routing.module';

import { GoalPage } from './goal.page';
import { PipeModule } from 'src/app/pipes/pipe.module';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PipeModule,
    GoalPageRoutingModule
  ],
  declarations: [GoalPage]
})
export class GoalPageModule {}
