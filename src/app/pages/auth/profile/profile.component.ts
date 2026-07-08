import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ProfileResponse, UpdateProfileRequest } from '../../../models/auth.models';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { AiRoadmapService, StudyRoadmap, StudyRoadmapWeek } from '../../../services/ai-roadmap.service';

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
  private aiRoadmapService = inject(AiRoadmapService);

  profile?: ProfileResponse;
  loading = false;
  roadmapLoading = false;
  successMessage = '';
  errorMessage = '';
  roadmapMessage = '';
  roadmapError = '';
  studyRoadmap: StudyRoadmap | null = null;
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
        this.loadRoadmap();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = 'Không thể tải thông tin người dùng.';
        this.loading = false;
      }
    });
  }

  private async loadRoadmap(): Promise<void> {
    try {
      this.studyRoadmap = await this.aiRoadmapService.getSavedRoadmap();
    } catch {
      this.studyRoadmap = null;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async addRoadmap(): Promise<void> {
    this.roadmapMessage = '';
    this.roadmapError = '';

    try {
      this.roadmapLoading = true;
      const roadmap = await this.aiRoadmapService.generateRoadmap();
      this.studyRoadmap = roadmap;
      this.roadmapMessage = 'Đã tạo lộ trình học cá nhân hóa từ attempt gần nhất.';
    } catch (err) {
      this.roadmapError = err instanceof Error
        ? err.message
        : 'Không tạo được lộ trình, vui lòng thử lại.';
    } finally {
      this.roadmapLoading = false;
      this.cdr.markForCheck();
    }
  }

  async updateRoadmap(): Promise<void> {
    if (!this.studyRoadmap) {
      await this.addRoadmap();
      return;
    }

    this.roadmapMessage = '';
    this.roadmapError = '';

    const previousAttemptKey = this.getRoadmapAttemptKey(this.studyRoadmap);

    try {
      this.roadmapLoading = true;
      const roadmap = await this.aiRoadmapService.generateRoadmap();

      if (previousAttemptKey && this.getRoadmapAttemptKey(roadmap) === previousAttemptKey) {
        this.roadmapError = 'Bạn cần làm bài ít nhất 1 lần sau khi có lộ trình cũ để cập nhật';
        return;
      }

      this.studyRoadmap = roadmap;
      this.roadmapMessage = 'Đã cập nhật lộ trình học từ attempt mới nhất.';
    } catch (err) {
      this.roadmapError = err instanceof Error
        ? err.message
        : 'Không cập nhật được lộ trình, vui lòng thử lại.';
    } finally {
      this.roadmapLoading = false;
      this.cdr.markForCheck();
    }
  }

  private getRoadmapAttemptKey(roadmap: StudyRoadmap): string | null {
    return roadmap.sourceAttemptId || roadmap.sourceSubmittedAt || null;
  }

  startWeekPractice(week: StudyRoadmapWeek, weekIndex: number): void {
    const type = week.practiceType || this.inferPracticeType(week);
    this.router.navigate(['/luyen-tap'], {
      queryParams: {
        type,
        week: weekIndex + 1
      }
    });
  }

  private inferPracticeType(week: StudyRoadmapWeek): string {
    const text = `${week.title} ${week.goal} ${(week.tasks || []).join(' ')}`.toLowerCase();

    if (text.includes('điền từ') || text.includes('dien tu')) return 'Đọc hiểu - điền từ';
    if (text.includes('phát âm') || text.includes('phat am')) return 'Phát âm';
    if (text.includes('trọng âm') || text.includes('trong am')) return 'Trọng âm';
    if (text.includes('tìm lỗi sai') || text.includes('tim loi sai')) return 'Tìm lỗi sai';
    if (text.includes('giao tiếp') || text.includes('giao tiep')) return 'Giao tiếp';
    if (text.includes('đồng nghĩa') || text.includes('dong nghia')) return 'Từ đồng nghĩa';
    if (text.includes('trái nghĩa') || text.includes('trai nghia')) return 'Từ trái nghĩa';
    if (text.includes('đọc hiểu') || text.includes('doc hieu')) return 'Đọc hiểu';
    if (text.includes('viết lại') || text.includes('viet lai')) return 'Viết lại câu (gần nghĩa)';

    return 'Chọn đáp án đúng';
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
