export type IssueCategory = "pothole" | "streetlight" | "garbage" | "water_leak" | "other";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "Open" | "In Progress" | "Resolved" | "Verified";

export interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
  state?: string;
  city?: string;
  streetAddress?: string;
  zipCode?: string;
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
  coReporters?: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    timestamp: string;
  }[];
  confirmationPhotos?: {
    url: string;
    reporterId: string;
    reporterName: string;
    reporterPhoto?: string;
    note?: string;
    timestamp: string;
  }[];
  confirmationCount?: number;
  isEscalated?: boolean;
  escalatedAt?: string;
  complaintLetter?: string;
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

export const isDemoIssue = (issue: CivicIssue): boolean => {
  if (!issue) return false;
  return (
    issue.id.startsWith("seed_") ||
    issue.reporterId.startsWith("seed_user") ||
    issue.reporterEmail === "saroja.s@bharat-civic.org" ||
    issue.reporterEmail === "milind.j@my-neighborhood.net" ||
    issue.reporterEmail === "esha.r@eco-action.org"
  );
};

