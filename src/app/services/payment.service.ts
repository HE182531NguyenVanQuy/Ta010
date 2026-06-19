import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface PackageResponse {
  packageId: string;
  name: string;
  description?: string;
  price: number;
  durationTime?: number;
  status: string;
  createdAt?: string;
}

export interface UserPackageResponse {
  userPackageId: string;
  packageId: string;
  packageName: string;
  startDate: string;
  endDate?: string;
  status: string;
  isActive: boolean;
}

export interface CheckoutResponse {
  paymentId: string;
  checkoutUrl: string;
  qrCodeUrl?: string;
  expectedAmount: number;
  message: string;
}

export interface PaymentResponse {
  paymentId: string;
  packageName: string;
  expectedAmount: number;
  receivedAmount?: number;
  paymentMethod: string;
  transactionCode?: string;
  status: string;
  paidAt?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl: string;

  constructor() {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}` : '/api';
  }

  getActivePackages(): Observable<PackageResponse[]> {
    return this.http.get<PackageResponse[]>(`${this.apiUrl}/Packages`);
  }

  getPackageExams(packageId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Packages/${packageId}/exams`);
  }

  getMyPackage(): Observable<UserPackageResponse> {
    return this.http.get<UserPackageResponse>(`${this.apiUrl}/Packages/my-package`);
  }

  activateFreeTrial(): Observable<UserPackageResponse> {
    return this.http.post<UserPackageResponse>(`${this.apiUrl}/Packages/activate-free-trial`, {});
  }

  checkout(packageId: string, paymentMethod: string): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/Payments/checkout`, {
      packageId,
      paymentMethod
    });
  }

  verifyReturn(orderCode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Payments/verify-return?orderCode=${orderCode}`);
  }

  getMyPaymentHistory(): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(`${this.apiUrl}/Payments/my-history`);
  }
}
