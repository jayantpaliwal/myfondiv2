import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangePaycheckPopupPage } from './change-paycheck-popup.page';

const routes: Routes = [
  {
    path: '',
    component: ChangePaycheckPopupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChangePaycheckPopupPageRoutingModule {}
