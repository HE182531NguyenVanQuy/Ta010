import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { DashboardAdminService } from '../../../services/dashboard-admin.service';
import { AuthService } from '../../../services/auth.service';
import {
  TransactionDto,
  DashboardStatsDto,
  PackageStatDto,
  RevenueDataDto
} from '../../../models/dashboard-admin.model';

interface Engagement {
  course: string;
  percentage: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardAdminService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  protected Math = Math;

  // Admin info
  adminName = 'Administrator';
  adminRole = 'Quản trị viên';
  adminAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3ODB76_D6Y2rNJMoPPsPWkr-ML3pnp_N_dU8DUguS20DQuZieF-KPFHhSk3QI0syswAT-PIZWYbAG6JT7L-ixjs4vFMQ5x73q0d_uGabFAIeYDuMagt8byPabmhVqO1983D1hn4GO-LEBo6Kh4ZCO0ZinlX8OEeAjblYZ1JlgKZD9mXR30ncSsEJavKAfBdvHOpCF1t2pkcIb4s1tA1S3m6NPWt_xXpQr-0cUqO8tz8OGvfzS9PEDGimmNHxjMn7MPTa4a1ECHw';

  // Sidebar
  isSidebarCollapsed = false;
  activeMenuItem = 'dashboard';

  // Real Data states
  stats: DashboardStatsDto = {
    totalCustomers: 0,
    totalPackages: 0,
    totalRevenue: 0,
    activeExams: 0,
    totalAttempts: 0
  };

  recentTransactions: TransactionDto[] = [];
  transactionsTotalCount = 0;
  transactionPageNumber = 1;
  transactionPageSize = 5;
  isTransactionsLoading = false;

  packageStats: PackageStatDto[] = [];
  revenueData: RevenueDataDto[] = [];
  activeRevenueTab: 'weekly' | 'monthly' | 'yearly' = 'monthly';
  revenueChart: any;
  isExporting = false;

  // Still keeping mock for engagements as it's not in the scope of backend requirements
  courseEngagements: Engagement[] = [
    { course: 'Ngữ pháp', percentage: 82 },
    { course: 'Từ vựng', percentage: 94 },
    { course: 'Đọc hiểu', percentage: 65 },
    { course: 'Viết luận', percentage: 48 }
  ];

