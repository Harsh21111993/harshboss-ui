import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * DailyBriefCard — shows the AI chief-of-staff brief with regenerate.
 * Renders a multi-line brief (one bullet per line in the response) and
 * shows a skeleton while loading.
 */
@Component({
  selector: "hb-daily-brief",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="hb-card p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <span
            class="grid place-items-center h-10 w-10 rounded-lg bg-emerald-600 text-white shrink-0 shadow-soft"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 5.8H20l-4.7 3.4 1.8 5.8L12 14.6l-5.1 3.4 1.8-5.8L4 8.8h6.1z" />
            </svg>
          </span>
          <div class="min-w-0">
            <h2 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Daily Brief
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Your chief-of-staff summary for {{ today() }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="hb-btn-outline shrink-0"
          (click)="regenerate.emit()"
          [disabled]="loading()"
        >
          @if (loading()) {
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span>Generating…</span>
          } @else {
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            <span>Regenerate</span>
          }
        </button>
      </div>

      <div class="mt-4">
        @if (loading() && !brief()) {
          <ul class="space-y-2.5">
            @for (i of [1,2,3,4,5]; track i) {
              <li class="flex gap-2 items-start">
                <span class="hb-skeleton mt-1 h-1.5 w-1.5 rounded-full"></span>
                <span class="hb-skeleton h-3 flex-1" [style.width.%]="60 + i * 5"></span>
              </li>
            }
          </ul>
        } @else if (brief()) {
          <ul class="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            @for (line of lines(); track $index) {
              <li class="flex gap-2.5 items-start">
                <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span class="min-w-0">{{ line }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-sm text-slate-400">No brief generated yet.</p>
        }
      </div>
    </section>
  `
})
export class DailyBriefComponent {
  readonly brief = input<string>("");
  readonly loading = input<boolean>(false);
  readonly regenerate = output<void>();

  readonly today = () =>
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });

  /** Split the brief into bullet lines. */
  readonly lines = computed(() => {
    const b = this.brief();
    if (!b) return [] as string[];
    return b
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\s>*-•\d.)]+/, "").trim())
      .filter((l) => l.length > 0);
  });
}
