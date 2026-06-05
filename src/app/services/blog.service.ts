import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BlogPost {
  blogPostId: string;
  title: string;
  content?: string;
  meta?: string;
  viewsCount?: number;
  statusId: string;
  createdAt?: string;
  publishedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private http = inject(HttpClient);
  private apiUrl: string;

  constructor() {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Blogs` : '/api/Blogs';
  }

  getBlogs(page: number = 1, pageSize: number = 10): Observable<BlogPost[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<BlogPost[]>(`${this.apiUrl}`, { params });
  }

  getBlogById(id: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.apiUrl}/${id}`);
  }
}
