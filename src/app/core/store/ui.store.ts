import { Injectable, signal, effect } from "@angular/core";
import { EmailLabel } from "../models";

export type ViewKey = "dashboard" | "inbox" | "important" | "tasks" | "contacts" | "jobs" | "portals" | "interview" | "calendar" | "approvals" | "profile" | "agent";
export type InboxFilter = "all" | "important" | "unread";

/**
 * UiStore — signal-based UI state (no NgRx).
 * Holds the current view, mobile sidebar open state, dark mode (persisted
 * to localStorage), and inbox filter settings.
 */
@Injectable({ providedIn: "root" })
export class UiStore {
  /** Current top-level view, used for nav highlight + topbar title. */
  readonly currentView = signal<ViewKey>("dashboard");

  /** Mobile sidebar drawer open? */
  readonly sidebarOpen = signal<boolean>(false);

  /** Dark mode on? Persisted to localStorage. */
  readonly darkMode = signal<boolean>(false);

  /** Currently selected email id in the inbox (null = none). */
  readonly selectedEmailId = signal<string | null>(null);

  /** Inbox filter. */
  readonly inboxFilter = signal<InboxFilter>("all");

  /** Whether to include spam folder emails in the inbox view. */
  readonly includeSpam = signal<boolean>(true);

  /** Active label filter (null = no label filter). */
  readonly selectedLabelFilter = signal<EmailLabel | null>(null);

  /** Propose-meeting dialog open? */
  readonly proposeDialogOpen = signal<boolean>(false);

  /** Currently selected calendar event id (null = none). */
  readonly selectedEventId = signal<string | null>(null);

  constructor() {
    // Hydrate dark mode from localStorage on first load.
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("atlas.darkMode");
      if (stored !== null) {
        this.darkMode.set(stored === "true");
      } else {
        const prefersDark =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        this.darkMode.set(prefersDark);
      }
    }

    // Persist dark mode + reflect on <html> class.
    effect(() => {
      const dark = this.darkMode();
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", dark);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("atlas.darkMode", String(dark));
      }
    });
  }

  setView(view: ViewKey): void {
    this.currentView.set(view);
    this.sidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((o) => !o);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleDarkMode(): void {
    this.darkMode.update((d) => !d);
  }

  selectEmail(id: string | null): void {
    this.selectedEmailId.set(id);
  }

  setInboxFilter(f: InboxFilter): void {
    this.inboxFilter.set(f);
  }

  toggleIncludeSpam(): void {
    this.includeSpam.update((v) => !v);
  }

  setLabelFilter(l: EmailLabel | null): void {
    this.selectedLabelFilter.set(l);
  }

  openProposeDialog(): void {
    this.proposeDialogOpen.set(true);
  }

  closeProposeDialog(): void {
    this.proposeDialogOpen.set(false);
  }

  selectEvent(id: string | null): void {
    this.selectedEventId.set(id);
  }
}

/** Page titles shown in the topbar for each view. */
export const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  important: "Important Emails",
  tasks: "Tasks",
  contacts: "Contacts",
  jobs: "Job Finder",
  portals: "Job Portals",
  interview: "AI Interviewer",
  calendar: "Calendar",
  approvals: "Approvals",
  profile: "Profile & Settings",
  agent: "Ask Harsh-Boss (AI Agent)"
};
