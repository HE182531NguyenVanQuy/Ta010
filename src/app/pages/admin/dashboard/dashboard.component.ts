import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

interface Transaction {
  id: string;
  user: string;
  initials: string;
  avatarBg: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
}

interface Engagement {
  course: string;
  percentage: number;
}

interface PackageStats {
  name: string;
  percentage: number;
  color: string;
  users: number;
  revenue: number;
}

interface RevenueData {
  month: string;
  height: number;
  value: number;
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
  // Admin info
  adminName = 'Alex Rivers';
  adminRole = 'Senior Administrator';
  adminAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3ODB76_D6Y2rNJMoPPsPWkr-ML3pnp_N_dU8DUguS20DQuZieF-KPFHhSk3QI0syswAT-PIZWYbAG6JT7L-ixjs4vFMQ5x73q0d_uGabFAIeYDuMagt8byPabmhVqO1983D1hn4GO-LEBo6Kh4ZCO0ZinlX8OEeAjblYZ1JlgKZD9mXR30ncSsEJavKAfBdvHOpCF1t2pkcIb4s1tA1S3m6NPWt_xXpQr-0cUqO8tz8OGvfzS9PEDGimmNHxjMn7MPTa4a1ECHw';

  // Sidebar
  isSidebarCollapsed = false;
  activeMenuItem = 'dashboard';

  // Mock Data
  stats = {
    totalCustomers: 1285,
    totalPackages: 285,
    monthlyRevenue: 84200,
    activeExams: 312,
    totalAttempts: 102400
  };

  recentTransactions: Transaction[] = [
    {
      id: 'TXN-882103',
      user: 'Nguyễn Văn An',
      initials: 'NA',
      avatarBg: 'bg-sky-100 text-sky-700',
      date: '24/10/2024',
      amount: '199.000VNĐ',
      status: 'completed'
    },
    {
      id: 'TXN-882104',
      user: 'Trần Thị Bình',
      initials: 'TB',
      avatarBg: 'bg-sky-100 text-sky-700',
      date: '24/10/2024',
      amount: '349.000VNĐ',
      status: 'pending'
    },
    {
      id: 'TXN-882105',
      user: 'Lê Văn Chiến',
      initials: 'LC',
      avatarBg: 'bg-indigo-100 text-indigo-700',
      date: '23/10/2024',
      amount: '89.000VNĐ',
      status: 'completed'
    },
    {
      id: 'TXN-882106',
      user: 'Phạm Thị Dung',
      initials: 'PD',
      avatarBg: 'bg-rose-100 text-rose-700',
      date: '23/10/2024',
      amount: '199.000VNĐ',
      status: 'failed'
    }
  ];

  courseEngagements: Engagement[] = [
    { course: 'Ngữ pháp', percentage: 82 },
    { course: 'Từ vựng', percentage: 94 },
    { course: 'Đọc hiểu', percentage: 65 },
    { course: 'Viết luận', percentage: 48 }
  ];

  // Package distribution data
  packageStats: PackageStats[] = [
    { 
      name: 'Gói Cơ Bản', 
      percentage: 45, 
      color: '#4db8ff',
      users: 6428,
      revenue: 642800000
    },
    { 
      name: 'Gói Nâng Cao', 
      percentage: 35, 
      color: '#2a8fd4',
      users: 5000,
      revenue: 750000000
    },
    { 
      name: 'Gói Cao Cấp', 
      percentage: 20, 
      color: '#1a6ba0',
      users: 2857,
      revenue: 571400000
    }
  ];

  // Revenue data cho 12 tháng
  revenueData: RevenueData[] = [
    { month: 'T1', height: 45, value: 45 },
    { month: 'T2', height: 52, value: 52 },
    { month: 'T3', height: 48, value: 48 },
    { month: 'T4', height: 61, value: 61 },
    { month: 'T5', height: 55, value: 55 },
    { month: 'T6', height: 67, value: 67 },
    { month: 'T7', height: 72, value: 72 },
    { month: 'T8', height: 58, value: 58 },
    { month: 'T9', height: 64, value: 64 },
    { month: 'T10', height: 70, value: 70 },
    { month: 'T11', height: 85, value: 85 },
    { month: 'T12', height: 100, value: 100 }
  ];

