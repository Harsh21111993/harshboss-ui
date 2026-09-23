import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  output
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CalendarService } from "../../core/services/calendar.service";
import { ToastService } from "../../core/services/toast.service";
import {
  ProposeMeetingRequest,
  ProposeMeetingResponse,
  Platform
} from "../../core/models";
import { formatDateTime, toDatetimeLocalValue } from "../../shared/utils";

/**
 * ProposeMeetingComponent — modal dialog with the propose-meeting form.
 * Submits to POST /api/calendar/propose and renders the conflict / free
 * result (including the auto-reply email and alternative slots).
 */
@Component({
  selector: "hb-propose-meeting",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        (click)="close.emit()"
        aria-hidden="true"
      ></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="propose-title"
        class="relative w-full sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-2xl animate-fade-in"
      >
        <!-- Header -->
        <header class="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="propose-title" class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Propose a meeting
          </h2>
          <button
            type="button"
            class="hb-btn-ghost !p-2"
            (click)="close.emit()"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          @if (!result()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Title</label>
                <input class="hb-input" formControlName="title" placeholder="Quarterly review" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Proposed start</label>
                  <input class="hb-input" type="datetime-local" formControlName="proposedStart" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Duration</label>
                  <select class="hb-input" formControlName="durationMinutes">
                    <option [ngValue]="15">15 min</option>
                    <option [ngValue]="30">30 min</option>
                    <option [ngValue]="45">45 min</option>
                    <option [ngValue]="60">60 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Platform</label>
                <select class="hb-input" formControlName="platform">
                  <option [ngValue]="'TEAMS'">Microsoft Teams</option>
                  <option [ngValue]="'GOOGLE'">Google Calendar</option>
                  <option [ngValue]="'ZOOM'">Zoom</option>
                  <option [ngValue]="'PERSONAL'">Personal</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Requester name</label>
                  <input class="hb-input" formControlName="requesterName" placeholder="Olivia Brooks" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Requester email</label>
                  <input class="hb-input" type="email" formControlName="requesterEmail" placeholder="olivia@northwind.io" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Message (optional)</label>
                <textarea class="hb-input min-h-[72px]" formControlName="message" placeholder="Looking forward to discussing the integration scope…"></textarea>
              </div>

              @if (formError()) {
                <p class="text-sm text-rose-600 dark:text-rose-400">{{ formError() }}</p>
              }

              <div class="flex items-center gap-2 pt-1">
                <button type="submit" class="hb-btn-primary flex-1" [disabled]="submitting()">
                  @if (submitting()) {
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                    </svg>
                    Checking availability…
                  } @else {
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Propose meeting
                  }
                </button>
                <button type="button" class="hb-btn-ghost" (click)="close.emit()" [disabled]="submitting()">Cancel</button>
              </div>
            </form>
          } @else {
            <!-- Result view -->
            <div class="space-y-4">
              @if (result()!.status === 'CONFLICT') {
                <div class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3">
                  <div class="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" class="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-rose-700 dark:text-rose-300">Conflict detected</div>
                      <p class="text-xs text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                        Auto-reply sent to requester with alternative slots.
                      </p>
                    </div>
                  </div>
                  @if (result()!.conflictInfo; as ci) {
                    <div class="mt-2 text-xs text-rose-700/90 dark:text-rose-300/90">
                      Overlaps with <strong>{{ ci.overlappingEventTitle }}</strong>
                      ({{ formatDateTime(ci.overlappingEventStart) }} – {{ formatDateTime(ci.overlappingEventEnd) }})
                    </div>
                  }
                </div>
              } @else {
                <div class="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <div class="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" class="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Meeting proposed</div>
                      <p class="text-xs text-emerald-600/90 dark:text-emerald-400/90 mt-0.5">
                        Pending approval — you'll find it in the Approvals tab.
                      </p>
                    </div>
                  </div>
                </div>
              }

              @if (result()!.alternatives && result()!.alternatives.length > 0) {
                <div>
                  <h3 class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Alternative slots
                  </h3>
                  <ul class="space-y-1.5">
                    @for (slot of result()!.alternatives; track $index) {
                      <li class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {{ formatDateTime(slot) }}
                      </li>
                    }
                  </ul>
                </div>
              }

              @if (result()!.autoReplyEmail) {
                <div>
                  <h3 class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Auto-reply email
                  </h3>
                  <pre class="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 font-sans">{{ result()!.autoReplyEmail }}</pre>
                </div>
              }

              <div class="flex items-center gap-2 pt-1">
                <button type="button" class="hb-btn-primary flex-1" (click)="reset()">Propose another</button>
                <button type="button" class="hb-btn-ghost" (click)="close.emit()">Done</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ProposeMeetingComponent {
  private readonly calendar = inject(CalendarService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  /** Optional pre-fill from parent (unused; kept for flexibility). */
  readonly close = output<void>();

  readonly submitting = signal<boolean>(false);
  readonly formError = signal<string>("");
  readonly result = signal<ProposeMeetingResponse | null>(null);

  readonly formatDateTime = formatDateTime;

  readonly form = this.fb.nonNullable.group({
    title: ["", [Validators.required, Validators.minLength(3)]],
    proposedStart: [toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)), [Validators.required]],
    durationMinutes: [30 as number, [Validators.required]],
    platform: ["TEAMS" as Platform, [Validators.required]],
    requesterName: ["", [Validators.required]],
    requesterEmail: ["", [Validators.required, Validators.email]],
    message: [""]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set("Please fill in all required fields with valid values.");
      return;
    }
    this.formError.set("");
    this.submitting.set(true);

    const v = this.form.getRawValue();
    const req: ProposeMeetingRequest = {
      title: v.title,
      proposedStart: new Date(v.proposedStart).toISOString(),
      durationMinutes: Number(v.durationMinutes),
      platform: v.platform,
      requesterName: v.requesterName,
      requesterEmail: v.requesterEmail,
      message: v.message || undefined
    };

    this.calendar.proposeMeeting(req).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.result.set(res);
        // Refresh the calendar + approvals lists so new event/approval show up.
        this.calendar.getEvents().subscribe();
        if (res.status === "CONFLICT") {
          this.toast.warning(
            "Conflict detected",
            "Auto-reply sent to requester with alternative slots."
          );
        } else {
          this.toast.success(
            "Meeting proposed",
            "Pending approval — see Approvals tab."
          );
        }
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error("Could not propose meeting", "Please try again.");
      }
    });
  }

  reset(): void {
    this.result.set(null);
    this.formError.set("");
    this.form.reset({
      title: "",
      proposedStart: toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)),
      durationMinutes: 30,
      platform: "TEAMS",
      requesterName: "",
      requesterEmail: "",
      message: ""
    });
  }
}
