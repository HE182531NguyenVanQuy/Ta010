import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DashboardAdminService } from '../../../services/dashboard-admin.service';
import { AdminReportDto } from '../../../models/dashboard-admin.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportAdminComponent implements OnInit {
  private dashboardService = inject(DashboardAdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  report: AdminReportDto | null = null;
  loading = false;
  error = '';
  fromDate = '';
  toDate = '';
  activeTab: 'exams' | 'packages' = 'exams';
  searchTerm = '';
  exporting = false;
  isSidebarCollapsed = false;
  sidebarMenuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard' },
    { label: 'Users', icon: 'group', route: 'users' },
    { label: 'Packages', icon: 'inventory_2', route: 'packages' },
    { label: 'Exams', icon: 'school', route: 'exams' },
  ];

  ngOnInit(): void {
    const routeTab = this.route.snapshot.data['reportTab'];
    if (routeTab === 'exams' || routeTab === 'packages') this.activeTab = routeTab;
    const now = new Date();
    this.fromDate = this.toDateInput(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    this.toDate = this.toDateInput(now);
    this.loadReport();
  }

  get pageTitle(): string {
    return this.activeTab === 'exams' ? 'Báo cáo Exam' : 'Báo cáo Package';
  }

  selectTab(tab: 'exams' | 'packages'): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.router.navigate([`/admin/${tab}`], { replaceUrl: true });
  }

  isMenuActive(route: string): boolean {
    return route === this.activeTab;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  async loadReport(): Promise<void> {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.error = 'Ngày bắt đầu không được sau ngày kết thúc.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const response = await this.dashboardService.getReportsAsync(this.fromDate, this.toDate);
      if (!response.success || !response.data) throw new Error(response.message || 'Không tải được báo cáo.');
      this.report = response.data;
    } catch (error: any) {
      this.error = error?.error?.message || error?.message || 'Không thể kết nối máy chủ.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  setPreset(months: number): void {
    const now = new Date();
    this.fromDate = this.toDateInput(new Date(now.getFullYear(), now.getMonth() - months + 1, 1));
    this.toDate = this.toDateInput(now);
    this.loadReport();
  }

  get filteredExams() {
    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    return (this.report?.exams || []).filter(item => !query || item.title.toLocaleLowerCase('vi').includes(query));
  }

  get filteredPackages() {
    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    return (this.report?.packages || []).filter(item => !query || item.name.toLocaleLowerCase('vi').includes(query));
  }

  get maxExamAttempts(): number {
    return Math.max(1, ...(this.report?.exams || []).map(item => item.attempts));
  }

  get maxPackageRevenue(): number {
    return Math.max(1, ...(this.report?.packages || []).map(item => item.revenue));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  }

  async exportExcel(): Promise<void> {
    if (!this.report || this.exporting) return;
    this.exporting = true;
    this.error = '';
    try {
      const blob = await this.dashboardService.exportReportExcelAsync(this.activeTab, this.fromDate, this.toDate);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bao-cao-${this.activeTab === 'exams' ? 'exam' : 'package'}-${this.fromDate}-${this.toDate}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      this.error = error?.error?.message || 'Không thể xuất file Excel. Vui lòng thử lại.';
    } finally {
      this.exporting = false;
      this.cdr.markForCheck();
    }
  }

  navigate(route: string): void {
    if (route === 'logout') {
      this.authService.logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login'])
      });
      return;
    }
    if (route === 'settings') return;
    if (route === 'exams' || route === 'packages') {
      this.activeTab = route;
      this.searchTerm = '';
    }
    this.router.navigate([route === 'dashboard' ? '/dashboard' : `/admin/${route}`]);
  }

  private toDateInput(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
