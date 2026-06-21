import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { PasswordResetStateService } from '../../../services/password-reset-state.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private state = inject(PasswordResetStateService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
  loading = false;
  error = '';

  submit() {
    this.error = '';
    if (this.form.invalid) return;
    this.loading = true;
    const email = this.form.value.email!.trim();
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.state.setEmail(email);
        // Đảm bảo route này khớp với path trong app.routes.ts
        this.router.navigate(['/verify-otp']);
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? 'Lỗi khi gửi mã OTP';
        this.loading = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}