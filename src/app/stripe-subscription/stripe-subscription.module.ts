import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StripeSubscriptionPageRoutingModule } from './stripe-subscription-routing.module';
import { StripeSubscriptionPage } from './stripe-subscription.page';
import { PipeModule } from '../pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,ReactiveFormsModule,
    IonicModule,PipeModule,
    StripeSubscriptionPageRoutingModule
  ],
  declarations: [StripeSubscriptionPage]
})
export class StripeSubscriptionPageModule {}
