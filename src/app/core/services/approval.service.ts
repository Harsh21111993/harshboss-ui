import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { Approval, DecisionRequest, DecisionResponse } from "../models";

/**
 * ApprovalService — wraps /api/approvals endpoints.
 */
@Injectable({ providedIn: "root" })
export class ApprovalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/approvals";

  private readonly _approvals = signal<Approval[]>([]);
  private readonly _loading = signal<boolean>(false);

  readonly approvals = this._approvals.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly pendingCount = signal<number>(0);

  /** GET /api/approvals */
  getApprovals(): Observable<Approval[]> {
    this._loading.set(true);
    return this.http.get<Approval[]>(this.baseUrl).pipe(
      tap((list) => {
        this._approvals.set(list ?? []);
        this.pendingCount.set(
          (list ?? []).filter((a) => a.status === "PENDING").length
        );
        this._loading.set(false);
      })
    );
  }

  /** POST /api/approvals/{id}/decide */
  decide(id: string, decision: "APPROVE" | "DECLINE"): Observable<DecisionResponse> {
    const body: DecisionRequest = { decision };
    return this.http
      .post<DecisionResponse>(`${this.baseUrl}/${id}/decide`, body)
      .pipe(
        tap((res) => {
          // optimistic local update so the UI reflects the change immediately
          this._approvals.update((list) =>
            list.map((a) =>
              a.id === id
                ? {
                    ...a,
                    status: res.status,
                    decisionEmailSent: res.notificationEmail
                  }
                : a
            )
          );
          this.pendingCount.set(
            this._approvals().filter((a) => a.status === "PENDING").length
          );
        })
      );
  }

  /** Convenience: get approval by id (synchronous from cache). */
  byId(id: string): Approval | undefined {
    return this._approvals().find((a) => a.id === id);
  }
}
