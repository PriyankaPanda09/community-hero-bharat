import React, { useState, useMemo } from "react";
import { CivicUser, CivicIssue } from "../types";
import { 
  Trophy, 
  Medal, 
  Award, 
  Sparkles, 
  User, 
  Search, 
  Crown, 
  ArrowRight, 
  Star, 
  Shield, 
  Download, 
  Loader2, 
  Printer, 
  FileText, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import { Language, translations } from "../translations";

interface LeaderboardProps {
  issues: CivicIssue[];
  currentUser: CivicUser | null;
  language: Language;
  onNavigateToReport?: () => void;
}

interface RankedUser {
  uid: string;
  name: string;
  email: string;
  photo: string;
  reportsCount: number;
  score: number;
  isCurrentUser: boolean;
  rank: number;
  badge: string;
  badgeColor: string;
}

interface CertificateData {
  title: string;
  recipient: string;
  citationText: string;
  signatureTitle: string;
  platformBranding: string;
}

export default function Leaderboard({ issues, currentUser, language, onNavigateToReport }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingCert, setGeneratingCert] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  
  const t = translations[language];

  // Calculate real-time rankings based on Firestore issues data
  const rankedUsers = useMemo(() => {
    const userMap: {
      [key: string]: {
        uid: string;
        name: string;
        email: string;
        photo: string;
        reportsCount: number;
        score: number;
        isCurrentUser: boolean;
      };
    } = {};

    // 1. Initialize current user in the map to ensure they appear even with 0 points
    if (currentUser) {
      const uKey = currentUser.uid;
      userMap[uKey] = {
        uid: currentUser.uid,
        name: currentUser.displayName || "Citizen Hero",
        email: currentUser.email || "",
        photo: currentUser.photoURL || "",
        reportsCount: 0,
        score: 0,
        isCurrentUser: true,
      };
    }

    // 2. Aggregate issue data
    issues.forEach((issue) => {
      // A) Handle Reporter Points
      const repId = issue.reporterId;
      const repEmail = issue.reporterEmail;
      const repName = issue.reporterName;
      
      const uKey = repId || repEmail || repName;
      if (uKey) {
        const isCurr = currentUser && (currentUser.uid === repId || currentUser.email === repEmail);

        if (!userMap[uKey]) {
          userMap[uKey] = {
            uid: repId || `anon_${repName}`,
            name: isCurr ? (currentUser.displayName || repName || "Anonymous Reporter") : (repName || "Anonymous Reporter"),
            email: repEmail || "",
            photo: isCurr ? (currentUser.photoURL || issue.reporterPhoto || "") : (issue.reporterPhoto || ""),
            reportsCount: 0,
            score: 0,
            isCurrentUser: !!isCurr,
          };
        } else if (isCurr) {
          userMap[uKey].name = currentUser.displayName || userMap[uKey].name;
          userMap[uKey].photo = currentUser.photoURL || userMap[uKey].photo;
        }

        const u = userMap[uKey];
        u.reportsCount += 1;

        // Calculate score for this issue
        let issueScore = 10;
        const isConfirmed =
          (issue.confirmationCount && issue.confirmationCount > 0) ||
          (issue.coReporters && issue.coReporters.length > 0) ||
          (issue.confirmationPhotos && issue.confirmationPhotos.length > 0);

        if (isConfirmed) {
          issueScore += 15;
        }
        if (issue.status === "Resolved" || issue.status === "Verified") {
          issueScore += 25;
        }
        if (issue.status === "Verified") {
          issueScore += 10;
        }

        u.score += issueScore;
      }

      // B) Handle Co-Reporters Points (7 points each for confirming an existing issue)
      issue.coReporters?.forEach((co) => {
        const coKey = co.uid || co.email || co.displayName;
        if (!coKey) return;

        const isCoCurr = currentUser && (currentUser.uid === co.uid || currentUser.email === co.email);

        if (!userMap[coKey]) {
          userMap[coKey] = {
            uid: co.uid || `co_${co.displayName}`,
            name: isCoCurr ? (currentUser.displayName || co.displayName || "Anonymous Co-Reporter") : (co.displayName || "Anonymous Co-Reporter"),
            email: co.email || "",
            photo: isCoCurr ? (currentUser.photoURL || co.photoURL || "") : (co.photoURL || ""),
            reportsCount: 0,
            score: 0,
            isCurrentUser: !!isCoCurr,
          };
        } else if (isCoCurr) {
          userMap[coKey].name = currentUser.displayName || userMap[coKey].name;
          userMap[coKey].photo = currentUser.photoURL || userMap[coKey].photo;
        }

        userMap[coKey].score += 7;
      });
    });

    // 3. Convert map to array and sort
    const userArray = Object.values(userMap);
    userArray.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.reportsCount !== a.reportsCount) {
        return b.reportsCount - a.reportsCount;
      }
      return a.name.localeCompare(b.name);
    });

    // 4. Assign ranks and badge levels
    let currentRank = 1;
    return userArray.map((u, idx) => {
      if (idx > 0 && u.score < userArray[idx - 1].score) {
        currentRank = idx + 1;
      }

      let badge = "Active Citizen";
      let badgeColor = "from-slate-500/20 to-slate-600/20 text-slate-300 border-slate-500/30";
      
      if (u.reportsCount >= 10) {
        badge = "Civic Champion";
        badgeColor = "from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-400 border-amber-500/30";
      } else if (u.reportsCount >= 5) {
        badge = "Community Guardian";
        badgeColor = "from-teal-500/20 to-cyan-500/20 text-teal-300 border-teal-500/30";
      } else if (u.reportsCount >= 1) {
        badge = "Community Observer";
        badgeColor = "from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30";
      }

      return {
        ...u,
        rank: currentRank,
        badge,
        badgeColor,
      } as RankedUser;
    });
  }, [issues, currentUser]);

  // Find current user's rank info
  const currentUserRankInfo = useMemo(() => {
    return rankedUsers.find((u) => u.isCurrentUser);
  }, [rankedUsers]);

  // Filter ranked users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return rankedUsers;
    const query = searchTerm.toLowerCase();
    return rankedUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.badge.toLowerCase().includes(query)
    );
  }, [rankedUsers, searchTerm]);

  // Limit list to top 10 for primary list view
  const top10Users = useMemo(() => {
    return filteredUsers.slice(0, 10);
  }, [filteredUsers]);

  // Personal Honors computations
  const reportCount = currentUserRankInfo?.reportsCount || 0;
  const totalScore = currentUserRankInfo?.score || 0;
  
  const { currentBadge, badgeColorClass, badgeGlowClass, badgeDescription } = useMemo(() => {
    let currentBadge = "Active Citizen";
    let badgeColorClass = "from-slate-400 to-slate-500 text-slate-100 border-slate-300/30";
    let badgeGlowClass = "hover:shadow-[0_0_15px_rgba(148,163,184,0.3)]";
    let badgeDescription = t.badgeExplanation || "Report your first civic issue to start your civic journey.";

    if (reportCount >= 10) {
      currentBadge = "Civic Champion";
      badgeColorClass = "from-amber-400 via-yellow-500 to-orange-500 text-amber-950 border-amber-300/50";
      badgeGlowClass = "hover:shadow-[0_0_20px_rgba(245,158,11,0.55)]";
      badgeDescription = "Top 1% vanguard of community improvement. Inspiring action across the region.";
    } else if (reportCount >= 5) {
      currentBadge = "Community Guardian";
      badgeColorClass = "from-teal-400 to-cyan-500 text-teal-950 border-teal-300/40";
      badgeGlowClass = "hover:shadow-[0_0_20px_rgba(20,184,166,0.45)]";
      badgeDescription = "An outstanding guardian of the neighborhood, actively identifying local concerns.";
    } else if (reportCount >= 1) {
      currentBadge = "Community Observer";
      badgeColorClass = "from-rose-400 to-pink-500 text-rose-950 border-rose-300/40";
      badgeGlowClass = "hover:shadow-[0_0_15px_rgba(244,63,94,0.45)]";
      badgeDescription = "Vigilant and engaged, initiating local improvements for their block.";
    }

    return { currentBadge, badgeColorClass, badgeGlowClass, badgeDescription };
  }, [reportCount, t]);

  const handleGenerateCertificate = async () => {
    if (!currentUser) return;
    setGeneratingCert(true);
    setCertError(null);
    try {
      const response = await fetch("/api/certificate/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentUser.displayName,
          totalReports: reportCount,
          badge: currentBadge,
          score: totalScore,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to communicate with certificate compiler.");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setCertData(data);
    } catch (err: any) {
      console.error("Certificate error:", err);
      setCertError(err.message || "Something went wrong. Please try again.");
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleDownloadCertificate = async () => {
    const element = document.getElementById("certificate-canvas");
    if (!element) return;

    setDownloadingCert(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fafaf9",
        logging: false,
      });

      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `Certificate_${certData?.recipient.replace(/\s+/g, "_") || "CommunityHero"}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error("Failed to generate image certificate:", err);
    } finally {
      setDownloadingCert(false);
    }
  };

  return (
    <div className="space-y-8 text-text-primary" id="civic-leaderboard-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-black tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            <span>Leaderboard & Honors</span>
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            Celebrating our top community heroes, tracking citizen badges, and downloading certificates of contribution.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search citizen heroes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900 text-xs text-text-primary rounded-xl border border-white/10 outline-none focus:border-accent-teal transition-all placeholder:text-text-muted font-semibold"
          />
        </div>
      </div>

      {/* Personal Honors Section (Profile, Score, Badge Cards + Certificate Download) */}
      {currentUser && (
        <div className="space-y-6" id="personal-honors-section">
          {/* Section Divider/Title */}
          <div className="border-b border-border-card/30 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <Award className="w-4 h-4 text-accent-teal" />
              <span>My Civic Honors & Badges</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-bg-card/40 backdrop-blur-xl rounded-2xl border border-border-card p-6 flex items-center gap-4 shadow-lg">
              <img
                src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                alt={currentUser.displayName}
                className="w-16 h-16 rounded-full border-2 border-accent-teal/50 shadow-md object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-display font-extrabold text-base text-text-primary">
                  {currentUser.displayName}
                </h4>
                <p className="text-xs text-text-muted mt-0.5">{currentUser.email}</p>
                <span className="inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 bg-accent-teal/10 text-accent-teal font-extrabold text-[9px] uppercase tracking-wider rounded-lg border border-accent-teal/15">
                  <Shield className="w-3 h-3" />
                  Verified Citizen
                </span>
              </div>
            </div>

            {/* Contribution Score Card */}
            <div className="bg-bg-card/40 backdrop-blur-xl rounded-2xl border border-border-card p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-accent-teal/5 rounded-full blur-2xl group-hover:bg-accent-teal/10 transition-all duration-300" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {t.civicScoreLabel}
                </span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-3xl font-display font-black text-text-primary tracking-tight">
                  {totalScore}
                </span>
                <span className="text-xs font-bold text-accent-teal uppercase tracking-widest">{t.pointsLabel}</span>
              </div>
              <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                {t.scoreExplanation}
              </p>
            </div>

            {/* Badge Card */}
            <div className="bg-bg-card/40 backdrop-blur-xl rounded-2xl border border-border-card p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {t.currentBadgeLabel}
                </span>
                <Medal className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${badgeColorClass} border text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all duration-300 ${badgeGlowClass}`}>
                  <Award className="w-4 h-4 shrink-0" />
                  <span>{currentBadge}</span>
                </div>
                <span className="text-[11px] font-bold text-text-muted">
                  {reportCount} {t.reportsCountText}{(reportCount === 1) ? "" : "s"}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                {badgeDescription}
              </p>
            </div>
          </div>

          {/* Certificate compilation panel */}
          <div className="bg-bg-card/30 backdrop-blur-md rounded-2xl border border-border-card/65 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display font-bold text-text-primary text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                {t.certificateHeader}
              </h4>
              <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                {t.certificateSub.replace("{count}", String(reportCount))}
              </p>
            </div>
            
            {reportCount === 0 ? (
              <button
                disabled
                className="w-full sm:w-auto px-5 py-2.5 bg-border-card text-text-muted font-bold text-xs rounded-xl cursor-not-allowed opacity-60"
                title="Submit a report to qualify for a certificate"
              >
                {t.certificateLocked}
              </button>
            ) : (
              <button
                onClick={handleGenerateCertificate}
                disabled={generatingCert}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-teal-950 font-black text-xs rounded-xl shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 transform hover:scale-102 active:scale-98"
              >
                {generatingCert ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-950" />
                    <span>{t.compilingCertificate}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-teal-950" />
                    <span>{t.compileCertificate}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Print/Save Certificate Modal */}
          <AnimatePresence>
            {certData && (
              <motion.div
                id="certificate-print-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setCertData(null)}
              >
                <motion.div
                  id="certificate-print-content"
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="bg-bg-card border border-border-card rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setCertData(null)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-border-card text-text-primary hover:text-rose-400 transition-all cursor-pointer"
                    title="Dismiss Certificate"
                  >
                    ✕
                  </button>

                  <div
                    id="certificate-canvas"
                    className="border-8 border-double border-amber-600 rounded-2xl p-4 sm:p-6 md:p-10 bg-stone-50/95 text-stone-900 shadow-inner relative text-center min-h-[400px] flex flex-col justify-between"
                    style={{
                      backgroundColor: "#fafaf9",
                      color: "#1c1917",
                      borderColor: "#d97706"
                    }}
                  >
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600" style={{ borderColor: "#d97706" }} />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600" style={{ borderColor: "#d97706" }} />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600" style={{ borderColor: "#d97706" }} />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600" style={{ borderColor: "#d97706" }} />

                    <div className="space-y-1">
                      <h2 className="font-display font-black text-xl md:text-2xl text-amber-900 tracking-wider uppercase" style={{ color: "#78350f" }}>
                        {certData.title}
                      </h2>
                      <p className="text-[10px] tracking-widest uppercase font-extrabold text-amber-600" style={{ color: "#d97706" }}>
                        {certData.platformBranding}
                      </p>
                    </div>

                    <div className="my-6">
                      <p className="text-xs italic text-stone-500 font-medium" style={{ color: "#78716c" }}>This is officially presented to</p>
                      <h3 className="font-display font-bold text-2xl md:text-3xl text-stone-850 mt-1 pb-1.5 border-b border-stone-200 inline-block min-w-[200px]" style={{ color: "#292524", borderColor: "#e7e5e4" }}>
                        {certData.recipient}
                      </h3>
                    </div>

                    <p className="text-xs md:text-sm text-stone-700 max-w-lg mx-auto leading-relaxed font-medium italic" style={{ color: "#44403c" }}>
                      &ldquo;{certData.citationText}&rdquo;
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                      <div className="text-left">
                        <p className="font-display font-bold text-amber-800 text-sm italic" style={{ color: "#92400e" }}>The Panel of Guardians</p>
                        <p className="text-[9px] uppercase font-bold text-stone-500 border-t border-stone-300 mt-4 pt-1" style={{ color: "#78716c", borderColor: "#d6d3d1" }}>
                          {certData.signatureTitle}
                        </p>
                      </div>

                      <div
                        id="certificate-seal"
                        className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center border-2 border-amber-200 shadow-md relative"
                        style={{
                          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                          borderColor: "#fde68a"
                        }}
                      >
                        <div className="absolute inset-1.5 border border-dashed border-amber-100 rounded-full" style={{ borderColor: "#fef3c7" }} />
                        <span className="text-[8px] font-display font-extrabold text-white text-center leading-none">
                          HERO<br />SEAL
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-stone-700" style={{ color: "#44403c" }}>
                          {new Date().toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[9px] uppercase font-bold text-stone-500 border-t border-stone-300 mt-4 pt-1" style={{ color: "#78716c", borderColor: "#d6d3d1" }}>
                          Date of Issue
                        </p>
                      </div>
                    </div>
                  </div>

                  <div id="certificate-actions" className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-end">
                    <p className="text-[10px] text-text-muted italic flex-grow text-left sm:pr-8 leading-normal">
                      *This document certifies community engagement peer recognition. It can be saved locally as a PNG image.
                    </p>
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={downloadingCert}
                      className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-teal-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:scale-102 disabled:cursor-not-allowed"
                    >
                      {downloadingCert ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Image...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Image (PNG)</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cert compile error banner */}
          {certError && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <h5 className="text-xs font-bold uppercase tracking-wider">Certificate System Offline</h5>
                <p className="text-xs mt-0.5">{certError}</p>
              </div>
              <button
                onClick={handleGenerateCertificate}
                className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 rounded-lg text-rose-300 text-xs font-bold transition-colors"
              >
                Retry Compile
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Section Header Divider */}
      <div className="border-b border-border-card/30 pb-2 pt-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Community Standings & Rankings</span>
        </h3>
      </div>

      {/* Current Signed-In User's Personal Ranking Bar */}
      {currentUser && currentUserRankInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-r from-teal-900/40 via-slate-900/50 to-teal-900/40 border border-teal-500/30 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          id="leaderboard-user-card"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex flex-col items-center justify-center font-display font-black text-teal-300 shadow-inner">
              <span className="text-[10px] text-teal-400/80 font-black leading-none">RANK</span>
              <span className="text-lg leading-none mt-0.5">#{currentUserRankInfo.rank}</span>
            </div>

            <div className="flex items-center gap-3">
              {currentUserRankInfo.photo ? (
                <img
                  src={currentUserRankInfo.photo}
                  alt={currentUserRankInfo.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border-2 border-teal-500/40 shadow-md"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-slate-800 border-2 border-teal-500/40 flex items-center justify-center text-teal-400 font-bold shadow-md">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display font-bold text-sm tracking-tight text-text-primary">
                    {currentUserRankInfo.name}
                  </h4>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    You
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mt-0.5">
                  {currentUserRankInfo.rank <= 3 && (
                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      currentUserRankInfo.rank === 1
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : currentUserRankInfo.rank === 2
                        ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                    }`}>
                      {currentUserRankInfo.rank === 1
                        ? "Civic Champion of the Week"
                        : currentUserRankInfo.rank === 2
                        ? "Community Guardian"
                        : "Neighborhood Hero"}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-teal-400 font-extrabold tracking-wide uppercase">
                      {currentUserRankInfo.badge}
                    </span>
                    <span className="text-[10px] text-text-muted font-bold">
                      • {currentUserRankInfo.reportsCount} Submissions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 relative z-10">
            <div className="text-left sm:text-right">
              <div className="text-[10px] text-text-muted font-black tracking-widest uppercase">My Civic Score</div>
              <div className="text-xl font-display font-black text-teal-300 flex items-center gap-1.5 sm:justify-end">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{currentUserRankInfo.score} pts</span>
              </div>
            </div>

            {onNavigateToReport && (
              <button
                onClick={onNavigateToReport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>Report to Rank Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Podiums for Top 3 Troika */}
      {top10Users.length > 0 && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2" id="leaderboard-podiums">
          {top10Users[1] && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:order-1 bg-gradient-to-b from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-3xl p-5 text-center relative flex flex-col items-center justify-between shadow-md"
            >
              <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-700/30 border border-slate-600/30 flex items-center justify-center text-slate-300 font-display font-black text-xs">
                #2
              </div>
              
              <div className="flex flex-col items-center space-y-3 pt-2">
                <div className="relative">
                  {top10Users[1].photo ? (
                    <img
                      src={top10Users[1].photo}
                      alt={top10Users[1].name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-400/50 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-400/50 flex items-center justify-center text-slate-300 font-bold shadow-md">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-1.5 bg-slate-400 text-slate-950 p-1.5 rounded-lg shadow-md border border-slate-300 flex items-center justify-center">
                    <Medal className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <h3 className="font-display font-extrabold text-sm text-text-primary tracking-tight truncate max-w-[160px]">
                    {top10Users[1].name}
                  </h3>
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 font-black tracking-wider uppercase text-[8.5px] px-2.5 py-1 rounded-full shadow-sm">
                      Community Guardian
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wide bg-white/5 border border-white/5 text-text-muted/80 px-1.5 py-0.5 rounded-md`}>
                      Badge: {top10Users[1].badge}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                <span className="text-text-muted">{top10Users[1].reportsCount} reports</span>
                <span className="text-slate-300 font-bold">{top10Users[1].score} pts</span>
              </div>
            </motion.div>
          )}

          {top10Users[0] && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.0 }}
              className="md:order-2 bg-gradient-to-b from-amber-500/10 to-slate-900/40 border border-amber-500/30 rounded-3xl p-6 text-center relative flex flex-col items-center justify-between shadow-lg ring-1 ring-amber-500/20 scale-102 md:scale-105"
            >
              <div className="absolute -top-4 text-amber-400 animate-bounce">
                <Crown className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              </div>

              <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-display font-black text-xs">
                #1
              </div>

              <div className="flex flex-col items-center space-y-3 pt-4">
                <div className="relative">
                  {top10Users[0].photo ? (
                    <img
                      src={top10Users[0].photo}
                      alt={top10Users[0].name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-amber-400 flex items-center justify-center text-amber-400 font-bold shadow-md">
                      <User className="w-9 h-9" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-1.5 bg-amber-400 text-amber-950 p-1.5 rounded-lg shadow-md border border-amber-300 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <h3 className="font-display font-black text-base text-text-primary tracking-tight truncate max-w-[180px] flex items-center gap-1 justify-center">
                    <span>{top10Users[0].name}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  </h3>
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black tracking-wider uppercase text-[8.5px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      Civic Champion of the Week
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wide bg-white/5 border border-white/5 text-text-muted/80 px-1.5 py-0.5 rounded-md`}>
                      Badge: {top10Users[0].badge}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs font-semibold">
                <span className="text-amber-300/80">{top10Users[0].reportsCount} reports</span>
                <span className="text-amber-400 font-black">{top10Users[0].score} pts</span>
              </div>
            </motion.div>
          )}

          {top10Users[2] && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:order-3 bg-gradient-to-b from-orange-800/10 to-slate-900/30 border border-orange-500/20 rounded-3xl p-5 text-center relative flex flex-col items-center justify-between shadow-md"
            >
              <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-orange-700/20 border border-orange-600/20 flex items-center justify-center text-orange-400 font-display font-black text-xs">
                #3
              </div>

              <div className="flex flex-col items-center space-y-3 pt-2">
                <div className="relative">
                  {top10Users[2].photo ? (
                    <img
                      src={top10Users[2].photo}
                      alt={top10Users[2].name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500/40 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-orange-500/40 flex items-center justify-center text-orange-400 font-bold shadow-md">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-1.5 bg-orange-500 text-orange-950 p-1.5 rounded-lg shadow-md border border-orange-400 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <h3 className="font-display font-extrabold text-sm text-text-primary tracking-tight truncate max-w-[160px]">
                    {top10Users[2].name}
                  </h3>
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 font-black tracking-wider uppercase text-[8.5px] px-2.5 py-1 rounded-full shadow-sm">
                      Neighborhood Hero
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wide bg-white/5 border border-white/5 text-text-muted/80 px-1.5 py-0.5 rounded-md`}>
                      Badge: {top10Users[2].badge}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                <span className="text-text-muted">{top10Users[2].reportsCount} reports</span>
                <span className="text-orange-400 font-bold">{top10Users[2].score} pts</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Complete Rankings List */}
      <div className="bg-bg-card border border-border-card rounded-3xl overflow-hidden shadow-md">
        <div className="p-4 sm:p-5 border-b border-border-card/50 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-text-muted">Rankings Roll</span>
          <span className="text-xs font-bold text-text-muted">{filteredUsers.length} total active users</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <User className="w-12 h-12 mx-auto text-text-muted/40 mb-3 animate-pulse" />
            <p className="text-xs font-bold">No community heroes match your search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-card/30">
            {filteredUsers.map((user, idx) => {
              const isCurr = user.isCurrentUser;
              if (!searchTerm && idx < 3) return null;

              return (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 transition-colors ${
                    isCurr ? "bg-teal-500/5 hover:bg-teal-500/10" : "hover:bg-slate-900/20"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 font-display font-black text-center text-xs text-text-muted">
                      #{user.rank}
                    </div>

                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className={`w-9 h-9 rounded-xl object-cover shrink-0 ${
                          isCurr ? "ring-2 ring-teal-500" : "border border-border-card"
                        }`}
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                        isCurr ? "bg-teal-500/20 text-teal-400 ring-2 ring-teal-500" : "bg-slate-800 text-text-muted"
                      }`}>
                        <User className="w-4.5 h-4.5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-display font-bold text-xs tracking-tight text-text-primary ${isCurr ? "text-teal-400" : ""}`}>
                          {user.name}
                        </span>
                        {isCurr && (
                          <span className="text-[8px] font-black uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {user.rank <= 3 && (
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                            user.rank === 1
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : user.rank === 2
                              ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                              : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          }`}>
                            {user.rank === 1
                              ? "Civic Champion of the Week"
                              : user.rank === 2
                              ? "Community Guardian"
                              : "Neighborhood Hero"}
                          </span>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-wider ${user.badgeColor.split(" ")[2] || "text-text-muted"}`}>
                          {user.badge}
                        </span>
                        <span className="text-[9px] text-text-muted font-semibold">
                          • {user.reportsCount} Submissions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    <span className="text-[10px] text-text-muted font-bold block sm:hidden">Civic Score</span>
                    <span className={`font-display font-black text-xs ${isCurr ? "text-teal-300" : "text-text-primary"}`}>
                      {user.score} pts
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Score and Rank Guideline notice */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-start gap-2.5 text-text-muted text-[11px] leading-relaxed">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="font-semibold">
          <span className="font-black text-text-primary uppercase mr-1">Rank Computation:</span>
          Points are awarded for Civic reporting. Submit a report (+10), confirm an existing report (+7), get community confirmation (+15), successfully resolve it (+25), or get it community verified (+10). Join your neighbors and rise to the vanguard of Clean Up, Light Up, Unite Bharat!
        </div>
      </div>
    </div>
  );
}
