import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChangeCategoryPageRoutingModule } from './change-category-routing.module';

import { ChangeCategoryPage } from './change-category.page';
import { PipeModule } from 'src/app/pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,PipeModule,
    ChangeCategoryPageRoutingModule
  ],
  declarations: [ChangeCategoryPage]
})
export class ChangeCategoryPageModule {}
