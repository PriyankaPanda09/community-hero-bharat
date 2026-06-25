import React, { useState, useEffect } from "react";
import { CivicIssue, IssueCategory, IssueStatus } from "../types";
import { BarChart3, TrendingUp, CheckCircle, Clock, AlertCircle, Activity, Info, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useFirebase } from "../FirebaseContext";

interface DashboardProps {
  issues: CivicIssue[];
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: "Pothole / Road Repair",
  streetlight: "Streetlight Fixes",
  garbage: "Garbage / Waste Dumping",
  water_leak: "Water line Flooding",
  other: "Other Civic Concerns",
};

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

export default function Dashboard({ issues }: DashboardProps) {
  const { currentUser, clearAllIssues, adminReadIssues, markAdminIssuesAsRead } = useFirebase();
  const [isClearing, setIsClearing] = useState(false);

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

  const handleClearAllData = async () => {
    if (window.confirm("Are you sure you want to clear ALL reported issues from the Firestore database? This action is irreversible.")) {
      try {
        setIsClearing(true);
        await clearAllIssues();
      } catch (err: any) {
        console.error("Failed to clear data:", err);
        alert("Failed to clear database reports: " + err.message);
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary flex items-center gap-2">
            <span>Insights Dashboard</span>
            <Activity className="w-5.5 h-5.5 text-accent-teal animate-pulse shrink-0" />
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            Muncipality response pipelines, civic health index, and real-time category stats.
          </p>
        </div>
        {currentUser?.email === "priyapanda959@gmail.com" && (
          <button
            onClick={handleClearAllData}
            disabled={isClearing}
            className={`flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer self-start sm:self-center`}
            id="clear-all-data-button"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isClearing ? "Clearing Database..." : "Clear All Data"}</span>
          </button>
        )}
      </div>

      {/* Admin Unread Reports Alert Banner */}
      {isAdmin && unreadCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md" id="admin-unread-alert">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
            <div className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide shrink-0">
              {unreadCount} Unread
            </div>
            <p className="text-xs text-text-primary font-bold">
              There are {unreadCount} new open civic reports waiting for your administrative review.
            </p>
          </div>
          <button
            onClick={markAdminIssuesAsRead}
            className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer self-start sm:self-center"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* KPI Cards Grid with custom hover scales and glow effects */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        {/* Total Issues Card */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0 border border-accent-teal/20">
            <BarChart3 className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">Total Reports</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedCounter value={total} />
            </h3>
            <p className="text-[9px] text-accent-teal font-semibold mt-1">Logged in registry</p>
          </div>
        </div>

        {/* Active Backlog */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">Active Backlog</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedCounter value={activeCount} />
            </h3>
            <p className="text-[9px] text-amber-500 font-semibold mt-1">Needs civic dispatch</p>
          </div>
        </div>

        {/* Resolved Issues */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">Resolved Issues</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedCounter value={statusCounts.Resolved} />
            </h3>
            <p className="text-[9px] text-emerald-500 font-semibold mt-1">Inspected and completed</p>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-[0_0_20px_var(--glow)] transform hover:-translate-y-1 hover:scale-103 transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none">Resolution Rate</p>
            <h3 className="text-2xl font-display font-black text-text-primary mt-2 leading-none">
              <AnimatedPercentageCounter value={resolutionRate} />
            </h3>
            <p className="text-[9px] text-purple-500 font-semibold mt-1">Cumulative efficiency</p>
          </div>
        </div>
      </div>

      {/* Main Charts Breakdown layout grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category analysis charts */}
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 sm:p-6 space-y-5" id="category-analytics">
          <div>
            <h4 className="font-display font-bold text-text-primary text-sm flex items-center gap-1.5">
              <span>Departmental Distribution</span>
            </h4>
            <p className="text-[10px] text-text-muted font-medium mt-0.5">Issues routed automatically by visual AI category filters.</p>
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
              <h4 className="font-display font-bold text-text-primary text-sm">Real-Time Dispatch Pipeline</h4>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">Muncipality team progress stages.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Open */}
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-sky-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mx-auto" />
                <span className="text-2xl font-display font-black text-sky-500 block mt-2">
                  <AnimatedCounter value={statusCounts.Open} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-sky-500 leading-none">Open</span>
              </div>

              {/* In Progress */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-purple-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mx-auto animate-pulse" />
                <span className="text-2xl font-display font-black text-purple-500 block mt-2">
                  <AnimatedCounter value={statusCounts["In Progress"]} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-500 leading-none">Dispatching</span>
              </div>

              {/* Resolved */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 text-center flex flex-col justify-between h-28 hover:bg-emerald-500/10 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" />
                <span className="text-2xl font-display font-black text-emerald-500 block mt-2">
                  <AnimatedCounter value={statusCounts.Resolved} />
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 leading-none">Resolved</span>
              </div>
            </div>
          </div>

          {/* Severity Breakdown Profile progress panel */}
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-3" id="severity-analytics">
            <div>
              <h4 className="font-display font-bold text-text-primary text-sm">Risk Severity Profile</h4>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">Priority classification of community reports.</p>
            </div>

            <div className="space-y-3">
              {/* High */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm" />
                <span className="text-xs font-bold text-text-secondary w-16">Critical</span>
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
                <span className="text-xs font-bold text-text-secondary w-16">Medium</span>
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
                <span className="text-xs font-bold text-text-secondary w-16">Low</span>
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
    </div>
  );
}
