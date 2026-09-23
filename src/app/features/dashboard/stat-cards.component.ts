import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { StatsResponse } from "../../core/models";

export interface StatCardConfig {
  key: keyof StatsResponse;
  label: string;
  icon: string; // inline SVG path
  accent: "emerald" | "rose" | "amber" | "teal";
  route: string;
}

export const STAT_CARDS: StatCardConfig[] = [
  {
    key: "unread",
    label: "Unread emails",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4l8 5 8-5",
    accent: "emerald",
    route: "/inbox"
  },
  {
    key: "important",
    label: "High importance",
    icon: "M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z",
    accent: "rose",
    route: "/inbox"
  },
  {
    key: "pendingApprovals",
    label: "Pending approvals",
    icon: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    accent: "amber",
    route: "/approvals"
  },
  {
    key: "meetingsToday",
    label: "Meetings today",
    icon: "M7 2v2h10V2h2v2h2v18H3V4h2V2h2zm14 6H5v12h16V8z",
    accent: "teal",
    route: "/calendar"
  }
];

const ACCENT_STYLES: Record<
  StatCardConfig["accent"],
  { bg: string; text: string; ring: string }
> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "hover:border-emerald-300 dark:hover:border-emerald-700"
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    ring: "hover:border-rose-300 dark:hover:border-rose-700"
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    ring: "hover:border-amber-300 dark:hover:border-amber-700"
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-600 dark:text-teal-400",
    ring: "hover:border-teal-300 dark:hover:border-teal-700"
  }
};

@Component({
  selector: "hb-stat-cards",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      @for (card of cards; track card.key) {
        <button
          type="button"
          (click)="select.emit(card.route)"
          class="hb-card p-4 sm:p-5 text-left transition-colors {{ accent(card).ring }}"
        >
          <div class="flex items-center justify-between">
            <span
              class="grid place-items-center h-9 w-9 rounded-lg {{ accent(card).bg }} {{ accent(card).text }}"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path [attr.d]="card.icon" />
              </svg>
            </span>
            @if (loading()) {
              <span class="hb-skeleton h-4 w-12"></span>
            }
          </div>
          <div class="mt-3">
            @if (loading()) {
              <span class="hb-skeleton block h-7 w-16"></span>
            } @else {
              <div class="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {{ value(card) }}
              </div>
            }
            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {{ card.label }}
            </div>
          </div>
        </button>
      }
    </div>
  `
})
export class StatCardsComponent {
  readonly stats = input<StatsResponse | null>(null);
  readonly loading = input<boolean>(false);
  readonly select = output<string>();

  readonly cards = STAT_CARDS;

  value(card: StatCardConfig): number {
    const s = this.stats();
    return s ? (s[card.key] as number) : 0;
  }

  accent(card: StatCardConfig) {
    return ACCENT_STYLES[card.accent];
  }
}
