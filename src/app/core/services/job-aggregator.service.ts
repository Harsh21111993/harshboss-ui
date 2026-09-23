import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface MatchedJob {
  source: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  postedAt: string;
  remote: boolean;
  salary?: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReason: string;
}

export interface PortalLink {
  key: string;
  name: string;
  searchUrl: string;
  applicationCount: number;
  bestFor: string;
  coverage: string;
}

export interface AggregatedJobsResponse {
  resume: {
    fullName: string;
    currentTitle: string;
    skills: string[];
    preferredRole: string;
    preferredLocation: string;
    yearsExperience: number;
  };
  matchedJobs: MatchedJob[];
  totalFound: number;
  totalAfterDedup: number;
  totalAfterSkillFilter: number;
  portalLinks: PortalLink[];
  trackedCount: number;
  searchKeywords: string;
}

@Injectable({ providedIn: "root" })
export class JobAggregatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/jobs-aggregator";

  search(maxResults = 10): Observable<AggregatedJobsResponse> {
    return this.http.post<AggregatedJobsResponse>(`${this.baseUrl}/search?maxResults=${maxResults}`, {});
  }

  getBookmarkletUrl(): string {
    return `${this.baseUrl}/bookmarklet`;
  }

  capture(body: Record<string, string>): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/capture`, body);
  }
}
