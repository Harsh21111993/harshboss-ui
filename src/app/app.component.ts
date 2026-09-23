import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnDestroy,
  computed,
  signal
} from "@angular/core";
import { RouterOutlet, Router, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { filter, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import { UiStore, VIEW_TITLES, ViewKey } from "./core/store/ui.store";
import { ApprovalService } from "./core/services/approval.service";
import { UserService } from "./core/services/user.service";
import { ToastService, Toast } from "./core/services/toast.service";
import { AvatarComponent } from "./shared/components/avatar.component";
import { LoadingTracker } from "./core/interceptors/loading.interceptor";

interface NavItem {
  key: ViewKey;
  label: string;
  route: string;
  icon: string; // inline SVG path data
}

const NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
  },
  {
    key: "inbox",
    label: "Inbox",
    route: "/inbox",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4l8 5 8-5"
  },
  {
    key: "important",
    label: "Important",
    route: "/important",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
  },
  {
    key: "tasks",
    label: "Tasks",
    route: "/tasks",
    icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
  },
  {
    key: "contacts",
    label: "Contacts",
    route: "/contacts",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  },
  {
    key: "jobs",
    label: "Job Finder",
    route: "/jobs",
    icon: "M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"
  },
  {
    key: "portals",
    label: "Job Portals",
    route: "/portals",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"
  },
  {
    key: "interview",
    label: "AI Interview",
    route: "/interview",
    icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8"
  },
  {
    key: "calendar",
    label: "Calendar",
    route: "/calendar",
    icon: "M7 2v2h10V2h2v2h2v18H3V4h2V2h2zm14 6H5v12h16V8z"
  },
  {
    key: "approvals",
    label: "Approvals",
    route: "/approvals",
    icon: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
  },
  {
    key: "profile",
    label: "Profile",
    route: "/profile",
    icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
  },
  {
    key: "agent",
    label: "Ask Harsh-Boss",
    route: "/agent",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
  }
];

