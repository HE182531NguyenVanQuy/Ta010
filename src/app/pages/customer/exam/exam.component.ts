import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { NgClass, CommonModule } from '@angular/common';
import { Subscription, firstValueFrom } from 'rxjs';
import { ExamService } from '../../../services/exam.service';
import { PaymentService, UserPackageResponse, PackageResponse } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

interface ExamCard {
  examId: string;
  title: string;
  description: string;
  questionsCount: number;
  durationTime: number;
  viewsCount: string;
  level: string;
  levelClass: string;
  action: string;
  cover: string;
  tag: string;
  tagClass: string;
}

interface Exam {
  examId: string;
  title: string;
  description?: string;
  questionsCount?: number;
  durationTime: number;
  level?: string;
  year?: number;
  examType?: string;
  viewsCount?: number;
  attemptsCount?: number;
  statusCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface SortOption {
  id: string;
  label: string;
}

type SortId =
  | 'newest'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'views-desc'
  | 'attempts-desc'
  | 'questions-desc'
  | 'questions-asc'
  | 'duration-desc'
  | 'duration-asc'
  | 'year-desc'
  | 'year-asc';

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [RouterLink, NgClass, CommonModule],
  templateUrl: './exam.component.html',
  styleUrl: './exam.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamComponent implements OnInit, OnDestroy {
  activeTab = 'all';
  activeYear = 'all';
  activeDifficulty = 'all';
  activeType = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  searchQuery = '';
  activeSort: SortId = 'title-asc';

  currentPage = 1;
  pageSize = 10;
  catalogTotalCount = 0;
  totalCount = 0;
  totalPages = 1;
  lastPage = 1;
  pages: number[] = [1];

  loading = true;
  errorMessage = '';
  examCardsMain: ExamCard[] = [];

  showSidebar = false;
  showTypeFilter = false;
  showYearFilter = false;
  showLevelFilter = false;

  tabs: FilterOption[] = [];
  yearChips: FilterOption[] = [];
  typeFilters: FilterOption[] = [];
  difficultyFilters: FilterOption[] = [];
  sortOptions: SortOption[] = [];

  // Subscription/Package logic
  hasActivePackage = false;
  activeUserPkg: UserPackageResponse | null = null;
  isProcessingPayment = false;
  selectedPackage: any = null;
  selectedExamPackage: PackageResponse | null = null;
  packagesList: PackageResponse[] = [];

  private catalogExams: Exam[] = [];
  private subscriptions = new Subscription();

