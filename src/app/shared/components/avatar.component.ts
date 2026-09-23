import { Component, ChangeDetectionStrategy, input, computed } from "@angular/core";

/**
 * Avatar — circular initials avatar with a deterministic slate-tinted background.
 */
@Component({
  selector: "hb-avatar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center rounded-full font-medium text-white select-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="Math.max(10, size() * 0.4)"
      [style.background]="bg()"
      [attr.aria-label]="name() || 'User'"
    >
      {{ text() }}
    </span>
  `
})
export class AvatarComponent {
  readonly name = input<string>("");
  readonly size = input<number>(36);

  // expose Math to template
  readonly Math = Math;

  readonly text = computed(() => {
    const n = (this.name() || "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  /** Deterministic slate-leaning background so avatars differ but stay on-palette. */
  readonly bg = computed(() => {
    const n = this.name() || "?";
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const palette = [
      "linear-gradient(135deg,#0f766e,#10b981)", // teal -> emerald
      "linear-gradient(135deg,#15803d,#22c55e)",
      "linear-gradient(135deg,#b45309,#f59e0b)",
      "linear-gradient(135deg,#9f1239,#f43f5e)",
      "linear-gradient(135deg,#334155,#64748b)",
      "linear-gradient(135deg,#0d9488,#14b8a6)"
    ];
    return palette[h % palette.length];
  });
}
