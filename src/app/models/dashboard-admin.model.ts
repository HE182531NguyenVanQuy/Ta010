export interface DashboardStatsDto {
  totalCustomers: number;
  totalPackages: number;
  totalRevenue: number;
  activeExams: number;
  totalAttempts: number;
}

export interface TransactionDto {
  id: string;
  user: string;
  initials: string;
  avatarBg: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface TransactionPagedResponse {
  items: TransactionDto[];
  totalCount: number;
}

export interface RevenueDataDto {
  month: string;
  value: number;
  height?: number; // Calculated on frontend
}

export interface PackageStatDto {
  name: string;
  percentage: number;
  color: string;
  users: number;
  price: number;
}
