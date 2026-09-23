import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Approval } from "../../core/models";
import { PlatformBadgeComponent } from "../../shared/components/platform-badge.component";
import { formatDateTime, formatTime } from "../../shared/utils";

@Component({
  selector: "hb-approval-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PlatformBadgeComponent],
  template: `
    <article class="hb-card p-4 sm:p-5 flex flex-col gap-3">
      <!-- Header -->
      <header class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {{ approval().proposalDetails.title || approval().type }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            from {{ approval().requesterName }} · {{ approval().requesterEmail }}
          </p>
        </div>
        <span class="hb-badge shrink-0 {{ statusBadge() }}">
          {{ statusLabel() }}
        </span>
      </header>

      <!-- Proposal details -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div class="text-slate-400 uppercase tracking-wide">Requested</div>
          <div class="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            {{ formatDateTime(approval().requestedTime) }}
          </div>
        </div>
        <div>
          <div class="text-slate-400 uppercase tracking-wide">Duration</div>
          <div class="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            {{ approval().proposalDetails.durationMinutes }} min
          </div>
        </div>
        <div>
          <div class="text-slate-400 uppercase tracking-wide">Platform</div>
          <div class="mt-0.5">
            <hb-platform-badge [platform]="approval().proposalDetails.platform" />
          </div>
        </div>
        <div>
          <div class="text-slate-400 uppercase tracking-wide">Created</div>
          <div class="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            {{ formatDateTime(approval().createdAt) }}
          </div>
        </div>
      </div>

      <!-- Optional message -->
      @if (approval().message) {
        <div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
          <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Message</div>
          <p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{{ approval().message }}</p>
        </div>
      }

      <!-- Conflict info -->
      @if (approval().conflictInfo; as ci) {
        <div class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-2.5">
          <div class="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-1">
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
            </svg>
            Conflict with {{ ci.overlappingEventTitle }}
          </div>
          <p class="text-xs text-rose-700/90 dark:text-rose-300/90">
            {{ formatTime(ci.overlappingEventStart) }} – {{ formatTime(ci.overlappingEventEnd) }}
          </p>
        </div>
      }

      <!-- Alternative slots offered -->
      @if (approval().alternatives?.length) {
        <div>
          <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Alternative slots offered</div>
          <ul class="space-y-1">
            @for (slot of approval().alternatives; track $index) {
              <li class="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {{ formatDateTime(slot) }}
              </li>
            }
          </ul>
        </div>
      }

      <!-- Action buttons (only when pending) -->
      @if (approval().status === 'PENDING') {
        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            class="hb-btn-primary flex-1"
            (click)="decide.emit('APPROVE')"
            [disabled]="busy()"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Approve
          </button>
          <button
            type="button"
            class="hb-btn-outline flex-1 !text-rose-600 dark:!text-rose-400 !border-rose-200 dark:!border-rose-800 hover:!bg-rose-50 dark:hover:!bg-rose-950/30"
            (click)="decide.emit('DECLINE')"
            [disabled]="busy()"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Decline
          </button>
        </div>
      }

      <!-- Collapsible auto-reply email -->
      @if (approval().autoReplySent) {
        <details class="group rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <summary class="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between select-none">
            <span class="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Auto-reply sent to requester
            </span>
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <pre class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 px-3 pb-3 font-sans">{{ approval().autoReplySent }}</pre>
        </details>
      }

      <!-- Collapsible decision notification email -->
      @if (approval().decisionEmailSent) {
        <details class="group rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
          <summary class="cursor-pointer px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between select-none">
            <span class="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Notification email sent to requester
            </span>
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <pre class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 px-3 pb-3 font-sans">{{ approval().decisionEmailSent }}</pre>
        </details>
      }

      @if (busy()) {
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
          Processing…
        </div>
      }
    </article>
  `
})
export class ApprovalCardComponent {
  readonly approval = input.required<Approval>();
  readonly busy = input<boolean>(false);
  readonly decide = output<"APPROVE" | "DECLINE">();

  readonly formatDateTime = formatDateTime;
  readonly formatTime = formatTime;

  statusLabel(): string {
    switch (this.approval().status) {
      case "PENDING":
        return "Pending";
      case "APPROVED":
        return "Approved";
      case "DECLINED":
        return "Declined";
      default:
        return this.approval().status;
    }
  }

  statusBadge(): string {
    switch (this.approval().status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "DECLINED":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  }
}
