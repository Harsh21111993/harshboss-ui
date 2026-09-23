// Models for the 10 advanced features

// 1. Notifications
export interface AppNotification {
  id: string;
  type: string; // HIGH_EMAIL | MEETING_CHANGE | DEADLINE | FOLLOW_UP | MEETING_PREP
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// 2. Reply Draft
export interface ReplyDraft {
  tone: string;
  body: string;
}

// 3. Thread Summary
export interface ThreadSummary {
  id: string;
  threadSubject: string;
  decided: string;
  pending: string;
  actionNeeded: string;
  emailCount: number;
  createdAt: string;
}

// 4. Task
export interface Task {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  externalSystem: string;
  status: string; // TODO | IN_PROGRESS | DONE
  priority: string; // HIGH | MEDIUM | LOW
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: string;
  importantEmailId?: string;
  sourceUrl?: string;
}

// 5. Deadline
export interface Deadline {
  id: string;
  title: string;
  dueAt: string;
  sourceSubject: string | null;
  sourceUrl: string | null;
  status: string; // PENDING | DONE | OVERDUE
  createdAt: string;
}

// 6. Contact
export interface Contact {
  id: string;
  emailAddress: string;
  name: string;
  lastContactedAt: string | null;
  lastRepliedAt: string | null;
  totalEmails: number;
  totalReplies: number;
  avgResponseHours: string | null;
  relationshipHealth: string; // GOOD | STALE | AT_RISK | COLD
  notes: string | null;
}

// 7. Slack config
export interface SlackConfig {
  webhookUrl: string | null;
  channel: string | null;
  notifyHighOnly: boolean;
  autoForward: boolean;
  connected: boolean;
}

export interface SlackConfigRequest {
  webhookUrl: string;
  channel?: string;
  notifyHighOnly?: boolean;
  autoForward?: boolean;
}

// 8. Meeting Prep Brief
export interface MeetingPrepBrief {
  id: string;
  meetingTitle: string;
  meetingStart: string;
  attendees: string[];
  relevantEmails: string;
  lastMeetingNotes: string | null;
  agenda: string | null;
  createdAt: string;
}

// 9. Quick Action result
export interface QuickActionResult {
  success: boolean;
  message: string;
}
