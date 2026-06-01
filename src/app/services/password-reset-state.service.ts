import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const KEY = 'tao10_password_reset_state_v1';

interface State {
  email?: string;
  otpExpiresAt?: number; // unix ms
  resetToken?: string;
}

@Injectable({ providedIn: 'root' })
export class PasswordResetStateService {
  private state$ = new BehaviorSubject<State>(this.load());

  private load(): State {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private save(s: State) {
    sessionStorage.setItem(KEY, JSON.stringify(s));
    this.state$.next(s);
  }

  setEmail(email: string) {
    const s = this.load();
    s.email = email;
    s.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes if not provided by backend
    s.resetToken = undefined;
    this.save(s);
  }

  setOtpExpiry(expiryMs: number) {
    const s = this.load();
    s.otpExpiresAt = expiryMs;
    this.save(s);
  }

  setResetToken(token: string) {
    const s = this.load();
    s.resetToken = token;
    this.save(s);
  }

  clear() {
    sessionStorage.removeItem(KEY);
    this.state$.next({});
  }

  get email() { return this.load().email; }
  get otpExpiresAt() { return this.load().otpExpiresAt; }
  get resetToken() { return this.load().resetToken; }
  get stateObservable() { return this.state$.asObservable(); }
}