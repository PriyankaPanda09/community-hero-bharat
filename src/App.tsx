import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CivicUser, CivicIssue, IssueStatus } from "./types";
import Navbar from "./components/Navbar";
import BrowseIssues from "./components/BrowseIssues";
import ReportIssueForm from "./components/ReportIssueForm";
import Dashboard from "./components/Dashboard";
import MapView from "./components/MapView";
import MyReports from "./components/MyReports";
import Leaderboard from "./components/Leaderboard";
import ProfileSettings from "./components/ProfileSettings";
import LandingPage from "./components/LandingPage";
import { Heart, Shield, Landmark, Map, List, PlusCircle, BarChart3, ChevronRight, LogIn, AlertCircle, Sparkles, WifiOff, Award, Trophy, X } from "lucide-react";
import { useFirebase } from "./FirebaseContext";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "./translations";

// Background blobs for theme-aware ambient depth
export function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" id="ambient-background-blobs">
      {/* Blob 1 */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[15%] left-[5%] w-72 h-72 rounded-full bg-accent-teal/6 blur-[90px] md:blur-[120px]"
      />
      {/* Blob 2 */}
      <motion.div
        animate={{
          x: [0, -30, 40, 0],
          y: [0, 50, -50, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[45%] right-[8%] w-80 h-80 rounded-full bg-accent-highlight/6 blur-[90px] md:blur-[120px]"
      />
      {/* Blob 3 */}
      <motion.div
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[15%] left-[20%] w-64 h-64 rounded-full bg-accent-teal/4 blur-[100px] md:blur-[130px]"
      />
    </div>
  );
}

// Flat vector-style premium community illustration featuring active citizen characters helping each other
export function CommunityIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full object-contain drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background soft concentric radar lines */}
      <circle cx="160" cy="120" r="100" stroke="var(--text-primary)" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="160" cy="120" r="75" stroke="var(--text-primary)" strokeOpacity="0.06" strokeWidth="1.5" />
      <circle cx="160" cy="120" r="50" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="2" />

      {/* Silhouettes of houses/buildings in the background */}
      <rect x="25" y="150" width="55" height="65" rx="3" fill="var(--text-primary)" fillOpacity="0.03" stroke="var(--text-primary)" strokeOpacity="0.08" strokeWidth="1.2" />
      <polygon points="20,150 52.5,125 85,150" fill="var(--text-primary)" fillOpacity="0.06" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="1.2" />
      
      <rect x="245" y="140" width="50" height="75" rx="3" fill="var(--text-primary)" fillOpacity="0.03" stroke="var(--text-primary)" strokeOpacity="0.08" strokeWidth="1.2" />
      <polygon points="240,140 270,115 300,140" fill="var(--text-primary)" fillOpacity="0.06" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="1.2" />

      {/* Main Ground/Pathway line */}
      <path d="M 15 215 L 305 215" stroke="var(--text-primary)" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d="M 20 215 L 300 215" stroke="var(--accent-highlight)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 4" />

      {/* Streetlight pole */}
      <path d="M 215 215 L 215 95 Q 215 75 235 75" stroke="var(--text-primary)" strokeOpacity="0.3" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M 230 75 L 246 75 L 241 86 L 227 86 Z" fill="var(--accent-teal)" stroke="var(--text-primary)" strokeOpacity="0.15" strokeWidth="1" />
      {/* Spotlight glow beam */}
      <polygon points="228,86 240,86 270,215 180,215" fill="var(--accent-teal)" fillOpacity="0.12" style={{ mixBlendMode: "screen" }} />
      <circle cx="234" cy="86" r="5" fill="var(--accent-highlight)" className="animate-pulse" />

      {/* Character 1: Citizens cleaning up street (Left side, bending/sweeping) */}
      <g id="char-sweeping">
        {/* Head */}
        <circle cx="75" cy="158" r="7" fill="var(--text-secondary)" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Torso/Shirt */}
        <path d="M 72 165 C 64 170 60 182 64 195 L 76 191 C 77 182 76 170 76 165 Z" fill="var(--accent-teal)" />
        {/* Legs/Pants */}
        <path d="M 64 195 L 66 215 M 73 191 L 76 213" stroke="var(--text-secondary)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Broom handle */}
        <line x1="55" y1="168" x2="84" y2="215" stroke="var(--accent-highlight)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Broom brush */}
        <path d="M 79 211 L 89 217 L 85 221 L 75 215 Z" fill="var(--accent-highlight)" />
      </g>

      {/* Character 2: Citizen reporting issue with smartphone (Center-Right, pointing/recording) */}
      <g id="char-reporting">
        {/* Head */}
        <circle cx="150" cy="135" r="7.5" fill="var(--text-secondary)" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Torso/Shirt */}
        <path d="M 144 142.5 C 144 142.5 140 160 145 178 L 158 178 C 162 160 158 142.5 158 142.5 Z" fill="var(--accent-highlight)" />
        {/* Legs/Pants */}
        <path d="M 147 178 L 147 215 M 155 178 L 155 215" stroke="var(--text-secondary)" strokeWidth="4" strokeLinecap="round" />
        {/* Arms holding phone */}
        <path d="M 145 148 Q 133 151 137 161" stroke="var(--text-secondary)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <rect x="132" y="158" width="5.5" height="10.5" rx="1" fill="var(--text-primary)" transform="rotate(12 132 158)" />
        {/* Camera vision cone / light ray pointing at pothole */}
        <polygon points="133,163 105,215 120,215" fill="var(--accent-highlight)" fillOpacity="0.22" />
        
        {/* Other arm resting on hip */}
        <path d="M 157 148 Q 164 151 161 162" stroke="var(--text-secondary)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      </g>

      {/* Character 3: Citizen fixing/pointing to streetlight (Far Right) */}
      <g id="char-pointing">
        {/* Head */}
        <circle cx="195" cy="150" r="7" fill="var(--text-secondary)" stroke="var(--text-primary)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Torso/Shirt */}
        <path d="M 190 157 C 195 161 195 185 195 185 L 203 185 C 203 161 198 157 198 157 Z" fill="var(--accent-teal)" />
        {/* Legs/Pants */}
        <path d="M 193 185 L 193 215 M 201 185 L 201 215" stroke="var(--text-secondary)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Arm reaching upwards towards the lamp */}
        <path d="M 198 160 Q 212 142 221 126" stroke="var(--text-secondary)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      </g>

      {/* Miniature Tree and foliage */}
      <circle cx="102" cy="198" r="11" fill="var(--accent-teal)" fillOpacity="0.1" stroke="var(--accent-teal)" strokeOpacity="0.3" strokeWidth="1.2" />
      <line x1="102" y1="204" x2="102" y2="215" stroke="var(--accent-teal)" strokeOpacity="0.4" strokeWidth="1.2" />

      {/* Clean sparkles of community happiness */}
      <path d="M 115 110 L 117 114 L 121 115 L 117 116 L 115 120 L 113 116 L 109 115 L 113 114 Z" fill="var(--accent-highlight)" className="animate-pulse" />
      <path d="M 180 120 L 181 123 L 185 124 L 181 125 L 180 128 L 179 125 L 175 124 L 179 123 Z" fill="var(--accent-teal)" className="animate-pulse" />
    </svg>
  );
}

