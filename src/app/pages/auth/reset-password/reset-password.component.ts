import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
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
  private notification = inject(NotificationService);
  private router = inject(Router);

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+/)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.match('newPassword','confirmPassword') });

  loading = false;
  error = '';

  ngOnInit() {
    if (!this.state.resetToken) {
      this.router.navigate(['/forgot-password']);
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
        this.loading = false;
        this.state.clear();
        this.notification.show('Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới.', 'success');
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? 'Không thể đổi mật khẩu';
        this.loading = false;
      }
    });
  }
}