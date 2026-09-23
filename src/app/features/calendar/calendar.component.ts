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
import { CalendarService } from "../../core/services/calendar.service";
import { ToastService } from "../../core/services/toast.service";
import { UiStore } from "../../core/store/ui.store";
import { CalendarEvent, Platform } from "../../core/models";
import { EventCardComponent } from "./event-card.component";
import { ProposeMeetingComponent } from "./propose-meeting.component";
import { PlatformBadgeComponent } from "../../shared/components/platform-badge.component";
import {
  PLATFORM_STYLES,
  formatTime,
  formatDay,
  isToday as isTodayFn
} from "../../shared/utils";

interface DayBucket {
  date: Date;
  isoDate: string;
  label: string;
  weekday: string;
  isToday: boolean;
  events: CalendarEvent[];
}

const HOUR_HEIGHT = 52; // px per hour
const START_HOUR = 8; // 8am
const END_HOUR = 20; // 8pm

@Component({
  selector: "hb-calendar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    EventCardComponent,
    ProposeMeetingComponent,
    PlatformBadgeComponent
  ],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Calendar
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Unified across Teams · Google · Zoom · Personal · Blocked
          </p>
        </div>
        <button type="button" class="hb-btn-primary" (click)="openPropose()">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Propose meeting
        </button>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap items-center gap-2">
        @for (p of platforms; track p) {
          <span class="hb-badge border {{ platformStyle(p).bg }} {{ platformStyle(p).text }} {{ platformStyle(p).border }}">
            <span class="h-1.5 w-1.5 rounded-full {{ platformStyle(p).dot }}"></span>
            {{ platformStyle(p).label }}
          </span>
        }
      </div>

      <!-- Desktop week grid -->
      <div class="hidden lg:block hb-card overflow-hidden">
        <!-- Day headers -->
        <div class="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800">
          <div class="px-2 py-2"></div>
          @for (day of week(); track day.isoDate) {
            <div
              class="px-2 py-2 text-center border-l border-slate-200 dark:border-slate-800"
              [ngClass]="day.isToday ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''"
            >
              <div class="text-[11px] uppercase tracking-wider text-slate-400">{{ day.weekday }}</div>
              <div
                class="text-sm font-semibold"
                [ngClass]="day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'"
              >
                {{ day.label }}
              </div>
            </div>
          }
        </div>

        <!-- Grid body -->
        <div class="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] relative">
          <!-- Hour gutter -->
          <div class="border-r border-slate-200 dark:border-slate-800">
            @for (h of hours(); track h) {
              <div class="h-[52px] px-1.5 text-[10px] text-right text-slate-400 -translate-y-1.5">
                {{ hourLabel(h) }}
              </div>
            }
          </div>

          <!-- Day columns -->
          @for (day of week(); track day.isoDate) {
            <div class="relative border-l border-slate-200 dark:border-slate-800 min-h-[676px]">
              <!-- Hour lines -->
              @for (h of hours(); track h) {
                <div class="h-[52px] border-b border-slate-100 dark:border-slate-800/60"></div>
              }
              <!-- Now indicator -->
              @if (day.isToday) {
                <div
                  class="absolute left-0 right-0 h-px bg-rose-500 z-10"
                  [style.top.px]="nowOffsetPx()"
                >
                  <span class="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500"></span>
                </div>
              }
              <!-- Events -->
              @for (ev of day.events; track ev.id) {
                <div
                  class="absolute left-1 right-1 z-[5]"
                  [style.top.px]="eventTopPx(ev)"
                  [style.height.px]="eventHeightPx(ev)"
                >
                  <hb-event-card
                    [event]="ev"
                    [hourHeight]="52"
                    (select)="openEvent($event)"
                  />
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Mobile / tablet day-list -->
      <div class="lg:hidden space-y-3">
        @if (calendar.loading() && week().length === 0) {
          @for (i of [1,2,3]; track i) {
            <div class="hb-card p-4 space-y-2">
              <span class="hb-skeleton block h-4 w-1/3"></span>
              <span class="hb-skeleton block h-12 w-full"></span>
            </div>
          }
        } @else {
          @for (day of week(); track day.isoDate) {
            <section class="hb-card overflow-hidden">
              <div
                class="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"
                [ngClass]="day.isToday ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''"
              >
                <div>
                  <span class="text-xs uppercase tracking-wider text-slate-400">{{ day.weekday }}</span>
                  <span
                    class="ml-2 text-sm font-semibold"
                    [ngClass]="day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'"
                  >{{ day.label }}</span>
                </div>
                <span class="text-xs text-slate-400">{{ day.events.length }} event(s)</span>
              </div>
              <div class="p-2 space-y-2">
                @if (day.events.length === 0) {
                  <p class="px-2 py-3 text-sm text-slate-400">No events.</p>
                } @else {
                  @for (ev of day.events; track ev.id) {
                    <hb-event-card
                      [event]="ev"
                      [hourHeight]="40"
                      (select)="openEvent($event)"
                    />
                  }
                }
              </div>
            </section>
          }
        }
      </div>

      <!-- Event detail popover -->
      @if (selectedEvent(); as ev) {
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            (click)="selectedEvent.set(null)"
            aria-hidden="true"
          ></div>
          <div
            role="dialog"
            aria-modal="true"
            class="relative w-full sm:max-w-md rounded-t-xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-2xl animate-fade-in"
          >
            <header class="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <hb-platform-badge [platform]="ev.platform" />
                  @if (ev.status === 'TENTATIVE') {
                    <span class="hb-badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Tentative</span>
                  }
                </div>
                <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ ev.title }}</h2>
              </div>
              <button type="button" class="hb-btn-ghost !p-2" (click)="selectedEvent.set(null)" aria-label="Close">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div class="px-5 py-4 space-y-3 text-sm">
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                </svg>
                {{ formatTime(ev.start) }} – {{ formatTime(ev.end) }}
              </div>
              <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
                {{ ev.organizer }}
              </div>
              @if (ev.attendees && ev.attendees.length > 0) {
                <div class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400 mt-0.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span class="min-w-0">{{ ev.attendees.join(', ') }}</span>
                </div>
              }
              @if (ev.location) {
                <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {{ ev.location }}
                </div>
              }
              @if (ev.isHiddenByOthers) {
                <div class="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                  Marked busy by another calendar — details hidden.
                </div>
              }
              @if (ev.sourceEmailId || ev.sourceEmailUrl) {
                <div class="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded p-2 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4l8 5 8-5" />
                  </svg>
                  <span>Auto-detected from an email invitation</span>
                </div>
              }
            </div>
            @if (ev.sourceEmailUrl) {
              <div class="px-5 py-2 border-t border-slate-200 dark:border-slate-800">
                <a
                  [href]="ev.sourceEmailUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" /><path d="M10 14L21 3" />
                  </svg>
                  View in {{ ev.platform === 'GOOGLE' ? 'Gmail' : (ev.platform === 'TEAMS' ? 'Outlook' : 'email') }}
                </a>
              </div>
            } @else if (ev.sourceEmailId) {
              <div class="px-5 py-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  (click)="viewSourceEmail(ev.sourceEmailId!)"
                  class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4l8 5 8-5" />
                  </svg>
                  View source email
                </button>
              </div>
            }
            @if (ev.joinUrl) {
              <footer class="px-5 py-3 border-t border-slate-200 dark:border-slate-800">
                <a
                  [href]="ev.joinUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hb-btn-primary w-full"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  Join meeting
                </a>
              </footer>
            }
          </div>
        </div>
      }

      <!-- Propose dialog -->
      @if (ui.proposeDialogOpen()) {
        <hb-propose-meeting (close)="ui.closeProposeDialog()" />
      }
    </div>
  `
})
export class CalendarComponent implements OnInit {
  protected readonly calendar = inject(CalendarService);
  protected readonly ui = inject(UiStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly platforms: Platform[] = ["TEAMS", "GOOGLE", "ZOOM", "PERSONAL", "BLOCKED"];
  protected readonly formatTime = formatTime;

  readonly selectedEvent = signal<CalendarEvent | null>(null);

  readonly hours = () => {
    const out: number[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) out.push(h);
    return out;
  };

  ngOnInit(): void {
    this.calendar.getEvents().subscribe({
      error: () => this.toast.error("Could not load calendar")
    });
  }

  /** Build a 7-day week (Mon-Sun) containing today. */
  readonly week = computed<DayBucket[]>(() => {
    const events = this.calendar.events();
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = (todayMidnight.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const monday = new Date(todayMidnight);
    monday.setDate(todayMidnight.getDate() - dayOfWeek);

    const buckets: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoDate = d.toISOString().slice(0, 10);
      const dayEvents = events
        .filter((e) => new Date(e.start).toISOString().slice(0, 10) === isoDate)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      buckets.push({
        date: d,
        isoDate,
        label: d.toLocaleDateString(undefined, { day: "numeric" }),
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
        isToday: isTodayFn(d.toISOString()),
        events: dayEvents
      });
    }
    return buckets;
  });

  hourLabel(h: number): string {
    const ampm = h < 12 ? "AM" : "PM";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${ampm}`;
  }

  /** Top offset of an event in pixels, clamped to grid bounds. */
  eventTopPx(ev: CalendarEvent): number {
    const start = new Date(ev.start);
    const startH = start.getHours() + start.getMinutes() / 60;
    const clamped = Math.max(START_HOUR, Math.min(END_HOUR, startH));
    return Math.round((clamped - START_HOUR) * HOUR_HEIGHT) + 2;
  }

  /** Height in pixels based on event duration, clamped. */
  eventHeightPx(ev: CalendarEvent): number {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const startH = Math.max(START_HOUR, start.getHours() + start.getMinutes() / 60);
    const endH = Math.min(END_HOUR, end.getHours() + end.getMinutes() / 60);
    const hours = Math.max(0.25, endH - startH);
    return Math.max(28, Math.round(hours * HOUR_HEIGHT) - 6);
  }

  /** "Now" line offset within a day column (only meaningful for today). */
  nowOffsetPx(): number {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < START_HOUR || h > END_HOUR) return -10;
    return Math.round((h - START_HOUR) * HOUR_HEIGHT);
  }

  openPropose(): void {
    this.ui.openProposeDialog();
  }

  openEvent(id: string): void {
    const ev = this.calendar.events().find((e) => e.id === id);
    if (ev) this.selectedEvent.set(ev);
  }

  /**
   * Navigate to the Inbox and select the source email that generated this
   * calendar event. This is the "email ↔ calendar" navigation link.
   */
  viewSourceEmail(emailId: string): void {
    this.selectedEvent.set(null);
    this.ui.selectEmail(emailId);
    this.router.navigate(["/inbox"], { queryParams: { email: emailId } });
  }

  platformStyle(p: Platform) {
    return PLATFORM_STYLES[p];
  }
}
