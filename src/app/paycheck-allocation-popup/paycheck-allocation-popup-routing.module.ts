import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PaycheckAllocationPopupPage } from './paycheck-allocation-popup.page';

const routes: Routes = [
  {
    path: '',
    component: PaycheckAllocationPopupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaycheckAllocationPopupPageRoutingModule {}
