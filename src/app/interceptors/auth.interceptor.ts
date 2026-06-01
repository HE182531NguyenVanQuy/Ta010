import { Injectable, Injector, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isBrowser: boolean;

  constructor(
    private injector: Injector,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't access localStorage on server
    if (!this.isBrowser) return next.handle(req);

    const url = req.url.toLowerCase();

    // Skip auth endpoints to avoid attaching token to login/register/refresh requests
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/resend-otp') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/revoke')
    ) {
      return next.handle(req);
    }

    // Lazy resolve AuthService to avoid circular DI if AuthService uses HttpClient
    const authService = this.injector.get(AuthService, null);

    // Prefer token from AuthService.getAccessToken(), fallback to localStorage
    const token = authService?.getAccessToken?.() ?? localStorage.getItem('tao10_access_token');

    if (!token) return next.handle(req);

    // If request already has Authorization header, leave it
    if (req.headers.has('Authorization')) return next.handle(req);

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next.handle(authReq);
  }
}