import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ForumCategoryResponse {
  forumCategoryId: string;
  name: string;
  description?: string;
  threadsCount?: number;
  repliesCount?: number;
  badge?: string;
  createdAt?: string;
}

export interface ForumThreadResponse {
  forumThreadId: string;
  title: string;
  content: string;
  excerpt?: string;
  isPinned: boolean;
  isHot: boolean;
  tags: string[];
  viewsCount: number;
  repliesCount: number;
  status: string;
  authorName: string;
  authorId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumReplyResponse {
  forumReplyId: string;
  forumThreadId: string;
  content: string;
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private http = inject(HttpClient);
  private apiUrl: string;

  constructor() {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Forum` : '/api/Forum';
  }

  getCategories(): Observable<ForumCategoryResponse[]> {
    return this.http.get<ForumCategoryResponse[]>(`${this.apiUrl}/categories`);
  }

  getCategoryThreads(
    categoryId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Observable<ForumThreadResponse[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
      
    return this.http.get<ForumThreadResponse[]>(`${this.apiUrl}/categories/${categoryId}/threads`, { params });
  }

  getThreadDetails(threadId: string): Observable<ForumThreadResponse> {
    return this.http.get<ForumThreadResponse>(`${this.apiUrl}/threads/${threadId}`);
  }

  createThread(
    forumCategoryId: string, 
    title: string, 
    content: string, 
    tags: string[] = []
  ): Observable<ForumThreadResponse> {
    return this.http.post<ForumThreadResponse>(`${this.apiUrl}/threads`, {
      forumCategoryId,
      title,
      content,
      tags
    });
  }

  getThreadReplies(
    threadId: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Observable<ForumReplyResponse[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ForumReplyResponse[]>(`${this.apiUrl}/threads/${threadId}/replies`, { params });
  }

  postReply(threadId: string, content: string): Observable<ForumReplyResponse> {
    return this.http.post<ForumReplyResponse>(`${this.apiUrl}/threads/${threadId}/replies`, {
      content
    });
  }
}
