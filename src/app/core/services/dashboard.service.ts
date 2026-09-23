import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { DailyBriefResponse, StatsResponse } from "../models";

/**
 * DashboardService — wraps /api/dashboard endpoints.
 */
@Injectable({ providedIn: "root" })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/dashboard";

  private readonly _stats = signal<StatsResponse | null>(null);
  private readonly _loadingStats = signal<boolean>(false);
  private readonly _brief = signal<string>("");
  private readonly _loadingBrief = signal<boolean>(false);

  readonly stats = this._stats.asReadonly();
  readonly loadingStats = this._loadingStats.asReadonly();
  readonly brief = this._brief.asReadonly();
  readonly loadingBrief = this._loadingBrief.asReadonly();

  /** GET /api/dashboard/stats */
  getStats(): Observable<StatsResponse> {
    this._loadingStats.set(true);
    return this.http.get<StatsResponse>(`${this.baseUrl}/stats`).pipe(
      tap((s) => {
        this._stats.set(s);
        this._loadingStats.set(false);
      })
    );
  }

  /** POST /api/dashboard/daily-brief */
  getDailyBrief(): Observable<DailyBriefResponse> {
    this._loadingBrief.set(true);
    return this.http
      .post<DailyBriefResponse>(`${this.baseUrl}/daily-brief`, {})
      .pipe(
        tap((b) => {
          this._brief.set(b?.brief ?? "");
          this._loadingBrief.set(false);
        })
      );
  }

  /** Force re-generation of the brief. */
  regenerate(): Observable<DailyBriefResponse> {
    this._brief.set("");
    return this.getDailyBrief();
  }
}
