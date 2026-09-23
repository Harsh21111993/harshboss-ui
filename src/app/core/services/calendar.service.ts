import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { CalendarEvent, ProposeMeetingRequest, ProposeMeetingResponse } from "../models";

/**
 * CalendarService — wraps /api/calendar endpoints.
 * Caches the fetched event list and exposes it as a signal.
 */
@Injectable({ providedIn: "root" })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/calendar";

  private readonly _events = signal<CalendarEvent[]>([]);
  private readonly _loading = signal<boolean>(false);

  readonly events = this._events.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * GET /api/calendar/events?from=&to=
   * Defaults to a 14-day window centered on today.
   */
  getEvents(from?: Date, to?: Date): Observable<CalendarEvent[]> {
    this._loading.set(true);
    const now = new Date();
    const fromD = from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const toD =
      to ?? new Date(fromD.getTime() + 14 * 24 * 60 * 60 * 1000);
    const params = {
      from: fromD.toISOString(),
      to: toD.toISOString()
    };
    return this.http
      .get<CalendarEvent[]>(`${this.baseUrl}/events`, { params })
      .pipe(
        tap((list) => {
          this._events.set(list ?? []);
          this._loading.set(false);
        })
      );
  }

  /** POST /api/calendar/propose */
  proposeMeeting(req: ProposeMeetingRequest): Observable<ProposeMeetingResponse> {
    return this.http.post<ProposeMeetingResponse>(`${this.baseUrl}/propose`, req);
  }
}
