import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface LeaderboardItem {
  name: string;
  score: string;
  points: string;
  initial: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection: HubConnection | null = null;
  private isBrowser: boolean;

  private leaderboardSubject = new Subject<LeaderboardItem[]>();
  public leaderboard$: Observable<LeaderboardItem[]> = this.leaderboardSubject.asObservable();

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Automatically start connection if user is already logged in
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.startConnection();
      } else {
        this.stopConnection();
      }
    });
  }

  public startConnection(): void {
    if (!this.isBrowser || this.hubConnection) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    const hubUrl = base ? `${base}/hubs/notification` : '/hubs/notification';

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('SignalR Connection started.'))
      .catch((err: any) => console.error('Error while starting SignalR connection: ' + err));

    this.registerOnServerEvents();
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => {
          this.hubConnection = null;
          console.log('SignalR Connection stopped.');
        })
        .catch((err: any) => console.error('Error while stopping SignalR: ', err));
    }
  }

  private registerOnServerEvents(): void {
    if (!this.hubConnection) return;

    // Listen to personal notification pushes
    this.hubConnection.on('ReceiveNotification', (title: string, content: string) => {
      this.notificationService.show(`${title}: ${content}`, 'info', 8000);
    });

    // Listen to global test attempts completions ticker
    this.hubConnection.on('ReceiveAttemptUpdate', (username: string, examTitle: string, score: string) => {
      this.notificationService.show(
        `🏆 ${username} vừa hoàn thành '${examTitle}' đạt ${score} điểm!`,
        'success',
        6000
      );
    });

    // Listen to real-time leaderboard update pushes
    this.hubConnection.on('LeaderboardUpdated', (leaderboard: LeaderboardItem[]) => {
      this.leaderboardSubject.next(leaderboard);
    });
  }
}
