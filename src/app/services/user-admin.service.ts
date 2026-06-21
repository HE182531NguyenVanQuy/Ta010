import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, UserPagedResponse, UserDetailDto } from '../models/user-admin.model';

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Users` : '/api/Users';
  }

  getPagedUsers(search?: string, pageNumber: number = 1, pageSize: number = 5): Observable<ApiResponse<UserPagedResponse>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<UserPagedResponse>>(this.apiUrl, { params });
  }

  async getPagedUsersAsync(search?: string, pageNumber: number = 1, pageSize: number = 5): Promise<ApiResponse<UserPagedResponse>> {
    return await firstValueFrom(this.getPagedUsers(search, pageNumber, pageSize));
  }

  getUserById(id: string): Observable<ApiResponse<UserDetailDto>> {
    return this.http.get<ApiResponse<UserDetailDto>>(`${this.apiUrl}/${id}`);
  }

  async getUserByIdAsync(id: string): Promise<ApiResponse<UserDetailDto>> {
    return await firstValueFrom(this.getUserById(id));
  }

  updateUserStatus(id: string, statusCode: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}/status`, { statusCode });
  }

  async updateUserStatusAsync(id: string, statusCode: string): Promise<ApiResponse<boolean>> {
    return await firstValueFrom(this.updateUserStatus(id, statusCode));
  }

  updateUserRole(id: string, role: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}/role`, { role });
  }

  async updateUserRoleAsync(id: string, role: string): Promise<ApiResponse<boolean>> {
    return await firstValueFrom(this.updateUserRole(id, role));
  }
}
