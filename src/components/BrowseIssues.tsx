import React, { useState } from "react";
import { CivicIssue, IssueCategory, IssueStatus, IssueSeverity, CivicUser } from "../types";
import { MapPin, Calendar, User, Search, Filter, AlertTriangle, CheckCircle2, ShieldAlert, ChevronRight, Check, Trash2, Building2, Building, Phone, Mail, BadgeCheck, Camera, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../FirebaseContext";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface BrowseIssuesProps {
  issues: CivicIssue[];
  currentUser: CivicUser | null;
  onUpdateStatus: (id: string, newStatus: IssueStatus) => void;
  onDeleteIssue?: (id: string) => void;
}

const CATEGORY_ICONS: Record<IssueCategory, string> = {
  pothole: "🕳️",
  streetlight: "💡",
  garbage: "🗑️",
  water_leak: "💧",
  other: "⚙️",
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: "Pothole",
  streetlight: "Streetlight Fix",
  garbage: "Garbage / Waste",
  water_leak: "Water Line Leak",
  other: "Other Concern",
};

// Theme-aware severity pill styling
const SEVERITY_BADGES: Record<IssueSeverity, string> = {
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const STATUS_BADGES: Record<IssueStatus, string> = {
  Open: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "In Progress": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Verified: "bg-teal-500/10 text-teal-500 border-teal-500/20",
};

const AUTHORITY_MAPPING: Record<string, { name: string; email: string; phone: string; desc: string }> = {
  pothole: {
    name: "PWD (Public Works Department)",
    email: "pwd.complaints@kar.nic.in",
    phone: "1912 / +91-80-22201416",
    desc: "Main state Highways, Arterial roads, and Public Works."
  },
  streetlight: {
    name: "BESCOM / Municipal Electricity Board",
    email: "helpline@bescom.co.in",
    phone: "1912 / +91-80-22873333",
    desc: "Electrical failures, streetlights, transformer outages."
  },
  garbage: {
    name: "Municipal Corporation / BBMP",
    email: "commissioner@bbmp.gov.in",
    phone: "+91-80-22660000",
    desc: "Waste clearance, illegal dumping, garbage segregation."
  },
  water_leak: {
    name: "Jal Board / BWSSB",
    email: "complaints@bwssb.gov.in",
    phone: "+91-80-22238888",
    desc: "Water main leaks, sewage overflow, contaminated drinking water supply."
  },
  other: {
    name: "Municipal Ward Grievance Cell",
    email: "wardcomplaints@municipal.gov.in",
    phone: "+91-80-22210031",
    desc: "General local ward complaints and infrastructure grievances."
  }
};

export default function BrowseIssues({
  issues,
  currentUser,
  onUpdateStatus,
  onDeleteIssue,
}: BrowseIssuesProps) {
  const { activeDatabase, setIssues } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | IssueCategory>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | IssueStatus>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | IssueSeverity>("all");
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [expandedAuthorityId, setExpandedAuthorityId] = useState<string | null>(null);

  // Filters logic
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.reporterName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;
    const matchesSeverity = selectedSeverity === "all" || issue.severity === selectedSeverity;

    return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
  });

  const visibleIssues = filteredIssues.filter((issue) => !deletedIds.includes(issue.id));

  const handleDelete = async (issueId: string) => {
    try {
      await deleteDoc(doc(db, 'issues', issueId));
      setIssues(prev => prev.filter(issue => issue.id !== issueId));
      alert('Issue deleted successfully');
    } catch (error: any) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleCommunityVerify = async (issueId: string, type: "verified" | "not_fixed") => {
    if (!currentUser) {
      alert("Please sign in to verify this resolution.");
      return;
    }
    const userEmail = currentUser.email;
    if (userEmail === "priyapanda959@gmail.com") {
      alert("Administrators cannot submit community audits.");
      return;
    }

    try {
      await updateDoc(doc(db, "issues", issueId), {
        [`verifications.${currentUser.uid}`]: type
      });
    } catch (err: any) {
      console.error("Failed to submit verification:", err);
      alert("Failed to save verification vote: " + err.message);
    }
  };

  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [proofPhotoBase64, setProofPhotoBase64] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    const userEmail = currentUser?.email || "";
    const isAdmin = userEmail === "priyapanda959@gmail.com";
    if (!isAdmin) {
      alert("Only the administrator is allowed to update report status.");
      return;
    }

    if (newStatus === "Resolved") {
      setResolvingIssueId(issueId);
      setProofPhotoBase64(null);
      return;
    }

    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === "In Progress") {
        updatePayload["timeline.inProgressAt"] = new Date().toISOString();
      } else if (newStatus === "Verified") {
        updatePayload["timeline.verifiedAt"] = new Date().toISOString();
      }

      await updateDoc(doc(db, 'issues', issueId), updatePayload);

      if (onUpdateStatus) {
        onUpdateStatus(issueId, newStatus);
      }
    } catch (err: any) {
      console.error("Failed to update status in Firestore:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleProofPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 600; // Limit dimensions to avoid memory issues
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setProofPhotoBase64(dataUrl);
        setIsUploadingProof(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitResolutionWithProof = async () => {
    if (!resolvingIssueId) return;
    if (!proofPhotoBase64) {
      alert("Please upload a proof photo to verify the resolution of this issue.");
      return;
    }

    try {
      await updateDoc(doc(db, 'issues', resolvingIssueId), {
        status: "Resolved",
        resolvedPhoto: proofPhotoBase64,
        "timeline.resolvedAt": new Date().toISOString()
      });

      if (onUpdateStatus) {
        onUpdateStatus(resolvingIssueId, "Resolved");
      }

      setResolvingIssueId(null);
      setProofPhotoBase64(null);
    } catch (err: any) {
      console.error("Failed to resolve issue:", err);
      alert("Failed to submit resolution proof: " + err.message);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6" id="browse-issues-root">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-card pb-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary flex items-center gap-2">
            <span>Browse Reports</span>
            <span className="text-xs font-bold bg-accent-teal/15 text-accent-teal border border-accent-teal/20 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
              {visibleIssues.length} total
            </span>
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            Real-time neighborhood concerns reported by citizens, verified and tracked securely.
          </p>
        </div>

        {/* Dynamic Database Active Indicator */}
        <div className="flex items-center gap-2.5 bg-bg-card/30 backdrop-blur-md border border-border-card/50 px-3.5 py-2 rounded-2xl shadow-sm self-start sm:sm:self-center">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" id="db-indicator-firestore"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Storage Engine: <span className="text-emerald-400 font-extrabold animate-pulse">Firebase Firestore Cloud</span>
          </span>
        </div>
      </div>

      {/* Glassmorphism Search & Filters drawer */}
      <div className="bg-bg-card/40 backdrop-blur-xl rounded-2xl border border-border-card shadow-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by address, description, or reporter..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-card bg-bg-card/50 text-text-primary placeholder-text-muted/60 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal outline-none text-xs sm:text-sm transition-all shadow-inner"
              id="search-input"
            />
          </div>

          {/* Quick Clear Button */}
          {(searchTerm || selectedCategory !== "all" || selectedStatus !== "all" || selectedSeverity !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedStatus("all");
                setSelectedSeverity("all");
              }}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-all border border-rose-500/25 cursor-pointer transform hover:scale-102 active:scale-98"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border-card/30">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
            >
              <option value="all">📁 All Categories</option>
              <option value="pothole">🕳️ Potholes</option>
              <option value="streetlight">💡 Streetlights</option>
              <option value="garbage">🗑️ Garbage / Waste</option>
              <option value="water_leak">💧 Water Leaks</option>
              <option value="other">⚙️ Others</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
            >
              <option value="all">🔔 All Statuses</option>
              <option value="Open">🔵 Open</option>
              <option value="In Progress">🟣 In Progress</option>
              <option value="Resolved">🟢 Resolved</option>
              <option value="Verified">✅ Verified</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
            >
              <option value="all">⚡ All Severities</option>
              <option value="low">🟢 Low Severity</option>
              <option value="medium">🟡 Medium Severity</option>
              <option value="high">🔴 High Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Issues with 3D perspective and hover animations */}
      {visibleIssues.length === 0 ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-bg-card/30 rounded-3xl border border-border-card p-12 text-center"
          id="empty-feed-state"
        >
          <AlertTriangle className="w-12 h-12 text-text-muted mx-auto mb-4 animate-bounce" />
          <h4 className="font-display font-bold text-text-primary text-base">No Matching Reports</h4>
          <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto">
            Try adjusting your status, category or search queries, or submit a new report to help Bharat!
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 perspective-container" id="issues-cards-grid">
          <AnimatePresence>
            {visibleIssues.map((issue) => {
              const sevBadge = SEVERITY_BADGES[issue.severity] || SEVERITY_BADGES.medium;
              const statBadge = STATUS_BADGES[issue.status] || STATUS_BADGES.Open;
              const categoryEmoji = CATEGORY_ICONS[issue.category] || "⚙️";
              const categoryLabel = CATEGORY_LABELS[issue.category] || "Other";
              const authority = AUTHORITY_MAPPING[issue.category] || AUTHORITY_MAPPING.other;

              const votes = issue.verifications || {};
              const verifiedCount = Object.values(votes).filter((v) => v === "verified").length;
              const notFixedCount = Object.values(votes).filter((v) => v === "not_fixed").length;
              const userVote = currentUser ? votes[currentUser.uid] : null;

              return (
                <motion.article
                  key={issue.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ 
                    scale: 1.02, 
                    rotateY: 4, 
                    rotateX: -1.5, 
                    z: 10,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="bg-bg-card border border-border-card rounded-2xl overflow-hidden card-shadow-glow flex flex-col sm:flex-row gap-5 p-5 text-text-primary transition-all duration-300 relative group"
                >
                  {/* Photo Section with 3D overlay */}
                  <div className="relative w-full sm:w-32 sm:h-32 h-44 bg-slate-900/10 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <img
                      src={issue.photoUrl}
                      alt={categoryLabel}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Safe custom SVG fallback if the original photo fails
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const svgPlaceholder = document.createElement("div");
                          svgPlaceholder.className = "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-accent-teal/10 to-accent-highlight/10 text-accent-teal p-3 text-center";
                          svgPlaceholder.innerHTML = `
                            <svg class="w-10 h-10 animate-pulse mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span class="text-[9px] uppercase font-bold tracking-widest text-text-secondary">Community Guard</span>
                          `;
                          parent.appendChild(svgPlaceholder);
                        }
                      }}
                    />
                    {/* Shadow-layered Category Pill floating elegantly */}
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-bg-card/90 backdrop-blur-md text-text-primary font-bold text-[10px] px-2.5 py-1 rounded-lg border border-border-card/50 shadow-md flex items-center gap-1">
                        <span className="filter drop-shadow-md text-xs transform group-hover:scale-115 duration-200 inline-block">{categoryEmoji}</span>
                        <span>{categoryLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-grow flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${sevBadge}`}>
                          {issue.severity} Severity
                        </span>
                        <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-accent-teal" />
                          {formatDate(issue.timestamp)}
                        </span>
                      </div>

                      <h4 className="font-display font-extrabold text-text-primary tracking-tight leading-tight text-sm sm:text-base group-hover:text-accent-teal transition-colors duration-200">
                        {categoryLabel} &bull; {issue.location.address}
                      </h4>

                      {/* AI analysis card container with border outline */}
                      <div className="bg-bg-card/30 rounded-xl p-3 border border-border-card/50 relative overflow-hidden group-hover:border-accent-teal/20 transition-all">
                        <p className="text-[9px] text-accent-teal font-black uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified AI Dispatch Summary
                        </p>
                        <p className="text-xs text-text-secondary leading-relaxed font-medium">
                          {issue.description}
                        </p>
                      </div>

                      {/* Additional local user note */}
                      {issue.note && (
                        <div className="text-xs bg-accent-highlight/5 border border-accent-highlight/15 rounded-xl p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-accent-highlight">
                            ✍️ Reporter Commentary
                          </p>
                          <p className="text-text-primary/95 mt-1 leading-relaxed text-[11px] font-medium italic">
                            "{issue.note}"
                          </p>
                        </div>
                      )}

                      {/* Collapsible Local Authority Contact Panel */}
                      {expandedAuthorityId === issue.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="bg-black/15 border border-white/5 p-3 rounded-xl space-y-2 text-xs mt-3"
                          id={`authority-panel-${issue.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[8px] uppercase font-black tracking-widest text-amber-400 leading-none">Target Department</p>
                              <h5 className="text-white font-extrabold text-[11px] mt-1">{authority.name}</h5>
                            </div>
                            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed italic">"{authority.desc}"</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] font-semibold pt-1 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-slate-200">{authority.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="text-slate-200 break-all">{authority.email}</span>
                            </div>
                          </div>
                          <div className="pt-1.5">
                            <a
                              href={`mailto:${authority.email}?subject=${encodeURIComponent(`Official Civic Grievance: ${categoryLabel} reported at ${issue.location.address}`)}&body=${encodeURIComponent(
                                `Respected Authority Officers,\n\nI am writing to officially report a civic issue regarding ${categoryLabel} identified at ${issue.location.address} on Bharat Civic Hub.\n\nDescription of Issue: ${issue.description}\nReport Reference ID: ${issue.id}\nTimestamp: ${formatDate(issue.timestamp)}\n\nPlease investigate this report and resolve the concern at your earliest convenience.\n\nRegards,\n${currentUser?.displayName || "Concerned Citizen"}\n(Citizen report routed via CommunityHero Bharat Civic Hub)`
                              )}`}
                              className="w-full py-2 text-center block bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                            >
                              Report to Authority (Pre-Filled Email) ✉️
                            </a>
                          </div>
                        </motion.div>
                      )}

                      {/* Community Verification Audit (Resolved / Verified) */}
                      {(issue.status === "Resolved" || issue.status === "Verified") && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2 mt-3" id={`verify-block-${issue.id}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <BadgeCheck className="w-4 h-4 text-emerald-400" />
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Community Resolution Audit</h5>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                              <span>{verifiedCount} Verified ✅</span>
                              <span className="opacity-40">|</span>
                              <span>{notFixedCount} Not Fixed ❌</span>
                            </div>
                          </div>
                          
                          {/* Resolution Proof Photo Display */}
                          {issue.resolvedPhoto && (
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Resolution Proof Photo</p>
                              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-emerald-500/20 shadow-inner group/proof">
                                <img 
                                  src={issue.resolvedPhoto} 
                                  alt="Resolution proof" 
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/proof:scale-103"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent flex items-end p-2.5">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-white bg-emerald-600 px-2 py-0.5 rounded">
                                    Administrative Proof Verified
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {currentUser && currentUser.email !== "priyapanda959@gmail.com" && (
                            <div className="pt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <p className="text-[9px] text-slate-300 font-extrabold">Does this proof show a completed fix?</p>
                              <div className="flex gap-1.5 self-end sm:self-center">
                                <button
                                  onClick={() => handleCommunityVerify(issue.id, 'verified')}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                                    userVote === 'verified'
                                      ? 'bg-emerald-500 text-slate-950 scale-102 shadow-md shadow-emerald-500/15'
                                      : 'bg-black/20 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  Verified ✅
                                </button>
                                <button
                                  onClick={() => handleCommunityVerify(issue.id, 'not_fixed')}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                                    userVote === 'not_fixed'
                                      ? 'bg-rose-500 text-white scale-102 shadow-md shadow-rose-500/15'
                                      : 'bg-black/20 hover:bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  Not Fixed ❌
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Real-time Issue Timeline History */}
                      <div className="mt-3.5 pt-3.5 border-t border-white/5 space-y-2 bg-black/10 p-3 rounded-xl border border-white/[0.03]">
                        <p className="text-[8px] uppercase font-black tracking-widest text-slate-400 leading-none">Issue Pipeline History</p>
                        <div className="flex items-center justify-between gap-1 pt-1.5">
                          {/* Step 1: Reported */}
                          <div className="flex flex-col items-center flex-1 text-center">
                            <div className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500 text-sky-400 flex items-center justify-center text-[9px] font-black shadow-sm">
                              1
                            </div>
                            <p className="text-[8px] text-white font-extrabold mt-1 uppercase tracking-wide">Reported</p>
                            <p className="text-[7.5px] text-slate-400 mt-0.5 leading-none font-bold">
                              {formatDate(issue.timeline?.reportedAt || issue.timestamp).split(',')[0]}
                            </p>
                          </div>

                          <div className={`h-0.5 flex-1 -mt-4 transition-colors ${issue.timeline?.inProgressAt ? 'bg-purple-500' : 'bg-white/5'}`} />

                          {/* Step 2: In Progress */}
                          <div className="flex flex-col items-center flex-1 text-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                              issue.timeline?.inProgressAt 
                                ? 'bg-purple-500/15 border border-purple-500 text-purple-400' 
                                : 'bg-white/5 border border-white/10 text-slate-500'
                            }`}>
                              2
                            </div>
                            <p className={`text-[8px] font-extrabold mt-1 uppercase tracking-wide ${issue.timeline?.inProgressAt ? 'text-purple-400' : 'text-slate-500'}`}>
                              In Progress
                            </p>
                            {issue.timeline?.inProgressAt && (
                              <p className="text-[7.5px] text-slate-400 mt-0.5 leading-none font-bold">
                                {formatDate(issue.timeline.inProgressAt).split(',')[0]}
                              </p>
                            )}
                          </div>

                          <div className={`h-0.5 flex-1 -mt-4 transition-colors ${issue.timeline?.resolvedAt ? 'bg-emerald-500' : 'bg-white/5'}`} />

                          {/* Step 3: Resolved */}
                          <div className="flex flex-col items-center flex-1 text-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                              issue.timeline?.resolvedAt 
                                ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-400' 
                                : 'bg-white/5 border border-white/10 text-slate-500'
                            }`}>
                              3
                            </div>
                            <p className={`text-[8px] font-extrabold mt-1 uppercase tracking-wide ${issue.timeline?.resolvedAt ? 'text-emerald-400' : 'text-slate-500'}`}>
                              Resolved
                            </p>
                            {issue.timeline?.resolvedAt && (
                              <p className="text-[7.5px] text-slate-400 mt-0.5 leading-none font-bold">
                                {formatDate(issue.timeline.resolvedAt).split(',')[0]}
                              </p>
                            )}
                          </div>

                          <div className={`h-0.5 flex-1 -mt-4 transition-colors ${issue.timeline?.verifiedAt || issue.status === 'Verified' ? 'bg-teal-500' : 'bg-white/5'}`} />

                          {/* Step 4: Verified */}
                          <div className="flex flex-col items-center flex-1 text-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                              issue.timeline?.verifiedAt || issue.status === 'Verified'
                                ? 'bg-teal-500/15 border border-teal-500 text-teal-400' 
                                : 'bg-white/5 border border-white/10 text-slate-500'
                            }`}>
                              4
                            </div>
                            <p className={`text-[8px] font-extrabold mt-1 uppercase tracking-wide ${issue.timeline?.verifiedAt || issue.status === 'Verified' ? 'text-teal-400' : 'text-slate-500'}`}>
                              Verified
                            </p>
                            {(issue.timeline?.verifiedAt || issue.status === 'Verified') && (
                              <p className="text-[7.5px] text-slate-400 mt-0.5 leading-none font-bold">
                                {formatDate(issue.timeline?.verifiedAt || issue.timestamp).split(',')[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Tactile interactive footer bar */}
                    <div className="pt-3 border-t border-border-card/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Reporter profile widget */}
                      <div className="flex items-center gap-2">
                        {issue.reporterPhoto ? (
                          <img
                            src={issue.reporterPhoto}
                            alt={issue.reporterName}
                            className="w-6.5 h-6.5 rounded-full object-cover border border-border-card shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6.5 h-6.5 rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/20 flex items-center justify-center text-[10px] font-bold">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wide leading-none">Reported By</p>
                          <p className="text-[11px] text-text-primary font-extrabold mt-0.5 leading-none">
                            {issue.reporterName}
                          </p>
                        </div>
                      </div>

                      {/* GPS coords indicator */}
                      {issue.location.lat && issue.location.lng && (
                        <span className="text-[9px] font-mono text-text-muted font-semibold bg-bg-card/50 border border-border-card/40 px-2 py-0.5 rounded-lg shadow-2xs">
                          📍 {issue.location.lat.toFixed(4)}°, {issue.location.lng.toFixed(4)}°
                        </span>
                      )}

                      {/* Contact Authority Trigger Button */}
                      <button
                        onClick={() => setExpandedAuthorityId(expandedAuthorityId === issue.id ? null : issue.id)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-extrabold px-3 py-1.5 rounded-xl border border-white/5 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Contact Authority</span>
                      </button>

                      {/* Status controller select panel */}
                      <div className="flex items-center gap-1.5 bg-bg-card/45 p-1 rounded-xl border border-border-card/60">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${statBadge}`}>
                          {issue.status}
                        </span>
                        
                        {/* Only show status dropdown to admin (priyapanda959@gmail.com). Hide it completely for all other users. */}
                        {currentUser?.email === "priyapanda959@gmail.com" && (
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                            className="bg-bg-card border border-border-card/80 text-text-primary text-[10px] font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-accent-teal cursor-pointer transition-colors"
                            title="Change Report Status"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Verified">Verified</option>
                          </select>
                        )}

                        {/* Delete button: only show if user is admin OR reporterEmail matches current user's email */}
                        {currentUser && (currentUser.email === "priyapanda959@gmail.com" || (currentUser.email && issue.reporterEmail === currentUser.email)) && (
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this civic report?")) {
                                handleDelete(issue.id);
                              }
                            }}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                            title="Delete Civic Report"
                            id={`delete-btn-${issue.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {/* Resolution Proof Upload Dialog Popup */}
      {resolvingIssueId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161a23] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative" id="proof-upload-modal">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wide">
                  Submit Resolution Proof
                </h3>
              </div>
              <button
                onClick={() => {
                  setResolvingIssueId(null);
                  setProofPhotoBase64(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-black"
              >
                ✕ Skip / Cancel
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                As an administrator, you are marking this issue as <strong className="text-emerald-400">Resolved</strong>. Please upload a clear photo verifying the completed fix or civic resolution.
              </p>

              {/* Upload Dropzone Box */}
              {!proofPhotoBase64 ? (
                <label className="border-2 border-dashed border-white/10 hover:border-amber-400/50 bg-black/25 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:bg-black/40">
                  <Upload className="w-8 h-8 text-slate-400 animate-bounce" />
                  <div className="text-center">
                    <span className="text-xs text-white font-extrabold">Upload Proof Photo</span>
                    <p className="text-[10px] text-slate-400 mt-1">JPEG/PNG high-quality compression up to 800px</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofPhotoUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected Proof Preview</p>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-emerald-500/30">
                    <img
                      src={proofPhotoBase64}
                      alt="Proof preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setProofPhotoBase64(null)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white px-2 py-1 rounded-lg text-[10px] font-black transition-colors"
                      title="Remove Photo"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Action row */}
              <div className="pt-2 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIssueId(null);
                    setProofPhotoBase64(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitResolutionWithProof}
                  disabled={isUploadingProof || !proofPhotoBase64}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isUploadingProof ? "Analyzing..." : "Confirm Resolution ✅"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
