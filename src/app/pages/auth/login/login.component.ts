import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { LoginRequest, CurrentUser } from '../../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {

  // ── Form fields ───────────────────────────────────────────
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;

  // ── UI state ──────────────────────────────────────────────
  isLoading = false;
  loginError = '';
  emailError = '';
  emailSuccess = false;
  passwordError = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  validateEmail(): void {
    this.emailError = '';
    this.emailSuccess = false;

    if (!this.email.trim()) {
      this.emailError = 'Vui lòng nhập email hoặc tên đăng nhập.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email.includes('@') && !emailRegex.test(this.email)) {
      this.emailError = 'Địa chỉ email không hợp lệ.';
      return;
    }

    this.emailSuccess = true;
    this.cdr.markForCheck();
  }

  async onSubmit(): Promise<void> {
    // Reset errors
    this.loginError = '';
    this.emailError = '';
    this.passwordError = '';

    // Validate
    let hasError = false;

    if (!this.email.trim()) {
      this.emailError = 'Vui lòng nhập email hoặc tên đăng nhập.';
      hasError = true;
    }

    if (!this.password) {
      this.passwordError = 'Vui lòng nhập mật khẩu.';
      hasError = true;
    } else if (this.password.length < 6) {
      this.passwordError = 'Mật khẩu phải có ít nhất 6 ký tự.';
      hasError = true;
    }

    if (hasError) {
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const payload: LoginRequest = {
        email: this.email.trim(),
        password: this.password
      };

      // call AuthService which stores tokens and decodes user
      await this.authService.loginAsync(payload);
      this.notificationService.show('Đăng nhập thành công. Chào mừng bạn đến TaO10!', 'success');

      // optionally preserve remembered email
      if (this.rememberMe) {
        localStorage.setItem('tao10_remember', this.email);
      } else {
        localStorage.removeItem('tao10_remember');
      }

      // decide route by role (AuthService already decoded token into currentUser)
      const current = this.authService.getCurrentUserSnapshot();
      const role = current?.role?.toLowerCase?.() ?? '';

      if (role === 'admin') {
        await this.router.navigate(['/dashboard']);
      } else {
        await this.router.navigate(['/']);
      }

    } catch (err: unknown) {
      // Prefer server-provided message
      if (err && (err as any).error && (err as any).error.message) {
        this.loginError = (err as any).error.message;
      } else if (err instanceof Error) {
        this.loginError = err.message;
      } else {
        this.loginError = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      }
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Social login (placeholders) ──────────────────────────
  loginWithGoogle(): void {
    console.log('Google login');
  }

  loginWithFacebook(): void {
    console.log('Facebook login');
  }

  goToForgotPassword(): void {
    console.log('Navigating to /forgot-password');
    this.router.navigateByUrl('/forgot-password')
      .then((success) => {
        if (!success) {
          console.error('Navigation to /forgot-password failed.');
        }
      })
      .catch((err) => {
        console.error('Router navigation error to /forgot-password:', err);
      });
  }
}