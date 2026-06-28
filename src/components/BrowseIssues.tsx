import React, { useState } from "react";
import { CivicIssue, IssueCategory, IssueStatus, IssueSeverity, CivicUser, isDemoIssue } from "../types";
import { MapPin, Calendar, User, Users, Search, Filter, AlertTriangle, CheckCircle2, ShieldAlert, ChevronRight, Check, Trash2, Building2, Building, Phone, Mail, BadgeCheck, Camera, Upload, Info, AlertCircle, Copy, Download, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../FirebaseContext";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Language, translations } from "../translations";
import { INDIA_STATES_AND_DISTRICTS } from "../data/indiaStatesDistricts";

// Flat vector-style illustration representing a clean neighborhood empty state with a citizen checking their device
export function EmptyStateIllustration() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background soft ambient radial rings */}
      <circle cx="100" cy="75" r="60" stroke="var(--accent-teal)" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="100" cy="75" r="45" stroke="var(--accent-teal)" strokeOpacity="0.1" strokeWidth="1.5" />
      <circle cx="100" cy="75" r="30" fill="var(--bg-card)" fillOpacity="0.05" stroke="var(--accent-teal)" strokeOpacity="0.15" strokeWidth="1" />

      {/* Background Scenic Elements: Clean Street & Trees */}
      <line x1="20" y1="125" x2="180" y2="125" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      <rect x="35" y="125" width="12" height="4" rx="1" fill="var(--text-muted)" style={{ opacity: 0.4 }} />
      <rect x="150" y="125" width="12" height="4" rx="1" fill="var(--text-muted)" style={{ opacity: 0.4 }} />

      {/* Flat style background tree */}
      <g id="bg-tree">
        <line x1="45" y1="95" x2="45" y2="125" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="45" cy="82" r="16" fill="var(--accent-teal)" fillOpacity="0.12" />
        <circle cx="45" cy="82" r="11" fill="var(--accent-teal)" fillOpacity="0.22" />
      </g>

      {/* Floating Cloud in sky */}
      <path d="M 130 45 Q 135 40 142 45 Q 148 40 153 45 Q 155 50 148 50 L 133 50 Q 128 50 130 45 Z" fill="var(--text-muted)" style={{ opacity: 0.15 }} />

      {/* Character: Citizen standing relaxed on street, looking at phone */}
      <g id="character-neutral">
        {/* Head */}
        <circle cx="100" cy="55" r="7.5" fill="var(--text-secondary)" />
        {/* Torso/Shirt */}
        <path d="M 94 62.5 C 94 62.5 90 80 95 98 L 105 98 C 110 80 106 62.5 106 62.5 Z" fill="var(--accent-teal)" />
        {/* Legs/Pants */}
        <path d="M 97 98 L 97 122 M 103 98 L 103 122" stroke="var(--text-secondary)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Arm holding smartphone */}
        <path d="M 95 68 Q 85 74 91 84" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Glowing smartphone device */}
        <rect x="88" y="81" width="5" height="9.5" rx="0.8" fill="var(--accent-highlight)" />
        <circle cx="90.5" cy="85.5" r="1.5" className="fill-white animate-ping" />
      </g>

      {/* Clean sparkles of extreme neighborhood hygiene */}
      <path d="M 118 68 L 120 71 L 124 72 L 120 73 L 118 76 L 116 73 L 112 72 L 116 71 Z" fill="var(--accent-highlight)" className="animate-pulse" />
      <path d="M 72 58 L 74 61 L 78 62 L 74 63 L 72 66 L 70 63 L 66 62 L 70 61 Z" fill="var(--accent-highlight)" className="animate-pulse" />
    </svg>
  );
}

interface BrowseIssuesProps {
  issues: CivicIssue[];
  currentUser: CivicUser | null;
  onUpdateStatus: (id: string, newStatus: IssueStatus) => void;
  onDeleteIssue?: (id: string) => void;
  highlightedIssueId?: string | null;
  onClearHighlight?: () => void;
  initialFilterUnseen?: boolean;
  onClearUnseenFilter?: () => void;
  onNavigateToReport?: () => void;
  language?: Language;
  theme?: "light" | "dark" | "neon";
}

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

// Map of common synonyms or historical names for Indian cities and states
const SYNONYM_GROUPS: string[][] = [
  ["berhampur", "brahmapur"],
  ["bangalore", "bengaluru"],
  ["bombay", "mumbai"],
  ["madras", "chennai"],
  ["calcutta", "kolkata"],
  ["poona", "pune"],
  ["gurgaon", "gurugram"],
  ["trivandrum", "thiruvananthapuram"],
  ["cochin", "kochi"],
  ["pondicherry", "puducherry"],
  ["benares", "varanasi"],
  ["allahabad", "prayagraj"],
  ["orissa", "odisha"]
];

/**
 * Checks if the source text contains the search or filter query, taking into account common Indian city synonyms (e.g. Berhampur/Brahmapur)
 */
