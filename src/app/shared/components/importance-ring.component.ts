import { Component, ChangeDetectionStrategy, input, computed } from "@angular/core";
import { Importance } from "../../core/models";
import { importanceColor } from "../utils";

/**
 * ImportanceRing — SVG progress ring (0-100) colored by importance.
 * Use for the AI analysis score.
 */
@Component({
  selector: "hb-importance-ring",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-flex items-center justify-center">
      <svg
        [attr.width]="size()"
        [attr.height]="size()"
        [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
        class="-rotate-90"
      >
        <circle
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          fill="none"
          stroke="currentColor"
          [attr.stroke-width]="stroke()"
          class="text-slate-200 dark:text-slate-800"
        />
        <circle
          [attr.cx]="size() / 2"
          [attr.cy]="size() / 2"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="color()"
          [attr.stroke-width]="stroke()"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashoffset()"
        />
      </svg>
      <div
        class="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span class="text-base font-semibold leading-none text-slate-900 dark:text-slate-100">
          {{ score() }}
        </span>
        <span class="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
          {{ importance() === "HIGH" ? "High" : importance() === "MEDIUM" ? "Med" : "Low" }}
        </span>
      </div>
    </div>
  `
})
export class ImportanceRingComponent {
  readonly score = input.required<number>();
  readonly importance = input.required<Importance>();
  readonly size = input<number>(56);
  readonly stroke = input<number>(5);

  readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashoffset = computed(
    () => this.circumference() * (1 - Math.max(0, Math.min(100, this.score())) / 100)
  );
  readonly color = computed(() => importanceColor(this.score()));
}
