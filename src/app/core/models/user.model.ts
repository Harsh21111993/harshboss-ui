/**
 * The workspace owner (the "logged-in" user).
 * Returned by GET /api/users/me.
 */
export interface User {
  id: string;
  fullName: string;
  email: string;
  title?: string | null;
  avatarColor: string;
  timezone: string;
  profilePic?: string | null;
}

/** Body for POST /api/users (first-run create) — name + email required. */
export interface CreateUserRequest {
  fullName: string;
  email: string;
  title?: string;
  avatarColor?: string;
  timezone?: string;
}

/** Body for PATCH /api/users/me — all fields optional. */
export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  title?: string;
  avatarColor?: string;
  timezone?: string;
  profilePic?: string;
}

/** Result of POST /api/admin/seed-demo. */
export interface SeedDemoResult {
  created: boolean;
  emails: number;
  events: number;
  approvals: number;
  user: string;
  message: string;
}
