import { Platform } from "./calendar-event.model";

export type ApprovalStatus = "PENDING" | "APPROVED" | "DECLINED";

export interface ConflictInfo {
  overlappingEventTitle: string;
  overlappingEventStart: string; // ISO 8601
  overlappingEventEnd: string; // ISO 8601
}

export interface ProposalDetails {
  title: string;
  proposedStart: string; // ISO 8601
  durationMinutes: number;
  platform: Platform;
}

export interface Approval {
  id: string;
  type: string; // "MEETING_PROPOSAL"
  requesterName: string;
  requesterEmail: string;
  requestedTime: string; // ISO 8601
  status: ApprovalStatus;
  createdAt: string; // ISO 8601
  message?: string | null;
  proposalDetails: ProposalDetails;
  conflictInfo?: ConflictInfo | null;
  alternatives?: string[]; // ISO 8601 start times
  autoReplySent?: string | null;
  decisionEmailSent?: string | null;
}

export interface ProposeMeetingRequest {
  title: string;
  proposedStart: string; // ISO 8601
  durationMinutes: number;
  platform: Platform;
  requesterName: string;
  requesterEmail: string;
  message?: string;
}

export interface ProposeMeetingResponse {
  approvalId: string;
  status: "FREE" | "CONFLICT";
  conflictInfo?: ConflictInfo | null;
  alternatives: string[]; // ISO 8601 start times
  autoReplyEmail?: string | null;
}

export interface DecisionRequest {
  decision: "APPROVE" | "DECLINE";
}

export interface DecisionResponse {
  approvalId: string;
  status: ApprovalStatus;
  notificationEmail: string;
}
