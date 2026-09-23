import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Resume {
  id: string;
  fileName: string;
  fullName: string;
  email: string | null;
  currentTitle: string | null;
  yearsExperience: number | null;
  skills: string[];
  location: string | null;
  summary: string | null;
  preferredRole: string | null;
  preferredLocation: string | null;
  salaryExpectation: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  source: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  salary: string | null;
  remote: boolean;
  applyUrl: string;
}

export interface MatchedJob {
  job: Job;
  matchScore: number;
  matchReason: string;
  status: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  status: string;
  matchScore: number | null;
  matchReason: string | null;
  appliedAt: string | null;
  interviewDate: string | null;
  notes: string | null;
}

@Injectable({ providedIn: "root" })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/jobs";

  uploadResumeText(text: string, fileName: string): Observable<Resume> {
    return this.http.post<Resume>(`${this.baseUrl}/upload-resume-text`, { text, fileName });
  }

  getResumes(): Observable<Resume[]> {
    return this.http.get<Resume[]>(`${this.baseUrl}/resumes`);
  }

  searchJobs(resumeId: string, maxResults = 20): Observable<{ resume: Resume; totalFound: number; matchedJobs: MatchedJob[] }> {
    return this.http.post<any>(`${this.baseUrl}/search?resumeId=${resumeId}&maxResults=${maxResults}`, {});
  }

  getTrackedJobs(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(`${this.baseUrl}/tracked`);
  }

  updateStatus(applicationId: string, status: string): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.baseUrl}/applications/${applicationId}/status`, { status });
  }
}
