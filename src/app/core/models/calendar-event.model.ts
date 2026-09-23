export type Platform = "TEAMS" | "GOOGLE" | "ZOOM" | "PERSONAL" | "BLOCKED";

export type EventStatus = "TENTATIVE" | "CONFIRMED";

export interface CalendarEvent {
  id: string;
  title: string;
  platform: Platform;
  start: string; // ISO 8601
  end: string; // ISO 8601
  organizer: string;
  attendees: string[];
  joinUrl?: string | null;
  location?: string | null;
  isHiddenByOthers: boolean;
  status: EventStatus;
  /** If non-null, this event was auto-created from a meeting invitation email.
   *  The calendar shows a "View source email" link that navigates to the inbox. */
  sourceEmailId?: string | null;
  /** Deep link to view the source email in Gmail/Outlook. */
  sourceEmailUrl?: string | null;
}
