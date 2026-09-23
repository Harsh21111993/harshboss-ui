import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { DashboardService } from "../../core/services/dashboard.service";
import { EmailService } from "../../core/services/email.service";
import { CalendarService } from "../../core/services/calendar.service";
import { ApprovalService } from "../../core/services/approval.service";
import { ToastService } from "../../core/services/toast.service";
import { StatCardsComponent } from "./stat-cards.component";
import { DailyBriefComponent } from "./daily-brief.component";
import { LabelBadgeComponent } from "../../shared/components/label-badge.component";
import { ImportanceDotComponent } from "../../shared/components/importance-dot.component";
import { PlatformBadgeComponent } from "../../shared/components/platform-badge.component";
import { TimeAgoPipe } from "../../shared/pipes/time-ago.pipe";
import {
  Email,
  CalendarEvent,
  Approval
} from "../../core/models";
import { greetingForNow, todayLong, formatTime, isToday } from "../../shared/utils";
import { UserService } from "../../core/services/user.service";

@Component({
  selector: "hb-dashboard",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    StatCardsComponent,
    DailyBriefComponent,
    LabelBadgeComponent,
    ImportanceDotComponent,
    PlatformBadgeComponent,
    TimeAgoPipe
  ],
  template: `
    <div class="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {{ greeting() }}, {{ user.firstName() || 'there' }} 👋
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ today() }}</p>
      </header>

      <!-- Stat cards -->
      <hb-stat-cards
        [stats]="dashboard.stats()"
        [loading]="dashboard.loadingStats()"
        (select)="go($event)"
      />

      <!-- Empty state: no data yet → show "Load demo data" CTA -->
      @if (!dashboard.loadingStats() && dashboard.stats() && isEmpty()) {
        <div class="p-6 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
          <div class="flex flex-col items-center gap-3">
            <span class="grid place-items-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </span>
            <div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Your workspace is empty</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Load 12 demo emails (including a buried-in-spam partnership email), 12 calendar events,
                and 1 pending approval — all synced with your profile.
              </p>
            </div>
            <button
              type="button"
              (click)="loadDemoData()"
              [disabled]="seeding()"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              @if (seeding()) {
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Loading demo data…
              } @else {
                Load demo data
              }
            </button>
          </div>
        </div>
      }

      <!-- Daily brief -->
      <hb-daily-brief
        [brief]="dashboard.brief()"
        [loading]="dashboard.loadingBrief()"
        (regenerate)="regenerateBrief()"
      />

      <!-- 3-column preview -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <!-- Important emails -->
        <section class="hb-card p-4 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Important emails</h2>
            <button type="button" class="text-xs font-medium text-emerald-600 hover:text-emerald-500" (click)="go('/inbox')">
              View inbox →
            </button>
          </div>
          @if (emailLoading()) {
            <div class="space-y-2.5">
              @for (i of [1,2,3]; track i) {
                <div class="flex gap-2.5">
                  <span class="hb-skeleton h-9 w-9 rounded-full"></span>
                  <div class="flex-1 space-y-1.5">
                    <span class="hb-skeleton block h-3 w-2/3"></span>
                    <span class="hb-skeleton block h-3 w-1/2"></span>
                  </div>
                </div>
              }
            </div>
          } @else if (importantEmails().length === 0) {
            <p class="text-sm text-slate-400 py-6 text-center">
              No high-importance emails detected yet.
            </p>
          } @else {
            <ul class="space-y-2.5">
              @for (e of importantEmails(); track e.id) {
                <li>
                  <button
                    type="button"
                    (click)="openEmail(e)"
                    class="w-full text-left flex gap-2.5 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <hb-importance-dot
                      [importance]="e.analysis?.importance || 'MEDIUM'"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {{ e.fromName }}
                        </span>
                        @if (e.analysis?.label) {
                          <hb-label-badge [label]="e.analysis!.label" />
                        }
                      </div>
                      <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {{ e.subject }}
                      </div>
                    </div>
                    <span class="text-[11px] text-slate-400 shrink-0">
                        {{ e.receivedAt | timeAgo }}
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Upcoming meetings -->
        <section class="hb-card p-4 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming meetings</h2>
            <button type="button" class="text-xs font-medium text-emerald-600 hover:text-emerald-500" (click)="go('/calendar')">
              View calendar →
            </button>
          </div>
          @if (calendar.loading()) {
            <div class="space-y-2.5">
              @for (i of [1,2,3]; track i) {
                <div class="space-y-1.5">
                  <span class="hb-skeleton block h-3 w-1/3"></span>
                  <span class="hb-skeleton block h-3 w-2/3"></span>
                </div>
              }
            </div>
          } @else if (upcomingMeetings().length === 0) {
            <p class="text-sm text-slate-400 py-6 text-center">
              No upcoming meetings this week.
            </p>
          } @else {
            <ul class="space-y-2.5">
              @for (ev of upcomingMeetings(); track ev.id) {
                <li>
                  <button
                    type="button"
                    (click)="go('/calendar')"
                    class="w-full text-left flex gap-2.5 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <hb-platform-badge [platform]="ev.platform" />
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {{ ev.title }}
                      </div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">
                        {{ formatTime(ev.start) }}
                        @if (!isToday(ev.start)) {
                          · {{ ev.start | timeAgo }}
                        }
                      </div>
                    </div>
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Pending approvals preview -->
        <section class="hb-card p-4 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Pending approvals</h2>
            <button type="button" class="text-xs font-medium text-emerald-600 hover:text-emerald-500" (click)="go('/approvals')">
              View all →
            </button>
          </div>
          @if (approvals.loading()) {
            <div class="space-y-2.5">
              @for (i of [1,2]; track i) {
                <div class="space-y-1.5">
                  <span class="hb-skeleton block h-3 w-2/3"></span>
                  <span class="hb-skeleton block h-3 w-1/2"></span>
                </div>
              }
            </div>
          } @else if (pendingApprovals().length === 0) {
            <p class="text-sm text-slate-400 py-6 text-center">
              No approvals pending.
            </p>
          } @else {
            <ul class="space-y-2.5">
              @for (a of pendingApprovals(); track a.id) {
                <li>
                  <button
                    type="button"
                    (click)="go('/approvals')"
                    class="w-full text-left flex gap-2.5 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span class="grid place-items-center h-7 w-7 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {{ a.proposalDetails.title || a.type }}
                      </div>
                      <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {{ a.requesterName }}
                      </div>
                    </div>
                    @if (a.conflictInfo) {
                      <span class="hb-badge bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 shrink-0">
                        Conflict
                      </span>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);
  protected readonly emailsSvc = inject(EmailService);
  protected readonly calendar = inject(CalendarService);
  protected readonly approvals = inject(ApprovalService);
  protected readonly user = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly emailLoading = this.emailsSvc.loading;
  protected readonly greeting = greetingForNow;
  protected readonly today = todayLong;
  protected readonly formatTime = formatTime;
  protected readonly isToday = isToday;

  ngOnInit(): void {
    // Load everything the dashboard needs (services dedupe / cache).
    if (!this.user.user()) {
      this.user.loadMe().subscribe({
        error: () => this.toast.error("Could not load user profile")
      });
    }
    this.dashboard.getStats().subscribe({
      error: () => this.toast.error("Could not load dashboard stats")
    });
    if (!this.dashboard.brief()) {
      this.dashboard.getDailyBrief().subscribe({
        error: () => this.toast.error("Could not generate daily brief")
      });
    }
    if (this.emailsSvc.emails().length === 0) {
      this.emailsSvc.getEmails(true).subscribe();
    }
    if (this.calendar.events().length === 0) {
      this.calendar.getEvents().subscribe();
    }
    if (this.approvals.approvals().length === 0) {
      this.approvals.getApprovals().subscribe();
    }
  }

  readonly importantEmails = computed<Email[]>(() => {
    const all = this.emailsSvc.emails();
    return all
      .filter((e) => e.analysis && e.analysis.importance === "HIGH")
      .sort((a, b) => (b.analysis!.score ?? 0) - (a.analysis!.score ?? 0))
      .slice(0, 3);
  });

  readonly upcomingMeetings = computed<CalendarEvent[]>(() => {
    const now = Date.now();
    return this.calendar
      .events()
      .filter((e) => new Date(e.start).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  });

  readonly pendingApprovals = computed<Approval[]>(() =>
    this.approvals.approvals().filter((a) => a.status === "PENDING").slice(0, 3)
  );

  /** True when the workspace has no data (unread + important + pending + meetings all zero). */
  readonly isEmpty = computed(() => {
    const s = this.dashboard.stats();
    if (!s) return false;
    return s.unread === 0 && s.important === 0 && s.pendingApprovals === 0 && s.meetingsToday === 0;
  });

  readonly seeding = signal<boolean>(false);

  go(route: string): void {
    this.router.navigateByUrl(route);
  }

  openEmail(e: Email): void {
    // Hop to inbox; the inbox will auto-select the email via the URL state.
    this.router.navigate(["/inbox"], { queryParams: { email: e.id } });
  }

  regenerateBrief(): void {
    this.dashboard.regenerate().subscribe({
      next: () => this.toast.success("Daily brief regenerated"),
      error: () => this.toast.error("Could not regenerate brief")
    });
  }

  /** Load demo data (12 emails + 12 events + 1 approval) for the current user. */
  loadDemoData(): void {
    this.seeding.set(true);
    this.user.seedDemoData().subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.seeding.set(false);
        // Refresh all dashboard data
        this.dashboard.getStats().subscribe();
        this.emailsSvc.getEmails(true).subscribe();
        this.calendar.getEvents().subscribe();
        this.approvals.getApprovals().subscribe();
        if (!this.dashboard.brief()) {
          this.dashboard.getDailyBrief().subscribe();
        }
      },
      error: () => {
        this.toast.error("Could not load demo data");
        this.seeding.set(false);
      }
    });
  }
}
