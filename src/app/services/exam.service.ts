import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.prod';

const API_BASE = (environment.apiUrl ?? 'https://localhost:7103/api').replace(/\/+$/g, '');

// Mock data for development/fallback
const MOCK_EXAMS = [
  {
    examId: '1',
    title: 'De thi thu toan quoc 2026 - Dot 1',
    description: 'De thi thu chuan cau truc ky thi vao lop 10',
    questionsCount: 50,
    durationTime: 120,
    level: 'medium',
    year: 2026,
    examType: 'De thi thu',
    viewsCount: 2450,
    attemptsCount: 1200,
    createdAt: new Date().toISOString(),
  },
  {
    examId: '2',
    title: 'De chinh thuc Ha Noi 2024',
    description: 'De thi chinh thuc ky thi vao lop 10 cua Ha Noi',
    questionsCount: 50,
    durationTime: 120,
    level: 'hard',
    year: 2024,
    examType: 'De chinh thuc',
    viewsCount: 5230,
    attemptsCount: 3100,
    createdAt: new Date().toISOString(),
  },
  {
    examId: '3',
    title: 'On tap Unit 1-2 - Thi hien tai',
    description: 'Bai tap on tap chi tiet ve cac thi hien tai',
    questionsCount: 30,
    durationTime: 45,
    level: 'easy',
    year: 2026,
    examType: 'De thi thu',
    viewsCount: 1890,
    attemptsCount: 890,
    createdAt: new Date().toISOString(),
  },
  {
    examId: '4',
    title: 'De thi thu TP.HCM - Lan 2',
    description: 'De thi thu lan 2 cua TP.HCM nam 2026',
    questionsCount: 50,
    durationTime: 120,
    level: 'medium',
    year: 2026,
    examType: 'De thi thu',
    viewsCount: 3200,
    attemptsCount: 1650,
    createdAt: new Date().toISOString(),
  },
  {
    examId: '5',
    title: 'Luyen tap cau phuc',
    description: 'Bo bai tap luyen tap ve cau phuc',
    questionsCount: 40,
    durationTime: 60,
    level: 'medium',
    year: 2026,
    examType: 'De thi thu',
    viewsCount: 1560,
    attemptsCount: 720,
    createdAt: new Date().toISOString(),
  },
  {
    examId: '6',
    title: 'De chinh thuc TP.HCM 2024',
    description: 'De thi chinh thuc ky thi vao lop 10 cua TP.HCM',
    questionsCount: 50,
    durationTime: 120,
    level: 'hard',
    year: 2024,
    examType: 'De chinh thuc',
    viewsCount: 4560,
    attemptsCount: 2300,
    createdAt: new Date().toISOString(),
  }
];

// Environment detection
const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = !IS_BROWSER || (typeof ngDevMode !== 'undefined' && ngDevMode);

export interface Question {
  questionId: string;
  questionNumber: number | null;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  importOrder?: number;
  displayOrder?: number;
  sourceRow?: number;
}

export type ExamPackageCode = 'free' | '1Month' | '3Month' | '6Month' | '12Month';

export interface ExamImportPackage {
  code: ExamPackageCode;
  name: string;
}

export interface ExamImportResponse {
  importedCount?: number;
  packageCodes?: ExamPackageCode[];
  packageNames?: string[];
  message?: string;
  data?: unknown;
}

export interface Exam {
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
  statusCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserExamAttempt {
  userExamAttemptId: string;
  examId?: string;
  userId?: string;
  exam?: Exam;
  questions?: Question[];
  userAnswers?: UserAnswer[];
  startedAt?: string;
  completedAt?: string;
  score?: number;
  statusCode?: string;
}

export interface UserAnswer {
  userAnswerId: string;
  userExamAttemptId: string;
  questionId: string;
  userAnswer: string;
  isCorrect?: boolean;
  submittedAt?: string;
}

export interface AnswerSubmission {
  questionId: string;
  userAnswer: string;
}

export interface ExamSecurityEvent {
  index: number;
  leftAt: string;
  returnedAt?: string | null;
  durationSeconds: number;
}

export interface ExamSecurityReport {
  reason: string;
  altTabCount: number;
  threshold: number;
  totalAwaySeconds: number;
  autoSubmitted: boolean;
  studentEmail?: string | null;
  studentUserId?: string | null;
  clientTimeZone?: string;
  userAgent?: string;
  events: ExamSecurityEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private static readonly RETRY_ATTEMPTS = 2;
  private static readonly RETRY_DELAY = 1000;
  private static readonly PACKAGE_IMPORT_CHAIN: ExamImportPackage[] = [
    { code: 'free', name: 'Gói Dùng Thử' },
    { code: '1Month', name: 'Gói Cấp Tốc' },
    { code: '3Month', name: 'Gói Chuyên Sâu' },
    { code: '6Month', name: 'Gói Nâng Cao' },
    { code: '12Month', name: 'Gói Premium' },
  ];

