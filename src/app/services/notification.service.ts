import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationPayload {
  message: string;
  type: NotificationType;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notificationSubject = new BehaviorSubject<NotificationPayload | null>(null);
  public readonly notification$: Observable<NotificationPayload | null> = this.notificationSubject.asObservable();
  private timerId: number | undefined;

  show(message: string, type: NotificationType = 'success', durationMs = 5000): void {
    this.clear();
    this.notificationSubject.next({ message, type });
    this.timerId = window.setTimeout(() => this.clear(), durationMs);
  }

  clear(): void {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = undefined;
    }
    this.notificationSubject.next(null);
  }
}
