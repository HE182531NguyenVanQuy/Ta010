import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ProfileResponse, UpdateProfileRequest } from '../../../models/auth.models';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);

  profile?: ProfileResponse;
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = signal<'general' | 'security'>('general');

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    location: [''],
    avatar: [''],
    currentPassword: [''],
    newPassword: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  setTab(tab: 'general' | 'security') {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.location.back();
  }

  loadProfile(): void {
    this.loading = true;
    this.authService.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.form.patchValue({
          fullName: p.fullName,
          phone: p.phone ?? '',
          location: p.location ?? '',
          avatar: p.avatar ?? ''
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = 'Không thể tải thông tin người dùng.';
        this.loading = false;
      }
    });
  }

  submit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.errorMessage = 'Vui lòng kiểm tra lại thông tin.';
      return;
    }

    const values = this.form.value;

    // If updating password, require currentPassword
    if (values.newPassword && !values.currentPassword) {
      this.errorMessage = 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.';
      return;
    }

    const payload: UpdateProfileRequest = {
      fullName: values.fullName || undefined,
      phone: values.phone || undefined,
      location: values.location || undefined,
      avatar: values.avatar || undefined,
      currentPassword: values.currentPassword || undefined,
      newPassword: values.newPassword || undefined
    };

    this.loading = true;
    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.successMessage = 'Cập nhật thông tin thành công.';
        this.profile = res;
        // clear password fields
        this.form.patchValue({ currentPassword: '', newPassword: '' });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) this.errorMessage = 'Mật khẩu hiện tại không chính xác.';
        else if (err.status === 409) this.errorMessage = err.error?.message ?? 'Số điện thoại đã tồn tại.';
        else this.errorMessage = err.error?.message ?? 'Cập nhật thất bại, vui lòng thử lại.';
        this.loading = false;
      }
    });
  }
}