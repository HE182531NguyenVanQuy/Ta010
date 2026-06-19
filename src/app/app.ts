import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NotificationService, NotificationPayload } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    @if (!isAdminLayout()) {
      <app-header />
    }

    <main class="app-main" [class.app-main--admin]="isAdminLayout()">
      <router-outlet />
    </main>

    <div class="notification-center" *ngIf="notification$ | async as notification">
      <div class="notification-card" [ngClass]="notification.type">
        <div class="notification-icon">{{ notification.type === 'success' ? '✅' : notification.type === 'error' ? '⚠️' : 'ℹ️' }}</div>
        <div class="notification-body">
          <div class="notification-label">{{ notification.type === 'success' ? 'Thành công' : notification.type === 'error' ? 'Lỗi' : 'Thông tin' }}</div>
          <div class="notification-message">{{ notification.message }}</div>
        </div>
      </div>
    </div>

    @if (!isAdminLayout()) {
      <app-footer />
    }
  `,
  styles: [
    `
      .app-main {
        min-height: 60vh;
      }

      .app-main--admin {
        min-height: 100vh;
      }

      .notification-center {
        position: fixed;
        inset: 0;
        z-index: 140;
        display: grid;
        place-items: center;
        pointer-events: none;
      }

      .notification-card {
        display: flex;
        align-items: center;
        gap: 16px;
        max-width: min(520px, calc(100% - 40px));
        padding: 18px 22px;
        border-radius: 24px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: 0 32px 90px rgba(15, 23, 42, 0.2);
        background: rgba(255, 255, 255, 0.97);
        backdrop-filter: blur(18px);
        pointer-events: auto;
        animation: fadeInUp .3s ease;
      }

      .notification-card.success {
        border-color: rgba(16, 185, 129, 0.24);
      }

      .notification-card.error {
        border-color: rgba(248, 113, 113, 0.24);
      }

      .notification-card.info {
        border-color: rgba(59, 130, 246, 0.24);
      }

      .notification-icon {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(14, 165, 233, 0.12);
        font-size: 1.2rem;
      }

      .notification-card.success .notification-icon {
        background: rgba(16, 185, 129, 0.14);
      }

      .notification-card.error .notification-icon {
        background: rgba(248, 113, 113, 0.14);
      }

      .notification-card.info .notification-icon {
        background: rgba(59, 130, 246, 0.14);
      }

      .notification-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .notification-label {
        font-family: var(--font-head);
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
      }

      .notification-message {
        font-family: var(--font-body);
        font-size: 0.9rem;
        color: #475569;
        line-height: 1.5;
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  ],
})
export class App {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly notification$ = this.notificationService.notification$;

  protected readonly isAdminLayout = computed(() => {
    const url = this.currentUrl();
    
    // Danh sách các đường dẫn không sử dụng Header/Footer chung của app
    const standalonePaths = [
      '/login', 
      '/register', 
      '/forgot-password', 
      '/verify-otp', 
      '/reset-password'
    ];

    // Loại bỏ query parameters trước khi so sánh (ví dụ: /login?msg=... -> /login)
    const cleanUrl = url.split('?')[0];
    
    return url.startsWith('/dashboard') || url.startsWith('/admin') || standalonePaths.includes(cleanUrl);
  });
}
