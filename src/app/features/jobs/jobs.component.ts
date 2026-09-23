import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { JobAggregatorService, MatchedJob, AggregatedJobsResponse, PortalLink } from "../../core/services/job-aggregator.service";
import { JobPortalService, TrackedApplication } from "../../core/services/job-portal.service";
import { ToastService } from "../../core/services/toast.service";
import { Router } from "@angular/router";

/**
 * JobsComponent — the skill-matched job aggregator.
 *
 * Features:
 *  1. Searches SerpAPI + Google CSE + JSearch in one call
 *  2. Filters results to ONLY show jobs matching the user's tech stack
 *  3. Shows match score + matched/missing skills per job
 *  4. Deep links to all 7 portals with pre-filled search
 *  5. Bookmarklet installation for capturing jobs from any portal
 *  6. Application tracking across all portals
 */
@Component({
  selector: "hb-jobs",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Skill-Matched Jobs</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Jobs from Naukri, LinkedIn, Wellfound + more — filtered to ONLY match your tech stack.
        </p>
      </header>

      <!-- No resume CTA -->
      @if (!result() && !searching()) {
        <div class="p-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4">
          <span class="text-5xl">📄</span>
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload your resume first</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              The AI extracts your skills and filters jobs to only show your tech stack.
            </p>
          </div>
          <button type="button" (click)="goToProfile()"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
            Go to Profile →
          </button>
        </div>
      }

      <!-- Resume profile summary -->
      @if (result(); as r) {
        <div class="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Your Profile</h3>
            <button type="button" (click)="goToProfile()" class="text-xs text-slate-400 hover:text-slate-600">Edit resume</button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div><span class="text-slate-400">Name:</span> {{ r.resume.fullName }}</div>
            <div><span class="text-slate-400">Title:</span> {{ r.resume.currentTitle }}</div>
            <div><span class="text-slate-400">Experience:</span> {{ r.resume.yearsExperience }} yrs</div>
            <div><span class="text-slate-400">Location:</span> {{ r.resume.preferredLocation }}</div>
          </div>
          <div>
            <span class="text-xs text-slate-400">Skills (used for filtering):</span>
            <div class="flex flex-wrap gap-1 mt-1">
              @for (s of r.resume.skills; track s) {
                <span class="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium">{{ s }}</span>
              }
            </div>
          </div>
        </div>
      }

      <!-- Search button -->
      <button type="button" (click)="search()" [disabled]="searching()"
        class="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
        @if (searching()) {
          <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
          Searching SerpAPI + Google CSE + JSearch + filtering by skills…
        } @else { 🔍 Search Skill-Matched Jobs }
      </button>

      <!-- Search stats -->
      @if (result(); as r) {
        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 flex-wrap">
          <span>Found: {{ r.totalFound }}</span>
          <span>After dedup: {{ r.totalAfterDedup }}</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-medium">After skill filter: {{ r.totalAfterSkillFilter }}</span>
          <span>Keywords: "{{ r.searchKeywords }}"</span>
        </div>
      }

      <!-- Matched jobs -->
      @if (result()?.matchedJobs?.length; ) {
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {{ result()!.matchedJobs.length }} jobs matching your tech stack
          </h3>
          @for (m of result()!.matchedJobs; track m.title + m.company) {
            <div class="p-4 rounded-lg border bg-white dark:bg-slate-900" [class]="scoreBorder(m.matchScore)">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ m.title }}</span>
                <span class="text-xs font-mono px-1.5 py-0.5 rounded {{ scoreBadge(m.matchScore) }}">{{ m.matchScore }}% match</span>
                <span class="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{{ m.source }}</span>
                @if (m.remote) { <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Remote</span> }
              </div>
              <div class="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {{ m.company }} · {{ m.location }}
                @if (m.salary) { · {{ m.salary }} }
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{{ m.description }}</p>
              <!-- Skill match details -->
              <div class="mt-2 flex items-center gap-2 flex-wrap">
                @for (s of m.matchedSkills; track s) {
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">✓ {{ s }}</span>
                }
                @for (s of m.missingSkills; track s) {
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">✗ {{ s }}</span>
                }
              </div>
              <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <a [href]="m.applyUrl" target="_blank" rel="noopener noreferrer"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium">
                  Apply →
                </a>
                <button type="button" (click)="trackJob(m)"
                  class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                  Track
                </button>
              </div>
            </div>
          }
        </div>
      } @else if (result() && !searching()) {
        <div class="text-center py-8 text-slate-400">
          No jobs matched your skills. Try broadening your resume profile.
        </div>
      }

      <!-- Portal deep links -->
      @if (result()?.portalLinks?.length; ) {
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Search on 7 Portals (pre-filled with your keywords)</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            @for (p of result()!.portalLinks; track p.key) {
              <a [href]="p.searchUrl" target="_blank" rel="noopener noreferrer"
                class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all text-center">
                <div class="text-xs font-medium text-slate-900 dark:text-slate-100">{{ p.name }}</div>
                @if (p.applicationCount > 0) {
                  <div class="text-[10px] text-emerald-500 mt-0.5">{{ p.applicationCount }} tracked</div>
                }
              </a>
            }
          </div>
        </div>
      }

      <!-- Bookmarklet -->
      <div class="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
        <h3 class="text-sm font-semibold text-amber-700 dark:text-amber-400">📋 Browser Bookmarklet</h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Install this to capture jobs from any of the 7 portals directly into Harsh-Boss.
          When you're viewing a job on Naukri/LinkedIn/etc., click the bookmarklet to track it.
        </p>
        <a [href]="bookmarkletUrl" target="_blank"
          class="inline-block px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium">
          Get Bookmarklet →
        </a>
      </div>

      <!-- Tracked applications -->
      @if (tracked().length > 0) {
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tracked Applications ({{ tracked().length }})</h3>
          @for (t of tracked(); track t.id) {
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{{ t.portal }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{ t.jobTitle }}</div>
                <div class="text-xs text-slate-400 truncate">{{ t.company }} · {{ t.location }}</div>
              </div>
              <select [value]="t.status" (change)="updateStatus(t.id, $any($event.target).value)"
                class="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                <option value="NOT_APPLIED">Not applied</option>
                <option value="APPLIED">Applied</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class JobsComponent implements OnInit {
  private readonly aggregator = inject(JobAggregatorService);
  private readonly portalSvc = inject(JobPortalService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly searching = signal(false);
  readonly result = signal<AggregatedJobsResponse | null>(null);
  readonly tracked = signal<TrackedApplication[]>([]);
  readonly bookmarkletUrl = "http://localhost:8080/api/jobs-aggregator/bookmarklet";

  ngOnInit(): void {
    this.loadTracked();
  }

  search(): void {
    this.searching.set(true);
    this.aggregator.search(10).subscribe({
      next: (r) => {
        this.result.set(r);
        this.searching.set(false);
        this.toast.success(`Found ${r.totalAfterSkillFilter} skill-matched jobs (from ${r.totalFound} total)`);
      },
      error: () => {
        this.searching.set(false);
        this.toast.error("Job search failed. Check your API keys in application.yml.");
      }
    });
  }

  trackJob(job: MatchedJob): void {
    this.portalSvc.trackApplication({
      portal: job.source,
      jobTitle: job.title,
      company: job.company,
      jobUrl: job.applyUrl,
      location: job.location,
      salary: job.salary || "",
      workMode: job.remote ? "REMOTE" : "ONSITE",
      status: "NOT_APPLIED"
    }).subscribe({
      next: () => {
        this.toast.success("Job added to tracking!");
        this.loadTracked();
      },
      error: () => this.toast.error("Could not track job")
    });
  }

  loadTracked(): void {
    this.portalSvc.getTracked().subscribe({
      next: (t) => this.tracked.set(t || []),
      error: () => {}
    });
  }

  updateStatus(id: string, status: string): void {
    this.portalSvc.updateStatus(id, status).subscribe({
      next: () => { this.toast.success("Status updated"); this.loadTracked(); },
      error: () => this.toast.error("Could not update status")
    });
  }

  goToProfile(): void {
    this.router.navigateByUrl("/profile");
  }

  scoreBorder(score: number): string {
    if (score >= 70) return "border-emerald-200 dark:border-emerald-800";
    if (score >= 50) return "border-amber-200 dark:border-amber-800";
    return "border-slate-200 dark:border-slate-800";
  }

  scoreBadge(score: number): string {
    if (score >= 70) return "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300";
    if (score >= 50) return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300";
    return "bg-slate-100 dark:bg-slate-800 text-slate-500";
  }
}
