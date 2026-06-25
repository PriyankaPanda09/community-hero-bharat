export type IssueCategory = "pothole" | "streetlight" | "garbage" | "water_leak" | "other";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "Open" | "In Progress" | "Resolved" | "Verified";

export interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

export interface CivicUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface CivicIssue {
  id: string;
  photoUrl: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  location: LocationData;
  status: IssueStatus;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhoto?: string;
  note?: string;
  timestamp: string;
  resolvedPhoto?: string;
  timeline?: {
    reportedAt?: string;
    inProgressAt?: string;
    resolvedAt?: string;
    verifiedAt?: string;
  };
  verifications?: {
    [uid: string]: "verified" | "not_fixed";
  };
}

export interface AnalysisResult {
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
}

export interface InAppNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  issueId: string;
  status: IssueStatus;
}
