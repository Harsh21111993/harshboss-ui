import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { EmailAnalysis } from "../../core/models";
import { ImportanceRingComponent } from "../../shared/components/importance-ring.component";
import { LabelBadgeComponent } from "../../shared/components/label-badge.component";

/**
 * AiAnalysisCard — renders the AI triage result for an email:
 *   brief, label badge, importance ring, reason ("Why this score"),
 *   suggested action, action items checklist, key dates.
 */
@Component({
  selector: "hb-ai-analysis-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ImportanceRingComponent, LabelBadgeComponent],
  template: `
    @if (analysis()) {
      <section
        class="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 sm:p-5"
      >
        <header class="flex items-start gap-3">
          <span
            class="grid place-items-center h-9 w-9 rounded-lg bg-emerald-600 text-white shrink-0 shadow-soft"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.9 5.8H20l-4.7 3.4 1.8 5.8L12 14.6l-5.1 3.4 1.8-5.8L4 8.8h6.1z" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                AI Triage
              </h3>
              <hb-label-badge [label]="analysis()!.label" />
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {{ analysis()!.brief }}
            </p>
          </div>
          <hb-importance-ring
            [score]="analysis()!.score"
            [importance]="analysis()!.importance"
            [size]="56"
          />
        </header>

        <dl class="mt-4 space-y-3 text-sm">
          <!-- Why this score -->
          <div>
            <dt class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Why this score
            </dt>
            <dd class="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
              {{ analysis()!.reason }}
            </dd>
          </div>

          <!-- Suggested action -->
          <div>
            <dt class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Suggested action
            </dt>
            <dd class="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
              {{ analysis()!.suggestedAction }}
            </dd>
          </div>

          <!-- Action items -->
          @if (analysis()!.actionItems && analysis()!.actionItems.length > 0) {
            <div>
              <dt class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Action items
              </dt>
              <dd class="mt-1.5">
                <ul class="space-y-1.5">
                  @for (item of analysis()!.actionItems; track $index) {
                    <li class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span
                        class="mt-0.5 grid place-items-center h-4 w-4 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shrink-0"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      <span class="min-w-0">{{ item }}</span>
                    </li>
                  }
                </ul>
              </dd>
            </div>
          }

          <!-- Key dates -->
          @if (analysis()!.keyDates && analysis()!.keyDates.length > 0) {
            <div>
              <dt class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Key dates
              </dt>
              <dd class="mt-1.5">
                <ul class="space-y-1.5">
                  @for (d of analysis()!.keyDates; track $index) {
                    <li class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <svg viewBox="0 0 24 24" class="mt-0.5 h-4 w-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M3 9h18M8 3v4M16 3v4" />
                      </svg>
                      <span class="min-w-0">{{ d }}</span>
                    </li>
                  }
                </ul>
              </dd>
            </div>
          }
        </dl>

        @if (loading()) {
          <div class="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            Analyzing…
          </div>
        }
      </section>
    } @else if (loading()) {
      <section class="hb-card p-4 sm:p-5 space-y-3">
        <div class="flex items-center gap-2">
          <span class="hb-skeleton h-9 w-9 rounded-lg"></span>
          <span class="hb-skeleton h-3 w-24"></span>
        </div>
        <span class="hb-skeleton block h-3 w-full"></span>
        <span class="hb-skeleton block h-3 w-3/4"></span>
        <span class="hb-skeleton block h-3 w-1/2"></span>
      </section>
    } @else {
      <section
        class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 sm:p-5 text-center"
      >
        <p class="text-sm text-slate-500 dark:text-slate-400">
          No AI analysis yet.
        </p>
        <button
          type="button"
          class="hb-btn-primary mt-3"
          (click)="analyze.emit()"
          [disabled]="loading()"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l1.9 5.8H20l-4.7 3.4 1.8 5.8L12 14.6l-5.1 3.4 1.8-5.8L4 8.8h6.1z" />
          </svg>
          Analyze with AI
        </button>
      </section>
    }
  `
})
export class AiAnalysisCardComponent {
  readonly analysis = input<EmailAnalysis | null | undefined>(null);
  readonly loading = input<boolean>(false);
  readonly analyze = output<void>();
}
