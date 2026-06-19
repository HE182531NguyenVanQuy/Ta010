import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  // form model
  fullName = '';
  email = '';
  phone = '';
  location = '';
  agreeToTerms = false;

  // UI state
  isLoading = false;
  registerError = '';
  serverErrors: Record<string, string[]> = {};

  // per-field errors
  nameError = '';
  emailError = '';
  emailSuccess = false;
  phoneError = '';
  locationError = '';
  termsError = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  // validations
  validateFullName(): void {
    this.nameError = '';
    if (!this.fullName.trim()) {
      this.nameError = 'Vui lòng nhập họ và tên.';
    } else if (this.fullName.trim().length < 2) {
      this.nameError = 'Họ và tên quá ngắn.';
    }
  }

  validateEmail(): void {
    this.emailError = '';
    this.emailSuccess = false;

    if (!this.email.trim()) {
      this.emailError = 'Vui lòng nhập địa chỉ email.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Địa chỉ email không hợp lệ.';
      return;
    }

    this.emailSuccess = true;
  }

  validatePhone(): void {
    this.phoneError = '';
    const raw = (this.phone || '').replace(/\D/g, '');
    if (!raw) {
      this.phoneError = 'Vui lòng nhập số điện thoại.';
      return;
    }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(raw)) {
      this.phoneError = 'Số điện thoại không hợp lệ (10-11 chữ số).';
      return;
    }
    // normalize stored format
    this.phone = raw;
  }

  validateLocation(): void {
    this.locationError = '';
    if (!this.location?.trim()) {
      this.locationError = 'Vui lòng nhập địa điểm.';
    }
  }

  validateTerms(): void {
    this.termsError = '';
    if (!this.agreeToTerms) {
      this.termsError = 'Vui lòng đồng ý với điều khoản sử dụng.';
    }
  }

  onSubmit(): void {
    // run validations
    this.validateFullName();
    this.validateEmail();
    this.validatePhone();
    this.validateLocation();
    this.validateTerms();

    if (this.nameError || this.emailError || this.phoneError || this.locationError || this.termsError) {
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.registerError = '';
    this.serverErrors = {};

    const registerData = {
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      location: this.location.trim()
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.isLoading = false;

        // treat any non-error response as success — backend returns created object or 201
        const success = !!response && ((response as any).email || (response as any).userId || Object.keys(response).length > 0);
        if (success) {
          this.notificationService.show('Đăng ký thành công! Mật khẩu tạm thời đã được gửi tới email.', 'success');
          this.router.navigate(['/login']);
        } else {
          // unexpected shape
          this.registerError = 'Đăng ký thất bại. Vui lòng thử lại.';
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Register error:', error);

        if (error.status === 400) {
          const errBody = error.error || {};
          if (errBody.errors) {
            this.serverErrors = errBody.errors;
            const first = Object.values(this.serverErrors)[0];
            if (Array.isArray(first) && first.length > 0) {
              this.registerError = first[0];
            } else {
              this.registerError = errBody.message || 'Dữ liệu không hợp lệ.';
            }
          } else {
            this.registerError = errBody.message || 'Dữ liệu không hợp lệ.';
          }
        } else if (error.status === 409) {
          if (error.error?.message) {
            this.registerError = error.error.message;
            this.cdr.markForCheck();
            return;
          }
          this.registerError = 'Email hoặc số điện thoại đã được sử dụng.';
        } else if (error.status === 0) {
          this.registerError = 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet.';
        } else {
          this.registerError = error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.';
        }

        this.cdr.markForCheck();
      }
    });
  }

  // placeholders
  registerWithGoogle(): void {
    console.log('Google registration not implemented yet');
  }
  registerWithFacebook(): void {
    console.log('Facebook registration not implemented yet');
  }
}
