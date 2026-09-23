import { Component, inject, signal, input, output, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdvancedFeaturesService } from "../../core/services/advanced.service";
import { ToastService } from "../../core/services/toast.service";

/**
 * QuickActions — Feature 6: One-Click Quick Actions.
 * Shows action buttons on important emails: Accept Meeting, Send Availability,
 * Forward, Snooze, Mark Done.
 */
@Component({
  selector: "hb-quick-actions",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap gap-1.5">
      @for (a of actions; track a.key) {
        <button
          type="button"
          (click)="execute(a.key)"
          [disabled]="loading() === a.key"
          [class]="a.cls + ' px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1'"
          [title]="a.label"
        >
          @if (loading() === a.key) {
            <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
          } @else {
            <span>{{ a.icon }}</span>
          }
          {{ a.label }}
        </button>
      }
    </div>
  `
})
export class QuickActionsComponent {
  private readonly advanced = inject(AdvancedFeaturesService);
  private readonly toast = inject(ToastService);
  readonly emailId = input.required<string>();
  readonly actionResult = output<string>();

  readonly loading = signal<string | null>(null);

  readonly actions = [
    { key: "ACCEPT_MEETING", label: "Accept", icon: "✓", cls: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800" },
    { key: "SEND_AVAILABILITY", label: "Send Availability", icon: "📅", cls: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" },
    { key: "FORWARD", label: "Forward", icon: "↗", cls: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" },
    { key: "SNOOZE", label: "Snooze 1h", icon: "⏰", cls: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800" },
    { key: "MARK_DONE", label: "Done", icon: "✓", cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" }
  ];

  execute(action: string): void {
    this.loading.set(action);
    this.advanced.quickAction(this.emailId(), action).subscribe({
      next: (r) => {
        this.loading.set(null);
        if (r.success) {
          this.toast.success(r.message);
          this.actionResult.emit(action);
        } else {
          this.toast.error(r.message);
        }
      },
      error: () => {
        this.loading.set(null);
        this.toast.error("Action failed");
      }
    });
  }
}
