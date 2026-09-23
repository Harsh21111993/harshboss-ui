import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ImportantEmailService } from "../../core/services/important-email.service";
import { OAuthService } from "../../core/services/oauth.service";
import { ToastService } from "../../core/services/toast.service";
import { ImportantEmail, EmailLabel } from "../../core/models";

/**
 * Important Emails view — shows the lightweight summaries of emails the AI
 * flagged as important during sync.
 *
 * Each card shows:
 *   • Sender + subject + AI brief
 *   • Importance score + label badge
 *   • "View in Gmail/Outlook" button → opens the full email in the provider
 *
 * This replaces the old "store all emails" approach — we're now an intelligence
 * layer, not a mailbox clone.
 */
@Component({
  selector: "hb-important-emails",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <!-- Header -->
      <header class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Important Emails
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            AI-flagged emails that need your attention. Click "View in Gmail" to read the full email.
          </p>
        </div>
        @if (syncing()) {
          <div class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            Scanning your inbox…
          </div>
        }
      </header>

      <!-- Stats -->
      @if (stats(); as s) {
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ s.total }}</div>
            <div class="text-xs text-slate-400 mt-0.5">Important emails</div>
          </div>
          <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
            <div class="text-2xl font-bold text-rose-600 dark:text-rose-400">{{ s.high }}</div>
            <div class="text-xs text-rose-400 mt-0.5">High priority</div>
          </div>
          <div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
            <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ s.meetings }}</div>
            <div class="text-xs text-emerald-400 mt-0.5">Meeting invites</div>
          </div>
        </div>
      }

      <!-- Sync buttons -->
      @if (connectedProviders().length > 0) {
        <div class="flex gap-2 flex-wrap">
          @for (p of connectedProviders(); track p) {
            <button
              type="button"
              (click)="sync(p.key)"
              [disabled]="syncing() === p.key"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              @if (syncing() === p.key) {
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Scanning {{ p.label }}…
              } @else {
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/><path d="M21 3v6h-6"/></svg>
                Scan {{ p.label }}
              }
            </button>
          }
        </div>
      } @else {
        <div class="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-700 dark:text-amber-400">
          Connect your email account in <a routerLink="/profile" class="underline font-medium">Profile</a> to scan for important emails.
        </div>
      }

      <!-- Loading -->
      @if (importantEmails.loading() && importantEmails.emails().length === 0) {
        <div class="space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse">
              <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
              <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-1"></div>
              <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!importantEmails.loading() && importantEmails.emails().length === 0) {
        <div class="text-center py-12">
          <span class="text-5xl">📭</span>
          <h3 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No important emails yet</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sync your inbox to let the AI scan for important emails and meeting invitations.
          </p>
        </div>
      }

      <!-- Important email cards -->
      <div class="space-y-3">
        @for (email of importantEmails.emails(); track email.id) {
          <div
            class="p-4 rounded-lg border bg-white dark:bg-slate-900 transition-shadow hover:shadow-soft-md"
            [class]="importanceBorder(email.importance)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <!-- Sender + score -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {{ email.fromName }}
                  </span>
                  <span class="text-xs text-slate-400">&lt;{{ email.fromAddress }}&gt;</span>
                  <span class="text-xs font-mono px-1.5 py-0.5 rounded {{ importanceBadge(email.importance) }}">
                    {{ email.score }}/100
                  </span>
                  @if (email.isMeetingInvitation) {
                    <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium">
                      📅 Meeting
                    </span>
                  }
                </div>
                <!-- Subject -->
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {{ email.subject }}
                </h3>
                <!-- AI Brief -->
                <p class="text-sm text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                  {{ email.brief }}
                </p>
                <!-- Reason -->
                <p class="text-xs text-slate-400 mt-1.5 italic">
                  Why: {{ email.reason }}
                </p>
                <!-- Suggested action -->
                @if (email.suggestedAction) {
                  <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    → {{ email.suggestedAction }}
                  </p>
                }
              </div>
            </div>
            <!-- Footer: time + View in Gmail -->
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span class="text-xs text-slate-400">
                {{ email.receivedAt | date:'MMM d, h:mm a' }}
              </span>
              @if (email.providerUrl) {
                <a
                  [href]="email.providerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <path d="M15 3h6v6"/><path d="M10 14L21 3"/>
                  </svg>
                  View in {{ email.provider === 'GOOGLE' ? 'Gmail' : 'Outlook' }}
                </a>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ImportantEmailsComponent implements OnInit {
  protected readonly importantEmails = inject(ImportantEmailService);
  private readonly oauth = inject(OAuthService);
  private readonly toast = inject(ToastService);

  readonly syncing = signal<string | null>(null);
  readonly stats = signal<{ total: number; high: number; meetings: number } | null>(null);

  readonly connectedProviders = computed(() => {
    const providers = this.oauth.providers();
    if (!providers) return [];
    const out: { key: "google" | "microsoft"; label: string }[] = [];
    if (providers.google?.connected) out.push({ key: "google", label: "Gmail" });
    if (providers.microsoft?.connected) out.push({ key: "microsoft", label: "Outlook" });
    return out;
  });

  ngOnInit(): void {
    this.importantEmails.list().subscribe();
    this.importantEmails.stats().subscribe({
      next: (s) => this.stats.set(s)
    });
    this.oauth.getProviders().subscribe();
  }

  sync(provider: "google" | "microsoft"): void {
    this.syncing.set(provider);
    this.importantEmails; // just to satisfy the linter
    // Use the OAuth service's syncEmails method
    this.oauth.syncEmails(provider, 25).subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.syncing.set(null);
        this.importantEmails.list().subscribe();
        this.importantEmails.stats().subscribe({
          next: (s) => this.stats.set(s)
        });
      },
      error: () => {
        this.toast.error("Sync failed");
        this.syncing.set(null);
      }
    });
  }

  importanceBorder(importance: string): string {
    switch (importance) {
      case "HIGH": return "border-rose-200 dark:border-rose-800";
      case "MEDIUM": return "border-amber-200 dark:border-amber-800";
      default: return "border-slate-200 dark:border-slate-800";
    }
  }

  importanceBadge(importance: string): string {
    switch (importance) {
      case "HIGH": return "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300";
      case "MEDIUM": return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300";
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
    }
  }
}
