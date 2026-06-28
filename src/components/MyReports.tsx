import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CivicIssue, CivicUser } from "../types";
import { 
  Award, 
  CheckCircle, 
  Users, 
  ChevronRight,
  Sparkles,
  Shield,
  Loader2,
  Calendar,
  AlertCircle,
  FileText,
  XCircle,
  Eye
} from "lucide-react";
import { useFirebase } from "../FirebaseContext";
import { Language, translations } from "../translations";
import { MyReportsEmptyIllustration } from "./MyReportsEmptyIllustration";

// Extract region helper
export function extractRegion(address: string): string {
  if (!address) return "";
  const parts = address.split(",")
    .map(p => p.trim())
    .filter(p => {
      return p && 
             !/^\d+$/.test(p) && 
             !/^\d{5,6}$/.test(p) && 
             p.toLowerCase() !== "india" && 
             p.toLowerCase() !== "usa" &&
             p.toLowerCase() !== "united states";
    });
  
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  } else if (parts.length === 1) {
    return parts[0];
  }
  return "General";
}

interface MyReportsProps {
  issues: CivicIssue[];
  currentUser: CivicUser | null;
  onNavigateToReport?: () => void;
  onNavigateToBrowse?: () => void;
  openLoginModal: () => void;
  language?: Language;
  theme?: "light" | "dark" | "neon";
}

