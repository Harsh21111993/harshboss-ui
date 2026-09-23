import { Component, inject, signal, input, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AdvancedFeaturesService } from "../../core/services/advanced.service";
import { ToastService } from "../../core/services/toast.service";
import { ReplyDraft } from "../../core/models";

/**
 * ReplyDraftComponent — Feature 1: AI Reply Drafting.
 */
@Component({
  selector: "hb-reply-draft",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <header>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Reply Draft</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Pick a tone, generate a reply, then copy it into Gmail.</p>
      </header>
      <div class="flex gap-2">
        @for (t of tones; track t) {
          <button type="button" (click)="selectTone(t)"
            [class]="selectedTone() === t ? 'flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium' : 'flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium'">
            {{ t }}
          </button>
        }
      </div>
      <button type="button" (click)="generate()" [disabled]="loading() || !emailId()"
        class="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
        @if (loading()) {
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
          Generating…
        } @else { Generate Reply }
      </button>
      @if (draft()) {
        <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">{{ draft()!.tone }} reply</span>
            <button type="button" (click)="copyDraft()" class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
          <textarea [(ngModel)]="editableDraft" rows="6"
            class="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono resize-y focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
        </div>
      }
    </div>
  `
})
export class ReplyDraftComponent {
  private readonly advanced = inject(AdvancedFeaturesService);
  private readonly toast = inject(ToastService);
  readonly emailId = input.required<string>();
  readonly tones = ["ACCEPT", "DECLINE", "CUSTOM"];
  readonly selectedTone = signal("ACCEPT");
  readonly loading = signal(false);
  readonly draft = signal<ReplyDraft | null>(null);
  editableDraft = "";
  selectTone(tone: string): void { this.selectedTone.set(tone); this.draft.set(null); }
  generate(): void {
    this.loading.set(true);
    this.advanced.draftReply(this.emailId(), this.selectedTone()).subscribe({
      next: (d) => { this.draft.set(d); this.editableDraft = d.body; this.loading.set(false); },
      error: () => { this.toast.error("Could not generate reply"); this.loading.set(false); }
    });
  }
  copyDraft(): void {
    navigator.clipboard.writeText(this.editableDraft).then(() => this.toast.success("Reply copied to clipboard"));
  }
}
