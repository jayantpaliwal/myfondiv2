import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StripeSubscriptionPage } from './stripe-subscription.page';

const routes: Routes = [
  {
    path: '',
    component: StripeSubscriptionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StripeSubscriptionPageRoutingModule {}
