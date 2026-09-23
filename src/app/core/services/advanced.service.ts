import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import {
  AppNotification, ReplyDraft, ThreadSummary, Task, CreateTaskRequest,
  Deadline, Contact, SlackConfig, SlackConfigRequest, MeetingPrepBrief,
  QuickActionResult
} from "../models";

/**
 * AdvancedFeaturesService — Angular service for the 10 advanced features.
 * Calls the /api/advanced/* endpoints.
 */
@Injectable({ providedIn: "root" })
export class AdvancedFeaturesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/advanced";

  // Notifications
  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _unreadCount = signal(0);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();

  loadNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.baseUrl}/notifications`).pipe(
      tap((n) => {
        this._notifications.set(n || []);
        this._unreadCount.set(n?.filter(x => !x.isRead).length || 0);
      })
    );
  }

  markNotificationRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => this.loadNotifications().subscribe())
    );
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/read-all`, {}).pipe(
      tap(() => this.loadNotifications().subscribe())
    );
  }

  // 1. AI Reply Drafting
  draftReply(emailId: string, tone: string): Observable<ReplyDraft> {
    return this.http.post<ReplyDraft>(`${this.baseUrl}/emails/${emailId}/draft-reply`, { tone });
  }

  // 5. Thread Summarization
  summarizeThread(subjectKeyword: string): Observable<ThreadSummary> {
    return this.http.post<ThreadSummary>(`${this.baseUrl}/thread-summary`, { subjectKeyword });
  }

  loadThreadSummaries(): Observable<ThreadSummary[]> {
    return this.http.get<ThreadSummary[]>(`${this.baseUrl}/thread-summaries`);
  }

  // 6. Quick Actions
  quickAction(emailId: string, action: string): Observable<QuickActionResult> {
    return this.http.post<QuickActionResult>(`${this.baseUrl}/emails/${emailId}/quick-action`, { action });
  }

  // 7. Deadlines
  loadDeadlines(): Observable<Deadline[]> {
    return this.http.get<Deadline[]>(`${this.baseUrl}/deadlines`);
  }

  markDeadlineDone(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/deadlines/${id}/done`, {});
  }

  // 8. Slack
  getSlackConfig(): Observable<SlackConfig> {
    return this.http.get<SlackConfig>(`${this.baseUrl}/slack/config`);
  }

  configureSlack(req: SlackConfigRequest): Observable<SlackConfig> {
    return this.http.post<SlackConfig>(`${this.baseUrl}/slack/config`, req);
  }

  // 9. Tasks
  loadTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`);
  }

  createTask(req: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks`, req);
  }

  markTaskDone(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/tasks/${id}/done`, {});
  }

  // 10. Contacts
  loadContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.baseUrl}/contacts`);
  }

  loadAtRiskContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.baseUrl}/contacts/at-risk`);
  }

  // 4. Meeting Prep
  loadMeetingPreps(): Observable<MeetingPrepBrief[]> {
    return this.http.get<MeetingPrepBrief[]>(`${this.baseUrl}/meeting-prep`);
  }

  generateMeetingPrep(eventId: string): Observable<MeetingPrepBrief> {
    return this.http.post<MeetingPrepBrief>(`${this.baseUrl}/meeting-prep/${eventId}`, {});
  }
}
