import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface InterviewSession {
  sessionId: string;
  firstQuestion: string;
  techStack: string;
  status: string;
}

export interface SubmitAnswerResult {
  questionNumber: number;
  knowledgeScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  jevPassFail: string;
  jevConfidence: number;
  weaknessTopic: string;
  feedback: string;
  nextQuestion: string;
  interviewComplete: boolean;
}

export interface WeaknessItem {
  topic: string;
  incidentCount: number;
  avgScore: number;
  recommendation: string;
}

export interface InterviewHistoryItem {
  sessionId: string;
  startedAt: string;
  status: string;
  overallScore: number | null;
  totalQuestions: number;
  weaknessTags: string[];
}

@Injectable({ providedIn: "root" })
export class InterviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/interview";

  startInterview(resumeId: string): Observable<InterviewSession> {
    return this.http.post<InterviewSession>(`${this.baseUrl}/start?resumeId=${resumeId}`, {});
  }

  submitAnswer(sessionId: string, answerTranscript: string): Observable<SubmitAnswerResult> {
    return this.http.post<SubmitAnswerResult>(`${this.baseUrl}/answer`, { sessionId, answerTranscript });
  }

  getHistory(): Observable<InterviewHistoryItem[]> {
    return this.http.get<InterviewHistoryItem[]>(`${this.baseUrl}/history`);
  }

  getWeaknesses(): Observable<WeaknessItem[]> {
    return this.http.get<WeaknessItem[]>(`${this.baseUrl}/weaknesses`);
  }

  getSessionDetail(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${sessionId}`);
  }

  /** Generate interviewer voice (TTS) — returns an audio blob URL */
  generateSpeech(text: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/tts`, { text }, { responseType: "blob" });
  }

  /** Get Deepgram ephemeral token for browser-side STT */
  getDeepgramToken(): Observable<{ token: string; url: string; error?: string }> {
    return this.http.post<{ token: string; url: string; error?: string }>(`${this.baseUrl}/deepgram-token`, {});
  }
}
