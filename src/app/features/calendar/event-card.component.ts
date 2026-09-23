import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CalendarEvent } from "../../core/models";
import { PLATFORM_STYLES, formatTime } from "../../shared/utils";

/**
 * EventCard — a single calendar event block (used in the week grid and
 * the mobile day-list). Clickable to open the detail popover.
 */
@Component({
  selector: "hb-event-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="select.emit(event().id)"
      class="block w-full text-left rounded-lg border px-2.5 py-2 transition-shadow hover:shadow-soft-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      [class]="styles().bg + ' ' + styles().border + ' ' + styles().text"
      [style.height.px]="heightPx()"
      [attr.aria-label]="event().title + ' at ' + formatTime(event().start)"
    >
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full {{ styles().dot }}"></span>
        <span class="text-[11px] font-medium uppercase tracking-wide opacity-80">
          {{ styles().label }}
        </span>
        @if (event().status === 'TENTATIVE') {
          <span class="text-[10px] opacity-70">· tentative</span>
        }
        @if (event().isHiddenByOthers) {
          <span class="text-[10px] opacity-70">· hidden</span>
        }
        @if (event().sourceEmailId || event().sourceEmailUrl) {
          <span class="text-[10px] opacity-70 flex items-center gap-0.5">
            · 📧
          </span>
        }
      </div>
      <div class="text-xs sm:text-sm font-semibold mt-0.5 truncate">
        {{ event().title }}
      </div>
      <div class="text-[11px] opacity-80 mt-0.5">
        {{ formatTime(event().start) }} – {{ formatTime(event().end) }}
      </div>
    </button>
  `
})
export class EventCardComponent {
  readonly event = input.required<CalendarEvent>();
  /** Pixel-perfect hour height (only used by the week grid). */
  readonly hourHeight = input<number>(52);
  readonly select = output<string>();

  readonly styles = computed(() => PLATFORM_STYLES[this.event().platform]);
  readonly formatTime = formatTime;

  /** Height in pixels = (end - start) hours * hourHeight. */
  readonly heightPx = computed(() => {
    const e = this.event();
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    const hours = Math.max(0.25, (end - start) / (1000 * 60 * 60));
    return Math.max(28, Math.round(hours * this.hourHeight()) - 4);
  });
}
