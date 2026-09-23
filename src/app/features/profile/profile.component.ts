import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { UserService } from "../../core/services/user.service";
import { OAuthService } from "../../core/services/oauth.service";
import { ToastService } from "../../core/services/toast.service";
import { Router } from "@angular/router";
import {
  OAuthProvider,
  OAuthProvidersResponse,
  OAuthProviderStatus,
  EmailSyncResult
} from "../../core/models";

interface ProviderMeta {
  key: OAuthProvider;
  name: string;
  /** Tailwind class for the colored dot (Microsoft = slate, Google = rose). */
  dotClass: string;
  /** What the button labels call the provider. */
  shortName: string;
}

interface SyncKey {
  provider: OAuthProvider;
  kind: "emails" | "calendar";
}

/** Pull a human-readable message out of an Angular HTTP error response. */
function errMessage(err: HttpErrorResponse | unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Partial<HttpErrorResponse> & {
    error?: { message?: string } | string;
    message?: string;
  };
  if (e.error && typeof e.error === "object" && e.error.message) {
    return e.error.message;
  }
  if (typeof e.error === "string" && e.error) {
    return e.error;
  }
  return e.message;
}

/**
 * Profile / Settings page.
 *
 * Layout:
 *  1. Profile form (first-run create or edit) — name, email, title, avatar
 *     color, timezone.
 *  2. Email accounts section — connect/disconnect Microsoft and Google,
 *     plus on-demand "Sync emails" and "Sync calendar" buttons.
 *  3. A small "Need test data?" card at the bottom (load demo emails/events)
 *     for users who haven't set up OAuth2 yet.
 */
