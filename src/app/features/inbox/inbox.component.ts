import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  computed,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { EmailService } from "../../core/services/email.service";
import { ToastService } from "../../core/services/toast.service";
import { OAuthService } from "../../core/services/oauth.service";
import { SemanticSearchService, SemanticSearchHit } from "../../core/services/semantic-search.service";
import { UiStore, InboxFilter } from "../../core/store/ui.store";
import { Email, EmailLabel, OAuthProvider } from "../../core/models";
import { EmailListComponent } from "./email-list.component";
import { EmailDetailComponent } from "./email-detail.component";

@Component({
  selector: "hb-inbox",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, EmailListComponent, EmailDetailComponent],
  template: `
    <div class="h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
      <!-- Filter bar -->
      <div class="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
          @for (f of filters; track f.key) {
            <button
              type="button"
              (click)="setFilter(f.key)"
              class="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors"
              [class]="
                ui.inboxFilter() === f.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-soft'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              "
            >
              {{ f.label }}
            </button>
          }
        </div>

        <select
          class="hb-input !w-auto !py-1.5 text-xs sm:text-sm"
          [value]="ui.selectedLabelFilter() ?? ''"
          (change)="onLabelChange($event)"
          aria-label="Filter by label"
        >
          <option value="">All labels</option>
          @for (l of labels; track l) {
            <option [value]="l">{{ labelDisplay(l) }}</option>
          }
        </select>

        <label class="ml-auto inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
            [checked]="ui.includeSpam()"
            (change)="ui.toggleIncludeSpam(); refresh()"
          />
          Include spam folder
        </label>

        <button
          type="button"
          class="hb-btn-primary"
          (click)="analyzeAll()"
          [disabled]="emailsSvc.analyzingAll()"
        >
          @if (emailsSvc.analyzingAll()) {
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            Analyzing {{ progress().done }}/{{ progress().total }}…
          } @else {
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.9 5.8H20l-4.7 3.4 1.8 5.8L12 14.6l-5.1 3.4 1.8-5.8L4 8.8h6.1z" />
            </svg>
            Analyze all
          }
        </button>
      </div>

      <!-- Semantic search bar (PGVector) -->
      <div class="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <form (ngSubmit)="semanticSearch()" class="flex gap-2">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Semantic search: 'emails about the Q3 budget'…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            [disabled]="!searchQuery.trim() || semanticSearching()"
            class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            @if (semanticSearching()) {
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            } @else {
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            }
            Search
          </button>
          @if (searchResults().length > 0) {
            <button
              type="button"
              (click)="clearSearch()"
              class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm transition-colors"
            >
              Clear
            </button>
          }
        </form>

        @if (searchResults().length > 0) {
          <div class="mt-2 space-y-1">
            <p class="text-xs text-slate-400">{{ searchResults().length }} results for "{{ lastSearchQuery() }}" (by semantic similarity)</p>
            @for (r of searchResults(); track r.emailId) {
              <button
                type="button"
                (click)="openSearchResult(r.emailId)"
                class="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-10">{{ (r.score * 100).toFixed(0) }}%</span>
                <span class="text-sm text-slate-900 dark:text-slate-100 truncate flex-1">{{ r.subject }}</span>
                <span class="text-xs text-slate-400 truncate">{{ r.from }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- Sync real emails from connected providers -->
      @if (connectedProviders().length > 0) {
        @for (p of connectedProviders(); track p.key) {
          <button
            type="button"
            class="hb-btn-outline !py-1.5 !px-3 text-xs sm:text-sm"
            (click)="syncFromProvider(p.key)"
              [disabled]="syncingProvider() === p.key"
              [attr.aria-label]="'Sync emails from ' + p.label"
              [title]="'Sync emails from ' + p.label"
            >
              @if (syncingProvider() === p.key) {
                <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Syncing…
              } @else {
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Sync {{ p.label }}
              }
            </button>
          }
        } @else if (providersLoaded()) {
          <!-- No providers connected yet → push user to Profile to connect one -->
          <a
            routerLink="/profile"
            class="hb-btn-ghost !py-1.5 !px-3 text-xs sm:text-sm"
            title="Connect your Outlook or Gmail account"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Connect your email
          </a>
        }
      </div>

      <!-- Analyze-all progress bar -->
      @if (emailsSvc.analyzingAll()) {
        <div class="px-4 sm:px-6 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900">
          <div class="flex items-center gap-3">
            <span class="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              Analyzing {{ progress().done }} of {{ progress().total }} emails…
            </span>
            <div class="flex-1 h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
              <div
                class="h-full bg-emerald-500 transition-all"
                [style.width.%]="progressPct()"
              ></div>
            </div>
          </div>
        </div>
      }

      <!-- Split view -->
      <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <!-- Email list -->
        <div class="border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-white dark:bg-slate-900">
          @if (emailsSvc.loading() && filtered().length === 0) {
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (i of [1,2,3,4,5,6]; track i) {
                <li class="px-3 py-3 flex gap-3">
                  <span class="hb-skeleton h-10 w-10 rounded-full"></span>
                  <div class="flex-1 space-y-1.5">
                    <span class="hb-skeleton block h-3 w-1/3"></span>
                    <span class="hb-skeleton block h-3 w-2/3"></span>
                    <span class="hb-skeleton block h-3 w-1/2"></span>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <hb-email-list
              [emails]="filtered()"
              [selectedId]="selectedId()"
              (select)="selectEmail($event)"
            />
          }
        </div>

        <!-- Email detail (right pane on desktop) -->
        <div class="hidden lg:block bg-slate-50 dark:bg-slate-950">
          <hb-email-detail
            [email]="selectedEmail()"
            [analyzing]="analyzingId() === selectedId()"
            (analyze)="analyzeSelected()"
            (close)="selectEmail(null)"
          />
        </div>
      </div>
    </div>

    <!-- Mobile detail drawer -->
    @if (selectedEmail()) {
      <div class="lg:hidden fixed inset-0 z-50 flex">
        <div
          class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          (click)="selectEmail(null)"
          aria-hidden="true"
        ></div>
        <div class="relative ml-auto w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-xl animate-slide-in-right flex flex-col">
          <hb-email-detail
            [email]="selectedEmail()"
            [analyzing]="analyzingId() === selectedId()"
            (analyze)="analyzeSelected()"
            (close)="selectEmail(null)"
          />
        </div>
      </div>
    }
  `
})
export class InboxComponent implements OnInit, OnDestroy {
  protected readonly emailsSvc = inject(EmailService);
  protected readonly ui = inject(UiStore);
  protected readonly oauth = inject(OAuthService);
  protected readonly semantic = inject(SemanticSearchService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Semantic search state
  searchQuery = "";
  readonly semanticSearching = signal(false);
  readonly searchResults = signal<SemanticSearchHit[]>([]);
  readonly lastSearchQuery = signal("");

  semanticSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.semanticSearching.set(true);
    this.semantic.search(q, 10).subscribe({
      next: (r) => {
        this.searchResults.set(r.results || []);
        this.lastSearchQuery.set(q);
        this.semanticSearching.set(false);
        if (!r.results || r.results.length === 0) {
          this.toast.info("No semantically similar emails found");
        }
      },
      error: () => {
        this.toast.error("Semantic search failed");
        this.semanticSearching.set(false);
      }
    });
  }

