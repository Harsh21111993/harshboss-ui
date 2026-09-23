import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApprovalService } from "../../core/services/approval.service";
import { ToastService } from "../../core/services/toast.service";
import { Approval } from "../../core/models";
import { ApprovalCardComponent } from "./approval-card.component";

@Component({
  selector: "hb-approvals",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ApprovalCardComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Approvals
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review and decide on meeting proposals.
          </p>
        </div>
        <button type="button" class="hb-btn-outline" (click)="refresh()">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Refresh
        </button>
      </header>

      @if (approvals.loading() && pending().length === 0 && resolved().length === 0) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          @for (i of [1,2]; track i) {
            <div class="hb-card p-5 space-y-3">
              <div class="flex items-center justify-between">
                <span class="hb-skeleton block h-4 w-1/3"></span>
                <span class="hb-skeleton block h-5 w-16 rounded-full"></span>
              </div>
              <span class="hb-skeleton block h-3 w-1/2"></span>
              <span class="hb-skeleton block h-3 w-2/3"></span>
              <span class="hb-skeleton block h-16 w-full"></span>
            </div>
          }
        </div>
      } @else {
        <!-- Pending -->
        <section>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-amber-500"></span>
            Pending
            <span class="text-xs font-normal text-slate-400">({{ pending().length }})</span>
          </h2>
          @if (pending().length === 0) {
            <div class="hb-card p-8 text-center">
              <p class="text-sm text-slate-500 dark:text-slate-400">
                No pending approvals. 🎉
              </p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              @for (a of pending(); track a.id) {
                <hb-approval-card
                  [approval]="a"
                  [busy]="busyId() === a.id"
                  (decide)="confirm(a, $event)"
                />
              }
            </div>
          }
        </section>

        <!-- Resolved -->
        @if (resolved().length > 0) {
          <section>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-slate-400"></span>
              Resolved
              <span class="text-xs font-normal text-slate-400">({{ resolved().length }})</span>
            </h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              @for (a of resolved(); track a.id) {
                <hb-approval-card [approval]="a" />
              }
            </div>
          </section>
        }
      }
    </div>

    <!-- Confirm dialog -->
    @if (confirmState(); as cs) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          (click)="cancelConfirm()"
          aria-hidden="true"
        ></div>
        <div
          role="dialog"
          aria-modal="true"
          class="relative w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 shadow-2xl animate-fade-in"
        >
          <div class="p-5">
            <div class="flex items-start gap-3">
              <span
                class="grid place-items-center h-10 w-10 rounded-lg shrink-0"
                [class]="
                  cs.decision === 'APPROVE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                "
              >
                @if (cs.decision === 'APPROVE') {
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                }
              </span>
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {{ cs.decision === 'APPROVE' ? 'Approve' : 'Decline' }} this request?
                </h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {{ cs.decision === 'APPROVE'
                    ? 'A confirmation email will be sent to ' + cs.approval.requesterEmail + '.'
                    : 'A decline email will be sent to ' + cs.approval.requesterEmail + '.'
                  }}
                </p>
              </div>
            </div>
          </div>
          <footer class="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" class="hb-btn-ghost" (click)="cancelConfirm()">Cancel</button>
            <button
              type="button"
              class="hb-btn-primary"
              [class.!bg-rose-600]="cs.decision === 'DECLINE'"
              [class.hover:!bg-rose-500]="cs.decision === 'DECLINE'"
              (click)="doDecide(cs)"
            >
              {{ cs.decision === 'APPROVE' ? 'Approve' : 'Decline' }}
            </button>
          </footer>
        </div>
      </div>
    }

    <!-- Notification email reveal modal -->
    @if (notificationEmail(); as ne) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          (click)="notificationEmail.set(null)"
          aria-hidden="true"
        ></div>
        <div
          role="dialog"
          aria-modal="true"
          class="relative w-full sm:max-w-lg rounded-t-xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col"
        >
          <header class="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Notification email sent
            </h3>
            <button
              type="button"
              class="hb-btn-ghost !p-2"
              (click)="notificationEmail.set(null)"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div class="p-5 overflow-y-auto">
            <p class="text-xs text-slate-400 mb-2">
              The following email was sent to the requester.
            </p>
            <pre class="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 font-sans">{{ ne }}</pre>
          </div>
        </div>
      </div>
    }
  `
})
export class ApprovalsComponent implements OnInit {
  protected readonly approvals = inject(ApprovalService);
  private readonly toast = inject(ToastService);

  readonly busyId = signal<string | null>(null);
  readonly confirmState = signal<{ approval: Approval; decision: "APPROVE" | "DECLINE" } | null>(null);
  readonly notificationEmail = signal<string | null>(null);

  ngOnInit(): void {
    if (this.approvals.approvals().length === 0) {
      this.approvals.getApprovals().subscribe();
    }
  }

  readonly pending = computed<Approval[]>(() =>
    this.approvals
      .approvals()
      .filter((a) => a.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  readonly resolved = computed<Approval[]>(() =>
    this.approvals
      .approvals()
      .filter((a) => a.status !== "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  refresh(): void {
    this.approvals.getApprovals().subscribe({
      next: () => this.toast.success("Approvals refreshed"),
      error: () => this.toast.error("Could not refresh")
    });
  }

  confirm(approval: Approval, decision: "APPROVE" | "DECLINE"): void {
    this.confirmState.set({ approval, decision });
  }

  cancelConfirm(): void {
    this.confirmState.set(null);
  }

  doDecide(cs: { approval: Approval; decision: "APPROVE" | "DECLINE" }): void {
    this.confirmState.set(null);
    this.busyId.set(cs.approval.id);
    this.approvals.decide(cs.approval.id, cs.decision).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(
          cs.decision === "APPROVE" ? "Request approved" : "Request declined",
          "Requester notified by email"
        );
        this.notificationEmail.set(res.notificationEmail);
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error(
          "Decision failed",
          "Could not " + cs.decision.toLowerCase() + " this request"
        );
      }
    });
  }
}
