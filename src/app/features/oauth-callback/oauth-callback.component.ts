import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { OAuthService } from "../../core/services/oauth.service";
import { ToastService } from "../../core/services/toast.service";
import type { OAuthProvider } from "../../core/models";

/**
 * Handles the redirect back from Microsoft/Google after the user consents.
 * Reads the query params (provider, code, state, error) and calls the
 * backend callback endpoint to exchange the code for tokens.
 */
@Component({
  selector: "hb-oauth-callback",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div class="max-w-md w-full text-center space-y-4">
        @if (status() === "loading") {
          <div class="flex flex-col items-center gap-4">
            <svg class="h-12 w-12 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Connecting your account…</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Exchanging authorization code for tokens</p>
          </div>
        }

        @if (status() === "success") {
          <div class="flex flex-col items-center gap-4">
            <span class="text-5xl">✅</span>
            <h2 class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Connected!</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Redirecting you back to your profile…</p>
          </div>
        }

        @if (status() === "error") {
          <div class="flex flex-col items-center gap-4">
            <span class="text-5xl">❌</span>
            <h2 class="text-lg font-semibold text-rose-600 dark:text-rose-400">Connection failed</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ errorMessage() }}</p>
            <button
              type="button"
              (click)="goToProfile()"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              ← Back to Profile
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly oauth = inject(OAuthService);
  private readonly toast = inject(ToastService);

  readonly status = signal<"loading" | "success" | "error">("loading");
  readonly errorMessage = signal<string>("");

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const provider = params.get("provider") as OAuthProvider;
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      this.status.set("error");
      this.errorMessage.set(error + (params.get("error_description") ? ": " + params.get("error_description") : ""));
      return;
    }

    if (!provider || !code || !state) {
      this.status.set("error");
      this.errorMessage.set("Missing required parameters (provider, code, state). Please try connecting again.");
      return;
    }

    // Call the backend to exchange the code for tokens
    this.oauth.handleCallback(provider, code, state).subscribe({
      next: () => {
        this.status.set("success");
        this.toast.success("Email account connected!");
        setTimeout(() => this.router.navigateByUrl("/profile"), 1500);
      },
      error: (err: unknown) => {
        this.status.set("error");
        const msg = err instanceof Error ? err.message : String(err);
        this.errorMessage.set(msg || "The backend could not exchange the authorization code. Check the logs.");
      }
    });
  }

  goToProfile(): void {
    this.router.navigateByUrl("/profile");
  }
}
