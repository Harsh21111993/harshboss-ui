import { Component, ChangeDetectionStrategy, input, computed } from "@angular/core";
import { EmailLabel } from "../../core/models";
import { LABEL_STYLES } from "../utils";

/**
 * LabelBadge — colored chip for an AI email label.
 */
@Component({
  selector: "hb-label-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="hb-badge {{ styles().cls }}">
      {{ styles().label }}
    </span>
  `
})
export class LabelBadgeComponent {
  readonly label = input.required<EmailLabel>();
  readonly styles = computed(() => LABEL_STYLES[this.label()]);
}
