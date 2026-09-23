import { HttpInterceptorFn } from "@angular/common/http";
import { Injectable, signal, effect, inject } from "@angular/core";
import { finalize } from "rxjs";

/**
 * LoadingTracker — singleton signal-based counter of in-flight HTTP requests.
 * The app shell can show a global loading bar while `active()` is true.
 */
@Injectable({ providedIn: "root" })
export class LoadingTracker {
  readonly pending = signal<number>(0);
  readonly active = signal<boolean>(false);

  constructor() {
    effect(() => this.active.set(this.pending() > 0));
  }

  inc(): void {
    this.pending.update((n) => n + 1);
  }
  dec(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}

/**
 * loadingInterceptor — bumps/decrements the global counter on each request.
 * Requests with an `X-Skip-Loading` header are ignored.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const tracker = inject(LoadingTracker);
  if (req.headers.has("X-Skip-Loading")) {
    return next(req);
  }
  tracker.inc();
  return next(req).pipe(finalize(() => tracker.dec()));
};
