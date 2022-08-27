import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccountChoosePage } from './account-choose.page';

const routes: Routes = [
  {
    path: '',
    component: AccountChoosePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountChoosePageRoutingModule {}
