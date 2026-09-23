import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import {
  OAuthProvidersResponse,
  OAuthConnectResponse,
  EmailSyncResult,
  OAuthProvider
} from "../models";

/**
 * OAuthService — manages real email provider connections (Microsoft + Google)
 * and syncs actual emails from the user's mailbox.
 *
 * Flow:
 *  1. getProviders() → check what's configured + connected
 *  2. connect(provider) → get authorize URL → redirect browser
 *  3. handleCallback() → called from the /oauth-callback route
 *  4. syncEmails(provider) → fetch REAL emails from the provider
 *  5. disconnect(provider) → remove stored tokens
 */
@Injectable({ providedIn: "root" })
export class OAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/oauth";
  private readonly syncUrl = "/api/sync";

  private readonly _providers = signal<OAuthProvidersResponse | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _syncing = signal<string | null>(null);

  readonly providers = this._providers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly syncing = this._syncing.asReadonly();

  /** GET /api/oauth/providers → status of both providers */
  getProviders(): Observable<OAuthProvidersResponse> {
    this._loading.set(true);
    return this.http.get<OAuthProvidersResponse>(`${this.baseUrl}/providers`).pipe(
      tap((r) => {
        this._providers.set(r);
        this._loading.set(false);
      })
    );
  }

  /** GET /api/oauth/connect/{provider} → authorize URL */
  connect(provider: OAuthProvider): Observable<OAuthConnectResponse> {
    return this.http.get<OAuthConnectResponse>(`${this.baseUrl}/connect/${provider}`);
  }

  /** GET /api/oauth/callback/{provider}?code=...&state=... → HTML success page */
  handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Observable<string> {
    return this.http.get(`${this.baseUrl}/callback/${provider}`, {
      params: { code, state },
      responseType: "text"
    });
  }

  /** POST /api/oauth/disconnect/{provider} → 204 */
  disconnect(provider: OAuthProvider): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/disconnect/${provider}`, {}).pipe(
      tap(() => this.getProviders().subscribe())
    );
  }

  /** POST /api/sync/emails?provider=...&maxResults=... */
  syncEmails(provider: OAuthProvider, maxResults = 20): Observable<EmailSyncResult> {
    this._syncing.set(provider);
    return this.http
      .post<EmailSyncResult>(`${this.syncUrl}/emails`, {}, {
        params: { provider, maxResults: String(maxResults) }
      })
      .pipe(
        tap(() => this._syncing.set(null))
      );
  }

  /** POST /api/sync/all?maxResults=25 — sync from ALL connected providers */
  syncAll(maxResults = 25): Observable<EmailSyncResult[]> {
    this._syncing.set("all" as OAuthProvider);
    return this.http
      .post<EmailSyncResult[]>(`${this.syncUrl}/all`, {}, {
        params: { maxResults: String(maxResults) }
      })
      .pipe(
        tap(() => this._syncing.set(null))
      );
  }

  /** GET /api/sync/status — which providers are connected */
  getSyncStatus(): Observable<{ googleConnected: boolean; microsoftConnected: boolean; totalProviders: number }> {
    return this.http.get<{ googleConnected: boolean; microsoftConnected: boolean; totalProviders: number }>(
      `${this.syncUrl}/status`
    );
  }

  /** POST /api/sync/calendar?provider=... (placeholder — calendar sync not yet implemented on backend) */
  syncCalendar(provider: OAuthProvider): Observable<EmailSyncResult> {
    this._syncing.set(provider);
    // Calendar sync is not yet wired on the backend — return a clear message.
    return new Observable<EmailSyncResult>((subscriber) => {
      subscriber.next({
        provider,
        fetched: 0,
        new: 0,
        skipped: 0,
        message: "Calendar sync is not yet implemented. Use the email sync for now."
      });
      subscriber.complete();
      this._syncing.set(null);
    });
  }

  /** Helper used by the profile UI: get the status of a specific provider. */
  statusOf(provider: OAuthProvider): import("../models").OAuthProviderStatus | null {
    const p = this._providers();
    if (!p) return null;
    return provider === "microsoft" ? p.microsoft : p.google;
  }
}