@Component({
  selector: "hb-profile",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-2xl mx-auto">
      <header class="mb-6">
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {{ isCreateMode() ? "Create your profile" : "Profile & Settings" }}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {{ isCreateMode()
            ? "Set up your workspace identity. All emails, calendar events, and AI features will sync with your profile."
            : "Update your name, email, and preferences. Changes apply instantly across the workspace." }}
        </p>
      </header>

      <!-- Loading state -->
      @if (checking()) {
        <div class="flex items-center gap-3 text-sm text-slate-500 p-8 justify-center">
          <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
          Checking profile…
        </div>
      }

      <!-- Form (create or edit) -->
      @if (!checking()) {
        <form (ngSubmit)="save()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" for="fullName">
              Full name <span class="text-rose-500">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              [(ngModel)]="form.fullName"
              placeholder="e.g. Aarav Patel"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" for="email">
              Email <span class="text-rose-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              [(ngModel)]="form.email"
              placeholder="you@example.com"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
            <p class="text-xs text-slate-400 mt-1">
              All your inbox emails, calendar events, and AI triage are associated with this email.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" for="title">
              Job title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              [(ngModel)]="form.title"
              placeholder="e.g. Senior Engineering Manager"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" for="avatarColor">
                Avatar color
              </label>
              <select
                id="avatarColor"
                name="avatarColor"
                [(ngModel)]="form.avatarColor"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                <option value="emerald">Emerald</option>
                <option value="teal">Teal</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
                <option value="slate">Slate</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" for="timezone">
                Timezone
              </label>
              <input
                id="timezone"
                name="timezone"
                type="text"
                [(ngModel)]="form.timezone"
                placeholder="Asia/Calcutta"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              [disabled]="saving()"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              @if (saving()) {
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Saving…
              } @else {
                {{ isCreateMode() ? "Create profile" : "Save changes" }}
              }
            </button>
            @if (!isCreateMode()) {
              <button
                type="button"
                (click)="cancel()"
                class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            }
          </div>
        </form>

        <!-- Profile picture + Resume sections (only in edit mode) -->
        @if (!isCreateMode()) {
          <!-- Profile Picture -->
          <section class="mt-8 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile Picture</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload a photo — shown in the sidebar + dashboard.</p>
            </div>
            <div class="flex items-center gap-4">
              @if (userSvc.user()?.profilePic) {
                <img [src]="userSvc.user()!.profilePic" alt="Profile" class="h-16 w-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
              } @else {
                <div class="h-16 w-16 rounded-full bg-emerald-600 text-white grid place-items-center text-xl font-semibold">
                  {{ (form.fullName || 'U').charAt(0).toUpperCase() }}
                </div>
              }
              <label class="cursor-pointer px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium transition-colors">
                Choose Photo
                <input type="file" accept="image/*" (change)="onProfilePicSelected($event)" class="hidden" />
              </label>
              @if (uploadingPic()) {
                <span class="text-xs text-slate-400 flex items-center gap-1">
                  <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
                  Uploading…
                </span>
              }
            </div>
          </section>

          <!-- Resume Upload -->
          <section class="mt-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Resume</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload your resume — AI parses it and powers the Job Finder.</p>
            </div>
            @if (storedResume()) {
              <!-- Parsed resume profile -->
              <div class="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Resume Parsed</span>
                  <span class="text-xs text-slate-400">{{ storedResume()!.fileName }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div><span class="text-slate-400">Name:</span> {{ storedResume()!.fullName }}</div>
                  <div><span class="text-slate-400">Title:</span> {{ storedResume()!.currentTitle }}</div>
                  <div><span class="text-slate-400">Experience:</span> {{ storedResume()!.yearsExperience }} yrs</div>
                  <div><span class="text-slate-400">Location:</span> {{ storedResume()!.location }}</div>
                </div>
                <div>
                  <span class="text-xs text-slate-400">Skills:</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    @for (s of storedResume()!.skills; track s) {
                      <span class="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{{ s }}</span>
                    }
                  </div>
                </div>
              </div>
            }
            <div class="flex items-center gap-3">
              <label class="cursor-pointer px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors">
                Upload Resume (PDF/DOC/TXT)
                <input type="file" accept=".pdf,.doc,.docx,.txt" (change)="onResumeSelected($event)" class="hidden" />
              </label>
              @if (uploadingResume()) {
                <span class="text-xs text-slate-400 flex items-center gap-1">
                  <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
                  Parsing with AI…
                </span>
              }
            </div>
            <!-- Fallback: paste as text -->
            <details class="text-xs">
              <summary class="cursor-pointer text-slate-500 hover:text-slate-700">Or paste resume text</summary>
              <textarea
                #resumeTextarea
                rows="5"
                placeholder="Paste your resume text here…"
                class="w-full mt-2 p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono resize-y"
              ></textarea>
              <button type="button" (click)="uploadResumeText(resumeTextarea.value)" class="mt-1 px-3 py-1 rounded bg-slate-700 text-white text-xs">Parse Text</button>
            </details>
          </section>
        }

        <!-- Email accounts section (only in edit mode) -->
        @if (!isCreateMode()) {
          <section class="mt-8">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Email accounts
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Connect your real Microsoft / Google mailbox to sync actual emails and calendar events.
                </p>
              </div>
              <button
                type="button"
                (click)="refreshProviders()"
                [disabled]="oauth.loading()"
                class="hb-btn-ghost !py-1.5 !px-2.5 text-xs"
                aria-label="Refresh connection status"
                title="Refresh connection status"
              >
                @if (oauth.loading()) {
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                }
                <span class="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div class="space-y-3">
              @for (p of providerList; track p.key) {
                <div class="hb-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <!-- Provider identity -->
                  <div class="flex items-center gap-3 sm:flex-1 min-w-0">
                    <span
                      class="h-9 w-9 rounded-full shrink-0 grid place-items-center text-white"
                      [class]="p.dotClass"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                        <path [attr.d]="providerIcon(p.key)" />
                      </svg>
                    </span>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {{ p.name }}
                      </div>
                      <!-- Status line -->
                      @if (!providers()) {
                        <div class="text-xs text-slate-400">Checking status…</div>
                      } @else if (!statusOf(p.key)!.configured) {
                        <div class="text-xs text-slate-400">
                          Not configured. See OAUTH2_SETUP.md.
                        </div>
                      } @else if (!statusOf(p.key)!.connected) {
                        <div class="text-xs text-slate-500 dark:text-slate-400">
                          Not connected
                        </div>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 mt-0.5 hb-badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Connected as {{ statusOf(p.key)!.emailAddress || p.shortName }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Action area -->
                  <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                    @if (providers() && statusOf(p.key)!.configured && !statusOf(p.key)!.connected) {
                      <button
                        type="button"
                        (click)="connect(p.key)"
                        [disabled]="connecting() === p.key"
                        class="hb-btn-primary !py-1.5 !px-3 text-xs"
                      >
                        @if (connecting() === p.key) {
                          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                          </svg>
                          Redirecting…
                        } @else {
                          Connect {{ p.shortName }}
                        }
                      </button>
                    }

                    @if (providers() && statusOf(p.key)!.connected) {
                      <button
                        type="button"
                        (click)="syncEmails(p.key)"
                        [disabled]="isSyncing(p.key, 'emails')"
                        class="hb-btn-primary !py-1.5 !px-3 text-xs"
                      >
                        @if (isSyncing(p.key, 'emails')) {
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
                          Sync emails
                        }
                      </button>

                      <button
                        type="button"
                        (click)="syncCalendar(p.key)"
                        [disabled]="isSyncing(p.key, 'calendar')"
                        class="hb-btn-outline !py-1.5 !px-3 text-xs"
                      >
                        @if (isSyncing(p.key, 'calendar')) {
                          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                          </svg>
                          Syncing…
                        } @else {
                          Sync calendar
                        }
                      </button>

                      <button
                        type="button"
                        (click)="disconnect(p.key)"
                        [disabled]="disconnecting() === p.key"
                        class="hb-btn-outline !py-1.5 !px-3 text-xs !border-rose-300 dark:!border-rose-800 !text-rose-600 dark:!text-rose-400 hover:!bg-rose-50 dark:hover:!bg-rose-950/30"
                      >
                        @if (disconnecting() === p.key) {
                          <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                          </svg>
                        } @else {
                          Disconnect
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            @if (providers() && !anyConfigured()) {
              <div class="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
                No OAuth2 providers are configured on the backend yet. See <code class="font-mono">OAUTH2_SETUP.md</code> in the project root for how to register Microsoft / Google app credentials.
              </div>
            }
          </section>

          <!-- Need test data? (small card) -->
          <section class="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Need test data?
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Load 12 sample emails + 12 calendar events + 1 pending approval
                  if you haven't set up OAuth2 yet.
                </p>
              </div>
              <button
                type="button"
                (click)="loadDemoData()"
                [disabled]="seeding()"
                class="hb-btn-outline !py-1.5 !px-3 text-xs shrink-0"
              >
                @if (seeding()) {
                  <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                  </svg>
                  Loading…
                } @else {
                  Load demo data
                }
              </button>
            </div>
          </section>
        }
      }
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  protected readonly oauth = inject(OAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly checking = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly seeding = signal<boolean>(false);
  readonly isCreateMode = signal<boolean>(false);

  // Profile pic + resume upload state
  readonly uploadingPic = signal<boolean>(false);
  readonly uploadingResume = signal<boolean>(false);
  readonly storedResume = signal<any>(null);

  /** Currently fetching authorizeUrl for this provider (full redirect pending). */
  readonly connecting = signal<OAuthProvider | null>(null);
  /** Currently running sync for this provider/kind. */
  readonly syncing = signal<SyncKey | null>(null);
  /** Currently disconnecting this provider. */
  readonly disconnecting = signal<OAuthProvider | null>(null);

  /** Cached providers status from `oauth.providers` (read-only signal). */
  readonly providers: () => OAuthProvidersResponse | null = this.oauth.providers;
  readonly anyConfigured = computed<boolean>(() => {
    const all = this.oauth.providers();
    if (!all) return false;
    return !!all.microsoft?.configured || !!all.google?.configured;
  });

  readonly providerList: ProviderMeta[] = [
    {
      key: "microsoft",
      name: "Microsoft / Outlook",
      shortName: "Outlook",
      dotClass: "bg-slate-700 dark:bg-slate-600"
    },
    {
      key: "google",
      name: "Gmail / Google Workspace",
      shortName: "Gmail",
      dotClass: "bg-rose-500"
    }
  ];

  form = {
    fullName: "",
    email: "",
    title: "",
    avatarColor: "emerald",
    timezone: "Asia/Calcutta"
  };

  ngOnInit(): void {
    // First check if any user exists. If not → create mode. If yes → load + edit mode.
    this.userSvc.checkExists().subscribe({
      next: (r) => {
        if (r.exists) {
          this.isCreateMode.set(false);
          // Load stored resume
          this.userSvc.getResumes().subscribe({
            next: (resumes) => { if (resumes && resumes.length > 0) this.storedResume.set(resumes[0]); },
            error: () => {}
          });
          if (this.userSvc.user()) {
            this.populateForm(this.userSvc.user()!);
            this.checking.set(false);
          } else {
            this.userSvc.loadMe().subscribe({
              next: (u) => {
                this.populateForm(u);
                this.checking.set(false);
              },
              error: () => {
                this.toast.error("Could not load your profile");
                this.checking.set(false);
              }
            });
          }
          // Load OAuth connection status (best-effort, non-fatal).
          this.oauth.getProviders().subscribe({
            error: () => {
              /* The auth interceptor already toasts network errors. */
            }
          });
        } else {
          this.isCreateMode.set(true);
          this.checking.set(false);
        }
      },
      error: () => {
        this.toast.error("Could not check profile status");
        this.checking.set(false);
      }
    });
  }

  private populateForm(u: { fullName: string; email: string; title?: string | null; avatarColor: string; timezone: string }): void {
    this.form.fullName = u.fullName;
    this.form.email = u.email;
    this.form.title = u.title ?? "";
    this.form.avatarColor = u.avatarColor || "emerald";
    this.form.timezone = u.timezone || "Asia/Calcutta";
  }

  save(): void {
    if (!this.form.fullName.trim() || !this.form.email.trim()) {
      this.toast.error("Name and email are required");
      return;
    }
    this.saving.set(true);

    if (this.isCreateMode()) {
      this.userSvc.create({
        fullName: this.form.fullName.trim(),
        email: this.form.email.trim(),
        title: this.form.title.trim(),
        avatarColor: this.form.avatarColor,
        timezone: this.form.timezone
      }).subscribe({
        next: () => {
          this.toast.success("Profile created! Loading demo data…");
          this.userSvc.seedDemoData().subscribe({
            next: (r) => {
              this.toast.success(r.message);
              this.router.navigateByUrl("/dashboard");
            },
            error: () => {
              this.toast.warning("Profile created, but demo data failed. Use the 'Load demo data' button in Profile.");
              this.router.navigateByUrl("/dashboard");
            }
          });
        },
        error: (err) => {
          this.toast.error(err?.error?.message || "Could not create profile");
          this.saving.set(false);
        }
      });
    } else {
      this.userSvc.updateMe({
        fullName: this.form.fullName.trim(),
        email: this.form.email.trim(),
        title: this.form.title.trim(),
        avatarColor: this.form.avatarColor,
        timezone: this.form.timezone
      }).subscribe({
        next: () => {
          this.toast.success("Profile updated");
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message || "Could not update profile");
          this.saving.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigateByUrl("/dashboard");
  }

  /** Re-fetch the OAuth connection status (Refresh button). */
  refreshProviders(): void {
    this.oauth.getProviders().subscribe({
      next: () => this.toast.info("Connection status refreshed"),
      error: () => { /* interceptor toasts */ }
    });
  }

  /** Returns the cached status of a provider (or null if not loaded yet). */
  statusOf(provider: OAuthProvider): OAuthProviderStatus | null {
    return this.oauth.statusOf(provider);
  }

  /** True when a sync of the given provider+kind is in flight. */
  isSyncing(provider: OAuthProvider, kind: "emails" | "calendar"): boolean {
    const s = this.syncing();
    return !!s && s.provider === provider && s.kind === kind;
  }

  /** Kick off the OAuth2 consent redirect for a provider. */
  connect(provider: OAuthProvider): void {
    this.connecting.set(provider);
    const label = provider === "microsoft" ? "Microsoft" : "Google";
    this.oauth.connect(provider).subscribe({
      next: (res) => {
        if (!res?.authorizeUrl) {
          this.toast.error(
            `Could not start ${label} connection`,
            "Backend returned no authorize URL."
          );
          this.connecting.set(null);
          return;
        }
        this.toast.info(`Redirecting to ${label}…`, "You'll come back to Harsh-Boss after consent.");
        // Full page redirect to the provider's consent screen.
        window.location.href = res.authorizeUrl;
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(
          `Could not start ${label} connection`,
          errMessage(err) || "Please try again."
        );
        this.connecting.set(null);
      }
    });
  }

  /** Disconnect a provider (with confirm). */
  disconnect(provider: OAuthProvider): void {
    const label = provider === "microsoft" ? "Microsoft" : "Google";
    const email = this.statusOf(provider)?.emailAddress;
    const subject = email ? `${label} (${email})` : label;
    const ok = window.confirm(
      `Disconnect ${subject}?\n\nHarsh-Boss will forget the stored tokens. You can reconnect any time.`
    );
    if (!ok) return;
    this.disconnecting.set(provider);
    this.oauth.disconnect(provider).subscribe({
      next: () => {
        this.toast.success(`${label} disconnected`);
        this.disconnecting.set(null);
        this.oauth.getProviders().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(
          `Could not disconnect ${label}`,
          errMessage(err) || "Please try again."
        );
        this.disconnecting.set(null);
      }
    });
  }

  /** Trigger an email sync for a connected provider. */
  syncEmails(provider: OAuthProvider): void {
    this.syncing.set({ provider, kind: "emails" });
    const label = provider === "microsoft" ? "Outlook" : "Gmail";
    this.oauth.syncEmails(provider, 20).subscribe({
      next: (res: EmailSyncResult) => {
        this.handleSyncSuccess(label, "emails", res);
        this.syncing.set(null);
        // Refresh connection status (in case tokens were just refreshed).
        this.oauth.getProviders().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.handleSyncError(label, "emails", err);
        this.syncing.set(null);
      }
    });
  }

  /** Trigger a calendar sync for a connected provider. */
  syncCalendar(provider: OAuthProvider): void {
    this.syncing.set({ provider, kind: "calendar" });
    const label = provider === "microsoft" ? "Outlook" : "Gmail";
    this.oauth.syncCalendar(provider).subscribe({
      next: (res: EmailSyncResult) => {
        this.handleSyncSuccess(label, "calendar", res);
        this.syncing.set(null);
        this.oauth.getProviders().subscribe();
      },
      error: (err: HttpErrorResponse) => {
        this.handleSyncError(label, "calendar", err);
        this.syncing.set(null);
      }
    });
  }

  private handleSyncSuccess(label: string, kind: "emails" | "calendar", res: EmailSyncResult): void {
    const noun = kind === "emails" ? "emails" : "events";
    const newCount = res?.new ?? 0;
    const fetched = res?.fetched ?? 0;
    const title =
      newCount > 0
        ? `Synced ${newCount} new ${noun} from ${label}`
        : `No new ${noun} from ${label}`;
    const detail =
      res?.message ||
      (fetched > 0 ? `Fetched ${fetched}, all already in Harsh-Boss.` : "Nothing to import.");
    this.toast.success(title, detail);
  }

  private handleSyncError(label: string, kind: "emails" | "calendar", err: HttpErrorResponse | unknown): void {
    const status =
      err && typeof err === "object" && "status" in err
        ? ((err as HttpErrorResponse).status ?? 0)
        : 0;
    const errMsg = errMessage(err);
    const fallback =
      err instanceof Error ? err.message : "Please try again in a moment.";
    const noun = kind === "emails" ? "emails" : "calendar";
    // 401/403 usually means the access token has expired or been revoked.
    if (status === 401 || status === 403) {
      this.toast.error(
        `${label} ${noun} sync failed`,
        "Your access token has expired or been revoked. Please reconnect your account."
      );
      // Refresh status — connected may now be false.
      this.oauth.getProviders().subscribe();
      return;
    }
    this.toast.error(
      `Could not sync ${noun} from ${label}`,
      errMsg || fallback
    );
  }

  /** Simple inline SVG icon path for each provider (no external images). */
  providerIcon(p: OAuthProvider): string {
    if (p === "microsoft") {
      // Four-pane window mark — drawn within a 24×24 grid.
      return "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z";
    }
    // Google "G" — simplified single-path glyph.
    return "M21.35 11.1h-9.17v2.94h5.3c-.23 1.4-1.6 4.1-5.3 4.1-3.2 0-5.8-2.65-5.8-5.92s2.6-5.92 5.8-5.92c1.81 0 3.03.77 3.72 1.43l2.53-2.44C16.4 3.55 14.27 2.6 12.18 2.6 7.4 2.6 3.6 6.4 3.6 11.18s3.8 8.58 8.58 8.58c4.96 0 8.24-3.48 8.24-8.39 0-.56-.06-.99-.07-1.27z";
  }

  loadDemoData(): void {
    this.seeding.set(true);
    this.userSvc.seedDemoData().subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.seeding.set(false);
      },
      error: () => {
        this.toast.error("Could not load demo data");
        this.seeding.set(false);
      }
    });
  }

  /** Profile picture upload handler */
  onProfilePicSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error("Image too large (max 5MB)");
      return;
    }
    this.uploadingPic.set(true);
    this.userSvc.uploadProfilePic(file).subscribe({
      next: () => {
        this.uploadingPic.set(false);
        this.toast.success("Profile picture updated");
      },
      error: () => {
        this.uploadingPic.set(false);
        this.toast.error("Could not upload profile picture");
      }
    });
  }

  /** Resume file upload handler (PDF/DOC/TXT) */
  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadingResume.set(true);
    this.userSvc.uploadResume(file).subscribe({
      next: (resume) => {
        this.storedResume.set(resume);
        this.uploadingResume.set(false);
        this.toast.success("Resume parsed! Skills extracted.");
      },
      error: () => {
        this.uploadingResume.set(false);
        this.toast.error("Could not parse resume. Try pasting as text.");
      }
    });
  }

  /** Resume text upload handler (fallback) */
  uploadResumeText(text: string): void {
    if (!text.trim()) return;
    this.uploadingResume.set(true);
    this.userSvc.uploadResumeText(text, "resume.txt").subscribe({
      next: (resume) => {
        this.storedResume.set(resume);
        this.uploadingResume.set(false);
        this.toast.success("Resume parsed from text!");
      },
      error: () => {
        this.uploadingResume.set(false);
        this.toast.error("Could not parse resume text");
      }
    });
  }
}
