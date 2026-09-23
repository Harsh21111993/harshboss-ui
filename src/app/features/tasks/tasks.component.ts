import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AdvancedFeaturesService } from "../../core/services/advanced.service";
import { ToastService } from "../../core/services/toast.service";
import { Task } from "../../core/models";

/**
 * TasksComponent — Feature 9: Email-to-Task Conversion.
 * Shows tasks created from email action items.
 */
@Component({
  selector: "hb-tasks",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Tasks</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Action items extracted from your important emails.</p>
      </header>

      <!-- Create task -->
      <form (ngSubmit)="createTask()" class="flex gap-2">
        <input type="text" [(ngModel)]="newTaskTitle" name="title" placeholder="Add a task…"
          class="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        <button type="submit" [disabled]="!newTaskTitle.trim()"
          class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium">Add</button>
      </form>

      <!-- Task list -->
      <div class="space-y-2">
        @for (t of tasks(); track t.id) {
          <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <button type="button" (click)="markDone(t.id)"
              class="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 flex items-center justify-center transition-colors">
              @if (t.status === 'DONE') { <span class="text-emerald-500 text-xs">✓</span> }
            </button>
            <div class="flex-1 min-w-0">
              <div [class]="t.status === 'DONE' ? 'text-sm text-slate-400 line-through' : 'text-sm text-slate-900 dark:text-slate-100'">
                {{ t.title }}
              </div>
              @if (t.description) {
                <div class="text-xs text-slate-400 mt-0.5 truncate">{{ t.description }}</div>
              }
            </div>
            <span class="text-xs px-1.5 py-0.5 rounded {{ priorityBadge(t.priority) }}">{{ t.priority }}</span>
            @if (t.sourceUrl) {
              <a [href]="t.sourceUrl" target="_blank" rel="noopener" class="text-xs text-slate-400 hover:text-emerald-500">📧</a>
            }
          </div>
        }
        @if (tasks().length === 0) {
          <div class="text-center py-12 text-slate-400">No tasks yet. Add one above or convert from an important email.</div>
        }
      </div>
    </div>
  `
})
export class TasksComponent implements OnInit {
  private readonly advanced = inject(AdvancedFeaturesService);
  private readonly toast = inject(ToastService);
  readonly tasks = signal<Task[]>([]);
  newTaskTitle = "";

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.advanced.loadTasks().subscribe({
      next: (t) => this.tasks.set(t || []),
      error: () => this.toast.error("Could not load tasks")
    });
  }

  createTask(): void {
    if (!this.newTaskTitle.trim()) return;
    this.advanced.createTask({ title: this.newTaskTitle.trim(), priority: "MEDIUM" }).subscribe({
      next: () => { this.newTaskTitle = ""; this.load(); this.toast.success("Task added"); },
      error: () => this.toast.error("Could not create task")
    });
  }

  markDone(id: string): void {
    this.advanced.markTaskDone(id).subscribe({
      next: () => { this.load(); this.toast.success("Task done!"); },
      error: () => this.toast.error("Could not update task")
    });
  }

  priorityBadge(p: string): string {
    switch (p) {
      case "HIGH": return "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300";
      case "LOW": return "bg-slate-100 dark:bg-slate-800 text-slate-500";
      default: return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300";
    }
  }
}
