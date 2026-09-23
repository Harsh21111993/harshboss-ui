import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { User, UpdateUserRequest, CreateUserRequest, SeedDemoResult } from "../models";

/**
 * UserService — manages the workspace owner.
 *
 *  • exists()        → GET  /api/users/exists   (first-run check)
 *  • loadMe()        → GET  /api/users/me       (fetch current user)
 *  • create()        → POST /api/users          (first-run create)
 *  • updateMe()      → PATCH /api/users/me      (edit profile)
 *  • seedDemoData()  → POST /api/admin/seed-demo (load demo emails + events)
 *
 * The user is cached in a signal so every component (app shell, dashboard
 * greeting, AI email signatures, ...) reads the same dynamic value instead
 * of a hardcoded name.
 */
@Injectable({ providedIn: "root" })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/users";
  private readonly adminUrl = "/api/admin";

  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _exists = signal<boolean | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly exists = this._exists.asReadonly();

  /** Convenience signal: just the display name (or empty while loading). */
  readonly fullName = signal<string>("");

  /** GET /api/users/exists → { exists: boolean } */
  checkExists(): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.baseUrl}/exists`).pipe(
      tap((r) => this._exists.set(!!r.exists))
    );
  }

  /** GET /api/users/me → User */
  loadMe(): Observable<User> {
    this._loading.set(true);
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap((u) => {
        this._user.set(u);
        this.fullName.set(u?.fullName ?? "");
        this._loading.set(false);
        this._exists.set(true);
      })
    );
  }

  /** POST /api/users → User (first-run create) */
  create(req: CreateUserRequest): Observable<User> {
    this._loading.set(true);
    return this.http.post<User>(`${this.baseUrl}`, req).pipe(
      tap((u) => {
        this._user.set(u);
        this.fullName.set(u?.fullName ?? "");
        this._loading.set(false);
        this._exists.set(true);
      })
    );
  }

  /** PATCH /api/users/me → User (update profile) */
  updateMe(patch: UpdateUserRequest): Observable<User> {
    this._loading.set(true);
    return this.http.patch<User>(`${this.baseUrl}/me`, patch).pipe(
      tap((u) => {
        this._user.set(u);
        this.fullName.set(u?.fullName ?? "");
        this._loading.set(false);
      })
    );
  }

  /** POST /api/admin/seed-demo → SeedDemoResult (load demo emails + events) */
  seedDemoData(): Observable<SeedDemoResult> {
    return this.http.post<SeedDemoResult>(`${this.adminUrl}/seed-demo`, {});
  }

  /** POST /api/users/me/profile-pic → User (upload profile picture) */
  uploadProfilePic(file: File): Observable<User> {
    this._loading.set(true);
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<User>(`${this.baseUrl}/me/profile-pic`, formData).pipe(
      tap((u) => {
        this._user.set(u);
        this._loading.set(false);
      })
    );
  }

  /** POST /api/users/me/resume → Resume (upload resume for AI parsing) */
  uploadResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<any>(`${this.baseUrl}/me/resume`, formData);
  }

  /** POST /api/users/me/resume-text → Resume (upload resume as text) */
  uploadResumeText(text: string, fileName: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/me/resume-text`, { text, fileName });
  }

  /** GET /api/users/me/resumes → Resume[] (list stored resumes) */
  getResumes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/me/resumes`);
  }

  /** First name only, for greetings like "Good evening, Aarav". */
  firstName(): string {
    const full = this.fullName();
    if (!full) return "";
    return full.split(/\s+/)[0];
  }

  /** Clear the cached user (used after profile delete / logout). */
  clear(): void {
    this._user.set(null);
    this.fullName.set("");
    this._exists.set(null);
  }
}
