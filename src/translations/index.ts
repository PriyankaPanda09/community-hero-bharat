export type Language = "en" | "hi" | "or" | "bn" | "ta" | "te" | "mr" | "gu" | "pa" | "kn" | "ml";

export interface TranslationDict {
  // Navigation
  navBrowse: string;
  navReport: string;
  navMap: string;
  navDashboard: string;
  navMyReports: string;
  navHonors: string;
  navLeaderboard: string;

  // Global & Header
  helpTitle: string;
  helpSub: string;
  gotIt: string;
  close: string;
  themeLight: string;
  themeDark: string;
  themeNeon: string;
  signOut: string;
  signIn: string;

  // Help Modal Content
  helpHowItWorks: string;
  helpStep1Title: string;
  helpStep1_1: string;
  helpStep1_2: string;
  helpStep1_3: string;
  helpStep2Title: string;
  helpStep2_1: string;
  helpStep2_2: string;
  helpStep3Title: string;
  helpStep3_1: string;
  helpStep3_2: string;
  helpStep3_3: string;
  helpStep4Title: string;
  helpStep4Open: string;
  helpStep4OpenDesc: string;
  helpStep4Progress: string;
  helpStep4ProgressDesc: string;
  helpStep4Resolved: string;
  helpStep4ResolvedDesc: string;
  helpStep4Verified: string;
  helpStep4VerifiedDesc: string;
  helpStep5Title: string;
  helpStep5_1: string;
  helpStep5_2: string;
  helpStep5_3: string;
  helpFooterDisclaimer: string;

  // My Reports & Score
  mySubmissionsTitle: string;
  mySubmissionsSub: string;
  reportAnother: string;
  noSubmissionsYet: string;
  noSubmissionsDesc: string;
  raiseFirstReport: string;
  profileVerifiedCitizen: string;
  civicScoreLabel: string;
  pointsLabel: string;
  scoreExplanation: string;
  currentBadgeLabel: string;
  reportsCountText: string;
  badgeExplanation: string;
  certificateHeader: string;
  certificateSub: string;
  certificateLocked: string;
  compileCertificate: string;
  compilingCertificate: string;
  certSystemOffline: string;
  retryCompile: string;
  certDisclaimer: string;
  printSavePDF: string;
  loginWallTitle: string;
  loginWallDesc: string;
  signInBtn: string;
  statusLabel: string;
  confirmationsCountText: string;
  coReportersLabel: string;
  noCoReportersText: string;

  // Browse Issues / Filter Bar
  searchBarPlaceholder: string;
  regionLabel: string;
  allRegions: string;
  myRegion: string;
  categoryLabel: string;
  allCategories: string;
  searchLabel: string;
  searchTextPlaceholder: string;
  statusFilterLabel: string;
  allStatuses: string;
  severityLabel: string;
  allSeverities: string;
  clearAllFiltersBtn: string;
  allFiltersDefault: string;
  foundCountBanner: string;
  foundCountBannerSingle: string;
  foundCountInRegionBanner: string;
  foundCountInRegionBannerSingle: string;
  noMatchingReportsTitle: string;
  noMatchingReportsDesc: string;
  reportNewCivicIssue: string;
  lowSeverity: string;
  mediumSeverity: string;
  highSeverity: string;

  // Added Audited Keys
  catPothole: string;
  catStreetlight: string;
  catGarbage: string;
  catWaterLeak: string;
  catOther: string;

  statusOpen: string;
  statusInProgress: string;
  statusResolved: string;
  statusVerified: string;

  mapTitle: string;
  mapSub: string;
  plottedIssues: string;
  noPlottedIssues: string;
  noPlottedIssuesDesc: string;
  determiningLocation: string;
  youAreNear: string;
  youAreHere: string;
  viewDetails: string;
  urgentLabel: string;

  reportFormTitle: string;
  reportFormSub: string;
  civicReportDetails: string;
  livePhotoUpload: string;
  photoUploadDesc: string;
  takeSnapshot: string;
  changePicture: string;
  chooseGallery: string;
  dragDropOrClick: string;
  selectCategory: string;
  selectSeverity: string;
  detailedDescription: string;
  writeContextPlaceholder: string;
  analyzingImage: string;
  detectingLocation: string;
  detectLocationBtn: string;
  submitCivicReport: string;
  submittingCivicReport: string;
  thankYouHero: string;
  reportSuccessDesc: string;
  pointsCredited: string;
  fileAnotherReport: string;

  insightsDashboard: string;
  insightsDashboardSub: string;
  clearAllData: string;
  clearingDatabase: string;
  unreadText: string;
  newReportsAlertText: string;
  viewThemBtn: string;
  markAllReadBtn: string;
  civicReviewPipeline: string;
  civicReviewSub: string;
  useRelaxedThresholds: string;
  relaxedModeIndicator: string;
  strictModeIndicator: string;
  activeCriteria: string;
  criteriaStatusOpen: string;
  criteriaOneConfirmation: string;
  criteriaHighSeverity: string;
  criteriaIgnoredDays: string;
  criteriaFiveConfirmations: string;
  criteriaOpenSevenDays: string;
  runCivicReviewBtn: string;
  reviewingProgress: string;
  totalReportsCard: string;
  loggedRegistry: string;
  activeBacklogCard: string;
  needsDispatch: string;
  resolvedIssuesCard: string;
  resolutionSuccess: string;
  citizenSlaMet: string;
  resolutionRateCard: string;
  closedCasesRatio: string;
  escalatedCard: string;
  flaggedUrgent: string;
  categoryDistributionChart: string;
  categoryChartSub: string;
  timelineChartTitle: string;
  timelineChartSub: string;
  predictiveAiInsights: string;
  predictiveAiSub: string;
  modelStatusActive: string;
  systemLogHeader: string;
  aiAnalyzingClusters: string;
  aiRealtimeModeling: string;
  chartCategoryKey: string;
  chartCountKey: string;
  noDataToAnalyzeCategory: string;
  noDataToBuildTimeline: string;
}

import { en } from "./en";
import { hi } from "./hi";
import { or } from "./or";
import { bn } from "./bn";
import { ta } from "./ta";
import { te } from "./te";
import { mr } from "./mr";
import { gu } from "./gu";
import { pa } from "./pa";
import { kn } from "./kn";
import { ml } from "./ml";

export const translations: Record<Language, TranslationDict> = {
  en,
  hi,
  or,
  bn,
  ta,
  te,
  mr,
  gu,
  pa,
  kn,
  ml
};
