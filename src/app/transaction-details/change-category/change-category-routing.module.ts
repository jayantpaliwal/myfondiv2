import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChangeCategoryPage } from './change-category.page';

const routes: Routes = [
  {
    path: '',
    component: ChangeCategoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChangeCategoryPageRoutingModule {}
