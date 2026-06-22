import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.prod';

const API_BASE = (environment.apiUrl ?? 'http://localhost:5185/api').replace(/\/+$/g, '');

export interface StudyRoadmapWeek {
  title: string;
  goal: string;
  tasks: string[];
}

export interface StudyRoadmap {
  userStudyRoadmapId?: string;
  createdAt: string;
  sourceAttemptId?: string | null;
  sourceSubmittedAt?: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  weeks: StudyRoadmapWeek[];
  dailyTime: string;
  nextAction: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiRoadmapService {
  async getSavedRoadmap(): Promise<StudyRoadmap | null> {
    const response = await fetch(`${API_BASE}/ai-roadmaps/me`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await this.readErrorMessage(response, 'Không tải được lộ trình học.'));

    const payload = await response.json() as ApiResponse<StudyRoadmap>;
    return payload.data ?? null;
  }

  async generateRoadmap(): Promise<StudyRoadmap> {
    const response = await fetch(`${API_BASE}/ai-roadmaps/me`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(await this.readErrorMessage(response, 'Không tạo được lộ trình, vui lòng thử lại.'));
    }

    const payload = await response.json() as ApiResponse<StudyRoadmap>;
    if (!payload.data) {
      throw new Error(payload.message || 'Không tạo được lộ trình, vui lòng thử lại.');
    }

    return payload.data;
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('tao10_access_token');
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const payload = await response.json() as ApiResponse<unknown>;
      return payload.message || fallback;
    } catch {
      return fallback;
    }
  }
}
