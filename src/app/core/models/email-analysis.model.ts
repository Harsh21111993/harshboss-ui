export type EmailLabel =
  | "URGENT"
  | "ACTION_REQUIRED"
  | "MEETING_REQUEST"
  | "FYI"
  | "INVOICE"
  | "SPAM"
  | "PERSONAL";

export type Importance = "HIGH" | "MEDIUM" | "LOW";

export interface EmailAnalysis {
  brief: string;
  label: EmailLabel;
  importance: Importance;
  score: number; // 0-100
  reason: string;
  suggestedAction: string;
  actionItems: string[];
  keyDates: string[];
}