  // Sidebar menu
  sidebarMenuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard', active: true },
    { label: 'Users', icon: 'group', route: 'users', active: false },
    { label: 'Packages', icon: 'inventory_2', route: 'packages', active: false },
    { label: 'Exams', icon: 'school', route: 'exams', active: false },
  ];

  ngOnInit(): void {
    this.loadAdminProfile();
    this.loadDashboardData();
  }

  loadAdminProfile(): void {
    const userSnapshot = this.authService.getCurrentUserSnapshot();
    if (userSnapshot) {
      this.adminName = userSnapshot.email?.split('@')[0] || 'Administrator';
      this.adminRole = userSnapshot.role === 'admin' ? 'Hệ thống Admin' : 'Quản trị viên';
    }
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.adminName = profile.fullName || this.adminName;
          if (profile.avatar) {
            this.adminAvatar = profile.avatar;
          }
          this.cdr.markForCheck();
        }
      },
      error: (err) => console.error('Error loading admin profile in dashboard', err)
    });
  }

  async loadDashboardData(): Promise<void> {
    try {
      const statsRes = await this.dashboardService.getGeneralStatsAsync();
      if (statsRes.success && statsRes.data) {
        this.stats = statsRes.data;
      }

      await this.loadTransactions();

      const pkgsRes = await this.dashboardService.getPackageDistributionAsync();
      if (pkgsRes.success && pkgsRes.data) {
        this.packageStats = pkgsRes.data;
      }

      await this.loadRevenueData(this.activeRevenueTab);
    } catch (error) {
      console.error('Error loading dashboard data', error);
    }
    this.cdr.markForCheck();
  }

  async loadTransactions(): Promise<void> {
    this.isTransactionsLoading = true;
    this.cdr.markForCheck();
    try {
      const transRes = await this.dashboardService.getRecentTransactionsAsync(this.transactionPageNumber, this.transactionPageSize);
      if (transRes.success && transRes.data) {
        this.recentTransactions = transRes.data.items || [];
        this.transactionsTotalCount = transRes.data.totalCount || 0;
      }
    } catch (err) {
      console.error('Error loading transactions', err);
    } finally {
      this.isTransactionsLoading = false;
      this.cdr.markForCheck();
    }
  }

  async setRevenueTab(tab: 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    this.activeRevenueTab = tab;
    await this.loadRevenueData(tab);
  }

  async loadRevenueData(tab: 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    try {
      const res = await this.dashboardService.getRevenueAnalyticsAsync(tab);
      if (res.success && res.data) {
        this.revenueData = res.data;
        const labels = this.revenueData.map(d => d.month);
        const dataValues = this.revenueData.map(d => d.value);
        this.updateChart(labels, dataValues);
      }
    } catch (err) {
      console.error('Error loading revenue analytics', err);
    }
    this.cdr.markForCheck();
  }

  updateChart(labels: string[], dataValues: number[]): void {
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 97, 148, 0.5)'); // var(--primary)
    gradient.addColorStop(1, 'rgba(0, 97, 148, 0.0)');

    this.revenueChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: dataValues,
          borderColor: '#006194', // var(--primary)
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#006194',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4 // Smooth curves
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, family: 'Inter' },
            bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              font: { family: 'Inter', size: 12 },
              color: '#64748b'
            }
          },
          y: {
            grid: {
              color: '#f1f5f9'
            },
            border: {
              display: false,
              dash: [5, 5]
            },
            ticks: {
              font: { family: 'Inter', size: 12 },
              color: '#64748b',
              padding: 10,
              callback: function (value: any) {
                if (value >= 1000000) {
                  return (value / 1000000) + 'M';
                }
                if (value >= 1000) {
                  return (value / 1000) + 'k';
                }
                return value;
              }
            },
            beginAtZero: true
          }
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      }
    });
  }

  // Pagination for transactions
  onTransactionPageChange(page: number): void {
    if (page < 1 || page > this.transactionTotalPages) return;
    this.transactionPageNumber = page;
    this.loadTransactions();
  }

  get transactionTotalPages(): number {
    return Math.ceil(this.transactionsTotalCount / this.transactionPageSize) || 1;
  }

  get transactionPaginationRange(): number[] {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.transactionPageNumber - 2);
    let end = Math.min(this.transactionTotalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }

  // Helpers
  getBarColor(index: number): string {
    const colors = [
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#006194'
    ];
    return colors[index % colors.length] || '#e0f2fe';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'completed': 'bg-emerald-100 text-emerald-700',
      'pending': 'bg-amber-100 text-amber-700',
      'failed': 'bg-rose-100 text-rose-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'completed': 'Hoàn thành',
      'pending': 'Đang chờ',
      'failed': 'Thất bại'
    };
    return labels[status] || status;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount).replace('₫', 'VNĐ');
  }

  formatShortNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  viewAllHistory(): void {
    this.navigateTo('payments');
  }

  async exportReport(): Promise<void> {
    if (this.isExporting) return;
    this.isExporting = true;
    this.cdr.markForCheck();
    try {
      const blob = await this.dashboardService.exportDashboardExcelAsync();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bao-cao-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting dashboard report', error);
      alert('Không thể xuất báo cáo Excel. Vui lòng thử lại.');
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  navigateTo(route: string): void {
    this.activeMenuItem = route;
    this.sidebarMenuItems.forEach(item => {
      item.active = item.route === route;
    });

    if (route === 'logout') {
      this.logout();
    } else if (route === 'profile') {
      this.router.navigate(['/profile']);
    } else if (route === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate([`/admin/${route}`]);
    }
  }
}