export function textContainsQueryWithSynonyms(text: string, query: string): boolean {
  if (!text) return false;
  if (!query) return true;

  const cleanText = text.toLowerCase();
  const cleanQuery = query.toLowerCase().trim();

  for (const group of SYNONYM_GROUPS) {
    for (const synonym of group) {
      if (cleanQuery.includes(synonym)) {
        // If cleanQuery contains a synonym, check if the text contains ANY of the other synonymous terms
        for (const alternate of group) {
          const queryVariation = cleanQuery.replace(synonym, alternate);
          if (cleanText.includes(queryVariation)) {
            return true;
          }
        }
      }
    }
  }

  // Fallback to standard substring check
  return cleanText.includes(cleanQuery);
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
  highlightedIssueId,
  onClearHighlight,
  initialFilterUnseen,
  onClearUnseenFilter,
  onNavigateToReport,
  language,
  theme,
}: BrowseIssuesProps) {
  const { activeDatabase, setIssues, adminReadIssues, markAdminIssueAsRead, addCoReporter, updateIssueStatus } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | IssueCategory>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | IssueStatus>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | IssueSeverity>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [hasInitializedRegion, setHasInitializedRegion] = useState(false);
  const [unseenOnlyFilter, setUnseenOnlyFilter] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [expandedAuthorityId, setExpandedAuthorityId] = useState<string | null>(null);
  const [ccEmail, setCcEmail] = useState("");
  const [bccEmail, setBccEmail] = useState("");
  const [copiedIssueId, setCopiedIssueId] = useState<string | null>(null);

  // States for manual "This is happening here too" confirmations
  const [confirmingIssueId, setConfirmingIssueId] = useState<string | null>(null);
  const [confirmationPhotoBase64, setConfirmationPhotoBase64] = useState<string | null>(null);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [isUploadingConfirmation, setIsUploadingConfirmation] = useState(false);

  // State for the dedicated Issue's Detail Page Modal
  const [detailedIssueId, setDetailedIssueId] = useState<string | null>(null);

  const t = translations[language || "en"];
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

  const isAdmin = currentUser?.email === "priyapanda959@gmail.com";

  // Explicitly reset all filters when the authenticated user changes (sign-in, sign-out, switch accounts)
  React.useEffect(() => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedSeverity("all");
    setSelectedState("all");
    setSelectedDistrict("all");
    setUnseenOnlyFilter(false);
  }, [currentUser?.uid]);

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const filtersRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setIsFiltersExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const activeFiltersCount = 
    (searchTerm.trim() ? 1 : 0) +
    (selectedState !== "all" ? 1 : 0) +
    (selectedDistrict !== "all" && selectedDistrict !== "All Districts" ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedSeverity !== "all" ? 1 : 0) +
    (unseenOnlyFilter ? 1 : 0);

  const getActiveFiltersList = () => {
    const list: { key: string; label: string; onClear: () => void }[] = [];
    if (searchTerm.trim()) {
      list.push({ 
        key: "search", 
        label: `"${searchTerm.trim()}"`, 
        onClear: () => setSearchTerm("") 
      });
    }
    if (selectedState !== "all") {
      list.push({ 
        key: "state", 
        label: selectedState, 
        onClear: () => {
          setSelectedState("all");
          setSelectedDistrict("all");
        } 
      });
    }
    if (selectedDistrict !== "all" && selectedDistrict !== "All Districts") {
      list.push({ 
        key: "district", 
        label: selectedDistrict, 
        onClear: () => setSelectedDistrict("all") 
      });
    }
    if (selectedCategory !== "all") {
      let catLabel = selectedCategory;
      if (selectedCategory === "pothole") catLabel = "Potholes";
      else if (selectedCategory === "streetlight") catLabel = "Streetlights";
      else if (selectedCategory === "garbage") catLabel = "Garbage/Waste";
      else if (selectedCategory === "water_leak") catLabel = "Water Leaks";
      else if (selectedCategory === "other") catLabel = "Others";
      
      list.push({ 
        key: "category", 
        label: catLabel, 
        onClear: () => setSelectedCategory("all") 
      });
    }
    if (selectedStatus !== "all") {
      list.push({ 
        key: "status", 
        label: selectedStatus, 
        onClear: () => setSelectedStatus("all") 
      });
    }
    if (selectedSeverity !== "all") {
      list.push({ 
        key: "severity", 
        label: `${selectedSeverity.toUpperCase()} Severity`, 
        onClear: () => setSelectedSeverity("all") 
      });
    }
    if (unseenOnlyFilter) {
      list.push({ 
        key: "unseen", 
        label: "Unread Only", 
        onClear: () => setUnseenOnlyFilter(false) 
      });
    }
    return list;
  };

  const handleCopyLetter = (text: string, issueId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIssueId(issueId);
    setTimeout(() => {
      setCopiedIssueId((current) => current === issueId ? null : current);
    }, 2500);
  };

  const handleDownloadLetter = (issueId: string, letterText: string, categoryLabel: string) => {
    const blob = new Blob([letterText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `complaint_letter_${categoryLabel.toLowerCase().replace(/\s+/g, '_')}_${issueId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Auto-initialize default state and district to user's most recent report location
  React.useEffect(() => {
    if (!hasInitializedRegion && issues.length > 0 && currentUser) {
      const userIssues = issues.filter(
        (issue) => issue.reporterId === currentUser.uid || issue.reporterEmail === currentUser.email
      );
      if (userIssues.length > 0) {
        const sortedUserIssues = [...userIssues].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const address = sortedUserIssues[0].location.address;
        if (address) {
          const matchedState = INDIA_STATES_AND_DISTRICTS.find(s => 
            address.toLowerCase().includes(s.name.toLowerCase())
          );
          if (matchedState) {
            setSelectedState(matchedState.name);
            const matchedDistrict = matchedState.districts.find(d => 
              d !== "All Districts" && address.toLowerCase().includes(d.toLowerCase())
            );
            if (matchedDistrict) {
              setSelectedDistrict(matchedDistrict);
            }
          }
        }
      }
      setHasInitializedRegion(true);
    }
  }, [issues, currentUser, hasInitializedRegion]);

  // Handle initial unseen filter setting when entering from dashboard
  React.useEffect(() => {
    if (initialFilterUnseen) {
      setUnseenOnlyFilter(true);
      onClearUnseenFilter?.();
    }
  }, [initialFilterUnseen, onClearUnseenFilter]);

  // Mark issue as read when authority contact panel is expanded or clicked
  React.useEffect(() => {
    if (expandedAuthorityId && isAdmin) {
      markAdminIssueAsRead(expandedAuthorityId);
    }
  }, [expandedAuthorityId, isAdmin, markAdminIssueAsRead]);

  // Auto-scrolling and highlighting effect
  React.useEffect(() => {
    if (highlightedIssueId) {
      const targetIssue = issues.find((i) => i.id === highlightedIssueId);
      if (targetIssue) {
        setSearchTerm("");
        setSelectedCategory("all");
        setSelectedStatus("all");
        setSelectedSeverity("all");
        setSelectedState("all");
        setSelectedDistrict("all");
        setUnseenOnlyFilter(false);
        setExpandedAuthorityId(highlightedIssueId);

        const timer = setTimeout(() => {
          const element = document.getElementById(`issue-card-${highlightedIssueId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-4", "ring-accent-teal", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove("ring-4", "ring-accent-teal", "ring-offset-2");
            }, 3000);
          }
          onClearHighlight?.();
        }, 200);

        return () => clearTimeout(timer);
      }
    }
  }, [highlightedIssueId, issues, onClearHighlight]);

  // Filters logic
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = !searchTerm.trim() ||
      textContainsQueryWithSynonyms(issue.location.address, searchTerm) ||
      textContainsQueryWithSynonyms(issue.description, searchTerm) ||
      (issue.note && textContainsQueryWithSynonyms(issue.note, searchTerm)) ||
      textContainsQueryWithSynonyms(issue.reporterName, searchTerm);

    const matchesCategory = selectedCategory === "all" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;
    const matchesSeverity = selectedSeverity === "all" || issue.severity === selectedSeverity;
    const matchesUnseen = !unseenOnlyFilter || (issue.status === "Open" && !adminReadIssues.includes(issue.id));
    
    const matchesState = selectedState === "all" || 
      (issue.location.state && issue.location.state.toLowerCase() === selectedState.toLowerCase()) ||
      textContainsQueryWithSynonyms(issue.location.address, selectedState);

    const matchesDistrict = selectedDistrict === "all" || selectedDistrict === "All Districts" ||
      (issue.location.city && issue.location.city.toLowerCase() === selectedDistrict.toLowerCase()) ||
      textContainsQueryWithSynonyms(issue.location.address, selectedDistrict);

    return matchesSearch && matchesCategory && matchesStatus && matchesSeverity && matchesUnseen && matchesState && matchesDistrict;
  });

  const visibleIssues = filteredIssues
    .filter((issue) => !deletedIds.includes(issue.id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleDelete = async (issueId: string) => {
    try {
      await deleteDoc(doc(db, 'issues', issueId));
      setIssues(prev => prev.filter(issue => issue.id !== issueId));
      setModal({
        isOpen: true,
        title: "Deleted Successfully",
        message: "The civic report has been successfully deleted.",
        type: "success"
      });
    } catch (error: any) {
      setModal({
        isOpen: true,
        title: "Delete Failed",
        message: "Error deleting report: " + error.message,
        type: "error"
      });
    }
  };

  const handleCommunityVerify = async (issueId: string, type: "verified" | "not_fixed") => {
    if (!currentUser) {
      setModal({
        isOpen: true,
        title: "Sign In Required",
        message: "Please sign in to verify this resolution.",
        type: "info"
      });
      return;
    }
    const userEmail = currentUser.email;
    if (userEmail === "priyapanda959@gmail.com") {
      setModal({
        isOpen: true,
        title: "Access Denied",
        message: "Administrators cannot submit community audits.",
        type: "error"
      });
      return;
    }

    try {
      // First log the vote
      await updateDoc(doc(db, "issues", issueId), {
        [`verifications.${currentUser.uid}`]: type
      });

      // If they click "Verify Resolution ✅" (verified), progress the issue status to "Verified"
      if (type === "verified") {
        await updateIssueStatus(issueId, "Verified");
      }

      setModal({
        isOpen: true,
        title: "Audit Recorded",
        message: type === "verified"
          ? "Thank you! You have successfully verified the resolution. This report has now been moved to the Verified pipeline."
          : "Thank you! Your feedback has been registered in the resolution audit logs.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Failed to submit verification:", err);
      setModal({
        isOpen: true,
        title: "Verification Failed",
        message: err.message,
        type: "error"
      });
    }
  };

  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [proofPhotoBase64, setProofPhotoBase64] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    const userEmail = currentUser?.email || "";
    const isAdmin = userEmail === "priyapanda959@gmail.com";
    if (!isAdmin) {
      setModal({
        isOpen: true,
        title: "Administrator Required",
        message: "Only the administrator is allowed to update report status.",
        type: "error"
      });
      return;
    }

    if (newStatus === "Resolved") {
      setResolvingIssueId(issueId);
      setProofPhotoBase64(null);
      return;
    }

    try {
      // Transition status using centralized, sequential-order checks
      await updateIssueStatus(issueId, newStatus);

      if (onUpdateStatus) {
        onUpdateStatus(issueId, newStatus);
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      setModal({
        isOpen: true,
        title: "Status Transition Blocked",
        message: err.message,
        type: "error"
      });
    }
  };

  const handleProofPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
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

        try {
          const base64 = dataUrl.split(",")[1];
          const checkRealismRes = await fetch("/api/check-realism", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, mimeType: "image/jpeg" })
          });

          if (!checkRealismRes.ok) {
            throw new Error("Realism check failed with status: " + checkRealismRes.status);
          }

          const realismData = await checkRealismRes.json();
          if (realismData && realismData.isRealPhoto === false) {
            setModal({
              isOpen: true,
              title: "Invalid Proof Photo",
              message: "This looks like an illustration or graphic, not a real photo. Please upload an actual photo of the issue.",
              type: "error"
            });
            setProofPhotoBase64(null);
            setIsUploadingProof(false);
            return;
          }

          setProofPhotoBase64(dataUrl);
        } catch (err: any) {
          console.error("Proof photo realism check error:", err);
          // Allow fallback/bypass on system error or carry on
          setProofPhotoBase64(dataUrl);
        } finally {
          setIsUploadingProof(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitResolutionWithProof = async () => {
    if (!resolvingIssueId) return;
    if (!proofPhotoBase64) {
      setModal({
        isOpen: true,
        title: "Proof Required",
        message: "Please upload a proof photo to verify the resolution of this issue.",
        type: "info"
      });
      return;
    }

    const originalIssue = issues.find((i) => i.id === resolvingIssueId);
    if (!originalIssue) return;

    setIsVerifyingResolution(true);

    try {
      // Validate the proof photo against the original category and description via Gemini
      const response = await fetch("/api/verify-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: originalIssue.category,
          description: originalIssue.description,
          resolvedPhoto: proofPhotoBase64,
          mimeType: "image/jpeg"
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.matches) {
        setModal({
          isOpen: true,
          title: "Incompatible Resolution Photo",
          message: `The uploaded proof photo does not appear to show a resolved ${originalIssue.category.replace("_", " ")} issue.\n\nReasoning: ${data.reasoning || "Please upload a photo that matches the problem category."}\n\nPlease upload a relevant photo instead.`,
          type: "error"
        });
        setIsVerifyingResolution(false);
        return;
      }

      // Transition to Resolved with proof photo via our central method
      await updateIssueStatus(resolvingIssueId, "Resolved", { resolvedPhoto: proofPhotoBase64 });

      if (onUpdateStatus) {
        onUpdateStatus(resolvingIssueId, "Resolved");
      }

      setResolvingIssueId(null);
      setProofPhotoBase64(null);
    } catch (err: any) {
      console.error("Failed to resolve issue:", err);
      setModal({
        isOpen: true,
        title: "Resolution Failed",
        message: err.message || "An unexpected error occurred during photo verification.",
        type: "error"
      });
    } finally {
      setIsVerifyingResolution(false);
    }
  };

  const handleConfirmationPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingConfirmation(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
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

        try {
          const base64 = dataUrl.split(",")[1];
          const checkRealismRes = await fetch("/api/check-realism", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, mimeType: "image/jpeg" })
          });

          if (!checkRealismRes.ok) {
            throw new Error("Realism check failed with status: " + checkRealismRes.status);
          }

          const realismData = await checkRealismRes.json();
          if (realismData && realismData.isRealPhoto === false) {
            setModal({
              isOpen: true,
              title: "Invalid Confirmation Photo",
              message: "This looks like an illustration or graphic, not a real photo. Please upload an actual photo of the issue.",
              type: "error"
            });
            setConfirmationPhotoBase64(null);
            setIsUploadingConfirmation(false);
            return;
          }

          setConfirmationPhotoBase64(dataUrl);
        } catch (err: any) {
          console.error("Confirmation photo realism check error:", err);
          // Allow fallback/bypass on system error or carry on
          setConfirmationPhotoBase64(dataUrl);
        } finally {
          setIsUploadingConfirmation(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submitConfirmation = async () => {
    if (!confirmingIssueId || !currentUser) return;
    if (!confirmationPhotoBase64) {
      setModal({
        isOpen: true,
        title: "Proof Required",
        message: "Please upload a photo as proof that you are seeing this issue at this location.",
        type: "info"
      });
      return;
    }

    setIsUploadingConfirmation(true);
    try {
      const issue = issues.find(i => i.id === confirmingIssueId);
      if (!issue) {
        throw new Error("Target issue not found.");
      }

      // 1. Proximity Verification Check
      if (issue.location && typeof issue.location.lat === "number" && typeof issue.location.lng === "number") {
        const userCoords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser. You must allow location access to confirm an issue's proximity."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(new Error(`Could not access your location: ${err.message}. Proximity verification requires location access.`)),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
          );
        });

        const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371e3; // Earth's radius in meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          return R * c;
        };

        const distance = getDistanceInMeters(
          userCoords.latitude,
          userCoords.longitude,
          issue.location.lat,
          issue.location.lng
        );

        // Define a reasonable proximity threshold, e.g., 500 meters
        const proximityThresholdMeters = 500;
        if (distance > proximityThresholdMeters) {
          throw new Error(`Proximity Check Failed: You are too far from this issue to confirm it. You must be within ${proximityThresholdMeters} meters of the issue to confirm it, but you are currently ${Math.round(distance)} meters away.`);
        }
      }

      // 2. Perform AI Photo Match Verification
      const mimeTypeMatch = confirmationPhotoBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";

      const verifyResponse = await fetch("/api/verify-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingPhotoUrl: issue.photoUrl,
          existingDescription: issue.description,
          newPhotoBase64: confirmationPhotoBase64,
          newPhotoMimeType: mimeType
        }),
      });

      if (!verifyResponse.ok) {
        const errorJson = await verifyResponse.json().catch(() => ({}));
        throw new Error(errorJson.error || "AI verification server error occurred during photo matching.");
      }

      const verificationResult = await verifyResponse.json();
      if (!verificationResult.matches) {
        throw new Error(`AI Photo Verification Failed: ${verificationResult.reasoning || "The uploaded confirmation photo does not plausibly match the existing reported issue."}`);
      }

      // 3. Proximity and photo verification both passed - proceed to save co-reporter confirmation
      await addCoReporter(
        confirmingIssueId,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL || ""
        },
        confirmationPhotoBase64,
        confirmationNote
      );

      setModal({
        isOpen: true,
        title: "Confirmation Registered!",
        message: `Thank you for confirming this civic concern. Proximity and AI Photo checks both passed successfully! ${verificationResult.reasoning || ""}`,
        type: "success"
      });

      setConfirmingIssueId(null);
      setConfirmationPhotoBase64(null);
      setConfirmationNote("");
    } catch (err: any) {
      console.error("Failed to submit confirmation:", err);
      setModal({
        isOpen: true,
        title: "Submission Failed",
        message: err.message || "Something went wrong while logging your confirmation.",
        type: "error"
      });
    } finally {
      setIsUploadingConfirmation(false);
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

  // Extract unique regions and own region for filter bar
  const userIssuesForRegion = issues.filter(
    (issue) => currentUser && (issue.reporterId === currentUser.uid || issue.reporterEmail === currentUser.email)
  );
  let userOwnRegion = "";
  if (userIssuesForRegion.length > 0) {
    const sortedUserIssues = [...userIssuesForRegion].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    userOwnRegion = extractRegion(sortedUserIssues[0].location.address);
  }

  const uniqueRegions = Array.from(
    new Set(
      issues
        .map((issue) => extractRegion(issue.location.address))
        .filter((r) => r && r !== "General" && r !== "Unknown")
    )
  ).sort();

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedSeverity("all");
    setUnseenOnlyFilter(false);
    setSelectedState("all");
    setSelectedDistrict("all");
  };

  return (
    <div className="space-y-6" id="browse-issues-root">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-card pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-accent-teal shrink-0 relative overflow-hidden shadow-xs">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--accent-teal),0.15),transparent_70%)] animate-pulse" />
            <Search className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-extrabold text-text-primary flex items-center gap-2">
              <span>{t.navBrowse}</span>
              <span className="text-xs font-bold bg-accent-teal/15 text-accent-teal border border-accent-teal/20 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                {visibleIssues.length} {t.reportsCountText}
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-1 font-medium">
              {t.helpSub}
            </p>
          </div>
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

      {/* Collapsible Search & Filters Control Panel */}
      <div ref={filtersRef} className="space-y-3" id="filters-container-root">
        {/* Always-Visible Filter Header & Active-Filter Status Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-card/45 backdrop-blur-md p-4 rounded-2xl border border-border-card/80 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="filters-toggle-button"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all border cursor-pointer select-none ${
                isFiltersExpanded 
                  ? "bg-accent-teal border-accent-teal text-text-on-accent shadow-[0_0_15px_var(--glow)]" 
                  : "bg-bg-card/60 border-border-card/50 text-text-primary hover:border-accent-teal/50 hover:bg-bg-card"
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-accent-highlight text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
              {isFiltersExpanded ? (
                <ChevronUp className="w-4 h-4 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0 ml-1" />
              )}
            </button>

            {/* Inline Active Filters List */}
            {activeFiltersCount > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5" id="active-filters-badges">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1">
                  Active ({activeFiltersCount}):
                </span>
                {getActiveFiltersList().map((filter) => (
                  <span 
                    key={filter.key} 
                    className="inline-flex items-center gap-1 bg-accent-teal/10 hover:bg-accent-teal/15 border border-accent-teal/25 text-accent-teal text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-colors cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                    onClick={() => filter.onClear()}
                  >
                    <span>{filter.label}</span>
                    <span className="text-accent-teal/60 hover:text-accent-teal ml-0.5 text-xs">×</span>
                  </span>
                ))}
                
                {/* Clear All quick link */}
                <button
                  onClick={clearFilters}
                  className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors ml-1 cursor-pointer"
                  id="quick-clear-filters-btn"
                >
                  Clear All
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-text-muted/60 italic font-semibold ml-1">
                No active filters (showing all reports)
              </div>
            )}
          </div>

          {/* Result Count Status & Quick Info */}
          <div className="text-right flex items-center justify-end gap-2 shrink-0">
            <span className="text-xs font-black text-text-primary uppercase tracking-wider bg-bg-card/40 border border-border-card/40 px-3.5 py-2 rounded-xl">
              {selectedState === "all"
                ? `${visibleIssues.length} found across India`
                : selectedDistrict === "all" || selectedDistrict === "All Districts"
                  ? `${visibleIssues.length} found in ${selectedState}`
                  : `${visibleIssues.length} found in ${selectedDistrict}, ${selectedState}`}
            </span>
          </div>
        </div>

        {/* Collapsible Filters Panel with AnimatePresence */}
        <AnimatePresence>
          {isFiltersExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
              id="collapsible-filters-panel"
            >
              <div className="bg-bg-card/40 backdrop-blur-xl rounded-2xl border border-border-card shadow-lg p-5 space-y-4">
                {/* Row 1: State, District, Category, Text search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* State / Union Territory Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      🇮🇳 State / UT
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict("all"); // reset district
                      }}
                      className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
                    >
                      <option value="all">🌐 All India (All States)</option>
                      {INDIA_STATES_AND_DISTRICTS.map((state) => (
                        <option key={state.name} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District / City Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      🏢 District / City
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      disabled={selectedState === "all"}
                      className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="all">📍 All Districts / Cities</option>
                      {selectedState !== "all" &&
                        INDIA_STATES_AND_DISTRICTS.find((s) => s.name === selectedState)
                          ?.districts.filter(d => d !== "All Districts")
                          .map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      {t.categoryLabel}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as any)}
                      className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
                    >
                      <option value="all">📁 {t.allCategories}</option>
                      <option value="pothole">🕳️ Potholes</option>
                      <option value="streetlight">💡 Streetlights</option>
                      <option value="garbage">🗑️ Garbage / Waste</option>
                      <option value="water_leak">💧 Water Leaks</option>
                      <option value="other">⚙️ Others</option>
                    </select>
                  </div>

                  {/* Text Search Box */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      {t.searchLabel}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-text-muted" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchTextPlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-card bg-bg-card/50 text-text-primary placeholder-text-muted/60 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal outline-none text-xs transition-all shadow-inner"
                        id="search-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Status, Severity, and Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border-card/30 items-end">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      {t.statusFilterLabel}
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
                    >
                      <option value="all">🔔 {t.allStatuses}</option>
                      <option value="Open">🔵 {t.helpStep4Open}</option>
                      <option value="In Progress">🟣 {t.helpStep4Progress}</option>
                      <option value="Resolved">🟢 {t.helpStep4Resolved}</option>
                      <option value="Verified">✅ {t.helpStep4Verified}</option>
                    </select>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      {t.severityLabel}
                    </label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value as any)}
                      className="w-full bg-bg-card/70 border border-border-card text-text-primary text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
                    >
                      <option value="all">⚡ {t.allSeverities}</option>
                      <option value="low">🟢 {t.lowSeverity}</option>
                      <option value="medium">🟡 {t.mediumSeverity}</option>
                      <option value="high">🔴 {t.highSeverity}</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex items-center justify-end">
                    {(searchTerm || selectedCategory !== "all" || selectedStatus !== "all" || selectedSeverity !== "all" || selectedState !== "all" || selectedDistrict !== "all" || unseenOnlyFilter) ? (
                      <button
                        onClick={clearFilters}
                        className="w-full sm:w-auto px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-all border border-rose-500/25 cursor-pointer transform hover:scale-102 active:scale-98 flex items-center justify-center gap-2 shadow-xs"
                      >
                        {t.clearAllFiltersBtn}
                      </button>
                    ) : (
                      <div className="text-[11px] text-text-muted italic px-2 py-2 w-full text-right">
                        {t.allFiltersDefault}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin extra filter */}
                {isAdmin && (
                  <div className="pt-4 border-t border-border-card/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="unseen-only-checkbox"
                        checked={unseenOnlyFilter}
                        onChange={(e) => setUnseenOnlyFilter(e.target.checked)}
                        className="w-4 h-4 rounded border-border-card text-accent-teal bg-bg-card/70 focus:ring-accent-teal cursor-pointer"
                      />
                      <label 
                        htmlFor="unseen-only-checkbox" 
                        className="text-xs font-extrabold text-rose-400 uppercase tracking-wider cursor-pointer flex items-center gap-2 select-none font-sans"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        Show Unread / Unseen Reports Only
                      </label>
                    </div>
                    <span className="text-[10px] text-text-muted font-bold font-mono">
                      {issues.filter(i => i.status === "Open" && !adminReadIssues.includes(i.id)).length} unread reviews remaining
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid of Issues with 3D perspective and hover animations */}
      {visibleIssues.length === 0 ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-bg-card/25 rounded-3xl border border-border-card/60 p-12 text-center relative overflow-hidden backdrop-blur-md"
          id="empty-feed-state"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-accent-teal to-rose-500" />
          <div className="w-full max-w-[200px] aspect-[4/3] h-32 sm:h-36 md:h-40 mx-auto mb-4 flex items-center justify-center">
            <EmptyStateIllustration />
          </div>
          <h4 className="font-display font-bold text-text-primary text-base">No Matching Reports</h4>
          <p className="text-xs text-text-secondary mt-2 max-w-md mx-auto leading-relaxed">
            No matching issues found in {selectedState === "all"
              ? "any state"
              : selectedDistrict === "all" || selectedDistrict === "All Districts"
                ? selectedState
                : `${selectedDistrict}, ${selectedState}`}. 
            You can submit a new report to get it addressed!
          </p>
          {onNavigateToReport && (
            <button
              onClick={onNavigateToReport}
              className="mt-6 px-5 py-2.5 bg-gradient-to-r from-accent-teal to-accent-teal-hover hover:from-accent-teal-hover hover:to-accent-teal text-text-on-accent font-bold text-xs rounded-xl shadow-lg hover:shadow-[0_0_15px_var(--glow)] transition-all cursor-pointer transform hover:scale-103 active:scale-97 flex items-center gap-2 mx-auto"
            >
              Report a New Civic Issue
            </button>
          )}
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
              const subject = `Official Civic Grievance: ${categoryLabel} reported at ${issue.location.address}`;
              const bodyText = `Respected Authority Officers,

I am writing to officially report a civic issue regarding ${categoryLabel} identified at ${issue.location.address} on Bharat Civic Hub.

Description of Issue: ${issue.description}
Report Reference ID: ${issue.id}
Timestamp: ${formatDate(issue.timestamp)}

Please investigate this report and resolve the concern at your earliest convenience.

Regards,
${currentUser?.displayName || "Concerned Citizen"}
(Citizen report routed via CommunityHero Bharat Civic Hub)`;

              const finalLetter = issue.complaintLetter || bodyText;

              const votes = issue.verifications || {};
              const verifiedCount = Object.values(votes).filter((v) => v === "verified").length;
              const notFixedCount = Object.values(votes).filter((v) => v === "not_fixed").length;
              const userVote = currentUser ? votes[currentUser.uid] : null;

              const isReporter = currentUser && (currentUser.uid === issue.reporterId || currentUser.email === issue.reporterEmail);
              const isCoReporter = currentUser && !!issue.coReporters?.some((c) => c.uid === currentUser.uid || c.email === currentUser.email);
              const canVerify = (isReporter || isCoReporter) && issue.status === "Resolved" && !!issue.resolvedPhoto;

              const isUnseen = isAdmin && issue.status === "Open" && !adminReadIssues.includes(issue.id);

              return (
                <motion.article
                  id={`issue-card-${issue.id}`}
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
                    boxShadow: isUnseen 
                      ? "0 25px 50px -12px rgba(244,63,94,0.25)"
                      : "0 25px 50px -12px rgba(0,0,0,0.25)"
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className={`bg-bg-card rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-5 p-5 text-text-primary transition-all duration-300 relative group ${
                    isUnseen 
                      ? "border-2 border-rose-500/55 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-500/[0.015]" 
                      : "border border-border-card card-shadow-glow"
                  }`}
                >
                  {/* Photo Section with 3D overlay */}
                  <div className="relative w-full sm:w-32 sm:h-32 h-44 bg-slate-900/10 rounded-xl overflow-hidden shrink-0 shadow-md mb-4 sm:mb-0">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${sevBadge}`}>
                            {issue.severity} Severity
                          </span>
                          <span className="font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/30 bg-amber-400/5 text-amber-400">
                            Open for {(() => {
                              const issueDate = new Date(issue.timestamp);
                              const now = new Date();
                              const diffTime = Math.max(0, now.getTime() - issueDate.getTime());
                              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                              return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
                            })()}
                          </span>
                          {isUnseen && (
                            <span className="relative flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-500 font-extrabold text-[8px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block shrink-0"></span>
                              <span>Unseen</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAdminIssueAsRead(issue.id);
                                }}
                                className="ml-1 text-[8px] font-black bg-rose-500 text-white px-1 py-0.5 rounded-sm hover:bg-rose-600 transition-colors shadow-2xs"
                                title="Mark as Viewed"
                              >
                                Done
                              </button>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted font-bold flex items-center gap-1 shrink-0">
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
                          className="bg-black/15 border border-white/5 p-3 rounded-xl space-y-3.5 text-xs mt-3"
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

                          {/* CC and BCC fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-white/[0.03]">
                            <div>
                              <label className="block text-[8px] uppercase font-black tracking-widest text-slate-400 mb-1">CC Email (Optional)</label>
                              <input
                                type="email"
                                placeholder="e.g. manager@authority.gov"
                                value={ccEmail}
                                onChange={(e) => setCcEmail(e.target.value)}
                                className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-600 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] uppercase font-black tracking-widest text-slate-400 mb-1">BCC Email (Optional)</label>
                              <input
                                type="email"
                                placeholder="e.g. archive@civichub.org"
                                value={bccEmail}
                                onChange={(e) => setBccEmail(e.target.value)}
                                className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-600 font-medium"
                              />
                            </div>
                          </div>

                          {/* Letter Preview */}
                          <div className="space-y-1">
                            <label className="block text-[8px] uppercase font-black tracking-widest text-slate-400">Complaint Letter Draft</label>
                            <textarea
                              readOnly
                              value={finalLetter}
                              className="w-full h-24 bg-slate-900/80 border border-white/10 rounded-lg p-2 font-mono text-[9px] text-slate-300 leading-relaxed overflow-y-auto resize-none focus:outline-none select-all"
                            />
                          </div>

                          {/* Action Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCopyLetter(finalLetter, issue.id)}
                              className="py-2 px-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:border-white/20 active:scale-98"
                            >
                              {copiedIssueId === issue.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="text-emerald-400">Copied! ✓</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Copy Letter</span>
                                </>
                              )}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDownloadLetter(issue.id, finalLetter, categoryLabel)}
                              className="py-2 px-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:border-white/20 active:scale-98"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Download Text</span>
                            </button>

                            <a
                              href={(() => {
                                let mailtoUrl = `mailto:${authority.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalLetter)}`;
                                if (ccEmail.trim()) {
                                  mailtoUrl += `&cc=${encodeURIComponent(ccEmail.trim())}`;
                                }
                                if (bccEmail.trim()) {
                                  mailtoUrl += `&bcc=${encodeURIComponent(bccEmail.trim())}`;
                                }
                                return mailtoUrl;
                              })()}
                              className="py-2 px-3 text-center bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                              <span>Send via Email</span>
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

                          {issue.status === "Resolved" && (
                            <div className="pt-1.5">
                              {canVerify ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                                      Verify Resolution ✅
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
                              ) : (
                                <div className="w-full flex items-center gap-2 bg-black/15 border border-white/5 p-2 rounded-xl">
                                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <p className="text-[10px] text-slate-300 font-bold">
                                    Awaiting confirmation from the original reporter
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {issue.status === "Verified" && (
                            <div className="pt-1.5 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <p className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">
                                Resolution fully verified by the reporter
                              </p>
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
                    <div className="pt-3 border-t border-border-card/30 flex flex-wrap items-center justify-between gap-4 text-xs w-full">
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

                      {/* Co-reporters display */}
                      {issue.confirmationCount && issue.confirmationCount > 0 ? (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-[10px] text-amber-500 font-extrabold shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>+{issue.confirmationCount} Co-reporter{issue.confirmationCount > 1 ? 's' : ''}</span>
                        </div>
                      ) : null}

                      {/* GPS coords indicator */}
                      {issue.location.lat && issue.location.lng && (
                        <span className="text-[9px] font-mono text-text-muted font-semibold bg-bg-card/50 border border-border-card/40 px-2 py-0.5 rounded-lg shadow-2xs">
                          📍 {issue.location.lat.toFixed(4)}°, {issue.location.lng.toFixed(4)}°
                        </span>
                      )}

                      {/* Action buttons group */}
                      <div className="flex flex-wrap items-center gap-2 max-w-full">
                        {/* Contact Authority Trigger Button */}
                        <button
                          onClick={() => {
                            if (expandedAuthorityId !== issue.id) {
                              setCcEmail("");
                              setBccEmail("");
                              setCopiedIssueId(null);
                            }
                            setExpandedAuthorityId(expandedAuthorityId === issue.id ? null : issue.id);
                          }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-extrabold px-3 py-1.5 rounded-xl border border-white/5 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Contact Authority</span>
                        </button>

                        {/* Confirm Issue Button - Visible to any signed-in user who hasn't already contributed */}
                        {currentUser && !isReporter && !isCoReporter && (
                          <button
                            onClick={() => {
                              setConfirmingIssueId(issue.id);
                              setConfirmationPhotoBase64(null);
                              setConfirmationNote("");
                            }}
                            className="text-[10px] bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-400 font-black px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-102"
                            title="Confirm that you are seeing this issue too at this location"
                            id={`confirm-too-btn-${issue.id}`}
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Happening here too</span>
                          </button>
                        )}

                        {currentUser && (isReporter || isCoReporter) && (
                          <div className="text-[10px] bg-emerald-500/10 text-emerald-400 font-black px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 cursor-default shadow-xs" title="You have already contributed to this report">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>My Contribution</span>
                          </div>
                        )}

                        {/* Detailed View and Community Proof button */}
                        <button
                          onClick={() => setDetailedIssueId(issue.id)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-extrabold px-3 py-1.5 rounded-xl border border-white/5 transition-all flex items-center gap-1 cursor-pointer"
                          id={`view-proof-btn-${issue.id}`}
                        >
                          <Users className="w-3.5 h-3.5 text-accent-teal shrink-0" />
                          <span>Community Proof ({issue.confirmationPhotos?.length || 0})</span>
                        </button>
                      </div>

                      {/* Status controller select panel */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-bg-card/45 p-1.5 rounded-xl border border-border-card/60 max-w-full">
                        {issue.isEscalated && (
                          <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 text-white border border-rose-600 uppercase tracking-widest animate-pulse flex items-center gap-1 shrink-0" title="Flagged as urgent by the Civic Review system">
                            ⚠️ Urgent
                          </span>
                        )}
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${statBadge}`}>
                          {issue.status}
                        </span>
                        {issue.confirmationCount && issue.confirmationCount > 0 ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-widest flex items-center gap-1 shrink-0" title="Confirmed by other residents">
                            👥 {issue.confirmationCount} {issue.confirmationCount === 1 ? 'confirmation' : 'confirmations'}
                          </span>
                        ) : null}
                        
                        {/* Only show status dropdown to admin (priyapanda959@gmail.com). Hide it completely for all other users. */}
                        {currentUser?.email === "priyapanda959@gmail.com" && (
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                            className={`bg-bg-card border border-border-card/80 text-text-primary text-[10px] font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-accent-teal transition-colors ${
                              issue.status === "Resolved" || issue.status === "Verified" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                            }`}
                            title={
                              issue.status === "Resolved"
                                ? "Awaiting community verification - admins cannot verify"
                                : issue.status === "Verified"
                                ? "Grievance fully verified and closed"
                                : "Change Report Status"
                            }
                            disabled={issue.status === "Resolved" || issue.status === "Verified"}
                          >
                            {issue.status === "Open" && (
                              <>
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                              </>
                            )}
                            {issue.status === "In Progress" && (
                              <>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                              </>
                            )}
                            {issue.status === "Resolved" && (
                              <option value="Resolved">Resolved</option>
                            )}
                            {issue.status === "Verified" && (
                              <option value="Verified">Verified</option>
                            )}
                          </select>
                        )}

                        {/* Delete button: only show if user is admin OR reporterEmail matches current user's email */}
                        {currentUser && (currentUser.email === "priyapanda959@gmail.com" || (currentUser.email && issue.reporterEmail === currentUser.email)) && (
                          <button
                            onClick={() => {
                              setModal({
                                isOpen: true,
                                title: "Confirm Delete",
                                message: "Are you sure you want to delete this civic report?",
                                type: "confirm",
                                onConfirm: () => handleDelete(issue.id)
                              });
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
                  disabled={isUploadingProof || isVerifyingResolution || !proofPhotoBase64}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isVerifyingResolution ? "Verifying with Gemini..." : isUploadingProof ? "Analyzing..." : "Confirm Resolution ✅"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Citizen Confirmation Form Dialog Popup */}
      {confirmingIssueId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161a23] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative" id="confirmation-upload-modal">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wide">
                  Confirm Issue & Upload Proof
                </h3>
              </div>
              <button
                onClick={() => {
                  setConfirmingIssueId(null);
                  setConfirmationPhotoBase64(null);
                  setConfirmationNote("");
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-black"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <p className="text-xs text-slate-300 leading-relaxed">
                Confirming this issue helps draw attention from ward officers and escalates priority. Please upload a photo as proof of what you're seeing at this location, and optionally add a short note.
              </p>

              {/* Upload Dropzone Box */}
              {!confirmationPhotoBase64 ? (
                <label className="border-2 border-dashed border-white/10 hover:border-amber-400/50 bg-black/25 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:bg-black/40">
                  <Upload className="w-8 h-8 text-slate-400 animate-bounce" />
                  <div className="text-center">
                    <span className="text-xs text-white font-extrabold">Upload Proof Photo</span>
                    <p className="text-[10px] text-slate-400 mt-1">JPEG/PNG high-quality compression up to 800px</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleConfirmationPhotoUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected Proof Preview</p>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-amber-500/30">
                    <img
                      src={confirmationPhotoBase64}
                      alt="Proof preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setConfirmationPhotoBase64(null)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white px-2 py-1 rounded-lg text-[10px] font-black transition-colors"
                      title="Remove Photo"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Short Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Add a Short Note (Optional)
                </label>
                <textarea
                  value={confirmationNote}
                  onChange={(e) => setConfirmationNote(e.target.value)}
                  placeholder="e.g., Still leaking water as of this morning, blocks traffic."
                  maxLength={180}
                  className="w-full bg-black/20 text-white rounded-xl border border-white/10 p-3 text-xs focus:outline-none focus:border-amber-500/50 placeholder-slate-500 resize-none h-20"
                />
              </div>

              {/* Action row */}
              <div className="pt-2 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingIssueId(null);
                    setConfirmationPhotoBase64(null);
                    setConfirmationNote("");
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitConfirmation}
                  disabled={isUploadingConfirmation || !confirmationPhotoBase64}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isUploadingConfirmation ? "Processing..." : "Submit Confirmation 👥"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View and Community Proof Gallery Modal */}
      {detailedIssueId && (() => {
        const issue = issues.find(i => i.id === detailedIssueId);
        if (!issue) return null;
        
        const categoryLabel = CATEGORY_LABELS[issue.category] || "Other";
        const hasPhotos = issue.confirmationPhotos && issue.confirmationPhotos.length > 0;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#161a23] border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-8" id="detailed-issue-modal">
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-teal" />
                  <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wide">
                    {categoryLabel} &bull; Community Verification
                  </h3>
                </div>
                <button
                  onClick={() => setDetailedIssueId(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-black"
                >
                  ✕ Close
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-left custom-scrollbar">
                
                {/* Main Issue Card Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="relative h-44 rounded-xl overflow-hidden mb-4 md:mb-0">
                    <img 
                      src={issue.photoUrl} 
                      alt="Original report" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-slate-950/80 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                        Original Report
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] uppercase font-black tracking-widest text-accent-teal">Address Location</span>
                      <h4 className="text-sm font-extrabold text-white mt-0.5">{issue.location.address}</h4>
                      <p className="text-xs text-slate-300 mt-2 font-medium line-clamp-3">"{issue.description}"</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400 font-bold">
                      <span>Reported: {formatDate(issue.timestamp)}</span>
                      <span className="text-amber-400">Severity: {issue.severity.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Confirmations Header & CTA Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wide">
                      Citizen Proof Gallery ({issue.confirmationPhotos?.length || 0})
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                      Verified photos and comments submitted by other residents seeing this issue
                    </p>
                  </div>
                  {currentUser && (
                    <button
                      onClick={() => {
                        setDetailedIssueId(null);
                        setConfirmingIssueId(issue.id);
                        setConfirmationPhotoBase64(null);
                        setConfirmationNote("");
                      }}
                      className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md self-start sm:self-center"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>Happening here too</span>
                    </button>
                  )}
                </div>

                {/* Gallery List */}
                {hasPhotos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {issue.confirmationPhotos?.map((proof, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black/15 border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between"
                      >
                        {/* Image Preview */}
                        <div className="relative h-40 bg-slate-900/40">
                          <img 
                            src={proof.url} 
                            alt={`Proof by ${proof.reporterName}`} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/75 backdrop-blur-xs p-1.5 rounded-lg border border-white/5 flex items-center gap-1.5">
                            {proof.reporterPhoto ? (
                              <img 
                                src={proof.reporterPhoto} 
                                alt={proof.reporterName} 
                                className="w-5 h-5 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-[8px] font-bold">
                                <User className="w-3 h-3" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[9px] text-white font-extrabold truncate leading-tight">
                                {proof.reporterName}
                              </p>
                              <p className="text-[7px] text-slate-400 leading-none font-bold">
                                {formatDate(proof.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Comment section */}
                        {proof.note ? (
                          <div className="p-3 bg-white/[0.02] border-t border-white/5 flex-grow">
                            <p className="text-[10px] text-slate-300 italic font-medium leading-relaxed">
                              "{proof.note}"
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/[0.01] border-t border-white/5 flex-grow flex items-center">
                            <p className="text-[9px] text-slate-500 italic font-semibold">
                              No written note provided.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-black/10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-slate-500 animate-pulse" />
                    <p className="text-xs text-slate-400 font-extrabold">No Citizen Proof Logged Yet</p>
                    <p className="text-[10px] text-slate-500 font-semibold max-w-xs leading-relaxed">
                      Be the first to confirm this report! Your proof photos help authorities identify and prioritize active concerns.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom dialog modal replacement for window.alert/window.confirm */}
      {modal.isOpen && (() => {
        const currentTheme = theme || document.documentElement.getAttribute("data-theme") || "light";
        
        // Colors mapping
        let cardBg = "bg-bg-card border border-border-card/60 backdrop-blur-md";
        let titleColor = "text-text-primary";
        let msgColor = "text-text-secondary";
        let cancelBtn = "bg-slate-200 text-text-secondary hover:text-text-primary border border-transparent";
        let confirmBtn = "bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent";

        if (currentTheme === "neon") {
          cardBg = "bg-black border-2 border-[#a3e635] shadow-[0_0_25px_rgba(163,230,53,0.3)]";
          titleColor = "text-[#a3e635]";
          msgColor = "text-white";
          cancelBtn = "bg-zinc-900 hover:bg-zinc-800 text-[#c084fc] border border-purple-500/40";
          confirmBtn = "bg-[#a3e635] hover:bg-[#bef264] text-black";
        } else if (currentTheme === "dark") {
          cardBg = "bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80";
          titleColor = "text-white";
          msgColor = "text-slate-200";
          cancelBtn = "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600";
          confirmBtn = "bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent";
        } else {
          // light theme
          cardBg = "bg-white border border-slate-200 shadow-2xl";
          titleColor = "text-slate-900";
          msgColor = "text-slate-700";
          cancelBtn = "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300";
          confirmBtn = "bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent";
        }

        // Special red/rose for delete action button if it's a delete/confirm modal
        const isDeleteAction = modal.title?.toLowerCase().includes("delete") || modal.message?.toLowerCase().includes("delete");
        if (isDeleteAction) {
          if (currentTheme === "neon") {
            confirmBtn = "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]";
          } else if (currentTheme === "dark") {
            confirmBtn = "bg-rose-600 hover:bg-rose-500 text-white";
          } else {
            confirmBtn = "bg-rose-600 hover:bg-rose-700 text-white";
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
            <div 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
            />
            <div className={`${cardBg} rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200`}>
              <div className="flex items-start gap-3">
                {modal.type === "confirm" && <AlertCircle className="w-5 h-5 text-accent-highlight shrink-0 mt-0.5" />}
                {modal.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                {modal.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                {modal.type === "info" && <Info className="w-5 h-5 text-accent-teal shrink-0 mt-0.5" />}
                
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
                {modal.type === "confirm" ? (
                  <>
                    <button
                      onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                      className={`px-4 py-2 ${cancelBtn} font-extrabold text-xs rounded-xl transition-colors cursor-pointer`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setModal(prev => ({ ...prev, isOpen: false }));
                        if (modal.onConfirm) modal.onConfirm();
                      }}
                      className={`px-4 py-2 ${confirmBtn} font-extrabold text-xs rounded-xl transition-colors cursor-pointer`}
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                    className={`px-4 py-2 ${confirmBtn} font-extrabold text-xs rounded-xl transition-colors cursor-pointer`}
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