export default function MyReports({
  issues,
  currentUser,
  onNavigateToReport,
  onNavigateToBrowse,
  openLoginModal,
  language,
  theme,
}: MyReportsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"submissions" | "confirmations">("submissions");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const { removeConfirmation, deleteIssue } = useFirebase();
  const t = translations[language || "en"];

  // If user is not logged in, show login wall
  if (!currentUser) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto" id="my-reports-login-wall">
        <Award className="w-16 h-16 text-text-muted mx-auto mb-4 animate-pulse" />
        <h3 className="font-display font-extrabold text-xl text-text-primary">{t.loginWallTitle}</h3>
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          {t.loginWallDesc}
        </p>
        <button
          onClick={openLoginModal}
          className="mt-8 px-6 py-3 bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent font-bold text-sm rounded-xl shadow-lg hover:shadow-[0_0_15px_var(--glow)] transition-all cursor-pointer transform hover:scale-103 active:scale-97"
        >
          {t.signInBtn}
        </button>
      </div>
    );
  }

  // Filter issues personally reported by the logged-in user
  const myIssues = useMemo(() => {
    return issues.filter(
      (issue) => issue.reporterId === currentUser.uid || issue.reporterEmail === currentUser.email
    );
  }, [issues, currentUser]);

  // Filter issues confirmed by the logged-in user
  const confirmedIssues = useMemo(() => {
    return issues.filter((issue) => {
      const isReporter = issue.reporterId === currentUser.uid || issue.reporterEmail === currentUser.email;
      const isCoReporter = issue.coReporters?.some(
        (r) => r.uid === currentUser.uid || r.email === currentUser.email
      );
      return !isReporter && isCoReporter;
    });
  }, [issues, currentUser]);

  const handleDeleteSubmissionClick = (issueId: string) => {
    setModal({
      isOpen: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this report?",
      onConfirm: async () => {
        try {
          await deleteIssue(issueId);
        } catch (err) {
          console.error("Failed to delete issue:", err);
        }
      },
    });
  };

  const handleDeleteConfirmationClick = (issueId: string) => {
    setModal({
      isOpen: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this confirmation?",
      onConfirm: async () => {
        setRemovingId(issueId);
        try {
          await removeConfirmation(issueId, currentUser.uid);
        } catch (err) {
          console.error("Failed to remove confirmation:", err);
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-8" id="my-reports-root">
      
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border-card/50 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-accent-teal shrink-0 relative overflow-hidden shadow-xs">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--accent-teal),0.15),transparent_70%)] animate-pulse" />
            <FileText className="w-5.5 h-5.5 text-accent-teal" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-text-primary tracking-tight">
              My Reports & Confirmations
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Monitor, review, or manage issues you reported or verified across Bharat.
            </p>
          </div>
        </div>

        {/* Action Button */}
        {onNavigateToReport && (
          <button
            onClick={onNavigateToReport}
            className="text-xs text-accent-teal font-extrabold uppercase tracking-wider hover:text-accent-teal-hover transition-colors flex items-center gap-1 shrink-0"
          >
            <span>{t.reportAnother}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex gap-4 p-1 max-w-md" id="my-reports-tabs-container">
        <button
          id="my-submissions-tab"
          onClick={() => setActiveSubTab("submissions")}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border ${
            activeSubTab === "submissions"
              ? "bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent border-accent-teal shadow-md"
              : "bg-bg-card/40 border-border-card/50 text-text-secondary hover:text-text-primary hover:bg-bg-card/60 shadow-xs"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Submissions ({myIssues.length})</span>
        </button>
        <button
          id="my-confirmations-tab"
          onClick={() => setActiveSubTab("confirmations")}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border ${
            activeSubTab === "confirmations"
              ? "bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent border-accent-teal shadow-md"
              : "bg-bg-card/40 border-border-card/50 text-text-secondary hover:text-text-primary hover:bg-bg-card/60 shadow-xs"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>My Confirmations ({confirmedIssues.length})</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      <AnimatePresence mode="wait">
        {activeSubTab === "submissions" ? (
          <motion.div
            key="submissions-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {myIssues.length === 0 ? (
              <div className="bg-bg-card/25 rounded-3xl border border-border-card/65 p-12 text-center" id="my-reports-empty">
                <div className="w-full max-w-[160px] aspect-[8/7] h-28 sm:h-32 mx-auto mb-4 flex items-center justify-center">
                  <MyReportsEmptyIllustration />
                </div>
                <h4 className="font-display font-bold text-text-primary text-base">{t.noSubmissionsYet}</h4>
                <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                  {t.noSubmissionsDesc}
                </p>
                {onNavigateToReport && (
                  <button
                    id="my-reports-raise-report-btn"
                    onClick={onNavigateToReport}
                    className="mt-6 px-5 py-2.5 bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    {t.raiseFirstReport}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="my-reports-grid">
                {myIssues.map((issue) => {
                  const hasCoReporters = issue.coReporters && issue.coReporters.length > 0;
                  const region = extractRegion(issue.location.address);
                  
                  return (
                    <motion.div
                      key={issue.id}
                      className="bg-bg-card/40 backdrop-blur-md rounded-2xl border border-border-card shadow-md overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-44 w-full bg-slate-900/60 overflow-hidden">
                          <img
                            src={issue.photoUrl}
                            alt={issue.category}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-md ${
                              issue.status === "Verified"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                : issue.status === "Resolved"
                                ? "bg-teal-500/15 text-teal-400 border-teal-500/25"
                                : issue.status === "In Progress"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                            }`}>
                              {issue.status}
                            </span>
                          </div>

                          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
                            {issue.category.replace("_", " ")}
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-accent-teal tracking-wider block">
                              📍 {region}
                            </span>
                            <p className="text-xs text-text-muted line-clamp-1">
                              {issue.location.address}
                            </p>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t border-border-card/30 mt-3 space-y-4">
                        <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary">
                          <div className="flex items-center gap-1">
                            <CheckCircle className={`w-3.5 h-3.5 ${issue.status === "Verified" ? "text-emerald-400" : "text-text-muted"}`} />
                            <span>Status: {issue.status}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-accent-teal" />
                            <span>{issue.confirmationCount || 0} Confirmation{(issue.confirmationCount || 0) === 1 ? "" : "s"}</span>
                          </div>
                        </div>

                        <div className="space-y-2 bg-black/10 p-2.5 rounded-xl border border-border-card/25">
                          <span className="block text-[10px] uppercase font-extrabold text-text-muted tracking-wider">
                            Co-Reporters & Verifiers
                          </span>
                          {hasCoReporters ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {issue.coReporters?.map((rep, idx) => (
                                <div 
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-bg-card/75 border border-border-card/45 px-2 py-1 rounded-lg text-[10px] text-text-primary"
                                  title={rep.email}
                                >
                                  <img
                                    src={rep.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                                    alt={rep.displayName}
                                    className="w-3.5 h-3.5 rounded-full object-cover"
                                  />
                                  <span className="font-semibold">{rep.displayName}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-text-muted italic">
                              No co-reporters verified yet. Raise support to get it confirmed!
                            </p>
                          )}
                        </div>

                        {/* Delete Report Button */}
                        <button
                          onClick={() => handleDeleteSubmissionClick(issue.id)}
                          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 hover:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Delete Report</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="confirmations-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {confirmedIssues.length === 0 ? (
              <div className="bg-bg-card/25 rounded-3xl border border-border-card/65 p-12 text-center" id="my-confirmations-empty">
                <div className="w-12 h-12 rounded-full bg-accent-teal/10 flex items-center justify-center text-accent-teal mx-auto mb-4 border border-accent-teal/20">
                  <CheckCircle className="w-6 h-6 text-accent-teal" />
                </div>
                <h4 className="font-display font-bold text-text-primary text-base">No Confirmed Issues Found</h4>
                <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                  You haven't confirmed or upvoted any neighborhood issues reported by others yet. Upvote open reports to support your community!
                </p>
                {onNavigateToBrowse && (
                  <button
                    onClick={onNavigateToBrowse}
                    className="mt-6 px-5 py-2.5 bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Browse Feed to Confirm
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="my-confirmations-grid">
                {confirmedIssues.map((issue) => {
                  const region = extractRegion(issue.location.address);
                  const myProofPhoto = issue.confirmationPhotos?.find(
                    (p) => p.reporterId === currentUser.uid
                  )?.url;

                  return (
                    <motion.div
                      key={issue.id}
                      className="bg-bg-card/40 backdrop-blur-md rounded-2xl border border-border-card shadow-md overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Main card picture */}
                        <div className="relative h-44 w-full bg-slate-900/60 overflow-hidden">
                          <img
                            src={myProofPhoto || issue.photoUrl}
                            alt={issue.category}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Top-Right indicators: Points Earned & Issue Status */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-md">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>+7 Points</span>
                            </span>
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-md ${
                              issue.status === "Verified"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                : issue.status === "Resolved"
                                ? "bg-teal-500/15 text-teal-400 border-teal-500/25"
                                : issue.status === "In Progress"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                            }`}>
                              {issue.status}
                            </span>
                          </div>

                          {/* Category label */}
                          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
                            {issue.category.replace("_", " ")}
                          </div>
                          
                          {/* Custom proof photo indicator */}
                          {myProofPhoto && (
                            <div className="absolute bottom-3 right-3 bg-teal-500/80 backdrop-blur-sm border border-teal-400/20 px-2 py-0.5 rounded-md text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>My Proof Photo</span>
                            </div>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-accent-teal tracking-wider block">
                              📍 {region}
                            </span>
                            <p className="text-xs text-text-muted line-clamp-1">
                              {issue.location.address}
                            </p>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                            <span className="font-extrabold text-text-primary mr-1">Original Issue:</span>
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions of Confirmed Card */}
                      <div className="p-5 pt-0 border-t border-border-card/30 mt-3 space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-text-secondary">
                          <span className="text-text-muted">Reported by: {issue.reporterName}</span>
                          <span>{issue.confirmationCount || 0} Confirmation{(issue.confirmationCount || 0) === 1 ? "" : "s"}</span>
                        </div>

                        {/* Remove Confirmation Button */}
                        <button
                          onClick={() => handleDeleteConfirmationClick(issue.id)}
                          disabled={removingId === issue.id}
                          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 hover:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingId === issue.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Removing Confirmation...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              <span>Remove My Confirmation</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom high-contrast theme-aware confirmation modal */}
      {modal && modal.isOpen && (() => {
        const currentTheme = theme || document.documentElement.getAttribute("data-theme") || "light";
        
        let cardBg = "bg-bg-card border border-border-card/60 backdrop-blur-md";
        let titleColor = "text-text-primary";
        let msgColor = "text-text-secondary";
        let cancelBtn = "bg-slate-200 text-text-secondary hover:text-text-primary border border-transparent";
        let confirmBtn = "bg-rose-600 hover:bg-rose-700 text-white";

        if (currentTheme === "neon") {
          cardBg = "bg-black border-2 border-[#a3e635] shadow-[0_0_25px_rgba(163,230,53,0.3)]";
          titleColor = "text-[#a3e635]";
          msgColor = "text-white";
          cancelBtn = "bg-zinc-900 hover:bg-zinc-800 text-[#c084fc] border border-purple-500/40";
          confirmBtn = "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]";
        } else if (currentTheme === "dark") {
          cardBg = "bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80";
          titleColor = "text-white";
          msgColor = "text-slate-200";
          cancelBtn = "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600";
          confirmBtn = "bg-rose-600 hover:bg-rose-500 text-white";
        } else {
          // light theme
          cardBg = "bg-white border border-slate-200 shadow-2xl";
          titleColor = "text-slate-900";
          msgColor = "text-slate-700";
          cancelBtn = "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300";
          confirmBtn = "bg-rose-600 hover:bg-rose-700 text-white";
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
            <div 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setModal(null)}
            />
            <div className={`${cardBg} rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                
                <div className="space-y-1.5">
                  <h3 className={`font-display font-black text-sm uppercase tracking-wider ${titleColor}`}>
                    {modal.title}
                  </h3>
                  <p className={`text-xs ${msgColor} leading-relaxed font-semibold`}>
                    {modal.message}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setModal(null)}
                  className={`px-4 py-2 ${cancelBtn} font-extrabold text-xs rounded-xl transition-colors cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    modal.onConfirm();
                    setModal(null);
                  }}
                  className={`px-4 py-2 ${confirmBtn} font-extrabold text-xs rounded-xl transition-colors cursor-pointer`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
