import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'dashboard/add-card',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/add-card.component').then((m) => m.AddCardComponent)
  },
  {
    path: 'admin/cards',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/master-cards-list/master-cards-list.component').then((m) => m.MasterCardsListComponent)
  },
  {
    path: 'admin/cards/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/master-card-form/master-card-form.component').then((m) => m.MasterCardFormComponent)
  },
  {
    path: 'admin/cards/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/master-card-form/master-card-form.component').then((m) => m.MasterCardFormComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
