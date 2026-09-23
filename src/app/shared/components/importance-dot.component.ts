import { Component, ChangeDetectionStrategy, input, computed } from "@angular/core";
import { Importance } from "../../core/models";
import { IMPORTANCE_DOT } from "../utils";

/**
 * ImportanceDot — a small colored dot indicator (rose/amber/slate).
 */
@Component({
  selector: "hb-importance-dot",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block h-2.5 w-2.5 rounded-full"
      [class]="dotClass()"
      [attr.aria-label]="'Importance: ' + importance()"
      [title]="'Importance: ' + importance()"
    ></span>
  `
})
export class ImportanceDotComponent {
  readonly importance = input.required<Importance>();
  readonly dotClass = computed(() => IMPORTANCE_DOT[this.importance()]);
}
