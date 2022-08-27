import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { AuthGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        children: [
          {
            path: '',
            loadChildren: '../home/home.module#HomePageModule'
          },
          {
            path: 'create-goal', loadChildren: () => import('../create-goal/create-goal.module').then(m => m.CreateGoalPageModule)
          },
          {
            path: 'edit-goal',
            loadChildren: () => import('../edit-goal/edit-goal.module').then(m => m.EditGoalPageModule)
          },
          {
            path: 'change-category',
            loadChildren: () => import('../transaction-details/change-category/change-category.module').then( m => m.ChangeCategoryPageModule)
          },{ path: 'add-income', loadChildren: '../add-income/add-income.module#AddIncomePageModule', canActivate: [AuthGuard] },
          { path: 'pay-periods', loadChildren: '../pay-periods//pay-periods.module#PayPeriodsPageModule', canActivate: [AuthGuard] },
          { path: 'profile', loadChildren: '../profile/profile.module#ProfilePageModule' },
          { path: 'goal', loadChildren: '../goal/goal.module#GoalPageModule' },
         
          {
            path: 'paycheck-allocation-popup',
            loadChildren: () => import('../paycheck-allocation-popup/paycheck-allocation-popup.module').then(m => m.PaycheckAllocationPopupPageModule)
          },
          {
            path: 'paycheck-popup',
            loadChildren: () => import('../paycheck-popup/paycheck-popup.module').then(m => m.PaycheckPopupPageModule)
          },
          {
            path: 'details',
            loadChildren: () => import('../transaction-details/more-option/more-option.module').then( m => m.DetailsPageModule)
          },
          {
            path: 'change-paycheck',
            loadChildren: () => import('../transaction-details/change-paycheck/change-paycheck.module').then( m => m.ChangePaycheckPageModule)
          },
        ]
      },
      {
        path: 'paycheck',
        children: [
          {
            path: '',
            loadChildren: '../paychecks/paychecks.module#PaychecksPageModule'
          },
          { path: 'budget-allocation', loadChildren: '../budget-allocation/budget-allocation.module#BudgetAllocationPageModule', canActivate: [AuthGuard] },
          { path: 'paycheck-details', loadChildren: '../paycheck-details/paycheck-details.module#PaycheckDetailsPageModule', canActivate: [AuthGuard] },
          
        ]
      },

      {
        path: 'labs',
        children: [
          {
            path: '',
            loadChildren: '../labs/labs.module#LabsPageModule'
          }
        ]
      },
      {
        path: 'accounts',
        children: [
          {
            path: '',
            loadChildren: '../accounts/accounts.module#AccountsPageModule'
          }
        ]
      },
      {
        path: 'transaction-select',
        children: [
          {
            path: '',
            loadChildren: '../transaction/transaction-select/transaction-select.module#TransactionSelectPageModule'

          },
          {
            path: 'transaction-list',
            loadChildren: () => import('../plaid-transaction-list/transaction-list.module').then(m => m.TransactionListPageModule)
          },
           {
            path: 'transactions',
            loadChildren: () => import('../transactions/transactions.module').then(m => m.TransactionsPageModule)
          },
          { path: 'transaction-details', loadChildren: '../transaction-details/transaction-details.module#TransactionDetailsPageModule', canActivate: [AuthGuard] },
          // { path: 'transaction-select', loadChildren: '../transaction/transaction-select/transaction-select.module#TransactionSelectPageModule', canActivate: [AuthGuard] },
          { path: 'transaction-upload', loadChildren: '../transaction/transaction-upload/transaction-upload.module#TransactionUploadPageModule', canActivate: [AuthGuard] },
          { path: 'manual-transactions', loadChildren: '../transaction/manual-transactions/manual-transactions.module#ManualTransactionsPageModule', canActivate: [AuthGuard] },
          
        ]
      },
    ]
  },
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule { }
