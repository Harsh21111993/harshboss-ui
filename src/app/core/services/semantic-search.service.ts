import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface SemanticSearchHit {
  docId: string;
  emailId: string;
  subject: string;
  from: string;
  folder: string;
  score: number;
}

export interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchHit[];
}

/**
 * SemanticSearchService — calls POST /api/emails/search to find emails by
 * meaning (via PGVector cosine similarity), not just keyword match.
 */
@Injectable({ providedIn: "root" })
export class SemanticSearchService {
  private readonly http = inject(HttpClient);

  private readonly _results = signal<SemanticSearchHit[]>([]);
  private readonly _loading = signal(false);
  private readonly _lastQuery = signal("");

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastQuery = this._lastQuery.asReadonly();

  /** POST /api/emails/search body: { query, topK } */
  search(query: string, topK = 10): Observable<SemanticSearchResponse> {
    this._loading.set(true);
    this._lastQuery.set(query);
    return this.http.post<SemanticSearchResponse>("/api/emails/search", { query, topK });
  }

  clear(): void {
    this._results.set([]);
    this._lastQuery.set("");
  }
}