  async getExams(pageNumber: number = 1, pageSize: number = 10): Promise<any> {
    try {
      // Try API first
      const response = await this.fetchWithRetry(
        `${API_BASE}/exams?pageNumber=${pageNumber}&pageSize=${pageSize}`,
        { method: 'GET' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to fetch exams from API, using mock data:', error);
      // Return mock data as fallback
      return this.getMockExams(pageNumber, pageSize);
    }
  }

  async getPackageExams(packageId: string): Promise<any> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/Packages/${packageId}/exams`,
        { method: 'GET' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to fetch package exams, using mock data:', error);
      return { exams: this.getMockExams(1, 100) };
    }
  }

  async getExamWithQuestions(examId: string): Promise<any> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/exams/${examId}/with-questions`,
        { method: 'GET' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to fetch exam with questions:', error);
      // Return mock exam with sample questions
      return this.getMockExamWithQuestions(examId);
    }
  }

  getImportPackagesFromCode(code: ExamPackageCode): ExamImportPackage[] {
    const startIndex = ExamService.PACKAGE_IMPORT_CHAIN.findIndex(pkg => pkg.code === code);
    if (startIndex < 0) {
      throw new Error(`Unsupported package code: ${code}`);
    }

    return ExamService.PACKAGE_IMPORT_CHAIN.slice(startIndex);
  }

  async importExamFileByPackageCode(file: File, code: ExamPackageCode): Promise<ExamImportResponse> {
    const packages = this.getImportPackagesFromCode(code);
    const formData = new FormData();

    formData.append('file', file);
    formData.append('code', code);
    formData.append('packageCode', code);
    formData.append('packageName', packages[0].name);
    formData.append('targetPackageCodes', JSON.stringify(packages.map(pkg => pkg.code)));
    formData.append('targetPackageNames', JSON.stringify(packages.map(pkg => pkg.name)));

    const response = await this.fetchWithRetry(
      `${API_BASE}/ExamImport/excel/by-package-code?code=${encodeURIComponent(code)}`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  }

  async startExamAttempt(payload: { examId: string; userId?: string | null }): Promise<UserExamAttempt> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/user/exam-attempts/start`,
        {
          method: 'POST',
          headers: this.getJsonHeaders(),
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to start exam attempt:', error);
      throw new Error('Unable to start exam. Please check your connection.');
    }
  }

  async submitAnswer(attemptId: string, payload: AnswerSubmission): Promise<any> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/user/exam-attempts/${attemptId}/answer`,
        {
          method: 'POST',
          headers: this.getJsonHeaders(),
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to submit answer:', error);
      throw new Error('Unable to submit answer. Please try again.');
    }
  }

  async submitExam(attemptId: string, payload: any): Promise<UserExamAttempt> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/user/exam-attempts/${attemptId}/submit`,
        {
          method: 'POST',
          headers: this.getJsonHeaders(),
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to submit exam:', error);
      throw new Error('Unable to submit exam. Please try again.');
    }
  }

  async getAttemptDetails(attemptId: string): Promise<UserExamAttempt> {
    try {
      const response = await this.fetchWithRetry(
        `${API_BASE}/user/exam-attempts/${attemptId}`,
        { method: 'GET' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.warn('Failed to fetch attempt details:', error);
      throw new Error('Unable to load attempt details.');
    }
  }

  // Private helper methods
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= ExamService.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await this.fetchWithCertificateWorkaround(url, options);
        return response;
      } catch (error) {
        lastError = error as Error;

        if (attempt < ExamService.RETRY_ATTEMPTS) {
          // Exponential backoff
          const delay = ExamService.RETRY_DELAY * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Network request failed after retries');
  }

  private async fetchWithCertificateWorkaround(url: string, options: RequestInit): Promise<Response> {
    // For Node.js environment (SSR), bypass certificate validation
    if (!IS_BROWSER && typeof global !== 'undefined' && (global as any).https) {
      const nodeOptions: any = { ...options };
      const https = (global as any).https;

      // Create custom agent that ignores certificate errors
      nodeOptions.agent = new https.Agent({
        rejectUnauthorized: false
      });

      return fetch(url, nodeOptions);
    }

    return fetch(url, options);
  }

  private getJsonHeaders(): HeadersInit {
    return { ...this.getAuthHeaders(), 'Content-Type': 'application/json' };
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {};
    const token = this.getAccessToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getAccessToken(): string | null {
    if (!IS_BROWSER) return null;
    return localStorage.getItem('tao10_access_token');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockExams(pageNumber: number = 1, pageSize: number = 10): any[] {
    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize;
    return MOCK_EXAMS.slice(start, end);
  }

  private getMockExamWithQuestions(examId: string): any {
    const exam = MOCK_EXAMS.find(e => e.examId === examId);
    if (!exam) {
      throw new Error(`Exam ${examId} not found`);
    }

    return {
      ...exam,
      questions: this.generateMockQuestions(exam.questionsCount || 50)
    };
  }

  private generateMockQuestions(count: number): Question[] {
    const questions: Question[] = [];
    const sampleQuestions = [
      {
        text: 'Which of the following is correct?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 'B',
        explanation: 'This is the correct answer because...'
      },
      {
        text: 'Choose the best answer:',
        options: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4'],
        correct: 'C',
        explanation: 'The explanation goes here.'
      },
      {
        text: 'What is the meaning of...?',
        options: ['Meaning 1', 'Meaning 2', 'Meaning 3', 'Meaning 4'],
        correct: 'A',
        explanation: 'Based on the context, this meaning is correct.'
      }
    ];

    for (let i = 0; i < count; i++) {
      const sample = sampleQuestions[i % sampleQuestions.length];
      questions.push({
        questionId: `q${i + 1}`,
        questionNumber: i + 1,
        questionText: `${i + 1}. ${sample.text}`,
        optionA: sample.options[0],
        optionB: sample.options[1],
        optionC: sample.options[2],
        optionD: sample.options[3],
        correctAnswer: sample.correct,
        explanation: sample.explanation
      });
    }

    return questions;
  }
}