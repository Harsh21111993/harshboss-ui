import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { JobPortalService, JobPortal, TrackedApplication, PortalStats, PortalRecommendation } from "../../core/services/job-portal.service";
import { ToastService } from "../../core/services/toast.service";

/**
 * JobPortalsComponent — centralized hub for 7 job portals.
 *
 * Features:
 *  • 7 portal cards with personalized "Search →" deep links
 *  • Application tracking (add/edit/delete applications per portal)
 *  • Statistics dashboard (applications per portal + status breakdown)
 *  • AI-powered portal recommendations
 */
@Component({
  selector: "hb-job-portals",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Job Portals Hub</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          7 portals, one tracker. Search links are pre-filled with your resume keywords.
        </p>
      </header>

      <!-- Stats -->
      @if (stats(); as s) {
        <div class="grid grid-cols-5 gap-2">
          <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
            <div class="text-xl font-bold text-slate-700 dark:text-slate-200">{{ s.total }}</div>
            <div class="text-[10px] text-slate-400">Total</div>
          </div>
          <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
            <div class="text-xl font-bold text-amber-600">{{ s.byStatus['APPLIED'] || 0 }}</div>
            <div class="text-[10px] text-amber-500">Applied</div>
          </div>
          <div class="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
            <div class="text-xl font-bold text-blue-600">{{ s.byStatus['INTERVIEW'] || 0 }}</div>
            <div class="text-[10px] text-blue-500">Interview</div>
          </div>
          <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
            <div class="text-xl font-bold text-emerald-600">{{ s.byStatus['OFFER'] || 0 }}</div>
            <div class="text-[10px] text-emerald-500">Offer</div>
          </div>
          <div class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
            <div class="text-xl font-bold text-rose-600">{{ s.byStatus['REJECTED'] || 0 }}</div>
            <div class="text-[10px] text-rose-500">Rejected</div>
          </div>
        </div>
      }

      <!-- Recommendations -->
      @if (recommendations().length > 0) {
        <div class="space-y-2">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Recommendations</h3>
          @for (r of recommendations(); track r.portal) {
            <div class="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
              <span class="text-lg">💡</span>
              <div class="flex-1">
                <span class="text-sm font-medium text-emerald-700 dark:text-emerald-400">{{ r.portal }}</span>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{{ r.reason }}</p>
              </div>
            </div>
          }
        </div>
      }

      <!-- Portal cards grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (p of portals(); track p.key) {
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:shadow-soft-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ p.name }}</h3>
                <span class="text-[10px] text-slate-400">{{ p.coverage }}</span>
              </div>
              @if (p.applicationCount > 0) {
                <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium">
                  {{ p.applicationCount }}
                </span>
              }
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ p.bestFor }}</p>
            <div class="flex gap-2">
              <a [href]="p.searchUrl" target="_blank" rel="noopener noreferrer"
                class="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium text-center transition-colors">
                Search →
              </a>
              <a [href]="p.loginUrl" target="_blank" rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors">
                Login
              </a>
            </div>
          </div>
        }
      </div>

      <!-- Add application form -->
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Track a New Application</h3>
        <div class="grid grid-cols-2 gap-2">
          <select [(ngModel)]="newApp.portal" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm">
            @for (p of portals(); track p.key) {
              <option [value]="p.key">{{ p.name }}</option>
            }
          </select>
          <input type="text" [(ngModel)]="newApp.jobTitle" placeholder="Job title" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
          <input type="text" [(ngModel)]="newApp.company" placeholder="Company" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
          <input type="text" [(ngModel)]="newApp.location" placeholder="Location" class="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
          <input type="text" [(ngModel)]="newApp.jobUrl" placeholder="Job URL (paste from portal)" class="col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm" />
        </div>
        <button type="button" (click)="trackApplication()" [disabled]="!newApp.jobTitle.trim()"
          class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium">
          Add to Tracking
        </button>
      </div>

      <!-- Tracked applications -->
      @if (tracked().length > 0) {
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tracked Applications</h3>
          @for (t of tracked(); track t.id) {
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
              <span class="text-xs font-mono px-2 py-0.5 rounded {{ portalBadge(t.portal) }}">{{ t.portal }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{ t.jobTitle }}</div>
                <div class="text-xs text-slate-400 truncate">
                  {{ t.company || 'Unknown' }} · {{ t.location || 'Unknown' }}
                  @if (t.appliedAt) { · Applied {{ t.appliedAt | date:'MMM d' }} }
                </div>
              </div>
              <select [value]="t.status" (change)="updateStatus(t.id, $any($event.target).value)"
                class="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <option value="NOT_APPLIED">Not applied</option>
                <option value="APPLIED">Applied</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
              @if (t.jobUrl) {
                <a [href]="t.jobUrl" target="_blank" rel="noopener" class="text-slate-400 hover:text-emerald-500 text-sm">↗</a>
              }
              <button type="button" (click)="deleteApp(t.id)" class="text-slate-400 hover:text-rose-500 text-sm">✕</button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class JobPortalsComponent implements OnInit {
  private readonly portalSvc = inject(JobPortalService);
  private readonly toast = inject(ToastService);

  readonly portals = signal<JobPortal[]>([]);
  readonly tracked = signal<TrackedApplication[]>([]);
  readonly stats = signal<PortalStats | null>(null);
  readonly recommendations = signal<PortalRecommendation[]>([]);

  newApp = { portal: "NAUKRI", jobTitle: "", company: "", location: "", jobUrl: "" };

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.portalSvc.getPortals().subscribe({ next: (p) => this.portals.set(p || []), error: () => {} });
    this.portalSvc.getTracked().subscribe({ next: (t) => this.tracked.set(t || []), error: () => {} });
    this.portalSvc.getStats().subscribe({ next: (s) => this.stats.set(s), error: () => {} });
    this.portalSvc.getRecommendations().subscribe({ next: (r) => this.recommendations.set(r || []), error: () => {} });
  }

  trackApplication(): void {
    if (!this.newApp.jobTitle.trim()) return;
    this.portalSvc.trackApplication({
      portal: this.newApp.portal,
      jobTitle: this.newApp.jobTitle,
      company: this.newApp.company,
      location: this.newApp.location,
      jobUrl: this.newApp.jobUrl,
      status: "NOT_APPLIED"
    }).subscribe({
      next: () => {
        this.toast.success("Application tracked!");
        this.newApp = { portal: "NAUKRI", jobTitle: "", company: "", location: "", jobUrl: "" };
        this.loadAll();
      },
      error: () => this.toast.error("Could not track application")
    });
  }

  updateStatus(id: string, status: string): void {
    this.portalSvc.updateStatus(id, status).subscribe({
      next: () => { this.toast.success("Status updated"); this.loadAll(); },
      error: () => this.toast.error("Could not update status")
    });
  }

  deleteApp(id: string): void {
    this.portalSvc.deleteApplication(id).subscribe({
      next: () => { this.toast.success("Application removed"); this.loadAll(); },
      error: () => this.toast.error("Could not delete")
    });
  }

  portalBadge(portal: string): string {
    const map: Record<string, string> = {
      NAUKRI: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
      LINKEDIN: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
      WELLFOUND: "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
      INSTAHYRE: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
      OTTA: "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300",
      TURING: "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",
      CUTSHORT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
    };
    return map[portal] || "bg-slate-100 text-slate-500";
  }
}
