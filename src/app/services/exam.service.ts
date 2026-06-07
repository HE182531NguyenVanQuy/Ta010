import { Injectable } from '@angular/core';

const API_BASE = 'https://localhost:7103/api';

export interface Question {
  questionId: string;
  questionNumber: number;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
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

@Injectable({
  providedIn: 'root'
})
export class ExamService {

  async getExams(pageNumber = 1, pageSize = 10): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/exams?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`Failed to load exams: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching exams:', error);
      throw error;
    }
  }

  async getExamWithQuestions(examId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/exams/${examId}/with-questions`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`Failed to load exam: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching exam with questions:', error);
      throw error;
    }
  }

  async startExamAttempt(payload: { examId: string; userId?: string | null }): Promise<UserExamAttempt> {
    try {
      const response = await fetch(`${API_BASE}/user/exam-attempts/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Failed to start exam: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error starting exam attempt:', error);
      throw error;
    }
  }

  async submitAnswer(attemptId: string, payload: AnswerSubmission): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/user/exam-attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Failed to submit answer: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  async submitExam(attemptId: string, payload: any): Promise<UserExamAttempt> {
    try {
      const response = await fetch(`${API_BASE}/user/exam-attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Failed to submit exam: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error submitting exam:', error);
      throw error;
    }
  }

  async getAttemptDetails(attemptId: string): Promise<UserExamAttempt> {
    try {
      const response = await fetch(`${API_BASE}/user/exam-attempts/${attemptId}`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`Failed to load attempt: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching attempt details:', error);
      throw error;
    }
  }
}
