import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { ApiResponse } from '../models/user-admin.model';
import {
  DashboardStatsDto,
  TransactionPagedResponse,
  RevenueDataDto,
  PackageStatDto,
  AdminReportDto
} from '../models/dashboard-admin.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardAdminService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Dashboard` : '/api/Dashboard';
  }

  getGeneralStats(): Observable<ApiResponse<DashboardStatsDto>> {
    return this.http.get<ApiResponse<DashboardStatsDto>>(`${this.apiUrl}/stats`);
  }

  async getGeneralStatsAsync(): Promise<ApiResponse<DashboardStatsDto>> {
    return await firstValueFrom(this.getGeneralStats());
  }

  getRecentTransactions(page: number = 1, pageSize: number = 5): Observable<ApiResponse<TransactionPagedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<TransactionPagedResponse>>(`${this.apiUrl}/transactions`, { params });
  }

  async getRecentTransactionsAsync(page: number = 1, pageSize: number = 5): Promise<ApiResponse<TransactionPagedResponse>> {
    return await firstValueFrom(this.getRecentTransactions(page, pageSize));
  }

  getRevenueAnalytics(period: string = 'monthly'): Observable<ApiResponse<RevenueDataDto[]>> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ApiResponse<RevenueDataDto[]>>(`${this.apiUrl}/revenue`, { params });
  }

  async getRevenueAnalyticsAsync(period: string = 'monthly'): Promise<ApiResponse<RevenueDataDto[]>> {
    return await firstValueFrom(this.getRevenueAnalytics(period));
  }

  getPackageDistribution(): Observable<ApiResponse<PackageStatDto[]>> {
    return this.http.get<ApiResponse<PackageStatDto[]>>(`${this.apiUrl}/packages`);
  }

  async getPackageDistributionAsync(): Promise<ApiResponse<PackageStatDto[]>> {
    return await firstValueFrom(this.getPackageDistribution());
  }

  getReports(from?: string, to?: string): Observable<ApiResponse<AdminReportDto>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<AdminReportDto>>(`${this.apiUrl}/reports`, { params });
  }

  async getReportsAsync(from?: string, to?: string): Promise<ApiResponse<AdminReportDto>> {
    return await firstValueFrom(this.getReports(from, to));
  }

  exportReportExcel(type: 'exams' | 'packages', from?: string, to?: string): Observable<Blob> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get(`${this.apiUrl}/reports/${type}/export`, { params, responseType: 'blob' });
  }

  async exportReportExcelAsync(type: 'exams' | 'packages', from?: string, to?: string): Promise<Blob> {
    return await firstValueFrom(this.exportReportExcel(type, from, to));
  }

  async exportDashboardExcelAsync(): Promise<Blob> {
    return await firstValueFrom(this.http.get(`${this.apiUrl}/export`, { responseType: 'blob' }));
  }
}
