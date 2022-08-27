
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

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
          }
          
        ]
      },
      {
        path: 'budgets',
        children: [
          {
            path: '',
            loadChildren: '../budgets/budgets.module#BudgetsPageModule'

          },{
            path: 'pay-periods',
            loadChildren: '../pay-periods/pay-periods.module#PayPeriodsPageModule'
          }
        ]
      },
      {
        path: 'paychecks',
        children: [
          {
            path: '',
            loadChildren: '../paychecks/paychecks.module#PaychecksPageModule'

          }
        ]
      },
      {
        path: 'transaction-select',
        children: [
          {
            path: '',
            loadChildren: '../transaction/transaction-select/transaction-select.module#TransactionSelectPageModule'

          }
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