@Component({
  selector: "app-root",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, AvatarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <!-- Mobile sidebar backdrop -->
      @if (ui.sidebarOpen()) {
        <div
          class="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          (click)="ui.closeSidebar()"
          aria-hidden="true"
        ></div>
      }

      <div class="flex flex-1 min-h-0">
        <!-- Sidebar -->
        <aside
          class="fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-200 lg:static lg:translate-x-0 lg:flex lg:flex-col"
          [class.translate-x-0]="ui.sidebarOpen()"
          [class.-translate-x-full]="!ui.sidebarOpen()"
          role="navigation"
          aria-label="Primary"
        >
          <div class="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
            <span class="grid place-items-center h-9 w-9 rounded-lg bg-emerald-600 text-white shadow-soft">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <div class="leading-tight">
              <div class="font-semibold text-slate-900 dark:text-slate-100">Harsh-Boss</div>
              <div class="text-[11px] uppercase tracking-wider text-slate-400">AI Workspace</div>
            </div>
          </div>

          <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            @for (item of nav; track item.key) {
              <button
                type="button"
                (click)="navigate(item.route)"
                class="w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                [class]="
                  isActive(item.key)
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                "
                [attr.aria-current]="isActive(item.key) ? 'page' : null"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5 shrink-0"
                  [class]="
                    isActive(item.key)
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  "
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path [attr.d]="item.icon" />
                </svg>
                <span class="flex-1 text-left">{{ item.label }}</span>
                @if (item.key === 'approvals' && pendingCount() > 0) {
                  <span
                    class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-semibold"
                  >{{ pendingCount() }}</span>
                }
              </button>
            }
          </nav>

          <!-- User card (clickable → Profile) -->
          <div class="border-t border-slate-200 dark:border-slate-800 p-3">
            <button
              type="button"
              (click)="navigate('/profile')"
              class="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              @if (user.user()?.profilePic) {
                <img [src]="user.user()!.profilePic" alt="Profile" class="h-9 w-9 rounded-full object-cover" />
              } @else {
                <hb-avatar [name]="user.user()?.fullName || ''" [size]="36" />
              }
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {{ user.user()?.fullName || (user.loading() ? '…' : 'Guest') }}
                </div>
                <div class="text-xs text-slate-400 truncate">{{ user.user()?.email || '' }}</div>
              </div>
            </button>
          </div>
        </aside>

        <!-- Main column -->
        <div class="flex-1 min-w-0 flex flex-col">
          <!-- Topbar -->
          <header
            class="sticky top-0 z-20 flex items-center gap-3 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur"
          >
            <button
              type="button"
              class="lg:hidden hb-btn-ghost !p-2"
              (click)="ui.toggleSidebar()"
              aria-label="Toggle navigation"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate">
              {{ title() }}
            </h1>

            <!-- Loading bar -->
            @if (loading.active()) {
              <span class="hidden sm:inline-flex items-center gap-2 text-xs text-slate-400">
                <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                Loading
              </span>
            }

            <!-- Notification bell -->
            <button
              type="button"
              class="relative hb-btn-ghost !p-2"
              (click)="navigate('/approvals')"
              aria-label="Pending approvals"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              @if (pendingCount() > 0) {
                <span
                  class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold ring-2 ring-white dark:ring-slate-900"
                >{{ pendingCount() }}</span>
              }
            </button>

            <!-- Dark mode toggle -->
            <button
              type="button"
              class="hb-btn-ghost !p-2"
              (click)="ui.toggleDarkMode()"
              [attr.aria-label]="ui.darkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
              [title]="ui.darkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              @if (ui.darkMode()) {
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              }
            </button>
          </header>

          <!-- Routed view -->
          <main class="flex-1 min-w-0">
            <router-outlet></router-outlet>
          </main>

          <!-- Footer (sticky to bottom) -->
          <footer
            class="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <span class="font-medium text-slate-700 dark:text-slate-300">Harsh-Boss</span>
            <span>· AI Productivity Workspace · Angular + Spring Boot</span>
          </footer>
        </div>
      </div>

      <!-- Toast host -->
      <div
        class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        @for (t of toasts(); track t.id) {
          <div
            class="hb-card animate-slide-in-right p-3 flex gap-3 items-start"
            [class]="toastCls(t)"
            role="status"
          >
            <span class="mt-0.5 shrink-0">{{ toastIcon(t) }}</span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold">{{ t.title }}</div>
              @if (t.message) {
                <div class="text-xs mt-0.5 opacity-90 break-words">{{ t.message }}</div>
              }
            </div>
            <button
              type="button"
              class="shrink-0 -m-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              (click)="toast.dismiss(t.id)"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class AppComponent implements OnDestroy {
  protected readonly ui = inject(UiStore);
  protected readonly approvals = inject(ApprovalService);
  protected readonly user = inject(UserService);
  protected readonly toast = inject(ToastService);
  protected readonly loading = inject(LoadingTracker);
  private readonly router = inject(Router);

  protected readonly nav = NAV;
  protected readonly toasts = this.toast.toasts;

  private readonly destroy$ = new Subject<void>();

  /** Sync router URL → UiStore.currentView for nav highlight + topbar title. */
  readonly currentView = signal<ViewKey>("dashboard");

  readonly title = computed(
    () => VIEW_TITLES[this.currentView()] ?? "Harsh-Boss"
  );

  readonly pendingCount = computed(
    () => this.approvals.pendingCount()
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url;
        const seg = url.split("?")[0].split("/")[1] || "dashboard";
        const key =
          seg === "inbox" || seg === "important" || seg === "tasks" || seg === "contacts" || seg === "jobs" || seg === "portals" || seg === "interview" || seg === "calendar" || seg === "approvals" || seg === "profile" || seg === "agent"
            ? (seg as ViewKey)
            : "dashboard";
        this.currentView.set(key);
        this.ui.setView(key);
      });

    // Pre-fetch approvals so the bell badge works app-wide.
    this.approvals.getApprovals().subscribe();

    // Check if a user exists. If not → redirect to the profile (create) page.
    // If yes → load the user so the sidebar + greeting show the real name.
    this.user.checkExists().subscribe({
      next: (r) => {
        if (!r.exists) {
          // First-run: no user in DB → go to the profile create page.
          this.router.navigateByUrl("/profile");
        } else if (!this.user.user()) {
          this.user.loadMe().subscribe({
            error: () => this.toast.error("Could not load user profile")
          });
        }
      },
      error: () => this.toast.error("Could not check profile status")
    });
  }

  isActive(key: ViewKey): boolean {
    return this.currentView() === key;
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
    this.ui.closeSidebar();
  }

  toastCls(t: Toast): string {
    switch (t.kind) {
      case "success":
        return "border-emerald-200 dark:border-emerald-800";
      case "error":
        return "border-rose-200 dark:border-rose-800";
      case "warning":
        return "border-amber-200 dark:border-amber-800";
      default:
        return "border-slate-200 dark:border-slate-800";
    }
  }

  toastIcon(t: Toast): string {
    switch (t.kind) {
      case "success":
        return "✅";
      case "error":
        return "⚠️";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
