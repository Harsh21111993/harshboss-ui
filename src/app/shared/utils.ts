import { EmailLabel, Importance, Platform } from "../core/models";

/** Generate initials from a name, e.g. "Emily Watson" -> "EW". */
export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Convert a Date or ISO string to a `YYYY-MM-DDTHH:mm` value for <input type="datetime-local">. */
export function toDatetimeLocalValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Format an ISO date as a short absolute time, e.g. "Apr 12 · 14:30". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Format an ISO date as a short time, e.g. "14:30". */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Format an ISO date as a short date, e.g. "Mon Apr 12". */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

/** Is the given ISO date the same calendar day as today? */
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Greeting based on local hour, e.g. "Good morning". */
export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Today's full date, e.g. "Monday, April 15". */
export function todayLong(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/** Tailwind class strings for each platform. */
export const PLATFORM_STYLES: Record<
  Platform,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  TEAMS: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    label: "Teams"
  },
  GOOGLE: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    dot: "bg-teal-500",
    label: "Google"
  },
  ZOOM: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    label: "Zoom"
  },
  PERSONAL: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-500",
    label: "Personal"
  },
  BLOCKED: {
    bg: "bg-zinc-100 dark:bg-zinc-800/60",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-700",
    dot: "bg-zinc-500",
    label: "Blocked"
  }
};

/** Tailwind class strings for each email label. */
export const LABEL_STYLES: Record<EmailLabel, { cls: string; label: string }> = {
  URGENT: { cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", label: "Urgent" },
  ACTION_REQUIRED: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", label: "Action required" },
  MEETING_REQUEST: { cls: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", label: "Meeting request" },
  FYI: { cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: "FYI" },
  INVOICE: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", label: "Invoice" },
  SPAM: { cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", label: "Spam" },
  PERSONAL: { cls: "bg-pink-100 text-rose-700 dark:bg-pink-950/40 dark:text-rose-300", label: "Personal" }
};

/** Importance dot color. */
export const IMPORTANCE_DOT: Record<Importance, string> = {
  HIGH: "bg-rose-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-slate-400"
};

/** Ring color for the importance score (0-100). */
export function importanceColor(score: number): string {
  if (score >= 70) return "#f43f5e"; // rose-500
  if (score >= 40) return "#f59e0b"; // amber-500
  return "#94a3b8"; // slate-400
}
