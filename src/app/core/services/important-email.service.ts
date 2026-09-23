import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { ImportantEmail, ImportantEmailStats } from "../models";

/**
 * ImportantEmailService — fetches the lightweight important-email summaries.
 *
 * These are NOT full emails — they're AI-generated briefs with a deep link
 * to view the full email in Gmail/Outlook (providerUrl).
 */
@Injectable({ providedIn: "root" })
export class ImportantEmailService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/important-emails";

  private readonly _emails = signal<ImportantEmail[]>([]);
  private readonly _loading = signal<boolean>(false);

  readonly emails = this._emails.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** GET /api/important-emails */
  list(): Observable<ImportantEmail[]> {
    this._loading.set(true);
    return this.http.get<ImportantEmail[]>(this.baseUrl).pipe(
      tap((emails) => {
        this._emails.set(emails || []);
        this._loading.set(false);
      })
    );
  }

  /** GET /api/important-emails/stats */
  stats(): Observable<ImportantEmailStats> {
    return this.http.get<ImportantEmailStats>(`${this.baseUrl}/stats`);
  }
}