  clearSearch(): void {
    this.searchResults.set([]);
    this.lastSearchQuery.set("");
    this.searchQuery = "";
  }

  openSearchResult(emailId: string): void {
    this.ui.selectEmail(emailId);
  }

  private readonly destroy$ = new Subject<void>();

  readonly filters: { key: InboxFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "important", label: "Important" },
    { key: "unread", label: "Unread" }
  ];

  readonly labels: EmailLabel[] = [
    "URGENT",
    "ACTION_REQUIRED",
    "MEETING_REQUEST",
    "FYI",
    "INVOICE",
    "SPAM",
    "PERSONAL"
  ];

  readonly selectedId = signal<string | null>(null);
  readonly analyzingId = signal<string | null>(null);
  /** Provider currently syncing in the toolbar (null = none). */
  readonly syncingProvider = signal<OAuthProvider | null>(null);
  readonly progress = this.emailsSvc.analyzeProgress;
  readonly progressPct = computed(() => {
    const p = this.progress();
    if (!p.total) return 0;
    return Math.round((p.done / p.total) * 100);
  });

  /** List of connected providers (Microsoft / Google) for the Sync buttons. */
  readonly connectedProviders = computed<
    { key: OAuthProvider; label: string }[]
  >(() => {
    const all = this.oauth.providers();
    if (!all) return [];
    const out: { key: OAuthProvider; label: string }[] = [];
    if (all.microsoft?.connected) {
      out.push({ key: "microsoft", label: "Outlook" });
    }
    if (all.google?.connected) {
      out.push({ key: "google", label: "Gmail" });
    }
    return out;
  });

  /** True once the first providers-status fetch has settled (so we know to
   *  show the "Connect your email" link rather than nothing). */
  readonly providersLoaded = computed<boolean>(() => {
    const all = this.oauth.providers();
    return all !== null;
  });

  ngOnInit(): void {
    // Load emails (re-fetch when spam toggle changes).
    this.emailsSvc.getEmails(this.ui.includeSpam()).subscribe();

    // Load OAuth connection status so the toolbar can render Sync buttons.
    this.oauth.getProviders().subscribe();

    // React to ?email= query param (from dashboard "important email" click).
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params.get("email");
        if (id) {
          this.selectedId.set(id);
          this.ui.selectEmail(id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  readonly filtered = computed<Email[]>(() => {
    const all = this.emailsSvc.emails();
    const filter = this.ui.inboxFilter();
    const label = this.ui.selectedLabelFilter();
    let out = all;
    if (!this.ui.includeSpam()) {
      out = out.filter((e) => e.folder !== "SPAM");
    }
    if (filter === "important") {
      out = out.filter(
        (e) => e.analysis && e.analysis.importance !== "LOW"
      );
    } else if (filter === "unread") {
      out = out.filter((e) => !e.isRead);
    }
    if (label) {
      out = out.filter((e) => e.analysis?.label === label);
    }
    // Sort: unread first, then by receivedAt desc.
    return [...out].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });
  });

  readonly selectedEmail = computed<Email | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.emailsSvc.emails().find((e) => e.id === id) ?? null;
  });

  setFilter(f: InboxFilter): void {
    this.ui.setInboxFilter(f);
  }

  onLabelChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value as EmailLabel | "";
    this.ui.setLabelFilter(val ? (val as EmailLabel) : null);
  }

  labelDisplay(l: EmailLabel): string {
    const map: Record<EmailLabel, string> = {
      URGENT: "Urgent",
      ACTION_REQUIRED: "Action required",
      MEETING_REQUEST: "Meeting request",
      FYI: "FYI",
      INVOICE: "Invoice",
      SPAM: "Spam",
      PERSONAL: "Personal"
    };
    return map[l];
  }

  selectEmail(id: string | null): void {
    this.selectedId.set(id);
    this.ui.selectEmail(id);
    // Update ?email= query for shareable state.
    this.router.navigate(["/inbox"], {
      queryParams: id ? { email: id } : {},
      queryParamsHandling: "merge"
    });
  }

  analyzeSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    this.analyzingId.set(id);
    this.emailsSvc.analyzeEmail(id).subscribe({
      next: () => {
        this.analyzingId.set(null);
        this.toast.success("Email analyzed");
      },
      error: () => {
        this.analyzingId.set(null);
        this.toast.error("Could not analyze email");
      }
    });
  }

  analyzeAll(): void {
    const total = this.filtered().length || this.emailsSvc.emails().length;
    this.emailsSvc.analyzeAll().subscribe({
      next: (res) => {
        const errors = (res?.results ?? []).filter((r) => r.error);
        if (errors.length === 0) {
          this.toast.success(
            "Analyzed all emails",
            `${(res?.results ?? []).length} emails triaged`
          );
        } else {
          this.toast.warning(
            "Analyzed with errors",
            `${errors.length} of ${(res?.results ?? []).length} failed`
          );
        }
      },
      error: () => this.toast.error("Analyze-all failed")
    });
  }

  refresh(): void {
    this.emailsSvc.getEmails(this.ui.includeSpam()).subscribe();
  }

  /** Trigger a real email sync from the toolbar and re-fetch the list. */
  syncFromProvider(provider: OAuthProvider): void {
    this.syncingProvider.set(provider);
    const label = provider === "microsoft" ? "Outlook" : "Gmail";
    this.oauth.syncEmails(provider, 20).subscribe({
      next: (res) => {
        const newCount = res?.new ?? 0;
        const fetched = res?.fetched ?? 0;
        const title =
          newCount > 0
            ? `Synced ${newCount} new email${newCount === 1 ? "" : "s"} from ${label}`
            : `No new emails from ${label}`;
        const detail =
          res?.message ||
          (fetched > 0
            ? `Fetched ${fetched}, all already in Harsh-Boss.`
            : "Nothing to import.");
        this.toast.success(title, detail);
        this.syncingProvider.set(null);
        // Re-fetch the inbox list to surface the newly synced emails.
        this.emailsSvc.getEmails(true).subscribe();
        // Refresh connection status (token may have just been refreshed).
        this.oauth.getProviders().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        const status = err?.status ?? 0;
        if (status === 401 || status === 403) {
          this.toast.error(
            `${label} sync failed`,
            "Your access token has expired or been revoked. Please reconnect your account."
          );
          this.oauth.getProviders().subscribe();
        } else {
          const msg =
            err?.error?.message || err?.message || "Please try again in a moment.";
          this.toast.error(`Could not sync from ${label}`, msg);
        }
        this.syncingProvider.set(null);
      }
    });
  }
}
