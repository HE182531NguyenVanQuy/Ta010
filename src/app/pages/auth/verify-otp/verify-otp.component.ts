import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { PasswordResetStateService } from '../../../services/password-reset-state.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.scss'],
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private state = inject(PasswordResetStateService);
  private auth = inject(AuthService);
  // Phải để protected hoặc public để template truy cập được
  protected router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  form = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]] });
  email = '';
  remaining = 0; // seconds
  timerSub?: Subscription;
  loading = false;
  error = '';
  resendError = '';

  ngOnInit() {
    this.email = this.state.email ?? '';
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    const expires = this.state.otpExpiresAt ?? (Date.now() + 5 * 60 * 1000);
    this.startTimer(expires);
  }

  startTimer(expiresMs: number) {
    this.updateRemaining(expiresMs);
    this.timerSub = interval(1000).subscribe(() => this.updateRemaining(expiresMs));
  }

  updateRemaining(expiresMs: number) {
    const diff = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    this.remaining = diff;
    if (diff === 0 && this.timerSub) {
      this.timerSub.unsubscribe();
    }
  }

  submit() {
    this.error = '';
    this.form.controls['otp'].setErrors(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const otp = this.form.value.otp!;
    this.auth.verifyOtp(this.email, otp).subscribe({
      next: (res: any) => {
        this.state.setResetToken(res.resetToken);
        // replaceUrl: true giúp user không thể nhấn Back để quay lại trang nhập OTP
        this.router.navigate(['/reset-password'], { replaceUrl: true }); 
      },
      error: (err: any) => {
        const message = err?.error?.message ?? 'Mã OTP không hợp lệ';
        this.error = message;
        this.form.controls['otp'].setErrors({ server: true });
        this.form.controls['otp'].markAsTouched();
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resend() {
    this.resendError = '';
    this.auth.resendOtp(this.email).subscribe({
      next: () => {
        // update expiry in state to now + 5min
        this.state.setOtpExpiry(Date.now() + 5 * 60 * 1000);
        this.startTimer(Date.now() + 5 * 60 * 1000);
      },
      error: (err: any) => {
        this.resendError = err?.error?.message ?? 'Không thể gửi lại mã OTP';
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() { this.timerSub?.unsubscribe(); }
}