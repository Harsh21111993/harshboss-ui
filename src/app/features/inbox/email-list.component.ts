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
import { LabelBadgeComponent } from "../../shared/components/label-badge.component";
import { ImportanceDotComponent } from "../../shared/components/importance-dot.component";
import { TimeAgoPipe } from "../../shared/pipes/time-ago.pipe";

/**
 * EmailList — the inbox email list.
 * Each row shows: avatar, sender, subject, preview, time-ago, folder badge,
 * AI label badge, importance dot, unread indicator, and a "buried important"
 * rose badge when a spam-folder email has a non-spam AI label.
 */
@Component({
  selector: "hb-email-list",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AvatarComponent,
    LabelBadgeComponent,
    ImportanceDotComponent,
    TimeAgoPipe
  ],
  template: `
    <ul class="divide-y divide-slate-100 dark:divide-slate-800">
      @for (e of emails(); track e.id) {
        <li>
          <button
            type="button"
            (click)="select.emit(e.id)"
            class="w-full text-left px-3 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            [ngClass]="selectedId() === e.id ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''"
            [class.font-semibold]="!e.isRead"
            [attr.aria-current]="selectedId() === e.id ? 'true' : null"
          >
            <!-- Avatar + unread dot -->
            <div class="relative shrink-0">
              <hb-avatar [name]="e.fromName" [size]="40" />
              @if (!e.isRead) {
                <span
                  class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                  aria-label="Unread"
                ></span>
              }
            </div>

            <div class="min-w-0 flex-1">
              <!-- Top row: name + time + importance -->
              <div class="flex items-center gap-2">
                <span
                  class="text-sm truncate flex-1"
                  [class.font-semibold]="!e.isRead"
                  [class.text-slate-900]="!e.isRead"
                  [class.dark:text-slate-100]="!e.isRead"
                  [class.text-slate-700]="e.isRead"
                  [class.dark:text-slate-300]="e.isRead"
                >
                  {{ e.fromName }}
                </span>
                @if (e.analysis?.importance) {
                  <hb-importance-dot [importance]="e.analysis!.importance" />
                }
                <span class="text-[11px] text-slate-400 shrink-0">
                  {{ e.receivedAt | timeAgo }}
                </span>
              </div>

              <!-- Subject -->
              <div
                class="text-sm mt-0.5 truncate"
                [class.font-medium]="!e.isRead"
                [class.text-slate-900]="!e.isRead"
                [class.dark:text-slate-100]="!e.isRead"
                [class.text-slate-600]="e.isRead"
                [class.dark:text-slate-400]="e.isRead"
              >
                {{ e.subject }}
              </div>

              <!-- Preview -->
              <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {{ preview(e.body) }}
              </div>

              <!-- Badges -->
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                @if (e.folder === 'SPAM') {
                  <span class="hb-badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Spam folder
                  </span>
                }
                @if (e.analysis?.label) {
                  <hb-label-badge [label]="e.analysis!.label" />
                }
                @if (isBuriedImportant(e)) {
                  <span class="hb-badge bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    Buried important
                  </span>
                }
                @if (!e.analysis) {
                  <span class="hb-badge bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700">
                    Not analyzed
                  </span>
                }
              </div>
            </div>
          </button>
        </li>
      } @empty {
        <li class="px-4 py-12 text-center text-sm text-slate-400">
          No emails match the current filters.
        </li>
      }
    </ul>
  `
})
export class EmailListComponent {
  readonly emails = input.required<Email[]>();
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();

  /** Truncate body to a short preview. */
  preview(body: string): string {
    const t = (body || "").replace(/\s+/g, " ").trim();
    return t.length > 80 ? t.slice(0, 80) + "…" : t;
  }

  /** A spam-folder email labeled anything other than SPAM is "buried important". */
  isBuriedImportant(e: Email): boolean {
    return (
      e.folder === "SPAM" &&
      !!e.analysis &&
      e.analysis.label !== "SPAM"
    );
  }
}
