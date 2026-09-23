import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Email } from "../../core/models";
import { AvatarComponent } from "../../shared/components/avatar.component";
import { AiAnalysisCardComponent } from "./ai-analysis-card.component";
import { TimeAgoPipe } from "../../shared/pipes/time-ago.pipe";

/**
 * EmailDetail — full email body + AI analysis card.
 * Used in the right pane on desktop and as a modal/drawer on mobile.
 */
@Component({
  selector: "hb-email-detail",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvatarComponent, AiAnalysisCardComponent, TimeAgoPipe],
  template: `
    @if (email(); as e) {
      <article class="flex flex-col h-full">
        <!-- Header -->
        <header class="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <hb-avatar [name]="e.fromName" [size]="40" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {{ e.fromName }}
              </span>
              <span class="text-xs text-slate-400 truncate">{{ e.from }}</span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">
              to me · {{ e.receivedAt | timeAgo }}
            </div>
          </div>
          <button
            type="button"
            class="hb-btn-ghost !p-2 lg:hidden"
            (click)="close.emit()"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          <div>
            <h2 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ e.subject }}
            </h2>
            @if (e.folder === 'SPAM') {
              <span class="hb-badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 mt-1">
                Filed in Spam
              </span>
            }
          </div>

          <pre class="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed">{{ e.body }}</pre>

          <hb-ai-analysis-card
            [analysis]="e.analysis"
            [loading]="analyzing()"
            (analyze)="analyze.emit()"
          />
        </div>

        <!-- Footer actions -->
        <footer class="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            class="hb-btn-outline"
            (click)="analyze.emit()"
            [disabled]="analyzing()"
          >
            @if (analyzing()) {
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
              Analyzing…
            } @else {
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3l1.9 5.8H20l-4.7 3.4 1.8 5.8L12 14.6l-5.1 3.4 1.8-5.8L4 8.8h6.1z" />
              </svg>
              {{ e.analysis ? 'Re-analyze' : 'Analyze' }}
            }
          </button>
          <button type="button" class="hb-btn-ghost" (click)="close.emit()">Close</button>
        </footer>
      </article>
    } @else {
      <div class="h-full grid place-items-center p-6">
        <div class="text-center max-w-xs">
          <span class="inline-grid place-items-center h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4l8 5 8-5" />
            </svg>
          </span>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Select an email to see its contents and AI analysis.
          </p>
        </div>
      </div>
    }
  `
})
export class EmailDetailComponent {
  readonly email = input<Email | null>(null);
  readonly analyzing = input<boolean>(false);
  readonly analyze = output<void>();
  readonly close = output<void>();
}
