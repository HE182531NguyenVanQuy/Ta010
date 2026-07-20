import { Routes } from '@angular/router';
import { OtpFlowGuard } from './guards/otp-flow.guard';

export const routes: Routes = [
  //auth routes
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/auth/profile/profile.component').then((m) => m.ProfileComponent),
  },

  // Support legacy /auth/... paths used in some components and guards
  {
    path: 'auth',
    children: [
      { path: 'login', redirectTo: '/login', pathMatch: 'full' },
      { path: 'register', redirectTo: '/register', pathMatch: 'full' },
      { path: 'forgot-password', redirectTo: '/forgot-password', pathMatch: 'full' },
      { path: 'verify-otp', redirectTo: '/verify-otp', pathMatch: 'full' },
      { path: 'reset-password', redirectTo: '/reset-password', pathMatch: 'full' },
    ]
  },

  { 
    path: 'forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) 
  },
    
  { 
    path: 'verify-otp', 
    loadComponent: () => import('./pages/auth/verify-otp/verify-otp.component').then(m => m.VerifyOtpComponent), canActivate: [OtpFlowGuard] 
  },

  { 
    path: 'reset-password', 
    loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent), canActivate: [OtpFlowGuard] 
  },

  //admin routes
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'admin',
    children: [
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/user/user.component').then((m) => m.UserAdminComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/admin/report/report.component').then((m) => m.ReportAdminComponent),
      },
      {
        path: 'exams',
        data: { reportTab: 'exams' },
        loadComponent: () => import('./pages/admin/report/report.component').then((m) => m.ReportAdminComponent),
      },
      {
        path: 'packages',
        data: { reportTab: 'packages' },
        loadComponent: () => import('./pages/admin/report/report.component').then((m) => m.ReportAdminComponent),
      }
    ]
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
    path: 'tai-lieu',
    loadComponent: () => import('./pages/customer/document/document.component').then((m) => m.DocumentComponent),
  },
  {
    path: 'luyen-tap',
    loadComponent: () => import('./pages/customer/practice/practice.component').then((m) => m.PracticeComponent),
  },
  {
    path: 'dien-dan',
    loadComponent: () => import('./pages/customer/forum/forum.component').then((m) => m.ForumComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
