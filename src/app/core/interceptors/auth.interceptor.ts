import { HttpInterceptorFn, HttpResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { ToastService } from "../services/toast.service";

/**
 * authInterceptor — functional interceptor.
 * Adds a placeholder Authorization header (the backend is currently open;
 * wire real JWT/OAuth2 here later). Also surfaces 5xx errors as toasts.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  // Only attach auth header to our own API calls.
  let authReq = req;
  if (req.url.startsWith("/api/")) {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("atlas.token")) ||
      "hb-demo-token";
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err) => {
      const status = err?.status ?? 0;
      if (status >= 500) {
        toast.error(
          "Server error",
          err?.error?.message || err?.message || "Please try again later."
        );
      } else if (status === 0) {
        // Network error / backend down — common during local dev.
        toast.error(
          "Backend unreachable",
          "Could not reach Spring Boot API at /api. Is the backend running on :8080?"
        );
      } else if (status === 422 || status === 400) {
        const msg = err?.error?.message || err?.message || "Invalid request.";
        toast.error("Request failed", msg);
      } else if (status === 404) {
        // 404s are usually handled by the calling component — do not toast.
      } else if (status === 401 || status === 403) {
        toast.error("Not authorized", "You may need to sign in again.");
      }
      return throwError(() => err);
    })
  );
};
