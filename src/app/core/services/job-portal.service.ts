import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface JobPortal {
  key: string;
  name: string;
  baseUrl: string;
  loginUrl: string;
  profileUrl: string;
  searchUrl: string;
  bestFor: string;
  coverage: string;
  color: string;
  applicationCount: number;
}

export interface TrackedApplication {
  id: string;
  portal: string;
  jobTitle: string;
  company: string | null;
  jobUrl: string | null;
  location: string | null;
  salary: string | null;
  workMode: string | null;
  status: string;
  appliedAt: string | null;
  interviewDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalStats {
  total: number;
  byPortal: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface PortalRecommendation {
  portal: string;
  reason: string;
  action: string;
}

@Injectable({ providedIn: "root" })
export class JobPortalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/job-portals";

  getPortals(): Observable<JobPortal[]> {
    return this.http.get<JobPortal[]>(this.baseUrl);
  }

  trackApplication(body: Record<string, string>): Observable<TrackedApplication> {
    return this.http.post<TrackedApplication>(`${this.baseUrl}/track`, body);
  }

  getTracked(): Observable<TrackedApplication[]> {
    return this.http.get<TrackedApplication[]>(`${this.baseUrl}/tracked`);
  }

  updateStatus(id: string, status: string): Observable<TrackedApplication> {
    return this.http.post<TrackedApplication>(`${this.baseUrl}/${id}/status`, { status });
  }

  deleteApplication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<PortalStats> {
    return this.http.get<PortalStats>(`${this.baseUrl}/stats`);
  }

  getRecommendations(): Observable<PortalRecommendation[]> {
    return this.http.get<PortalRecommendation[]>(`${this.baseUrl}/recommendations`);
  }
}