  revenueMonths = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  // Sidebar menu đầy đủ theo ảnh
  sidebarMenuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard', active: true },
    { label: 'Users', icon: 'group', route: 'users', active: false },
    { label: 'Packages', icon: 'inventory_2', route: 'packages', active: false },
    { label: 'Payments', icon: 'payments', route: 'payments', active: false },
    { label: 'Exams', icon: 'school', route: 'exams', active: false },
    { label: 'Grammar', icon: 'menu_book', route: 'grammar', active: false },
    { label: 'Vocabulary', icon: 'translate', route: 'vocabulary', active: false },
    { label: 'Forum', icon: 'forum', route: 'forum', active: false },
    { label: 'Blog', icon: 'article', route: 'blog', active: false },
    { label: 'Documents', icon: 'description', route: 'documents', active: false },
    { label: 'Schedules', icon: 'calendar_month', route: 'schedules', active: false },
    { label: 'Testimonials', icon: 'reviews', route: 'testimonials', active: false }
  ];

  // Settings và Logout riêng
  settingsItem = { label: 'Settings', icon: 'settings', route: 'settings' };
  logoutItem = { label: 'Logout', icon: 'logout', route: 'logout' };

  // Active tab cho revenue chart
  activeRevenueTab: 'weekly' | 'monthly' | 'yearly' = 'monthly';

  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {}

  goToProfile(): void {
    console.log('Dashboard goToProfile() invoked');
    this.router.navigateByUrl('/profile')
      .then((success) => {
        if (!success) {
          console.error('Navigation to /profile failed.');
        }
      })
      .catch((err) => {
        console.error('Router navigation error to /profile:', err);
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
    } else {
      // Giả sử các route admin khác nằm trong path 'admin/...'
      // Nếu không, bạn có thể chỉnh sửa path tùy theo App Routing của bạn
      this.router.navigate([`/admin/${route}`]);
    }
  }

  setRevenueTab(tab: 'weekly' | 'monthly' | 'yearly'): void {
    this.activeRevenueTab = tab;
    
    // Cập nhật dữ liệu dựa trên tab được chọn
    if (tab === 'weekly') {
      this.revenueData = [
        { month: 'T2', height: 35, value: 35 },
        { month: 'T3', height: 42, value: 42 },
        { month: 'T4', height: 38, value: 38 },
        { month: 'T5', height: 55, value: 55 },
        { month: 'T6', height: 48, value: 48 },
        { month: 'T7', height: 62, value: 62 },
        { month: 'CN', height: 70, value: 70 }
      ];
      this.revenueMonths = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    } else if (tab === 'monthly') {
      this.revenueData = [
        { month: 'T1', height: 45, value: 45 },
        { month: 'T2', height: 52, value: 52 },
        { month: 'T3', height: 48, value: 48 },
        { month: 'T4', height: 61, value: 61 },
        { month: 'T5', height: 55, value: 55 },
        { month: 'T6', height: 67, value: 67 },
        { month: 'T7', height: 72, value: 72 },
        { month: 'T8', height: 58, value: 58 },
        { month: 'T9', height: 64, value: 64 },
        { month: 'T10', height: 70, value: 70 },
        { month: 'T11', height: 85, value: 85 },
        { month: 'T12', height: 100, value: 100 }
      ];
      this.revenueMonths = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    } else {
      this.revenueData = [
        { month: '2020', height: 40, value: 40 },
        { month: '2021', height: 55, value: 55 },
        { month: '2022', height: 65, value: 65 },
        { month: '2023', height: 80, value: 80 },
        { month: '2024', height: 100, value: 100 }
      ];
      this.revenueMonths = ['2020', '2021', '2022', '2023', '2024'];
    }
  }

  getBarColor(index: number): string {
    const colors = [
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#006194'
    ];
    return colors[index] || '#e0f2fe';
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

  exportReport(): void {
    console.log('Exporting report...');
    alert('📊 Báo cáo đã được xuất thành công!');
  }

  logout(): void {
    console.log('Logging out...');
    alert('👋 Đăng xuất thành công!');
  }
}