export default function App() {
  const { 
    currentUser, 
    issues, 
    loadingIssues: loading, 
    logout, 
    updateIssueStatus,
    deleteIssue,
    loginCustom
  } = useFirebase();

  const getTabFromPath = (pathname: string): "browse" | "report" | "dashboard" | "map" | "my-reports" | "leaderboard" | "profile" => {
    const path = pathname.replace(/^\//, "");
    const validTabs: Array<"browse" | "report" | "dashboard" | "map" | "my-reports" | "leaderboard" | "profile"> = [
      "browse",
      "report",
      "dashboard",
      "map",
      "my-reports",
      "leaderboard",
      "profile"
    ];
    if (validTabs.includes(path as any)) {
      return path as any;
    }
    return "browse";
  };

  const [activeTab, setActiveTab] = useState<"browse" | "report" | "dashboard" | "map" | "my-reports" | "leaderboard" | "profile">(() => {
    return getTabFromPath(window.location.pathname);
  });
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [initialFilterUnseen, setInitialFilterUnseen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [adminRedirectMessage, setAdminRedirectMessage] = useState<string | null>(null);
  const isAdmin = currentUser?.email === "priyapanda959@gmail.com";

  useEffect(() => {
    if (isAdmin && activeTab === "report") {
      setAdminRedirectMessage("Administrators manage and resolve civic reports, but cannot submit them, to keep verification fair and independent.");
      setActiveTab("browse");
    }
  }, [isAdmin, activeTab]);

  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update current URL route to match activeTab naturally
  useEffect(() => {
    if (hasEnteredApp) {
      const currentTab = getTabFromPath(window.location.pathname);
      if (currentTab !== activeTab) {
        window.history.pushState(null, "", "/" + activeTab);
      }
    } else {
      if (window.location.pathname !== "/") {
        window.history.pushState(null, "", "/");
      }
    }
  }, [activeTab, hasEnteredApp]);

  // Handle browser back/forward buttons (popstate events)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Track user login state transition to force landing page first on successful sign-in
  const prevUserRef = React.useRef<any>(null);
  useEffect(() => {
    if (currentUser && !prevUserRef.current) {
      // Transitioned from logged-out to logged-in (successful sign-in!)
      setHasEnteredApp(false);
    }
    prevUserRef.current = currentUser;
  }, [currentUser]);

  // When a new user signs in, reset filters, search, and selected highlight states
  useEffect(() => {
    setHighlightedIssueId(null);
    setInitialFilterUnseen(false);
    setAdminRedirectMessage(null);
  }, [currentUser?.email]);

  // Language state: en (English), hi (Hindi), or (Odia)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("community_hero_lang");
    if (saved === "en" || saved === "hi" || saved === "or") {
      return saved;
    }
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("community_hero_lang", language);
  }, [language]);

  // Theme state: light, dark, neon
  const [theme, setTheme] = useState<"light" | "dark" | "neon">(() => {
    const saved = localStorage.getItem("community_hero_theme");
    if (saved === "light" || saved === "dark" || saved === "neon") {
      return saved;
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("community_hero_theme", theme);
  }, [theme]);

  const handleLogin = (user: CivicUser) => {
    // Google Auth updates state automatically within the Firebase context
    console.log("Successfully authenticated user:", user.displayName);
  };

  const handleLogout = async () => {
    await logout();
    setHasEnteredApp(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: IssueStatus) => {
    try {
      await updateIssueStatus(id, newStatus);
      setError(null);
    } catch (err: any) {
      console.error("Error updating issue status:", err);
      setError("Failed to update status. Check security permissions.");
    }
  };

  const handleDeleteIssue = async (id: string) => {
    try {
      await deleteIssue(id);
      setError(null);
    } catch (err: any) {
      console.error("Error deleting issue:", err);
      setError("Failed to delete issue. Check security permissions.");
    }
  };

  if (!hasEnteredApp) {
    return (
      <LandingPage
        onEnterApp={(targetTab) => {
          setHasEnteredApp(true);
          if (targetTab) {
            setActiveTab(targetTab);
          }
        }}
        issuesCount={issues.length}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-text-primary transition-colors duration-300 relative overflow-x-hidden xl:pt-16" id="community-hero-app">
      {/* Background blobs for theme-aware ambient depth */}
      <BackgroundBlobs />

      {/* Brand Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Animated Gradient Hero Banner */}
      <AnimatePresence mode="wait">
        {(activeTab === "browse" || activeTab === "map") && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="hero-gradient-animated text-white relative overflow-hidden py-14 px-6 md:px-12 text-center md:text-left border-b border-white/10"
            id="hero-banner"
          >
            {/* Soft Ambient Radial Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
            
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-12 relative z-10">
              <div className="space-y-3 md:space-y-2 lg:space-y-4 max-w-2xl text-center md:text-left flex flex-col items-center md:items-start w-full lg:max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/20 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Empowering Local Change</span>
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight">
                  Clean Up, Light Up, <br className="block md:hidden lg:block" />
                  <span className="text-amber-300">Unite Bharat</span>
                </h2>
                <p className="text-sm md:text-base text-teal-50/90 leading-relaxed max-w-lg md:max-w-2xl lg:max-w-md font-medium">
                  Report potholes, dark streetlights, water leaks, or piling garbage instantly. Our visual AI inspects reports in real-time, matching resources for city officers to dispatch.
                </p>
              </div>

              {/* Group of Illustration and Stats - Row on sm and up, column below */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 w-full lg:w-auto shrink-0">
                {/* Animated Community Illustration - Visible and fully responsive across all screen sizes */}
                <div className="flex items-center justify-center w-full max-w-[240px] sm:max-w-[280px] aspect-[4/3] h-44 sm:h-52 bg-white/5 border border-white/10 p-4 rounded-3xl shadow-xl backdrop-blur-md shrink-0">
                  <CommunityIllustration />
                </div>

                {/* Stat Counters Overlay Card */}
                <div className="glass-panel p-6 bg-white/10 border-white/10 text-white flex flex-col items-center justify-center min-w-[240px] sm:min-w-[260px] max-w-[280px] w-full shadow-2xl backdrop-blur-md shrink-0">
                  <span className="text-xs uppercase tracking-widest text-teal-100 font-bold mb-1">Active Community Hub</span>
                  <div className="text-4xl font-display font-black text-amber-300">
                    {issues.length}
                  </div>
                  <p className="text-[11px] text-teal-100/80 font-semibold mt-1">Verified local civic reports</p>
                  {!isAdmin && (
                    <button
                      onClick={() => setActiveTab("report")}
                      className="mt-4 w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-teal-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 transform hover:-translate-y-0.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Report An Issue Now</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container with Glassmorphism frosted panels wrapper */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 pb-24 xl:pb-8">
        <AnimatePresence>
          {adminRedirectMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 shadow-lg relative overflow-hidden"
              id="admin-redirect-banner"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse" />
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm pr-6 leading-relaxed">
                <span className="font-extrabold uppercase tracking-wide text-amber-400 block mb-0.5 text-[10px]">Administrative Access Only</span>
                {adminRedirectMessage}
              </div>
              <button
                onClick={() => setAdminRedirectMessage(null)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" id="global-loading">
            <div className="w-12 h-12 rounded-full border-4 border-accent-teal border-t-transparent animate-spin mb-4"></div>
            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest animate-pulse">Synchronizing Community Hub...</p>
          </div>
        ) : error ? (
          <div className="glass-panel p-8 max-w-md mx-auto text-center my-10 border-rose-500/30" id="global-error">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
            <h3 className="font-display font-bold text-rose-500 text-lg">Connection Disturbed</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 cursor-pointer"
            >
              Retry Database Connection
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              id="active-tab-container"
              className="glass-panel p-4 sm:p-6 lg:p-8 shadow-2xl"
            >
              {activeTab === "browse" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <BrowseIssues
                    issues={issues}
                    currentUser={currentUser}
                    onUpdateStatus={handleUpdateStatus}
                    onDeleteIssue={handleDeleteIssue}
                    highlightedIssueId={highlightedIssueId}
                    onClearHighlight={() => setHighlightedIssueId(null)}
                    initialFilterUnseen={initialFilterUnseen}
                    onClearUnseenFilter={() => setInitialFilterUnseen(false)}
                    onNavigateToReport={isAdmin ? undefined : () => setActiveTab("report")}
                    language={language}
                    theme={theme}
                  />
                </div>
              )}

              {activeTab === "map" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <MapView
                    issues={issues}
                    onSelectIssue={(issueId) => {
                      setHighlightedIssueId(issueId);
                      setActiveTab("browse");
                    }}
                  />
                </div>
              )}

              {activeTab === "report" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <ReportIssueForm
                    currentUser={currentUser}
                    language={language}
                    onSuccessSubmit={async () => {
                      setActiveTab("browse");
                    }}
                    openLoginModal={() => {
                      const authBtn = document.getElementById("auth-login-button");
                      if (authBtn) {
                        authBtn.click();
                      }
                    }}
                  />
                </div>
              )}

              {activeTab === "dashboard" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <Dashboard 
                    issues={issues} 
                    language={language}
                    onViewUnseenOnly={() => {
                      setInitialFilterUnseen(true);
                      setActiveTab("browse");
                    }}
                  />
                </div>
              )}

              {activeTab === "my-reports" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <MyReports
                    issues={issues}
                    currentUser={currentUser}
                    onNavigateToReport={isAdmin ? undefined : () => setActiveTab("report")}
                    onNavigateToBrowse={() => setActiveTab("browse")}
                    openLoginModal={() => {
                      const authBtn = document.getElementById("auth-login-button");
                      if (authBtn) {
                        authBtn.click();
                      }
                    }}
                    language={language}
                    theme={theme}
                  />
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <Leaderboard
                    issues={issues}
                    currentUser={currentUser}
                    language={language}
                    onNavigateToReport={isAdmin ? undefined : () => setActiveTab("report")}
                  />
                </div>
              )}

              {activeTab === "profile" && (
                <div key={currentUser?.email || "anonymous"} className="contents">
                  <ProfileSettings
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    setTheme={setTheme}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Portaled layout helpers directly under body to guarantee visibility & avoid transform/clipping bugs */}
      {isMounted && createPortal(
        <>
          {/* Floating Action Button (FAB) for Instant Reporting Access */}
          {activeTab !== "report" && !isAdmin && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("report")}
              className="fab-pulse fixed bottom-20 right-6 xl:bottom-8 xl:right-8 z-[99999] bg-gradient-to-r from-accent-teal to-accent-teal-hover text-text-on-accent w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:shadow-[0_0_20px_var(--glow)] transition-all cursor-pointer"
              title="Report Civic Issue"
              id="global-fab-report"
            >
              <PlusCircle className="w-7 h-7" />
            </motion.button>
          )}

          {/* Mobile Sticky Tab bar for perfect tactile phone access */}
          <div className="xl:hidden fixed bottom-0 inset-x-0 z-[99999] bg-bg-card border-t border-border-card shadow-lg px-6 py-2 flex items-center justify-around" id="mobile-navigation">
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === "browse" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <List className="w-5.5 h-5.5" />
              <span className="text-[10px] tracking-tight">{translations[language].navBrowse.split(" ")[0]}</span>
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === "map" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Map className="w-5.5 h-5.5" />
              <span className="text-[10px] tracking-tight">{translations[language].navMap.split(" ")[0]}</span>
            </button>

            {!isAdmin && (
              <button
                onClick={() => setActiveTab("report")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  activeTab === "report" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <PlusCircle className="w-5.5 h-5.5" />
                <span className="text-[10px] tracking-tight">{translations[language].navReport.split(" ")[0]}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === "dashboard" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <BarChart3 className="w-5.5 h-5.5" />
              <span className="text-[10px] tracking-tight">{translations[language].navDashboard}</span>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === "leaderboard" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Trophy className="w-5.5 h-5.5 text-amber-400" />
              <span className="text-[10px] tracking-tight">{translations[language].navLeaderboard}</span>
            </button>

            <button
              onClick={() => setActiveTab("my-reports")}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === "my-reports" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Award className="w-5.5 h-5.5" />
              <span className="text-[10px] tracking-tight">{translations[language].navMyReports}</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Footer */}
      <footer className="bg-bg-card text-text-muted text-xs pt-10 pb-28 xl:py-10 border-t border-border-card text-center select-none mt-auto" id="app-footer">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-text-primary">
            <Shield className="w-4.5 h-4.5 text-accent-teal" />
            <span className="font-display font-bold text-sm tracking-tight">CommunityHero Hub</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-xs">
            Connecting citizens and municipal officers to build Bharat together. Fully secured via local storage.
          </p>
          <div className="pt-2 text-[10px] text-text-muted/60 flex items-center justify-center gap-1">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current animate-pulse" />
            <span>by Local Citizens of Bharat</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
