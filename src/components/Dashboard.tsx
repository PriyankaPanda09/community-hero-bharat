import React, { useState, useEffect } from "react";
import { CivicIssue, IssueCategory, IssueStatus } from "../types";
import { BarChart3, TrendingUp, CheckCircle, Clock, AlertCircle, Activity, Info, Sparkles, Trash2, Play, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useFirebase } from "../FirebaseContext";
import { Language, translations } from "../translations";

interface DashboardProps {
  issues: CivicIssue[];
  onViewUnseenOnly: () => void;
  language: Language;
}

const CATEGORY_GRADIENTS: Record<IssueCategory, string> = {
  pothole: "bg-gradient-to-r from-amber-500 to-amber-600",
  streetlight: "bg-gradient-to-r from-yellow-400 to-yellow-500",
  garbage: "bg-gradient-to-r from-emerald-500 to-emerald-600",
  water_leak: "bg-gradient-to-r from-teal-500 to-teal-600",
  other: "bg-gradient-to-r from-purple-400 to-purple-500",
};

// Fluid 1.2s custom count-up widget
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const totalMiliseconds = duration;
    // ensure updates aren't lagging
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

function AnimatedPercentageCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}%</span>;
}

export default function Dashboard({ issues, onViewUnseenOnly, language }: DashboardProps) {
  const t = translations[language || "en"];
  const CATEGORY_LABELS: Record<IssueCategory, string> = {
    pothole: t.catPothole,
    streetlight: t.catStreetlight,
    garbage: t.catGarbage,
    water_leak: t.catWaterLeak,
    other: t.catOther,
  };

  const { currentUser, clearAllIssues, clearDemoIssues, adminReadIssues, markAdminIssuesAsRead, updateIssueStatus, escalateIssue } = useFirebase();
  const [isClearing, setIsClearing] = useState(false);
  const [useRelaxedThresholds, setUseRelaxedThresholds] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    setInsightsError(null);
    try {
      const response = await fetch("/api/predictive-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issues }),
      });
      if (!response.ok) {
        throw new Error("Failed to load predictive insights");
      }
      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
      } else {
        throw new Error("No insights returned");
      }
    } catch (err: any) {
      console.error("Error fetching insights:", err);
      setInsightsError("Could not update predictive model insights at this time.");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Build a stable serialized representation of active issues to trigger real-time AI modeling when states modify
  const issuesDependencyKey = JSON.stringify(
    issues.map((i) => ({
      id: i.id,
      status: i.status,
      severity: i.severity,
      confirmationCount: i.confirmationCount || 0,
    }))
  );

  useEffect(() => {
    fetchInsights();
  }, [issuesDependencyKey]);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "confirm" | "success" | "error";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Compute metric calculations
  const total = issues.length;
  
  const statusCounts = {
    Open: issues.filter((i) => i.status === "Open").length,
    "In Progress": issues.filter((i) => i.status === "In Progress").length,
    Resolved: issues.filter((i) => i.status === "Resolved" || i.status === "Verified").length,
  };

  const isAdmin = currentUser?.email === "priyapanda959@gmail.com";
  const unreadCount = issues.filter(
    (i) => i.status === "Open" && !adminReadIssues.includes(i.id)
  ).length;

  const categoryCounts: Record<IssueCategory, number> = {
    pothole: issues.filter((i) => i.category === "pothole").length,
    streetlight: issues.filter((i) => i.category === "streetlight").length,
    garbage: issues.filter((i) => i.category === "garbage").length,
    water_leak: issues.filter((i) => i.category === "water_leak").length,
    other: issues.filter((i) => i.category === "other").length,
  };

  const severityCounts = {
    low: issues.filter((i) => i.severity === "low").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    high: issues.filter((i) => i.severity === "high").length,
  };

  const resolutionRate = total > 0 ? Math.round((statusCounts.Resolved / total) * 100) : 0;
  const activeCount = statusCounts.Open + statusCounts["In Progress"];

  const qualifyingIssues = issues.filter((issue) => {
    if (issue.status !== "Open") return false;
    if (issue.isEscalated) return false;

    if (useRelaxedThresholds) {
      // relaxed test thresholds: confirmationCount >= 1 AND severity is "high" only (any age)
      const confirmations = issue.confirmationCount || 0;
      return confirmations >= 1 && issue.severity === "high";
    } else {
      const issueDate = new Date(issue.timestamp);
      const now = new Date();
      const diffTime = Math.max(0, now.getTime() - issueDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const confirmations = issue.confirmationCount || 0;

      // real production rule: 5 or more confirmations AND severity is "high" AND open for more than 7 days
      return confirmations >= 5 && issue.severity === "high" && diffDays > 7;
    }
  });

  const handleRunReview = async () => {
    if (qualifyingIssues.length === 0) {
      setModal({
        isOpen: true,
        title: "No Qualifying Reports",
        message: "No open reports currently meet the review thresholds and are not yet escalated.",
        type: "info",
      });
      return;
    }

    const confirmMsg = `Are you sure you want to run the civic review on ${qualifyingIssues.length} qualifying report(s)? This will flag them as urgent.`;
    setModal({
      isOpen: true,
      title: "Confirm Civic Review",
      message: confirmMsg,
      type: "confirm",
      onConfirm: async () => {
        try {
          setIsReviewing(true);
          await Promise.all(
            qualifyingIssues.map((issue) => escalateIssue(issue.id))
          );
          setModal({
            isOpen: true,
            title: "Review Complete",
            message: `Successfully flagged ${qualifyingIssues.length} civic report(s) as urgent.`,
            type: "success",
          });
        } catch (err: any) {
          console.error("Failed to execute civic review:", err);
          setModal({
            isOpen: true,
            title: "Execution Failed",
            message: "Failed to execute civic review: " + err.message,
            type: "error",
          });
        } finally {
          setIsReviewing(false);
        }
      }
    });
  };

  const handleClearAllData = async () => {
    setModal({
      isOpen: true,
      title: "Confirm Database Reset",
      message: "Are you sure you want to clear ALL reported issues from the Firestore database? This action is irreversible.",
      type: "confirm",
      onConfirm: async () => {
        try {
          setIsClearing(true);
          await clearAllIssues();
          setModal({
            isOpen: true,
            title: "Reset Successful",
            message: "All reported issues have been successfully cleared from the Firestore database.",
            type: "success",
          });
        } catch (err: any) {
          console.error("Failed to clear data:", err);
          setModal({
            isOpen: true,
            title: "Reset Failed",
            message: "Failed to clear database reports: " + err.message,
            type: "error",
          });
        } finally {
          setIsClearing(false);
        }
      }
    });
  };

  const [isClearingDemo, setIsClearingDemo] = useState(false);

  const handleClearDemoIssues = async () => {
    setModal({
      isOpen: true,
      title: "Confirm Purging Demo Data",
      message: "Are you sure you want to remove all pre-loaded seed/demo issues from the Firestore database? This will leave your real verified citizen reports intact.",
      type: "confirm",
      onConfirm: async () => {
        try {
          setIsClearingDemo(true);
          await clearDemoIssues();
          setModal({
            isOpen: true,
            title: "Purge Successful",
            message: "All seed/demo issues have been successfully removed from the Firestore database.",
            type: "success",
          });
        } catch (err: any) {
          console.error("Failed to clear demo data:", err);
          setModal({
            isOpen: true,
            title: "Error Purging Data",
            message: "Failed to purge demo data: " + err.message,
            type: "error",
          });
        } finally {
          setIsClearingDemo(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-accent-teal shrink-0 relative overflow-hidden shadow-xs">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--accent-teal),0.15),transparent_70%)] animate-pulse" />
            <Activity className="w-5.5 h-5.5 text-accent-teal animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-extrabold text-text-primary tracking-tight">
              {t.insightsDashboard}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              {t.insightsDashboardSub}
            </p>
          </div>
        </div>
        {currentUser?.email === "priyapanda959@gmail.com" && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleClearDemoIssues}
              disabled={isClearingDemo}
              className={`flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/20 shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer`}
              id="clear-demo-data-button"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isClearingDemo ? "Purging..." : "Purge Demo Data"}</span>
            </button>
            <button
              onClick={handleClearAllData}
              disabled={isClearing}
              className={`flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer`}
              id="clear-all-data-button"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isClearing ? t.clearingDatabase : t.clearAllData}</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Unread Reports Alert Banner */}
      {isAdmin && unreadCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md" id="admin-unread-alert">
          <div 
            onClick={onViewUnseenOnly}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-grow group"
            title="Click to view unseen reports"
          >
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
            <div className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wide shrink-0 transition-colors shadow-sm">
              {unreadCount} {t.unreadText}
            </div>
            <p className="text-xs text-text-primary font-bold group-hover:text-accent-teal transition-colors">
              There are {unreadCount} {t.newReportsAlertText} <span className="text-accent-teal underline font-extrabold text-[11px] ml-1 inline-block transform group-hover:translate-x-1 transition-transform">{t.viewThemBtn} &rarr;</span>
            </p>
          </div>
          <button
            onClick={markAdminIssuesAsRead}
            className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer self-start sm:self-center shrink-0"
          >
            {t.markAllReadBtn}
          </button>
        </div>
      )}

      {/* Civic Review Control Panel with relaxed thresholds toggle */}
      <div className="bg-bg-card border border-border-card rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden" id="civic-review-panel">
        <div className="space-y-1.5 flex-1 w-full">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-black text-xs text-text-primary uppercase tracking-wider">{t.civicReviewPipeline}</h4>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
            {t.civicReviewSub}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1.5">
            {/* Toggle switch container */}
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={useRelaxedThresholds}
                  onChange={(e) => setUseRelaxedThresholds(e.target.checked)}
                  className="sr-only peer"
                  id="relaxed-thresholds-toggle"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-orange-500 transition-all" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">
                {t.useRelaxedThresholds}
              </span>
            </label>

            {/* Mode Indicator status */}
            {useRelaxedThresholds ? (
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/25 animate-pulse inline-flex items-center gap-1" id="relaxed-mode-indicator">
                {t.relaxedModeIndicator}
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 inline-flex items-center gap-1" id="strict-mode-indicator">
                {t.strictModeIndicator}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full md:w-auto">
          {/* Active pipeline rules info */}
          <div className="text-[10px] text-text-muted bg-slate-500/5 p-3 rounded-xl border border-border-card/25 space-y-1 text-left font-semibold">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary block">{t.activeCriteria}:</span>
            {useRelaxedThresholds ? (
              <div className="leading-tight text-[10px]">
                <div>&bull; {t.criteriaStatusOpen}</div>
                <div>&bull; {t.criteriaOneConfirmation}</div>
                <div>&bull; {t.criteriaHighSeverity}</div>
                <div>&bull; {t.criteriaIgnoredDays}</div>
              </div>
            ) : (
              <div className="leading-tight text-[10px]">
                <div>&bull; {t.criteriaFiveConfirmations}</div>
                <div>&bull; {t.criteriaHighSeverity}</div>
                <div>&bull; {t.criteriaOpenSevenDays}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleRunReview}
            disabled={isReviewing}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-accent-teal hover:bg-accent-teal-hover disabled:bg-teal-800 disabled:opacity-50 text-text-on-accent font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer self-stretch sm:self-auto min-h-[44px]"
            id="run-civic-review-button"
          >
            {isReviewing ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Play className="w-4 h-4 fill-current shrink-0" />
            )}
            <span>
              {isReviewing ? t.reviewingProgress : t.runCivicReviewBtn}
              {qualifyingIssues.length > 0 && ` (${qualifyingIssues.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with custom hover scales and glow effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        {/* Total Issues Card */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300 xl:p-5 xl:flex xl:flex-row xl:items-center xl:justify-start xl:gap-4 xl:w-full xl:min-w-0 xl:translate-x-0">
          <div className="w-11 h-11 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0 border border-accent-teal/20 xl:w-11 xl:h-11 xl:shrink-0">
            <BarChart3 className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1 xl:text-left xl:min-w-0 xl:w-auto">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none xl:text-[10px] xl:leading-normal xl:whitespace-normal xl:break-words" title={t.totalReportsCard}>{t.totalReportsCard}</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none xl:text-2xl xl:leading-none">
              <AnimatedCounter value={total} />
            </h3>
            <p className="text-[9px] text-accent-teal font-semibold mt-1 xl:text-[9px] xl:leading-normal xl:whitespace-normal xl:break-words" title={t.loggedRegistry}>{t.loggedRegistry}</p>
          </div>
        </div>

        {/* Active Backlog */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300 xl:p-5 xl:flex xl:flex-row xl:items-center xl:justify-start xl:gap-4 xl:w-full xl:min-w-0 xl:translate-x-0">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 xl:w-11 xl:h-11 xl:shrink-0">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1 xl:text-left xl:min-w-0 xl:w-auto">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none xl:text-[10px] xl:leading-normal xl:whitespace-normal xl:break-words" title={t.activeBacklogCard}>{t.activeBacklogCard}</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none xl:text-2xl xl:leading-none">
              <AnimatedCounter value={activeCount} />
            </h3>
            <p className="text-[9px] text-amber-500 font-semibold mt-1 xl:text-[9px] xl:leading-normal xl:whitespace-normal xl:break-words" title={t.needsDispatch}>{t.needsDispatch}</p>
          </div>
        </div>

        {/* Resolved Issues */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">{t.resolvedIssuesCard}</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedCounter value={statusCounts.Resolved} />
            </h3>
            <p className="text-[9px] text-emerald-500 font-semibold mt-1">{t.resolutionSuccess}</p>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">{t.resolutionRateCard}</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedPercentageCounter value={resolutionRate} />
            </h3>
            <p className="text-[9px] text-purple-500 font-semibold mt-1">{t.closedCasesRatio}</p>
          </div>
        </div>
      </div>

      {/* Main Charts Breakdown layout grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category analysis charts */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 sm:p-6 space-y-5" id="category-analytics">
          <div>
            <h4 className="font-display font-bold text-text-primary text-sm flex items-center gap-1.5">
              <span>{t.categoryDistributionChart}</span>
            </h4>
            <p className="text-[10px] text-text-muted font-medium mt-0.5">{t.categoryChartSub}</p>
          </div>

          <div className="space-y-4">
            {(Object.keys(categoryCounts) as IssueCategory[]).map((cat) => {
              const count = categoryCounts[cat];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const barGradient = CATEGORY_GRADIENTS[cat];

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span className="text-text-primary font-extrabold text-right">
                      {count} <span className="text-text-muted font-medium">({pct}%)</span>
                    </span>
                  </div>
                  {/* Outer progress shell */}
                  <div className="h-2.5 w-full bg-slate-500/10 rounded-full overflow-hidden border border-border-card/20 shadow-inner">
                    <motion.div
                       initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${barGradient} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status and Severity charts layout */}
        <div className="grid grid-cols-1 gap-6">
          {/* Status Breakdown tracking cards */}
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex flex-col justify-between" id="status-analytics">
            <div className="mb-4">
              <h4 className="font-display font-bold text-text-primary text-sm">{t.statusLabel}</h4>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">{t.needsDispatch}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Open */}
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-sky-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mx-auto" />
                <span className="text-2xl font-display font-black text-sky-500 block mt-2">
                  <AnimatedCounter value={statusCounts.Open} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-sky-500 leading-none">{t.statusOpen}</span>
              </div>

              {/* In Progress */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-purple-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mx-auto animate-pulse" />
                <span className="text-2xl font-display font-black text-purple-500 block mt-2">
                  <AnimatedCounter value={statusCounts["In Progress"]} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-500 leading-none">{t.statusInProgress}</span>
              </div>

              {/* Resolved */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-emerald-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" />
                <span className="text-2xl font-display font-black text-emerald-500 block mt-2">
                  <AnimatedCounter value={statusCounts.Resolved} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 leading-none">{t.statusResolved}</span>
              </div>
            </div>
          </div>

          {/* Severity Breakdown Profile progress panel */}
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-3" id="severity-analytics">
            <div>
              <h4 className="font-display font-bold text-text-primary text-sm">{t.severityLabel}</h4>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">{t.flaggedUrgent}</p>
            </div>

            <div className="space-y-3">
              {/* High */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm" />
                <span className="text-xs font-bold text-text-secondary w-16">{t.highSeverity.replace("🔴 ", "")}</span>
                <div className="flex-1 h-3 bg-slate-500/10 rounded-full overflow-hidden border border-border-card/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (severityCounts.high / total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full"
                  />
                </div>
                <span className="text-xs font-extrabold text-text-primary w-6 text-right">
                  <AnimatedCounter value={severityCounts.high} />
                </span>
              </div>

              {/* Medium */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 shadow-sm" />
                <span className="text-xs font-bold text-text-secondary w-16">{t.mediumSeverity.replace("🟡 ", "")}</span>
                <div className="flex-1 h-3 bg-slate-500/10 rounded-full overflow-hidden border border-border-card/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (severityCounts.medium / total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                  />
                </div>
                <span className="text-xs font-extrabold text-text-primary w-6 text-right">
                  <AnimatedCounter value={severityCounts.medium} />
                </span>
              </div>

              {/* Low */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                <span className="text-xs font-bold text-text-secondary w-16">{t.lowSeverity.replace("🟢 ", "")}</span>
                <div className="flex-1 h-3 bg-slate-500/10 rounded-full overflow-hidden border border-border-card/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (severityCounts.low / total) * 100 : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
                <span className="text-xs font-extrabold text-text-primary w-6 text-right">
                  <AnimatedCounter value={severityCounts.low} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Insights Section */}
      <div className="bg-bg-card border border-border-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300" id="predictive-insights-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display font-black text-text-primary text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-teal animate-pulse" />
              <span>{t.predictiveAiInsights}</span>
            </h4>
            <p className="text-[11px] text-text-muted font-medium mt-0.5">
              {t.predictiveAiSub}
            </p>
          </div>
          <button
            onClick={fetchInsights}
            disabled={isLoadingInsights}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-accent-teal hover:text-white font-bold text-xs rounded-xl border border-white/5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center"
            id="refresh-insights-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? "animate-spin" : ""}`} />
            <span>{isLoadingInsights ? t.analyzingImage : t.navDashboard}</span>
          </button>
        </div>

        {/* AI Disclaimer Label */}
        <div className="flex items-start gap-2.5 bg-accent-teal/5 border border-accent-teal/15 rounded-xl p-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-accent-teal shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] font-semibold">
            <span className="text-accent-teal font-extrabold uppercase tracking-wider mr-1">AI Notice:</span>
            These analysis cards are forward-looking predictions generated by AI pattern modeling. They represent probable trends, concentrations, and risk forecasts based on recent community activity—they are NOT guaranteed outcomes.
          </p>
        </div>

        {isLoadingInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3 animate-pulse h-40 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded-full w-2/3" />
                  <div className="h-3 bg-slate-800 rounded-full w-5/6" />
                  <div className="h-3 bg-slate-800 rounded-full w-4/5" />
                </div>
                <div className="h-5 bg-slate-800 rounded-full w-1/3" />
              </div>
            ))}
          </div>
        ) : insightsError ? (
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-300 font-bold">{insightsError}</p>
            <button
              onClick={fetchInsights}
              className="mt-2 text-xs font-bold text-accent-teal hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 text-center space-y-2">
            <Activity className="w-8 h-8 text-text-muted mx-auto animate-pulse" />
            <p className="text-xs text-text-muted font-bold">No predictions available. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, idx) => {
              // Icon mapping
              let IconComp = Sparkles;
              if (insight.type === "trending") IconComp = TrendingUp;
              if (insight.type === "concentration") IconComp = BarChart3;
              if (insight.type === "risk") IconComp = AlertCircle;

              // Color classes based on type or category
              let typeBadgeBg = "bg-accent-teal/10 text-accent-teal border-accent-teal/20";
              if (insight.type === "risk") {
                typeBadgeBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              } else if (insight.type === "trending") {
                typeBadgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              }

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${typeBadgeBg}`}>
                        {insight.type}
                      </span>
                      <span className="text-xs font-extrabold text-accent-teal uppercase tracking-wider">
                        {insight.metric}
                      </span>
                    </div>

                    <h5 className="font-display font-bold text-text-primary text-sm tracking-tight leading-snug group-hover:text-accent-teal transition-colors">
                      {insight.title}
                    </h5>

                    <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                      {insight.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-text-muted font-bold capitalize">
                      Category: {insight.category?.replace("_", " ")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful Info Tip bar */}
      <div className="bg-gradient-to-r from-accent-teal to-teal-700/80 rounded-2xl p-5 text-white flex items-start gap-3.5 shadow-md relative overflow-hidden" id="dashboard-tip-box">
        <div className="absolute inset-0 bg-radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08), transparent 50%)" />
        <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>
        <div>
          <h5 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5 text-amber-300">
            <span>Muncipality Response Efficiency</span>
          </h5>
          <p className="text-xs text-teal-50/90 mt-1 leading-relaxed font-medium">
            By cataloging pothole anomalies and light outrages early, Bharat reduces street reconstruction overheads by up to 35% and fosters inclusive, safe walking tracks.
          </p>
        </div>
      </div>

      {/* Custom dialog modal replacement for window.alert/window.confirm */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 sm:p-6 max-w-md w-full mx-4 relative z-10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              {modal.type === "confirm" && <AlertCircle className="w-5 h-5 text-accent-highlight shrink-0 mt-0.5" />}
              {modal.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
              {modal.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
              {modal.type === "info" && <Info className="w-5 h-5 text-accent-teal shrink-0 mt-0.5" />}
              
              <div className="space-y-1.5">
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
                  {modal.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  {modal.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2">
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-slate-200 text-text-secondary hover:text-text-primary font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setModal(prev => ({ ...prev, isOpen: false }));
                      if (modal.onConfirm) modal.onConfirm();
                    }}
                    className="px-4 py-2 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
