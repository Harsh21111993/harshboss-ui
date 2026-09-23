import { Injectable, signal } from "@angular/core";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

/**
 * ToastService — tiny signal-based toast notification system.
 * No external lib. Components subscribe to the `toasts` signal and render
 * them however they like; the AppComponent mounts the host.
 */
@Injectable({ providedIn: "root" })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(kind: ToastKind, title: string, message?: string, ttl = 4500): void {
    const id = this.nextId++;
    this._toasts.update((t) => [...t, { id, kind, title, message }]);
    if (ttl > 0) {
      setTimeout(() => this.dismiss(id), ttl);
    }
  }

  success(title: string, message?: string): void {
    this.show("success", title, message);
  }
  error(title: string, message?: string): void {
    this.show("error", title, message, 7000);
  }
  info(title: string, message?: string): void {
    this.show("info", title, message);
  }
  warning(title: string, message?: string): void {
    this.show("warning", title, message);
  }

  dismiss(id: number): void {
    this._toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
