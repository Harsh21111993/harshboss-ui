import { EmailAnalysis } from "./email-analysis.model";

export type EmailFolder = "INBOX" | "SPAM";

export interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  folder: EmailFolder;
  isRead: boolean;
  receivedAt: string; // ISO 8601
  analysis?: EmailAnalysis | null;
}
