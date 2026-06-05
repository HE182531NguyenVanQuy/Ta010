import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, CommonModule } from '@angular/common';
import { ExamService, ExamResponse } from '../../../services/exam.service';
import { PaymentService, PackageResponse, UserPackageResponse, CheckoutResponse } from '../../../services/payment.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [RouterLink, NgClass, CommonModule],
  templateUrl: './exam.component.html',
  styleUrl: './exam.component.scss',
})
export class ExamComponent implements OnInit {
  private examService = inject(ExamService);
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // States
  hasActivePackage = false;
  activeUserPkg: UserPackageResponse | null = null;
  exams: ExamResponse[] = [];
  packages: PackageResponse[] = [];

  // Payment States
  selectedPackage: PackageResponse | null = null;
  isProcessingPayment = false;

  // Tabs & filters
  activeTab = 'all';
  activeYear = 'all';
  activeDifficulty = 'all';
  activeType = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  currentPage = 1;

  tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'thu', label: 'Đề thi thử' },
    { id: 'chinh-thuc', label: 'Đề chính thức' },
  ];

  yearChips = [
    { id: 'all', label: 'Tất cả' },
    { id: '2026', label: '2026' },
  ];

  typeFilters = [
    { id: 'all', label: '🗂️ Tất cả', count: '4' },
    { id: 'thu', label: '📝 Đề thi thử tổng hợp', count: '4' },
  ];

  difficultyFilters = [
    { id: 'all', label: 'Tất cả', count: '4' },
    { id: 'easy', label: '🟢 Dễ', count: '1' },
    { id: 'medium', label: '🟡 Trung bình', count: '1' },
    { id: 'hard', label: '🔴 Khó', count: '2' },
  ];

  pages = [1];
  lastPage = 1;

  ngOnInit(): void {
    this.checkSubscription();
  }

  checkSubscription(): void {
    if (!this.authService.isLoggedIn()) {
      this.hasActivePackage = false;
      this.loadAllPackages();
      this.loadAllExamsFallback();
      return;
    }

    this.paymentService.getMyPackage().subscribe({
      next: (res) => {
        this.activeUserPkg = res;
        this.hasActivePackage = res.isActive;

        if (res.isActive) {
          this.loadExams();
        } else {
          this.loadAllPackages();
          this.loadAllExamsFallback();
        }
      },
      error: () => {
        this.hasActivePackage = false;
        this.loadAllPackages();
        this.loadAllExamsFallback();
      }
    });
  }

  loadExams(): void {
    if (!this.activeUserPkg?.packageId) return;
    
    const diffMap: { [key: string]: string } = {
      'Dễ': 'easy',
      'Trung bình': 'medium',
      'Khó': 'hard'
    };

    this.paymentService.getPackageExams(this.activeUserPkg.packageId).subscribe({
      next: (res) => {
        const data = res.exams || [];
        this.exams = data;
        this.updateExamFiltersCount(data);
      },
      error: (err) => {
        console.error('Failed to load exams', err);
      }
    });
  }

  loadAllExamsFallback(): void {
    this.examService.getExams().subscribe({
      next: (data) => {
        this.exams = data;
        this.updateExamFiltersCount(data);
      },
      error: (err) => console.error('Failed to load exams fallback', err)
    });
  }

  updateExamFiltersCount(data: any[]): void {
    const diffMap: { [key: string]: string } = {
      'Dễ': 'easy',
      'Trung bình': 'medium',
      'Khó': 'hard'
    };
    this.typeFilters[0].count = data.length.toString();
    this.typeFilters[1].count = data.length.toString();
    this.difficultyFilters[0].count = data.length.toString();

    const easyCount = data.filter((e: any) => diffMap[e.level ?? ''] === 'easy').length;
    const medCount = data.filter((e: any) => diffMap[e.level ?? ''] === 'medium').length;
    const hardCount = data.filter((e: any) => diffMap[e.level ?? ''] === 'hard').length;

    this.difficultyFilters[1].count = easyCount.toString();
    this.difficultyFilters[2].count = medCount.toString();
    this.difficultyFilters[3].count = hardCount.toString();
  }

  onStartExam(exam: ExamResponse): void {
    if (!this.hasActivePackage) {
      this.notificationService.show('Bạn cần nâng cấp gói để mở khóa đề thi này!', 'error');
      // scroll up to pricing packages
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    this.router.navigate(['/test'], { queryParams: { examId: exam.examId } });
  }

  loadAllPackages(): void {
    this.paymentService.getActivePackages().subscribe({
      next: (data) => {
        // Enforce the Basic, Pro, Premium exact order and descriptions if not fully detailed in DB
        const pkgDetails: { [key: string]: { price: string, desc: string, items: string[] } } = {
          'Basic': { 
            price: '199.000đ', 
            desc: 'Phù hợp ôn luyện cơ bản với mục tiêu trung bình khá.',
            items: ['Mở khóa Đề thi số 1', 'Mở khóa Đề thi số 2', 'Giải thích chi tiết đáp án', 'Hạn sử dụng trong 30 ngày']
          },
          'Pro': { 
            price: '299.000đ', 
            desc: 'Lựa chọn hàng đầu cho học sinh đặt mục tiêu chuyên Anh.',
            items: ['Mở khóa Đề thi số 1', 'Mở khóa Đề thi số 2', 'Mở khóa Đề thi số 3', 'Phân tích kết quả làm bài nâng cao', 'Hạn sử dụng trong 30 ngày']
          },
          'Premium': { 
            price: '399.000đ', 
            desc: 'Mở khóa toàn diện mọi giới hạn học tập trên hệ thống.',
            items: ['Mở khóa Đề thi số 1', 'Mở khóa Đề thi số 2', 'Mở khóa Đề thi số 3', 'Mở khóa Đề thi số 4', 'Đặc quyền hỗ trợ từ Admin 24/7', 'Hạn sử dụng trong 30 ngày']
          }
        };

        this.packages = data.map(p => {
          const details = pkgDetails[p.name] ?? { price: p.price.toLocaleString() + 'đ', desc: p.description ?? '', items: [] };
          return {
            ...p,
            description: details.desc,
            // Attach a temporary field to hold description items
            items: details.items
          } as any;
        }).sort((a, b) => a.price - b.price);
      },
      error: (err) => {
        console.error('Failed to load packages', err);
      }
    });
  }

  onBuyPackage(pkg: PackageResponse): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/de-thi' } });
      return;
    }

    this.selectedPackage = pkg;
    this.isProcessingPayment = true;

    this.paymentService.checkout(pkg.packageId, 'banking').subscribe({
      next: (res) => {
        // Redirect directly to PayOS Checkout URL
        window.location.href = res.checkoutUrl;
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.notificationService.show('Không thể tạo giao dịch. Vui lòng thử lại!', 'error');
      }
    });
  }

  getDifficultyClass(level: string): string {
    if (level === 'Khó') return 'diff-hard';
    if (level === 'Dễ') return 'diff-easy';
    return 'diff-medium';
  }

  getRandomCoverClass(id: string): string {
    const covers = ['cover-blue', 'cover-sky', 'cover-teal', 'cover-indigo', 'cover-emerald', 'cover-violet'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % covers.length;
    return covers[index];
  }

  setTab(id: string): void {
    this.activeTab = id;
  }
  setYear(id: string): void {
    this.activeYear = id;
  }
  setDifficulty(id: string): void {
    this.activeDifficulty = id;
  }
  setType(id: string): void {
    this.activeType = id;
  }
  setView(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
  setPage(p: number): void {
    this.currentPage = p;
  }
}
