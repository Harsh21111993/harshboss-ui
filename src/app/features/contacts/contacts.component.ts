import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdvancedFeaturesService } from "../../core/services/advanced.service";
import { ToastService } from "../../core/services/toast.service";
import { Contact } from "../../core/models";

/**
 * ContactsComponent — Feature 10: Contact Intelligence & Relationship Health.
 * Shows contacts with their relationship health scores.
 */
@Component({
  selector: "hb-contacts",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Contacts</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Relationship health based on your email interactions.</p>
      </header>

      <!-- Health summary -->
      <div class="grid grid-cols-4 gap-2">
        <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
          <div class="text-lg font-bold text-emerald-600">{{ countByHealth("GOOD") }}</div>
          <div class="text-[10px] text-emerald-500">Good</div>
        </div>
        <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
          <div class="text-lg font-bold text-amber-600">{{ countByHealth("STALE") }}</div>
          <div class="text-[10px] text-amber-500">Stale</div>
        </div>
        <div class="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-center">
          <div class="text-lg font-bold text-orange-600">{{ countByHealth("AT_RISK") }}</div>
          <div class="text-[10px] text-orange-500">At Risk</div>
        </div>
        <div class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
          <div class="text-lg font-bold text-rose-600">{{ countByHealth("COLD") }}</div>
          <div class="text-[10px] text-rose-500">Cold</div>
        </div>
      </div>

      <!-- Contact list -->
      <div class="space-y-2">
        @for (c of contacts(); track c.id) {
          <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            <div class="h-9 w-9 rounded-full grid place-items-center text-white text-xs font-semibold {{ healthColor(c.relationshipHealth) }}">
              {{ c.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{ c.name }}</div>
              <div class="text-xs text-slate-400 truncate">{{ c.emailAddress }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-medium {{ healthTextColor(c.relationshipHealth) }}">{{ c.relationshipHealth.replace('_', ' ') }}</div>
              <div class="text-[10px] text-slate-400">{{ c.totalEmails }} emails</div>
            </div>
          </div>
        }
        @if (contacts().length === 0) {
          <div class="text-center py-12 text-slate-400">No contacts yet. Sync your inbox to populate contacts.</div>
        }
      </div>
    </div>
  `
})
export class ContactsComponent implements OnInit {
  private readonly advanced = inject(AdvancedFeaturesService);
  private readonly toast = inject(ToastService);
  readonly contacts = signal<Contact[]>([]);

  ngOnInit(): void {
    this.advanced.loadContacts().subscribe({
      next: (c) => this.contacts.set(c || []),
      error: () => this.toast.error("Could not load contacts")
    });
  }

  countByHealth(health: string): number {
    return this.contacts().filter(c => c.relationshipHealth === health).length;
  }

  healthColor(h: string): string {
    switch (h) {
      case "GOOD": return "bg-emerald-500";
      case "STALE": return "bg-amber-500";
      case "AT_RISK": return "bg-orange-500";
      case "COLD": return "bg-rose-500";
      default: return "bg-slate-500";
    }
  }

  healthTextColor(h: string): string {
    switch (h) {
      case "GOOD": return "text-emerald-600 dark:text-emerald-400";
      case "STALE": return "text-amber-600 dark:text-amber-400";
      case "AT_RISK": return "text-orange-600 dark:text-orange-400";
      case "COLD": return "text-rose-600 dark:text-rose-400";
      default: return "text-slate-500";
    }
  }
}
