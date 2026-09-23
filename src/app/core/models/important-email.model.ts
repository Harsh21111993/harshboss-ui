import { EmailLabel, Importance } from "./email-analysis.model";

/**
 * Lightweight important-email summary.
 *
 * Does NOT contain the full email body — only the AI's brief + a deep link
 * to view the full email in Gmail/Outlook (providerUrl).
 */
export interface ImportantEmail {
  id: string;
  provider: string;
  providerMessageId: string;
  providerUrl: string | null;
  fromAddress: string;
  fromName: string;
  subject: string;
  brief: string;
  label: EmailLabel;
  importance: Importance;
  score: number;
  reason: string;
  suggestedAction: string;
  actionItems: string[];
  receivedAt: string;
  detectedAt: string;
  isMeetingInvitation: boolean;
}

export interface ImportantEmailStats {
  total: number;
  high: number;
  meetings: number;
}
