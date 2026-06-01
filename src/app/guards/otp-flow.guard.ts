import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { PasswordResetStateService } from '../services/password-reset-state.service';

@Injectable({ providedIn: 'root' })
export class OtpFlowGuard implements CanActivate {
  constructor(private state: PasswordResetStateService, private router: Router) {}

  canActivate(): boolean {
    // allow VerifyOtp if email present and not expired
    const url = this.router.url;
    if (url.includes('verify-otp')) {
      if (!this.state.email) { this.router.navigate(['/forgot-password']); return false; }
      const expiry = this.state.otpExpiresAt ?? 0;
      if (expiry < Date.now()) { this.router.navigate(['/forgot-password']); return false; }
      return true;
    }

    // allow ResetPassword only if resetToken present
    if (url.includes('reset-password')) {
      if (!this.state.resetToken) { this.router.navigate(['/forgot-password']); return false; }
      return true;
    }

    return true;
  }
}