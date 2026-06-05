import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExamResponse {
  examId: string;
  title: string;
  description?: string;
  questionsCount?: number;
  durationTime: number;
  level?: string;
  year?: number;
  examType?: string;
  viewsCount?: number;
  attemptsCount?: number;
  status: string;
  isPremium: boolean;
  progressPercentage?: number;
  createdAt?: string;
}

export interface QuestionResponse {
  questionId: string;
  questionNumber: number;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  points?: number;
}

export interface StartAttemptResponse {
  userExamAttemptId: string;
  examTitle: string;
  durationTime: number;
  questions: QuestionResponse[];
}

export interface QuestionResultDto {
  questionId: string;
  questionNumber: number;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  explanation?: string;
  points?: number;
}

export interface SubmitAttemptResponse {
  userExamAttemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentMinutes: number;
  details: QuestionResultDto[];
}

export interface AttemptHistoryResponse {
  userExamAttemptId: string;
  examId: string;
  examTitle: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  timeSpentMinutes?: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private http = inject(HttpClient);
  private apiUrl: string;

  constructor() {
    const base = (environment.apiUrl ?? '').trim().replace(/\/+$/, '');
    this.apiUrl = base ? `${base}` : '/api';
  }

  getExams(
    level?: string, 
    year?: number, 
    examType?: string, 
    search?: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Observable<ExamResponse[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (level) params = params.set('level', level);
    if (year) params = params.set('year', year.toString());
    if (examType) params = params.set('examType', examType);
    if (search) params = params.set('search', search);

    return this.http.get<ExamResponse[]>(`${this.apiUrl}/Exams`, { params });
  }

  getExamById(id: string): Observable<ExamResponse> {
    return this.http.get<ExamResponse>(`${this.apiUrl}/Exams/${id}`);
  }

  getQuestionsForExam(examId: string): Observable<QuestionResponse[]> {
    return this.http.get<QuestionResponse[]>(`${this.apiUrl}/Questions/exam/${examId}`);
  }

  startAttempt(examId: string): Observable<StartAttemptResponse> {
    return this.http.post<StartAttemptResponse>(`${this.apiUrl}/Attempts/exam/${examId}/start`, {});
  }

  saveDraftAnswer(attemptId: string, questionId: string, userAnswer: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/Attempts/${attemptId}/answers`, {
      questionId,
      userAnswer
    });
  }

  submitAttempt(
    attemptId: string, 
    answers: { questionId: string, userAnswer: string }[]
  ): Observable<SubmitAttemptResponse> {
    return this.http.post<SubmitAttemptResponse>(`${this.apiUrl}/Attempts/${attemptId}/submit`, {
      answers
    });
  }

  getAttemptResult(attemptId: string): Observable<SubmitAttemptResponse> {
    return this.http.get<SubmitAttemptResponse>(`${this.apiUrl}/Attempts/${attemptId}/result`);
  }

  getMyHistory(): Observable<AttemptHistoryResponse[]> {
    return this.http.get<AttemptHistoryResponse[]>(`${this.apiUrl}/Attempts/my-history`);
  }
}
