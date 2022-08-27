import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangePaycheckPage } from './change-paycheck.page';

const routes: Routes = [
  {
    path: '',
    component: ChangePaycheckPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChangePaycheckPageRoutingModule {}
