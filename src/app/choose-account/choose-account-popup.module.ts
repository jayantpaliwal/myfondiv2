import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChooseAccountPopupPage } from './choose-account-popup.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ChooseAccountPopupPage }])
  ],
  //declarations: [AddCategoriesPage]
})
export class ChooseAccountPopupPageModule {}
