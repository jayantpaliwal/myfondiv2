import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', loadChildren: './login/login.module#LoginPageModule' },
  { path: 'startup', loadChildren: './startup/startup.module#StartupPageModule' },
  { path: 'tabs', loadChildren: './tabs/tabs.module#TabsPageModule', canActivate: [AuthGuard] },
  { path: 'register', loadChildren: './register/register.module#RegisterPageModule' },
  { path: 'instructions', loadChildren: './instructions/instructions.module#InstructionsPageModule' },
  { path: 'questions', loadChildren: './questions/questions.module#QuestionsPageModule', canActivate: [AuthGuard] },
  { path: 'questions-next-step', loadChildren: './questions-next-step/questions-next-step.module#QuestionsNextStepPageModule', canActivate: [AuthGuard] },
  { path: 'email-verify', loadChildren: './email-verification/email-verification.module#EmailVerificationPageModule' },
  {
    path: 'stripe-subscription',
    loadChildren: () => import('./stripe-subscription/stripe-subscription.module').then( m => m.StripeSubscriptionPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
