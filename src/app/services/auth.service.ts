import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RegisterRequest, LoginRequest, TokenResponse, CurrentUser, ProfileResponse, UpdateProfileRequest, VerifyOtpResponse } from '../models/auth.models';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl: string;
  private currentUser = new BehaviorSubject<CurrentUser | null>(null);
  private readonly accessTokenKey = 'tao10_access_token';
  private readonly refreshTokenKey = 'tao10_refresh_token';
  private readonly userKey = 'tao10_user';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Normalize environment.apiUrl and default to '/api' so endpoints match backend routes like '/api/Auth/...'
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Auth` : '/api/Auth';

    if (this.isBrowser) {
      const token = this.getAccessToken();
      const userJson = localStorage.getItem(this.userKey);
      if (token && userJson) {
        try {
          this.currentUser.next(JSON.parse(userJson));
        } catch {
          // fallback: try to parse from token
          const parsed = this.parseJwt(token);
          const user: CurrentUser = {
            userId: parsed?.sub ?? parsed?.nameid,
            email: parsed?.email,
            role: this.extractRoleFromPayload(parsed)
          };
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUser.next(user);
        }
      }
    }
  }

  register(payload: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (!res) return;
        const access = (res as any).accessToken ?? (res as any).AccessToken;
        const refresh = (res as any).refreshToken ?? (res as any).RefreshToken;
        if (access && refresh && this.isBrowser) {
          localStorage.setItem(this.accessTokenKey, access);
          localStorage.setItem(this.refreshTokenKey, refresh);

          // decode JWT payload to extract role/email/sub
          const payload = this.parseJwt(access);
          const user: CurrentUser = {
            userId: payload?.sub ?? payload?.nameid,
            email: payload?.email,
            role: this.extractRoleFromPayload(payload)
          };

          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUser.next(user);
        }
      })
    );
  }

  // helper to support async/await callers
  async loginAsync(credentials: LoginRequest): Promise<TokenResponse> {
    const obs = this.login(credentials);
    return await firstValueFrom(obs);
  }

  logout(): Observable<any> {
    const refresh = this.getRefreshToken();
    if (this.isBrowser) {
      this.clearTokens();
      this.currentUser.next(null);
    }
    if (!refresh) return of(null);
    return this.http.post(`${this.apiUrl}/revoke`, { refreshToken: refresh });
  }

  // Return null when no refresh token exists
  refreshToken(): Observable<TokenResponse | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) return of(null);
    return this.http.post<TokenResponse>(`${this.apiUrl}/refresh`, { refreshToken: refresh }).pipe(
      tap(res => {
        if (!res || !this.isBrowser) return;
        const access = (res as any).accessToken ?? (res as any).AccessToken;
        const refreshNew = (res as any).refreshToken ?? (res as any).RefreshToken;
        if (access && refreshNew) {
          localStorage.setItem(this.accessTokenKey, access);
          localStorage.setItem(this.refreshTokenKey, refreshNew);

          const payload = this.parseJwt(access);
          const user: CurrentUser = {
            userId: payload?.sub ?? payload?.nameid,
            email: payload?.email,
            role: this.extractRoleFromPayload(payload)
          };
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUser.next(user);
        }
      })
    );
  }

// forgotPassword
forgotPassword(email: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/forgot-password`, { email });
}

resendOtp(email: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/resend-otp`, { email });
}

verifyOtp(email: string, otp: string): Observable<VerifyOtpResponse> {
  return this.http.post<VerifyOtpResponse>(`${this.apiUrl}/verify-otp`, { email, otp });
}

resetPassword(resetToken: string, newPassword: string): Observable<any> {
  // backend expects resetToken, newPassword, confirmPassword
  return this.http.post(`${this.apiUrl}/reset-password`, {
    resetToken,
    newPassword,
    confirmPassword: newPassword
  });
}

 // ===== Profile API =====
 getProfile(): Observable<ProfileResponse> {
   return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`);
 }

 updateProfile(payload: UpdateProfileRequest): Observable<ProfileResponse> {
   return this.http.put<ProfileResponse>(`${this.apiUrl}/profile`, payload);
 }
 // ===== end profile =====

  getAccessToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.refreshTokenKey);
  }

  private clearTokens(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  getCurrentUser() {
    return this.currentUser.asObservable();
  }

  getCurrentUserSnapshot(): CurrentUser | null {
    return this.currentUser.getValue();
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  getUserRole(): string | undefined {
    return this.getCurrentUserSnapshot()?.role;
  }

  // Minimal, safe JWT payload parser (no external deps)
  private parseJwt(token: string | null | undefined): any | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      // replace url-safe chars and add padding if needed
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const decoded = atob(base64);
      try {
        return JSON.parse(decoded);
      } catch {
        // in case of URI-encoded contents
        const json = decodeURIComponent(decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(json);
      }
    } catch {
      return null;
    }
  }

  // Extract role from common JWT claim names including ClaimTypes.Role URI used by .NET
  private extractRoleFromPayload(payload: any): string | undefined {
    if (!payload) return undefined;

    // Common keys to check
    const candidateKeys = [
      'role',
      'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/roles',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'
    ];

    for (const key of candidateKeys) {
      if (payload[key] !== undefined && payload[key] !== null) {
        const val = payload[key];
        if (Array.isArray(val) && val.length) return String(val[0]);
        return String(val);
      }
    }

    return undefined;
  }
}