import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  QuestionCatalogService,
  QuestionGroup,
} from '../../../services/question-catalog.service';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface SortOption {
  id: 'count-desc' | 'count-asc' | 'name-asc' | 'name-desc';
  label: string;
}

@Component({
  selector: 'app-tai-lieu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './document.component.html',
  styleUrls: ['./document.component.scss'],
})
export class DocumentComponent implements OnInit, OnDestroy {
  groups: QuestionGroup[] = [];
  loading = true;
  errorMessage = '';
  searchQuery = '';
  activeType = 'all';
  activeTab = 'all';
  activeSort: SortOption['id'] = 'count-desc';
  viewMode: 'grid' | 'list' = 'grid';

  sortOptions: SortOption[] = [
    { id: 'count-desc', label: 'Nhiều câu nhất' },
    { id: 'count-asc', label: 'Ít câu nhất' },
    { id: 'name-asc', label: 'Tên A → Z' },
    { id: 'name-desc', label: 'Tên Z → A' },
  ];

  private subscription?: Subscription;

  constructor(
    private questionCatalogService: QuestionCatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadGroups(): void {
    this.loading = true;
    this.errorMessage = '';
    this.subscription?.unsubscribe();

    this.subscription = this.questionCatalogService.getQuestionGroups(4).subscribe({
      next: (groups) => {
        this.groups = groups ?? [];
        this.loading = false;
        this.ensureActiveTypeStillExists();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load question groups:', error);
        this.groups = [];
        this.errorMessage = 'Không tải được danh sách nhóm câu hỏi từ hệ thống. Vui lòng thử lại.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get totalQuestions(): number {
    return this.groups.reduce((total, group) => total + group.count, 0);
  }

  get filteredGroups(): QuestionGroup[] {
    let result = [...this.groups];
    const query = this.searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((group) => group.type.toLowerCase().includes(query));
    }

    if (this.activeType !== 'all') {
      result = result.filter((group) => group.type === this.activeType);
    }

    return this.sortGroups(result);
  }

  get filterOptions(): FilterOption[] {
    return [
      { id: 'all', label: 'Tất cả', count: this.groups.length },
      ...this.groups
        .map((group) => ({
          id: group.type,
          label: group.type,
          count: group.count,
        }))
        .sort((left, right) => right.count - left.count),
    ];
  }

  get visibleQuestionCount(): number {
    return this.filteredGroups.reduce((total, group) => total + group.count, 0);
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() || this.activeType !== 'all';
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  setType(typeId: string): void {
    this.activeType = typeId;
    this.activeTab = typeId;
  }

  setTab(typeId: string): void {
    this.setType(typeId);
  }

  onSortChange(event: Event): void {
    this.activeSort = (event.target as HTMLSelectElement).value as SortOption['id'];
  }

  setView(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  getTypeIcon(type?: string | null): string {
    const value = (type ?? '').toLowerCase();
    if (value.includes('đọc') || value.includes('reading')) return '📖';
    if (value.includes('nghe') || value.includes('listening')) return '🎧';
    if (value.includes('viết') || value.includes('writing')) return '✍️';
    if (value.includes('ngữ pháp') || value.includes('grammar')) return '📚';
    if (value.includes('từ vựng') || value.includes('vocabulary')) return '🔤';
    if (value.includes('thi')) return '🧩';
    return '❓';
  }

  getCoverClass(index: number): string {
    const covers = ['cover-blue', 'cover-sky', 'cover-teal', 'cover-indigo', 'cover-emerald', 'cover-violet'];
    return covers[index % covers.length];
  }

  private sortGroups(groups: QuestionGroup[]): QuestionGroup[] {
    switch (this.activeSort) {
      case 'count-asc':
        return groups.sort((left, right) => left.count - right.count);
      case 'name-asc':
        return groups.sort((left, right) => left.type.localeCompare(right.type, 'vi', { sensitivity: 'base' }));
      case 'name-desc':
        return groups.sort((left, right) => right.type.localeCompare(left.type, 'vi', { sensitivity: 'base' }));
      case 'count-desc':
      default:
        return groups.sort((left, right) => right.count - left.count);
    }
  }

  private ensureActiveTypeStillExists(): void {
    if (this.activeType === 'all') return;

    if (!this.groups.some((group) => group.type === this.activeType)) {
      this.activeType = 'all';
      this.activeTab = 'all';
    }
  }
}
