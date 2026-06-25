import React, { useState, useEffect } from "react";
import { CivicUser, CivicIssue, IssueStatus } from "./types";
import Navbar from "./components/Navbar";
import BrowseIssues from "./components/BrowseIssues";
import ReportIssueForm from "./components/ReportIssueForm";
import Dashboard from "./components/Dashboard";
import MapView from "./components/MapView";
import { Heart, Shield, Landmark, Map, List, PlusCircle, BarChart3, ChevronRight, LogIn, AlertCircle, Sparkles, WifiOff } from "lucide-react";
import { useFirebase } from "./FirebaseContext";
import { motion, AnimatePresence } from "motion/react";

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

  const [activeTab, setActiveTab] = useState<"browse" | "report" | "dashboard" | "map">("browse");
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-text-primary transition-colors duration-300" id="community-hero-app">
      {/* Brand Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        setTheme={setTheme}
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
            
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/20 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Empowering Local Change</span>
                </span>
                <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight leading-tight">
                  Clean Up, Light Up, <br />
                  <span className="text-amber-300">Unite Bharat</span>
                </h2>
                <p className="text-sm md:text-base text-teal-50/90 leading-relaxed max-w-lg font-medium">
                  Report potholes, dark streetlights, water leaks, or piling garbage instantly. Our visual AI inspects reports in real-time, matching resources for city officers to dispatch.
                </p>
              </div>

              {/* Stat Counters Overlay Card */}
              <div className="glass-panel p-6 bg-white/10 border-white/10 text-white flex flex-col items-center justify-center min-w-[240px] shadow-2xl backdrop-blur-md">
                <span className="text-xs uppercase tracking-widest text-teal-100 font-bold mb-1">Active Community Hub</span>
                <div className="text-4xl font-display font-black text-amber-300">
                  {issues.length}
                </div>
                <p className="text-[11px] text-teal-100/80 font-semibold mt-1">Verified local civic reports</p>
                <button
                  onClick={() => setActiveTab("report")}
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-teal-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 transform hover:-translate-y-0.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Report An Issue Now</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container with Glassmorphism frosted panels wrapper */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8">
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
              className="mt-5 bg-accent-teal hover:bg-accent-teal-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 cursor-pointer"
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
                <BrowseIssues
                  issues={issues}
                  currentUser={currentUser}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteIssue={handleDeleteIssue}
                  highlightedIssueId={highlightedIssueId}
                  onClearHighlight={() => setHighlightedIssueId(null)}
                />
              )}

              {activeTab === "map" && (
                <MapView
                  issues={issues}
                  onSelectIssue={(issueId) => {
                    setHighlightedIssueId(issueId);
                    setActiveTab("browse");
                  }}
                />
              )}

              {activeTab === "report" && (
                <ReportIssueForm
                  currentUser={currentUser}
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
              )}

              {activeTab === "dashboard" && <Dashboard issues={issues} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating Action Button (FAB) for Instant Reporting Access */}
      {activeTab !== "report" && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab("report")}
          className="fab-pulse fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 bg-gradient-to-r from-accent-teal to-accent-teal-hover text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:shadow-[0_0_20px_var(--glow)] transition-all cursor-pointer"
          title="Report Civic Issue"
          id="global-fab-report"
        >
          <PlusCircle className="w-7 h-7" />
        </motion.button>
      )}

      {/* Mobile Sticky Tab bar for perfect tactile phone access */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-card border-t border-border-card shadow-lg px-6 py-2 flex items-center justify-around" id="mobile-navigation">
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            activeTab === "browse" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <List className="w-5.5 h-5.5" />
          <span className="text-[10px] tracking-tight">Browse</span>
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            activeTab === "map" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Map className="w-5.5 h-5.5" />
          <span className="text-[10px] tracking-tight">Map</span>
        </button>

        <button
          onClick={() => setActiveTab("report")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            activeTab === "report" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <PlusCircle className="w-5.5 h-5.5" />
          <span className="text-[10px] tracking-tight">Report</span>
        </button>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            activeTab === "dashboard" ? "text-accent-teal font-bold" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <BarChart3 className="w-5.5 h-5.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-bg-card text-text-muted text-xs py-10 border-t border-border-card text-center select-none mt-auto" id="app-footer">
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
