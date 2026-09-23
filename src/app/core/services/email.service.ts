import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { Email, EmailAnalysis, AnalyzeAllResponse } from "../models";

/**
 * EmailService — wraps all /api/emails endpoints.
 * Keeps a signal-based cache of the latest fetched email list so multiple
 * components can read it without re-fetching.
 */
@Injectable({ providedIn: "root" })
export class EmailService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/emails";

  /** Cache of the most recently fetched email list. */
  private readonly _emails = signal<Email[]>([]);
  /** Whether a list fetch is in progress. */
  private readonly _loading = signal<boolean>(false);
  /** Whether analyze-all is currently running. */
  private readonly _analyzingAll = signal<boolean>(false);
  /** Progress of analyze-all (0..total). */
  private readonly _analyzeProgress = signal<{ done: number; total: number }>({
    done: 0,
    total: 0
  });
  /** Per-email analysis cache (id -> analysis). */
  private readonly _analysisCache = signal<Record<string, EmailAnalysis>>({});

  readonly emails = this._emails.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly analyzingAll = this._analyzingAll.asReadonly();
  readonly analyzeProgress = this._analyzeProgress.asReadonly();

  readonly pendingCount = computed(
    () => this._analyzingAll() && this._analyzeProgress().total - this._analyzeProgress().done
  );

  /** GET /api/emails?includeSpam= */
  getEmails(includeSpam = true): Observable<Email[]> {
    this._loading.set(true);
    return this.http
      .get<Email[]>(this.baseUrl, {
        params: { includeSpam: String(includeSpam) }
      })
      .pipe(
        tap((list) => {
          this._emails.set(list ?? []);
          // hydrate analysis cache from any inline analyses
          for (const e of list ?? []) {
            if (e.analysis) {
              this._analysisCache.update((c) => ({
                ...c,
                [e.id]: e.analysis!
              }));
            }
          }
          this._loading.set(false);
        })
      );
  }

  /** POST /api/emails/{id}/analyze */
  analyzeEmail(id: string): Observable<EmailAnalysis> {
    return this.http
      .post<EmailAnalysis>(`${this.baseUrl}/${id}/analyze`, {})
      .pipe(
        tap((analysis) => {
          this._analysisCache.update((c) => ({ ...c, [id]: analysis }));
          // also update the email in the list with its new analysis
          this._emails.update((list) =>
            list.map((e) => (e.id === id ? { ...e, analysis } : e))
          );
        })
      );
  }

  /** POST /api/emails/analyze-all — sequential, with progress. */
  analyzeAll(): Observable<AnalyzeAllResponse> {
    this._analyzingAll.set(true);
    const total = this._emails().length || 12;
    this._analyzeProgress.set({ done: 0, total });
    return this.http
      .post<AnalyzeAllResponse>(`${this.baseUrl}/analyze-all`, {})
      .pipe(
        tap({
          next: (res) => {
            for (const r of res?.results ?? []) {
              if (r.analysis) {
                this._analysisCache.update((c) => ({
                  ...c,
                  [r.emailId]: r.analysis
                }));
              }
            }
            // refresh list with new analyses
            this._emails.update((list) =>
              list.map((e) => {
                const match = (res?.results ?? []).find(
                  (r) => r.emailId === e.id
                );
                return match?.analysis ? { ...e, analysis: match.analysis } : e;
              })
            );
            this._analyzeProgress.set({ done: total, total });
            this._analyzingAll.set(false);
          },
          error: () => {
            this._analyzingAll.set(false);
            this._analyzeProgress.set({ done: 0, total: 0 });
          }
        })
      );
  }

  /** Read cached analysis for an email (synchronous). */
  analysisFor(id: string): EmailAnalysis | undefined {
    return this._analysisCache()[id];
  }

  /** Force a refresh of the email list. */
  refresh(includeSpam = true): void {
    this.getEmails(includeSpam).subscribe();
  }
}
