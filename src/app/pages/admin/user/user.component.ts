import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserAdminService } from '../../../services/user-admin.service';
import { UserDto, UserDetailDto } from '../../../models/user-admin.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserAdminComponent implements OnInit {
  private userAdminService = inject(UserAdminService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  protected Math = Math;

  // Admin info
  adminName = 'Alex Rivers';
  adminRole = 'Senior Administrator';
  adminAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3ODB76_D6Y2rNJMoPPsPWkr-ML3pnp_N_dU8DUguS20DQuZieF-KPFHhSk3QI0syswAT-PIZWYbAG6JT7L-ixjs4vFMQ5x73q0d_uGabFAIeYDuMagt8byPabmhVqO1983D1hn4GO-LEBo6Kh4ZCO0ZinlX8OEeAjblYZ1JlgKZD9mXR30ncSsEJavKAfBdvHOpCF1t2pkcIb4s1tA1S3m6NPWt_xXpQr-0cUqO8tz8OGvfzS9PEDGimmNHxjMn7MPTa4a1ECHw';

  // Sidebar
  isSidebarCollapsed = false;
  activeMenuItem = 'users';

  // Sidebar menu item structure
  sidebarMenuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard', active: false },
    { label: 'Users', icon: 'group', route: 'users', active: true },
    { label: 'Packages', icon: 'inventory_2', route: 'packages', active: false },
    { label: 'Payments', icon: 'payments', route: 'payments', active: false },
    { label: 'Exams', icon: 'school', route: 'exams', active: false },
  ];

  // User list states
  users: UserDto[] = [];
  totalCount = 0;
  pageNumber = 1;
  pageSize = 5;
  searchQuery = '';
  isLoading = false;

  // Detail view states
  selectedUser: UserDetailDto | null = null;
  isDetailModalOpen = false;
  isStatusUpdating = false;

  // Confirm modal states
  isConfirmModalOpen = false;
  confirmModalData: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: () => Promise<void> | void;
    type: 'danger' | 'warning' | 'info';
  } | null = null;

  // Search debounce timeout
  private searchTimeout: any;

  // Toast message states
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  ngOnInit(): void {
    // Load admin profile if available
    this.loadAdminProfile();
    this.loadUsers();
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
      error: (err) => console.error('Error loading profile in user-admin component', err)
    });
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const response = await this.userAdminService.getPagedUsersAsync(this.searchQuery, this.pageNumber, this.pageSize);
      if (response.success && response.data) {
        this.users = response.data.items || [];
        this.totalCount = response.data.totalCount || 0;
      } else {
        this.showToast(response.message || 'Lỗi khi tải danh sách người dùng', 'error');
      }
    } catch (err: any) {
      console.error('Error loading users', err);
      this.showToast(err.error?.message || 'Có lỗi xảy ra khi kết nối máy chủ', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  onSearch(): void {
    this.pageNumber = 1;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadUsers();
    }, 400); // 400ms debounce to optimize network performance
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageNumber = page;
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  get paginationRange(): number[] {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.pageNumber - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }

  async viewUserDetail(userId: string): Promise<void> {
    try {
      const response = await this.userAdminService.getUserByIdAsync(userId);
      if (response.success && response.data) {
        this.selectedUser = response.data;
        this.isDetailModalOpen = true;
        this.cdr.markForCheck();
      } else {
        this.showToast(response.message || 'Lỗi khi tải chi tiết người dùng', 'error');
      }
    } catch (err: any) {
      console.error('Error loading user detail', err);
      this.showToast(err.error?.message || 'Không thể lấy thông tin chi tiết người dùng', 'error');
    }
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedUser = null;
  }

  openConfirmModal(data: any): void {
    this.confirmModalData = data;
    this.isConfirmModalOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirmModal(): void {
    this.isConfirmModalOpen = false;
    this.confirmModalData = null;
    this.cdr.markForCheck();
  }

  async onConfirmModalConfirm(): Promise<void> {
    if (this.confirmModalData?.action) {
      await this.confirmModalData.action();
    }
    this.closeConfirmModal();
  }

  toggleUserStatus(user: UserDto | UserDetailDto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const currentStatus = user.statusCode;
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const confirmMessage = currentStatus === 'ACTIVE'
      ? `Bạn có chắc chắn muốn KHÓA tài khoản của người dùng "${user.fullName}"?`
      : `Bạn có chắc chắn muốn MỞ KHÓA tài khoản của người dùng "${user.fullName}"?`;

    this.openConfirmModal({
      title: newStatus === 'BLOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      message: confirmMessage,
      confirmText: newStatus === 'BLOCKED' ? 'Khóa tài khoản' : 'Mở khóa',
      cancelText: 'Hủy',
      type: newStatus === 'BLOCKED' ? 'danger' : 'warning',
      action: async () => {
        this.isStatusUpdating = true;
        this.cdr.markForCheck();

        try {
          const response = await this.userAdminService.updateUserStatusAsync(user.userId, newStatus);
          if (response.success) {
            user.statusCode = newStatus;
            user.statusDisplayName = newStatus === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa';
            if (this.selectedUser && this.selectedUser.userId === user.userId) {
              this.selectedUser.statusCode = newStatus;
              this.selectedUser.statusDisplayName = newStatus === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa';
            }
            this.showToast(
              newStatus === 'ACTIVE' ? 'Mở khóa tài khoản thành công!' : 'Khóa tài khoản thành công!',
              'success'
            );
            await this.loadUsers();
          } else {
            this.showToast(response.message || 'Không thể cập nhật trạng thái người dùng', 'error');
          }
        } catch (err: any) {
          console.error('Error updating user status', err);
          this.showToast(err.error?.message || 'Lỗi khi cập nhật trạng thái người dùng', 'error');
        } finally {
          this.isStatusUpdating = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  toggleUserRole(user: UserDetailDto): void {
    const currentRole = user.role;
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    const confirmMessage = `Bạn có chắc chắn muốn thay đổi quyền của người dùng "${user.fullName}" thành "${newRole === 'admin' ? 'Hệ thống Admin' : 'Khách hàng'}"?`;

    this.openConfirmModal({
      title: 'Thay đổi quyền',
      message: confirmMessage,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      type: 'warning',
      action: async () => {
        try {
          const response = await this.userAdminService.updateUserRoleAsync(user.userId, newRole);
          if (response.success) {
            user.role = newRole;
            this.showToast(`Cập nhật vai trò thành ${newRole === 'admin' ? 'Admin' : 'Khách hàng'} thành công!`, 'success');
            await this.loadUsers();
          } else {
            this.showToast(response.message || 'Không thể cập nhật vai trò người dùng', 'error');
          }
        } catch (err: any) {
          console.error('Error updating user role', err);
          this.showToast(err.error?.message || 'Lỗi khi cập nhật vai trò người dùng', 'error');
        }
      }
    });
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
    }, 4000);
  }

  // Navigation and layout
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  navigateTo(route: string): void {
    this.activeMenuItem = route;
    if (route === 'logout') {
      this.logout();
    } else if (route === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else if (route === 'profile') {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate([`/admin/${route}`]);
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout error', err);
        this.router.navigate(['/login']);
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getAvatarBg(name: string): string {
    const initials = this.getInitials(name);
    const code = initials.charCodeAt(0) % 5;
    const colors = [
      'bg-sky-100 text-sky-700',
      'bg-indigo-100 text-indigo-700',
      'bg-rose-100 text-rose-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700'
    ];
    return colors[code];
  }
}
