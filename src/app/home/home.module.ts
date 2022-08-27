import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PipeModule } from '../pipes/pipe.module';


@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,PipeModule,
    RouterModule.forChild([{ path: '', component: HomePage }])
  ],
  declarations: [HomePage],
schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}
