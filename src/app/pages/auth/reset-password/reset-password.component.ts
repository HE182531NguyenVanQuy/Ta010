import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { PasswordResetStateService } from '../../../services/password-reset-state.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(PasswordResetStateService);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.match('newPassword','confirmPassword') });

  loading = false;
  error = '';

  ngOnInit() {
    if (!this.state.resetToken) {
      this.router.navigate(['/auth/forgot-password']);
    }
  }

  match(a: string, b: string) {
    return (fg: any) => {
      const av = fg.get(a)?.value;
      const bv = fg.get(b)?.value;
      return av === bv ? null : { mismatch: true };
    };
  }

  submit() {
    this.error = '';
    if (this.form.invalid) return;
    const token = this.state.resetToken!;
    const newPassword = this.form.value.newPassword!;
    this.loading = true;
    this.auth.resetPassword(token, newPassword).subscribe({
      next: () => {
        this.state.clear();
        // Điều hướng về login và chặn quay lại trang reset bằng replaceUrl
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? 'Không thể đổi mật khẩu';
        this.loading = false;
      }
    });
  }
}