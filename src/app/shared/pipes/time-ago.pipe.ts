import { Pipe, PipeTransform } from "@angular/core";

/**
 * timeAgo — formats an ISO date string as a relative time:
 *   "just now", "5m ago", "2h ago", "3d ago", "2024-04-12".
 */
@Pipe({ name: "timeAgo", standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return "";
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return "";
    const now = Date.now();
    const diffMs = now - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 30) return "just now";
    const min = Math.round(sec / 60);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day}d ago`;
    // older than a week → short date
    const d = new Date(value);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }
}