  constructor(
    private examService: ExamService,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      this.loading = false;
      return;
    }

    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (params['payment'] === 'success' || (params['code'] === '00' && params['orderCode'])) {
          const orderCode = params['orderCode'];
          
          if (orderCode) {
            // Manually verify return for local testing bypassing webhook
            this.paymentService.verifyReturn(orderCode).subscribe({
              next: () => {
                this.notificationService.show('Thanh toán thành công! Gói học tập của bạn đang được kích hoạt.', 'success');
                this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { payment: null, code: null, id: null, cancel: null, status: null, orderCode: null },
                  queryParamsHandling: 'merge'
                });
                // Poll just in case, but it should be instantaneous now
                this.pollSubscription(3, 1000);
              },
              error: (err) => {
                console.error('Error verifying return:', err);
                this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { payment: null, code: null, id: null, cancel: null, status: null, orderCode: null },
                  queryParamsHandling: 'merge'
                });
                this.pollSubscription(6, 2000);
              }
            });
          } else {
            this.notificationService.show('Thanh toán thành công! Gói học tập của bạn đang được kích hoạt.', 'success');
            // Clean query params from URL
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { payment: null },
              queryParamsHandling: 'merge'
            });
            // Poll for update: 6 attempts × 2 seconds = 12 second max wait
            this.pollSubscription(6, 2000);
          }
        } else if (params['payment'] === 'cancel' || params['cancel'] === 'true') {
           this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { payment: null, code: null, id: null, cancel: null, status: null, orderCode: null },
              queryParamsHandling: 'merge'
            });
        }
      })
    );

    this.checkUserSubscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private checkUserSubscription(): void {
    if (!this.authService.isLoggedIn()) {
      this.hasActivePackage = false;
      this.activeUserPkg = null;
      this.loadPackages();
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const sub = this.paymentService.getMyPackage().subscribe({
      next: (userPackage) => {
        this.activeUserPkg = userPackage;
        this.hasActivePackage = userPackage?.isActive ?? false;
        this.loadPackages();
        if (this.hasActivePackage) {
          this.loadExams(userPackage.packageId);
        } else {
          this.loading = false;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error checking user subscription:', err);
        this.hasActivePackage = false;
        this.activeUserPkg = null;
        this.loadPackages();
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.add(sub);
  }

  private pollSubscription(retries: number, delayMs: number): void {
    if (!this.authService.isLoggedIn()) return;

    this.paymentService.getMyPackage().subscribe({
      next: (userPackage) => {
        this.activeUserPkg = userPackage;
        this.hasActivePackage = userPackage?.isActive ?? false;
        this.loadPackages();
        if (this.hasActivePackage) {
          this.loadExams(userPackage.packageId);
        } else if (retries > 0) {
          console.log(`Polling for subscription: ${6 - retries}/6 attempts...`);
          setTimeout(() => this.pollSubscription(retries - 1, delayMs), delayMs);
        } else {
          console.warn('Payment webhook may not have processed. Showing packages.');
          this.loadPackages();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error checking subscription:', err);
        if (retries > 0) {
          console.log(`Retry polling: ${6 - retries}/6 attempts...`);
          setTimeout(() => this.pollSubscription(retries - 1, delayMs), delayMs);
        } else {
          this.hasActivePackage = false;
          this.activeUserPkg = null;
          this.loadPackages();
          this.cdr.markForCheck();
        }
      }
    });
  }

  loadPackages(): void {
    const sub = this.paymentService.getActivePackages().subscribe({
      next: (response) => {
        this.packagesList = this.extractPackages(response).sort((a, b) => a.price - b.price);

        if (!this.selectedExamPackage) {
          this.selectedExamPackage =
            this.packagesList.find(pkg => pkg.packageId === this.activeUserPkg?.packageId)
            ?? this.packagesList[0]
            ?? null;
        }

        if (!this.hasActivePackage && this.selectedExamPackage) {
          this.loadExams(this.selectedExamPackage.packageId);
        } else if (!this.hasActivePackage && this.packagesList.length === 0) {
          this.loadExams();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading active packages:', err);
        if (!this.hasActivePackage) {
          this.loadExams();
        }
      }
    });
    this.subscriptions.add(sub);
  }

  async loadExams(packageId?: string): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';
      this.currentPage = 1;

      let exams: Exam[] = [];
      const selectedPackageId = packageId ?? this.selectedExamPackage?.packageId ?? this.activeUserPkg?.packageId;

      if (selectedPackageId) {
        try {
          const response = await firstValueFrom(this.paymentService.getPackageExams(selectedPackageId));

          // Handle both camelCase and PascalCase response formats
          exams = this.extractExams(response);
          this.selectedExamPackage =
            this.packagesList.find(pkg => pkg.packageId === selectedPackageId)
            ?? this.selectedExamPackage
            ?? null;

          if (!exams || exams.length === 0) {
            console.warn('Package returned no exams. Package ID:', selectedPackageId);
            this.errorMessage = 'Gói học tập của bạn chưa có đề thi. Vui lòng liên hệ hỗ trợ.';
          }
        } catch (packageError) {
          console.error('Error loading package exams:', packageError);
          const response = await this.examService.getExams(1, 500);
          exams = this.extractExams(response);

          if (!exams || exams.length === 0) {
            this.errorMessage = 'Không thể tải đề thi từ gói. Vui lòng thử lại.';
            throw packageError;
          }
        }
      } else {
        // Fallback: load all exams
        const response = await this.examService.getExams(1, 500);
        exams = this.extractExams(response);
      }

      this.catalogExams = exams;
      this.catalogTotalCount = this.catalogExams.length;
      this.buildFiltersFromCatalog(this.catalogExams);
      this.buildSortOptions(this.catalogExams);
      this.applyFiltersAndPaginate();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading exams:', error);
      if (!this.errorMessage) {
        this.errorMessage = 'Không tải được danh sách đề thi. Vui lòng thử lại.';
      }
      this.resetState();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private resetState(): void {
    this.catalogExams = [];
    this.catalogTotalCount = 0;
    this.examCardsMain = [];
    this.totalCount = 0;
    this.totalPages = 1;
    this.lastPage = 1;
    this.pages = [1];
    this.resetFilters();
  }

  private extractExams(response: any): Exam[] {
    const candidates = [
      response,
      response?.exams,
      response?.Exams,
      response?.items,
      response?.Items,
      response?.data?.exams,
      response?.data?.Exams,
      response?.data?.items,
      response?.data?.Items,
      response?.data,
    ];

    return candidates.find(Array.isArray) ?? [];
  }

  private extractPackages(response: any): PackageResponse[] {
    const candidates = [
      response,
      response?.packages,
      response?.Packages,
      response?.items,
      response?.Items,
      response?.data?.packages,
      response?.data?.Packages,
      response?.data?.items,
      response?.data?.Items,
      response?.data,
    ];

    return candidates.find(Array.isArray) ?? [];
  }

  private buildFiltersFromCatalog(exams: Exam[]): void {
    if (!exams || exams.length === 0) {
      this.resetFilterState();
      return;
    }

    const typeCounts = new Map<string, { label: string; count: number }>();
    const yearCounts = new Map<string, number>();
    const levelCounts = new Map<string, { label: string; count: number }>();

    // Build filter counts in single pass
    exams.forEach((exam) => {
      // Type filter
      const examType = exam.examType?.trim();
      if (examType) {
        const id = this.normalizeExamType(examType);
        const existing = typeCounts.get(id);
        typeCounts.set(id, {
          label: this.getExamTypeLabel(id, examType),
          count: (existing?.count ?? 0) + 1,
        });
      }

      // Year filter
      if (exam.year != null) {
        const id = String(exam.year);
        yearCounts.set(id, (yearCounts.get(id) ?? 0) + 1);
      }

      // Level filter
      const level = exam.level?.trim();
      if (level) {
        const id = this.normalizeLevel(level);
        const existing = levelCounts.get(id);
        levelCounts.set(id, {
          label: this.getLevelLabel(id, level),
          count: (existing?.count ?? 0) + 1,
        });
      }
    });

    // Set filter visibility
    this.showTypeFilter = typeCounts.size > 0;
    this.showYearFilter = yearCounts.size > 0;
    this.showLevelFilter = levelCounts.size > 0;
    this.showSidebar = exams.length > 0;

    // Build filter arrays
    this.typeFilters = this.buildFilterArray(typeCounts, exams.length);
    this.tabs = this.typeFilters;
    this.yearChips = this.buildYearArray(yearCounts, exams.length);
    this.difficultyFilters = this.buildFilterArray(levelCounts, exams.length);

    // Reset active filters if no data
    if (!this.showTypeFilter) {
      this.activeType = 'all';
      this.activeTab = 'all';
    }
    if (!this.showYearFilter) {
      this.activeYear = 'all';
    }
    if (!this.showLevelFilter) {
      this.activeDifficulty = 'all';
    }
  }

  private resetFilterState(): void {
    this.showSidebar = false;
    this.showTypeFilter = false;
    this.showYearFilter = false;
    this.showLevelFilter = false;
    this.typeFilters = [];
    this.tabs = [];
    this.yearChips = [];
    this.difficultyFilters = [];
  }

  private buildFilterArray(
    counts: Map<string, { label: string; count: number }>,
    total: number
  ): FilterOption[] {
    return [
      { id: 'all', label: 'Tất cả', count: total },
      ...Array.from(counts.entries()).map(([id, value]) => ({
        id,
        label: value.label,
        count: value.count,
      })),
    ];
  }

  private buildYearArray(yearCounts: Map<string, number>, total: number): FilterOption[] {
    return [
      { id: 'all', label: 'Tất cả', count: total },
      ...Array.from(yearCounts.entries())
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([id, count]) => ({ id, label: id, count })),
    ];
  }

  private resetFilters(): void {
    this.activeType = 'all';
    this.activeYear = 'all';
    this.activeDifficulty = 'all';
    this.activeSort = 'title-asc';
    this.searchQuery = '';
    this.currentPage = 1;
  }

  private buildSortOptions(exams: Exam[]): void {
    const hasCreatedAt = exams.some(exam => !!exam.createdAt);
    const hasViews = exams.some(exam => (exam.viewsCount ?? 0) > 0);
    const hasAttempts = exams.some(exam => (exam.attemptsCount ?? 0) > 0);
    const hasQuestions = exams.some(exam => (exam.questionsCount ?? 0) > 0);
    const hasYear = exams.some(exam => exam.year != null);

    const options: SortOption[] = [];

    if (hasCreatedAt) {
      options.push({ id: 'newest', label: 'Mới nhất' });
      options.push({ id: 'oldest', label: 'Cũ nhất' });
    }

    options.push(
      { id: 'title-asc', label: 'Tên A → Z' },
      { id: 'title-desc', label: 'Tên Z → A' },
    );

    if (hasViews) {
      options.push({ id: 'views-desc', label: 'Nhiều lượt xem nhất' });
    }

    if (hasAttempts) {
      options.push({ id: 'attempts-desc', label: 'Nhiều lượt làm nhất' });
    }

    if (hasQuestions) {
      options.push(
        { id: 'questions-desc', label: 'Nhiều câu nhất' },
        { id: 'questions-asc', label: 'Ít câu nhất' },
      );
    }

    if (exams.length > 0) {
      options.push(
        { id: 'duration-desc', label: 'Thời gian dài nhất' },
        { id: 'duration-asc', label: 'Thời gian ngắn nhất' },
      );
    }

    if (hasYear) {
      options.push(
        { id: 'year-desc', label: 'Năm mới nhất' },
        { id: 'year-asc', label: 'Năm cũ nhất' },
      );
    }

    this.sortOptions = options;
    const defaultSort = hasCreatedAt ? 'newest' : 'title-asc';
    this.activeSort = options.some(option => option.id === this.activeSort)
      ? this.activeSort
      : defaultSort;
  }

  private applyFiltersAndPaginate(): void {
    let filtered = [...this.catalogExams];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(exam => {
        const title = exam.title?.toLowerCase() ?? '';
        const description = exam.description?.toLowerCase() ?? '';
        return title.includes(query) || description.includes(query);
      });
    }

    if (this.showTypeFilter && this.activeType !== 'all') {
      filtered = filtered.filter(
        exam => exam.examType?.trim() && this.normalizeExamType(exam.examType) === this.activeType
      );
    }

    if (this.showYearFilter && this.activeYear !== 'all') {
      filtered = filtered.filter(exam => exam.year != null && String(exam.year) === this.activeYear);
    }

    if (this.showLevelFilter && this.activeDifficulty !== 'all') {
      filtered = filtered.filter(
        exam => exam.level?.trim() && this.normalizeLevel(exam.level) === this.activeDifficulty
      );
    }

    const sorted = this.sortExams(filtered);
    const newestExamId = this.getNewestExamId(sorted);

    this.totalCount = sorted.length;
    this.totalPages = Math.max(1, Math.ceil(sorted.length / this.pageSize));
    this.lastPage = this.totalPages;

    if (this.currentPage > this.lastPage) {
      this.currentPage = this.lastPage;
    }

    this.pages = Array.from({ length: Math.min(5, this.lastPage) }, (_v, index) => index + 1);

    const start = (this.currentPage - 1) * this.pageSize;
    this.examCardsMain = sorted
      .slice(start, start + this.pageSize)
      .map((exam, index) => this.toExamCard(exam, start + index, newestExamId));
  }

  private sortExams(exams: Exam[]): Exam[] {
    const sorted = [...exams];

    switch (this.activeSort) {
      case 'newest':
        return sorted.sort((a, b) => this.compareDateDesc(this.getSortDate(b), this.getSortDate(a)));
      case 'oldest':
        return sorted.sort((a, b) => this.compareDateDesc(this.getSortDate(a), this.getSortDate(b)));
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'vi', { sensitivity: 'base' }));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title, 'vi', { sensitivity: 'base' }));
      case 'views-desc':
        return sorted.sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
      case 'attempts-desc':
        return sorted.sort((a, b) => (b.attemptsCount ?? 0) - (a.attemptsCount ?? 0));
      case 'questions-desc':
        return sorted.sort((a, b) => (b.questionsCount ?? 0) - (a.questionsCount ?? 0));
      case 'questions-asc':
        return sorted.sort((a, b) => (a.questionsCount ?? 0) - (b.questionsCount ?? 0));
      case 'duration-desc':
        return sorted.sort((a, b) => b.durationTime - a.durationTime);
      case 'duration-asc':
        return sorted.sort((a, b) => a.durationTime - b.durationTime);
      case 'year-desc':
        return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      case 'year-asc':
        return sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
      default:
        return sorted;
    }
  }

  private getSortDate(exam: Exam): string | undefined {
    return exam.createdAt ?? exam.updatedAt;
  }

  private compareDateDesc(a?: string, b?: string): number {
    const timeA = a ? new Date(a).getTime() : 0;
    const timeB = b ? new Date(b).getTime() : 0;
    return timeA - timeB;
  }

  private getNewestExamId(exams: Exam[]): string | null {
    if (exams.length === 0) return null;

    const newest = [...exams].sort(
      (a, b) => this.compareDateDesc(this.getSortDate(b), this.getSortDate(a))
    )[0];

    return newest?.examId ?? null;
  }

  private toExamCard(exam: Exam, index: number, newestExamId: string | null): ExamCard {
    const level = exam.level?.trim() || '';
    const normalizedLevel = level ? this.normalizeLevel(level) : '';
    const covers = ['cover-blue', 'cover-sky', 'cover-teal', 'cover-indigo', 'cover-emerald', 'cover-violet'];

    return {
      examId: exam.examId,
      title: exam.title,
      description: exam.description || '',
      questionsCount: exam.questionsCount || 0,
      durationTime: exam.durationTime,
      viewsCount: exam.viewsCount?.toString() || '0',
      level: normalizedLevel ? this.getLevelLabel(normalizedLevel, level) : '-',
      levelClass: normalizedLevel ? this.getLevelClass(normalizedLevel) : 'diff-medium',
      action: 'Làm bài →',
      cover: covers[index % covers.length],
      tag: exam.examId === newestExamId ? 'Mới' : 'Đề thi',
      tagClass: exam.examId === newestExamId ? 'tag-new' : 'tag-free',
    };
  }

  private normalizeExamType(examType: string): string {
    const value = examType.trim().toLowerCase();

    if (value.includes('thu') || value.includes('practice') || value.includes('thử')) {
      return 'thu';
    }

    if (value.includes('chinh') || value.includes('official') || value.includes('chính')) {
      return 'chinh-thuc';
    }

    return value;
  }

  private getExamTypeLabel(id: string, raw: string): string {
    const labels: Record<string, string> = {
      thu: 'Đề thi thử',
      'chinh-thuc': 'Đề chính thức',
      practice: 'Đề thi thử',
      official: 'Đề chính thức',
    };

    return labels[id] ?? raw;
  }

  private normalizeLevel(level: string): string {
    const value = level.trim().toLowerCase();

    if (value.includes('easy') || value.includes('dễ') || value === 'de') {
      return 'easy';
    }

    if (value.includes('hard') || value.includes('khó') || value === 'kho') {
      return 'hard';
    }

    if (value.includes('medium') || value.includes('trung')) {
      return 'medium';
    }

    return value;
  }

  private getLevelLabel(id: string, raw: string): string {
    const labels: Record<string, string> = {
      easy: 'easy',
      medium: 'medium',
      hard: 'hard',
    };

    return labels[id] ?? raw;
  }

  private getLevelClass(level: string): string {
    const normalized = this.normalizeLevel(level);

    if (normalized === 'easy') return 'diff-easy';
    if (normalized === 'hard') return 'diff-hard';
    return 'diff-medium';
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setTab(id: string): void {
    this.activeTab = id;
    this.activeType = id;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setYear(id: string): void {
    this.activeYear = id;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setDifficulty(id: string): void {
    this.activeDifficulty = id;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setType(id: string): void {
    this.activeType = id;
    this.activeTab = id;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setView(mode: 'grid' | 'list'): void {
    if (this.viewMode === mode) return;

    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  onSortChange(event: Event): void {
    this.activeSort = (event.target as HTMLSelectElement).value as SortId;
    this.currentPage = 1;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.lastPage || page === this.currentPage) return;

    this.currentPage = page;
    this.applyFiltersAndPaginate();
    this.cdr.markForCheck();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim()
      || (this.showTypeFilter && this.activeType !== 'all')
      || (this.showYearFilter && this.activeYear !== 'all')
      || (this.showLevelFilter && this.activeDifficulty !== 'all');
  }

  get selectedExamPackageId(): string | null {
    return this.selectedExamPackage?.packageId ?? null;
  }

  get selectedExamPackageName(): string {
    return this.selectedExamPackage?.name ?? '';
  }

  onSelectPackage(pkg: PackageResponse): void {
    this.selectedExamPackage = pkg;
    this.resetFilters();
    this.loadExams(pkg.packageId);
  }

  handlePackagePurchase(pkg: any): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.onBuyPackage(pkg);
  }

  onBuyPackage(pkg: any): void {
    this.isProcessingPayment = true;
    this.selectedPackage = pkg;
    this.cdr.markForCheck();

    // If it's a free trial package
    if (pkg.price === 0 || pkg.name.toLowerCase().includes('dùng thử')) {
      this.paymentService.activateFreeTrial().subscribe({
        next: (response) => {
          this.notificationService.show('Kích hoạt gói thành công! Bắt đầu trải nghiệm ngay.', 'success');
          this.isProcessingPayment = false;
          this.selectedPackage = null;
          this.checkUserSubscription();
        },
        error: (err) => {
          console.error('Error activating free trial:', err);
          this.notificationService.show(err.error?.message || 'Bạn đã sử dụng gói dùng thử trước đó rồi.', 'error');
          this.isProcessingPayment = false;
          this.selectedPackage = null;
          this.cdr.markForCheck();
        }
      });
    } else {
      // Normal checkout (now returns UserPackage directly for instant access)
      this.paymentService.checkout(pkg.packageId, 'bank_transfer').subscribe({
        next: (response: any) => {
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
          } else if (response.userPackageId) {
            this.notificationService.show('Thanh toán thành công! Gói học tập của bạn đã được kích hoạt.', 'success');
            this.isProcessingPayment = false;
            this.selectedPackage = null;
            this.checkUserSubscription();
          } else {
            this.isProcessingPayment = false;
            this.selectedPackage = null;
            this.cdr.markForCheck();
            this.notificationService.show('Lỗi: Không nhận được thông tin gói hoặc link thanh toán.', 'error');
          }
        },
        error: (err) => {
          console.error('Error during checkout:', err);
          this.notificationService.show('Lỗi khi khởi tạo thanh toán. Vui lòng thử lại.', 'error');
          this.isProcessingPayment = false;
          this.selectedPackage = null;
          this.cdr.markForCheck();
        }
      });
    }
  }

  onStartExam(exam: ExamCard): void {
    if (!this.hasActivePackage) {
      alert('Vui lòng mua gói để truy cập đề thi.');
      return;
    }
    this.router.navigate(['/lam-bai'], { queryParams: { examId: exam.examId } });
  }

  getPackageFeatures(name: string): string[] {
    const defaultFeatures = ['Chấm điểm tự động', 'Xem đáp án giải thích'];
    if (name.includes('Dùng Thử')) {
      return ['1 bộ đề thi đầy đủ', 'Thời hạn 3 ngày', ...defaultFeatures];
    }
    if (name.includes('Cấp Tốc')) {
      return ['30 bộ đề thi chuẩn', 'Thời hạn 1 tháng', ...defaultFeatures, 'Hỗ trợ cơ bản'];
    }
    if (name.includes('Chuyên Sâu') || name.includes('ChuyÃªn SÃ¢u')) {
      return ['65 bộ đề thi chuẩn', 'Thời hạn 3 tháng', ...defaultFeatures, 'Bảng điều khiển cá nhân'];
    }
    if (name.includes('Nâng Cao') || name.includes('NÃ¢ng Cao')) {
      return ['150+ bộ đề thi chuẩn', 'Thời hạn 6 tháng', ...defaultFeatures, 'Phân tích kết quả chuyên sâu'];
    }
    if (name.includes('Premium')) {
      return ['Không giới hạn đề thi', 'Thời hạn 12 tháng', ...defaultFeatures, 'VIP support 24/7'];
    }
    return defaultFeatures;
  }
}
