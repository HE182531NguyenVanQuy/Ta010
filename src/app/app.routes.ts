import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./layout/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./layout/register/register.component').then((m) => m.RegisterComponent),
  },

  //admin routes
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  

  //customer routes
   {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/customer/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'de-thi',
    loadComponent: () => import('./pages/customer/exam/exam.component').then((m) => m.ExamComponent),
  },
  {
    path: 'lam-bai',
    loadComponent: () => import('./pages/customer/test/test.component').then((m) => m.TestComponent),
  },
  {
    path: 'ai-analysis',
    loadComponent: () => import('./features/AI-analysis/ai-analysis.component').then((m) => m.AiAnalysisComponent),
  },
  {
    path: 'ngu-phap',
    loadComponent: () => import('./pages/customer/grammar/grammar.component').then((m) => m.GrammarComponent),
  },
  {
    path: 'tu-vung',
    loadComponent: () => import('./pages/customer/vocabulary/vocabulary.component').then((m) => m.VocabularyComponent),
  },
  {
    path: 'tai-lieu',
    loadComponent: () => import('./pages/customer/document/document.component').then((m) => m.DocumentComponent),
  },
  {
    path: 'dien-dan',
    loadComponent: () => import('./pages/customer/forum/forum.component').then((m) => m.ForumComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];