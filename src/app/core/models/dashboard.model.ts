export interface StatsResponse {
  unread: number;
  important: number; // high-importance emails
  pendingApprovals: number;
  meetingsToday: number;
}

export interface DailyBriefResponse {
  brief: string;
}

export interface AnalyzeAllResult {
  emailId: string;
  analysis: import("./email-analysis.model").EmailAnalysis;
  error?: string;
}

export interface AnalyzeAllResponse {
  results: AnalyzeAllResult[];
}
