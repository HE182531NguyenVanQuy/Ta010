import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { Exam, ExamService } from '../../../services/exam.service';

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
  imports: [RouterLink, NgClass],
  templateUrl: './exam.component.html',
  styleUrl: './exam.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamComponent implements OnInit {
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

  private catalogExams: Exam[] = [];

  constructor(
    private examService: ExamService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      this.loading = false;
      return;
    }

    this.loadExams();
  }

  async loadExams(): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';
      this.currentPage = 1;

      const firstPage = await this.examService.getExams(1, this.pageSize);
      const firstData = firstPage.data ?? {};
      const firstExams: Exam[] = firstData.exams ?? [];
      const totalFromApi = firstData.totalCount ?? firstExams.length;

      if (totalFromApi <= firstExams.length) {
        this.catalogExams = firstExams;
      } else {
        const allPage = await this.examService.getExams(1, totalFromApi);
        this.catalogExams = allPage.data?.exams ?? firstExams;
      }

      this.catalogTotalCount = this.catalogExams.length;
      this.buildFiltersFromCatalog(this.catalogExams);
      this.buildSortOptions(this.catalogExams);
      this.applyFiltersAndPaginate();
    } catch (error) {
      console.error('Error loading exams:', error);
      this.errorMessage = 'Không tải được danh sách đề thi.';
      this.catalogExams = [];
      this.catalogTotalCount = 0;
      this.examCardsMain = [];
      this.totalCount = 0;
      this.totalPages = 1;
      this.lastPage = 1;
      this.pages = [1];
      this.resetFilters();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private buildFiltersFromCatalog(exams: Exam[]): void {
    const typeCounts = new Map<string, { label: string; count: number }>();
    const yearCounts = new Map<string, number>();
    const levelCounts = new Map<string, { label: string; count: number }>();

    for (const exam of exams) {
      const examType = exam.examType?.trim();
      if (examType) {
        const id = this.normalizeExamType(examType);
        const existing = typeCounts.get(id);
        typeCounts.set(id, {
          label: this.getExamTypeLabel(id, examType),
          count: (existing?.count ?? 0) + 1,
        });
      }

      if (exam.year != null) {
        const id = String(exam.year);
        yearCounts.set(id, (yearCounts.get(id) ?? 0) + 1);
      }

      const level = exam.level?.trim();
      if (level) {
        const id = this.normalizeLevel(level);
        const existing = levelCounts.get(id);
        levelCounts.set(id, {
          label: this.getLevelLabel(id, level),
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    this.showTypeFilter = typeCounts.size > 0;
    this.showYearFilter = yearCounts.size > 0;
    this.showLevelFilter = levelCounts.size > 0;
    this.showSidebar = exams.length > 0;

    this.typeFilters = this.showTypeFilter
      ? [
          { id: 'all', label: 'Tất cả', count: exams.length },
          ...Array.from(typeCounts.entries()).map(([id, value]) => ({
            id,
            label: value.label,
            count: value.count,
          })),
        ]
      : [];

    this.tabs = this.typeFilters;

    this.yearChips = this.showYearFilter
      ? [
          { id: 'all', label: 'Tất cả', count: exams.length },
          ...Array.from(yearCounts.entries())
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([id, count]) => ({ id, label: id, count })),
        ]
      : [];

    this.difficultyFilters = this.showLevelFilter
      ? [
          { id: 'all', label: 'Tất cả', count: exams.length },
          ...Array.from(levelCounts.entries()).map(([id, value]) => ({
            id,
            label: value.label,
            count: value.count,
          })),
        ]
      : [];

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

  private resetFilters(): void {
    this.showSidebar = false;
    this.showTypeFilter = false;
    this.showYearFilter = false;
    this.showLevelFilter = false;
    this.tabs = [];
    this.typeFilters = [];
    this.yearChips = [];
    this.difficultyFilters = [];
    this.sortOptions = [];
    this.activeSort = 'title-asc';
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
    const covers = ['cover-blue', 'cover-sky', 'cover-teal', 'cover-indigo', 'cover-emerald', 'cover-violet'];

    return {
      examId: exam.examId,
      title: exam.title,
      description: exam.description || '',
      questionsCount: exam.questionsCount || 0,
      durationTime: exam.durationTime,
      viewsCount: exam.viewsCount?.toString() || '0',
      level: level || '—',
      levelClass: level ? this.getLevelClass(level) : 'diff-medium',
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
      easy: 'Dễ',
      medium: 'Trung bình',
      hard: 'Khó',
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
}
