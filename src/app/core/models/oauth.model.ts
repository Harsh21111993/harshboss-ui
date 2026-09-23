/** Status of a single OAuth2 provider for the current user. */
export interface OAuthProviderStatus {
  configured: boolean;
  connected: boolean;
  emailAddress: string | null;
}

/** Status of both providers (returned by GET /api/oauth/providers). */
export interface OAuthProvidersResponse {
  microsoft: OAuthProviderStatus;
  google: OAuthProviderStatus;
}

/** The authorize URL to redirect the user to. */
export interface OAuthConnectResponse {
  provider: string;
  authorizeUrl: string;
}

/** Result of a sync operation. */
export interface EmailSyncResult {
  provider: string;
  fetched: number;
  new: number;
  skipped: number;
  message: string;
}

/** Supported providers. */
export type OAuthProvider = "microsoft" | "google";
