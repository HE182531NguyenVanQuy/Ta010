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
  userEmail?: string;
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

export interface ReportSummaryDto {
  totalExams: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  totalPackages: number;
  packagesSold: number;
  packageRevenue: number;
  activeSubscribers: number;
}

export interface ExamReportDto {
  examId: string;
  title: string;
  attempts: number;
  completedAttempts: number;
  uniqueStudents: number;
  averageScore: number;
  passRate: number;
}

export interface PackageReportDto {
  packageId: string;
  name: string;
  price: number;
  purchases: number;
  activeSubscribers: number;
  revenue: number;
  examCount: number;
}

export interface AdminReportDto {
  summary: ReportSummaryDto;
  exams: ExamReportDto[];
  packages: PackageReportDto[];
}
