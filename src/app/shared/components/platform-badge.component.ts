import { Component, ChangeDetectionStrategy, input, computed } from "@angular/core";
import { Platform } from "../../core/models";
import { PLATFORM_STYLES } from "../utils";

/**
 * PlatformBadge — small colored chip showing the platform name + dot.
 */
@Component({
  selector: "hb-platform-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="hb-badge border {{ styles().bg }} {{ styles().text }} {{ styles().border }}"
    >
      <span class="h-1.5 w-1.5 rounded-full {{ styles().dot }}"></span>
      {{ styles().label }}
    </span>
  `
})
export class PlatformBadgeComponent {
  readonly platform = input.required<Platform>();
  readonly styles = computed(() => PLATFORM_STYLES[this.platform()]);
}
