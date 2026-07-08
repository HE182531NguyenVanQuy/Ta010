import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QuestionCatalogItem {
  questionId: string;
  examId?: string | null;
  examTitle?: string | null;
  questionNumber?: number | null;
  questionType: string;
  section?: string | null;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  points?: number | null;
  level?: string | null;
  year?: number | null;
  examType?: string | null;
  createdAt?: string | null;
}

export interface QuestionTypeFilter {
  id: string;
  label: string;
  count: number;
}

export interface QuestionGroup {
  type: string;
  count: number;
  sampleQuestions: QuestionCatalogItem[];
}

export interface PracticeQuestionsResponse {
  type: string;
  totalAvailable: number;
  questions: QuestionCatalogItem[];
}

export interface QuestionCatalogResponse {
  questions: QuestionCatalogItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  typeFilters: QuestionTypeFilter[];
}

interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuestionCatalogService {
  private http = inject(HttpClient);
  private apiUrl: string;

  constructor() {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}/Questions` : '/api/Questions';
  }

  getQuestions(params: {
    search?: string;
    type?: string;
    sortBy?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<QuestionCatalogResponse> {
    let httpParams = new HttpParams()
      .set('pageNumber', String(params.pageNumber ?? 1))
      .set('pageSize', String(params.pageSize ?? 12))
      .set('sortBy', params.sortBy ?? 'newest');

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    if (params.type && params.type !== 'all') {
      httpParams = httpParams.set('type', params.type);
    }

    return this.http
      .get<ApiResponse<QuestionCatalogResponse> | QuestionCatalogResponse>(this.apiUrl, { params: httpParams })
      .pipe(map((response) => ('data' in response && response.data ? response.data : response as QuestionCatalogResponse)));
  }

  getQuestionGroups(sampleSize = 3): Observable<QuestionGroup[]> {
    const params = new HttpParams().set('sampleSize', String(sampleSize));

    return this.http
      .get<ApiResponse<QuestionGroup[]> | QuestionGroup[]>(`${this.apiUrl}/groups`, { params })
      .pipe(map((response) => ('data' in response && response.data ? response.data : response as QuestionGroup[])));
  }

  getPracticeQuestions(type: string, take = 10): Observable<PracticeQuestionsResponse> {
    const params = new HttpParams()
      .set('type', type)
      .set('take', String(take));

    return this.http
      .get<ApiResponse<PracticeQuestionsResponse> | PracticeQuestionsResponse>(`${this.apiUrl}/practice`, { params })
      .pipe(map((response) => ('data' in response && response.data ? response.data : response as PracticeQuestionsResponse)));
  }
}
