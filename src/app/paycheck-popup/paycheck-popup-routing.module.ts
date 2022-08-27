import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PaycheckPopupPage } from './paycheck-popup.page';

const routes: Routes = [
  {
    path: '',
    component: PaycheckPopupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaycheckPopupPageRoutingModule {}
