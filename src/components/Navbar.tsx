import React from "react";
import { CivicUser } from "../types";
import AuthSim from "./AuthSim";
import { useFirebase } from "../FirebaseContext";
import { 
  ShieldAlert, 
  PlusCircle, 
  Map, 
  List, 
  BarChart3, 
  Sun, 
  Moon, 
  Zap, 
  Bell, 
  CheckCheck, 
  Trash2, 
  MessageSquare, 
  Award,
  HelpCircle,
  X,
  BookOpen,
  Info,
  Globe,
  Menu,
  ChevronRight,
  Trophy,
  LogIn,
  LogOut,
  User,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../translations";

const settingsTranslations: Record<string, string> = {
  en: "Settings",
  hi: "सेटिंग्स",
  or: "ସେଟିଙ୍ଗସ",
  bn: "সেটিংস",
  ta: "அமைப்புகள்",
  te: "సెట్టింగులు",
  mr: "সেटिंग्ज",
  gu: "સેટિંગ્સ",
  pa: "ਸੈਟਿੰਗਾਂ",
  kn: "ಸಂಯೋಜನೆಗಳು",
  ml: "ക്രമീകരണങ്ങൾ"
};

interface NavbarProps {
  currentUser: CivicUser | null;
  onLogin: (user: CivicUser) => void;
  onLogout: () => void;
  activeTab: "browse" | "report" | "dashboard" | "map" | "my-reports" | "leaderboard" | "profile";
  setActiveTab: (tab: "browse" | "report" | "dashboard" | "map" | "my-reports" | "leaderboard" | "profile") => void;
  theme: "light" | "dark" | "neon";
  setTheme: (theme: "light" | "dark" | "neon") => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function Navbar({
  currentUser,
  onLogin,
  onLogout,
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  language,
  setLanguage,
}: NavbarProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications, loginWithGoogle } = useFirebase();

  const handleMobileGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (onLogin) onLogin(user);
      setShowMobileMenu(false);
    } catch (err) {
      console.error("Error signing in with Google from mobile menu:", err);
    }
  };

  const handleMobileSignOut = async () => {
    try {
      if (onLogout) onLogout();
      setShowMobileMenu(false);
    } catch (err) {
      console.error("Error signing out from mobile menu:", err);
    }
  };
  const [showNotifDropdown, setShowNotifDropdown] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const isAdmin = currentUser?.email === "priyapanda959@gmail.com";
  const t = translations[language];

  return (
    <header className="sticky top-0 xl:fixed xl:top-0 xl:left-0 xl:right-0 xl:w-full z-50 bg-nav-bg text-white shadow-lg border-b border-white/5 px-4 md:px-6 transition-colors duration-300" id="app-navbar">
      <div className="max-w-6xl xl:max-w-7xl mx-auto flex items-center justify-between h-16 w-full gap-2">
        {/* Brand Logo */}
        <div
          onClick={() => {
            setActiveTab("browse");
            setShowMobileMenu(false);
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group animate-fade-in"
          id="brand-logo"
        >
          <div className="w-9 h-9 bg-accent-highlight rounded-xl flex items-center justify-center font-bold text-slate-950 shadow-md transition-transform duration-200 group-hover:scale-105">
            <ShieldAlert className="w-5.5 h-5.5 shrink-0 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-display font-black tracking-tight leading-none text-white">
              Community<span className="text-accent-highlight">Hero</span>
            </h1>
            <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5 leading-none">
              Bharat Civic Hub
            </p>
          </div>
        </div>

        {/* Navigation Tabs - Desktop */}
        <nav className="hidden xl:flex items-center gap-0.5 xl:gap-1" id="desktop-navigation">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "browse"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <List className="w-4 h-4 shrink-0" />
            <span>{t.navBrowse}</span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "map"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <Map className="w-4 h-4 shrink-0" />
            <span>{t.navMap}</span>
          </button>

          {!isAdmin && (
            <button
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
                activeTab === "report"
                  ? "bg-white/15 text-white border border-white/10 shadow-inner"
                  : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{t.navReport}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "dashboard"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>{t.navDashboard}</span>
          </button>

          <button
            onClick={() => setActiveTab("my-reports")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "my-reports"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <Award className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{t.navMyReports}</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "leaderboard"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{t.navLeaderboard}</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1 px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "profile"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
            id="desktop-nav-profile"
          >
            <Settings className="w-4 h-4 shrink-0 text-accent-teal" />
            <span>{settingsTranslations[language] || "Settings"}</span>
          </button>
        </nav>

        {/* Right side Actions: Theme Switcher, Notifications, Help & Auth */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Notification Bell (Visible on both Mobile & Desktop) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/10 text-white transition-all cursor-pointer hover:scale-105 duration-200"
              title="In-App Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 rounded-full text-[9px] font-black flex items-center justify-center text-white border border-slate-900 animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifDropdown(false)}
                />
                <div className="absolute right-0 mt-2.5 w-76 sm:w-80 md:w-96 bg-[#161a23] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all text-left">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h3 className="font-display font-bold text-xs text-white uppercase tracking-wide">
                        Civic Notifications
                      </h3>
                      {unreadNotifCount > 0 && (
                        <span className="bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadNotifCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          clearAllNotifications();
                          setShowNotifDropdown(false);
                        }}
                        className="text-[10px] font-extrabold text-rose-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5 bg-[#121620]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold">All caught up!</p>
                        <p className="text-[10px] mt-1 opacity-80">You will receive notifications here when your reported issues get updated.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-white/[0.02] ${
                            !notif.read ? "bg-amber-400/5 border-l-2 border-amber-400" : "opacity-85"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium leading-relaxed break-words">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] text-slate-400 font-bold">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[9px] bg-teal-500/10 text-teal-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                {notif.status}
                              </span>
                            </div>
                          </div>
                          {!notif.read && (
                            <button
                              onClick={() => markNotificationAsRead(notif.id)}
                              className="p-1 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors self-center cursor-pointer"
                              title="Mark as read"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Always Visible Auth / Profile simulation */}
          <div className="flex items-center" id="navbar-auth-container-always">
            <AuthSim 
              currentUser={currentUser} 
              onLogin={onLogin} 
              onLogout={onLogout} 
              onNavigateToProfile={() => setActiveTab("profile")}
            />
          </div>

          {/* Desktop-Only Action Container */}
          <div className="hidden xl:flex items-center gap-1.5 xl:gap-2">
            {/* Help / How It Works Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 rounded-lg bg-black/25 hover:bg-black/40 border border-white/10 text-white transition-all cursor-pointer hover:scale-105 duration-200 flex items-center justify-center animate-pulse hover:animate-none"
              title="How It Works / Help Guide"
              id="help-guide-button"
            >
              <HelpCircle className="w-4 h-4 text-amber-300" />
            </button>
          </div>

          {/* Mobile Hamburger Menu Icon */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="xl:hidden p-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/10 text-white transition-all cursor-pointer flex items-center justify-center hover:scale-105"
            title="Toggle Menu"
            id="mobile-menu-hamburger"
          >
            {showMobileMenu ? <X className="w-4.5 h-4.5 text-accent-highlight" /> : <Menu className="w-4.5 h-4.5 text-white" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Floating Panel Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Semi-transparent backdrop that does NOT block scroll/is fully click-dismissable */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="xl:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 pointer-events-auto"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Floating Menu Card Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="xl:hidden fixed top-20 right-4 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] bg-[#161a23]/95 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-white backdrop-blur-md"
              id="mobile-drawer"
            >
              {/* Header with Title and clearly visible close button - Fixed at top */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-white/10 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-accent-highlight">Citizen Menu</span>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-white/15 text-white transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                  title="Close Menu"
                  id="mobile-menu-close-btn"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Scrollable Container inside Drawer */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {/* Help Button */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowHelpModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 text-xs font-bold transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-300" />
                    <span>{t.helpTitle}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </button>

                {/* User Login/Auth */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-black uppercase text-white/50 tracking-wider">Citizen Profile</span>
                    <AuthSim 
                      currentUser={currentUser} 
                      onLogin={(user) => {
                        onLogin(user);
                        setShowMobileMenu(false);
                      }} 
                      onLogout={() => {
                        onLogout();
                        setShowMobileMenu(false);
                      }} 
                      onNavigateToProfile={() => {
                        setActiveTab("profile");
                        setShowMobileMenu(false);
                      }}
                    />
                  </div>

                  {currentUser ? (
                    <>
                      {/* Dedicated Profile Card inside Menu */}
                      <div className="p-3.5 rounded-xl bg-black/25 border border-white/5 flex items-center gap-3">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt={currentUser.displayName}
                            className="w-10 h-10 rounded-full border border-white/20 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent-highlight text-white flex items-center justify-center font-bold text-sm">
                            {currentUser.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white truncate max-w-[120px]">{currentUser.displayName}</span>
                            {currentUser.email === "priyapanda959@gmail.com" && (
                              <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/60 truncate mt-0.5">{currentUser.email}</p>
                        </div>
                      </div>

                      {/* Clearly visible Settings button */}
                      <button
                        onClick={() => {
                          setActiveTab("profile");
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-accent-teal/10 hover:bg-accent-teal hover:text-text-on-accent border border-accent-teal/30 text-accent-teal font-extrabold text-xs py-2 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md"
                        id="mobile-menu-profile-btn"
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span>{settingsTranslations[language] || "Settings"}</span>
                      </button>

                      {/* Clearly visible Sign Out button */}
                      <button
                        onClick={handleMobileSignOut}
                        className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md"
                        id="mobile-menu-signout-btn"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Clearly visible Settings button even for unauthenticated users */}
                      <button
                        onClick={() => {
                          setActiveTab("profile");
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-accent-teal/10 hover:bg-accent-teal hover:text-text-on-accent border border-accent-teal/30 text-accent-teal font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md"
                        id="mobile-menu-profile-unauth-btn"
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span>{settingsTranslations[language] || "Settings"}</span>
                      </button>

                      {/* Clearly visible Sign In with Google button */}
                      <button
                        onClick={handleMobileGoogleLogin}
                        className="w-full flex items-center justify-center gap-2.5 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer active:scale-95 shadow-md hover:shadow-[0_0_15px_var(--glow)]"
                        id="mobile-menu-signin-google-btn"
                      >
                        <LogIn className="w-3.5 h-3.5 shrink-0" />
                        <span>Sign In with Google</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Static Help / How it works modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto text-text-primary"
            onClick={() => setShowHelpModal(false)}
            id="help-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-bg-card border border-border-card rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowHelpModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/10 hover:bg-black/20 border border-border-card text-text-primary hover:text-rose-400 transition-all cursor-pointer flex items-center justify-center"
                title="Close Guide"
                id="close-help-modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6 border-b border-border-card/50 pb-4">
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-display font-black text-lg text-text-primary tracking-tight">
                    {t.helpTitle}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {t.helpSub}
                  </p>
                </div>
              </div>

              {/* Scrollable contents */}
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-left">
                {/* Step 1: Reporting */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-accent-teal tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-teal/10 text-accent-teal text-[10px] font-black">1</span>
                    {t.helpStep1Title}
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>{t.helpStep1_1}</li>
                    <li>{t.helpStep1_2}</li>
                    <li>{t.helpStep1_3}</li>
                  </ol>
                </div>

                {/* Step 2: Duplicate detection */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-black">2</span>
                    {t.helpStep2Title}
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>{t.helpStep2_1}</li>
                    <li>{t.helpStep2_2}</li>
                  </ol>
                </div>

                {/* Step 3: Upvote / Confirm */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-teal-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-400/10 text-teal-400 text-[10px] font-black">3</span>
                    {t.helpStep3Title}
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>{t.helpStep3_1}</li>
                    <li>{t.helpStep3_2}</li>
                    <li>{t.helpStep3_3}</li>
                  </ol>
                </div>

                {/* Step 4: Status progression */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-rose-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-400/10 text-rose-400 text-[10px] font-black">4</span>
                    {t.helpStep4Title}
                  </h4>
                  <ul className="text-xs text-text-secondary space-y-2 pl-1 font-semibold">
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase shrink-0">{t.helpStep4Open}</span>
                      <span>{t.helpStep4OpenDesc}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase shrink-0">{t.helpStep4Progress}</span>
                      <span>{t.helpStep4ProgressDesc}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/15 text-teal-400 border border-teal-500/25 uppercase shrink-0">{t.helpStep4Resolved}</span>
                      <span>{t.helpStep4ResolvedDesc}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase shrink-0">{t.helpStep4Verified}</span>
                      <span>{t.helpStep4VerifiedDesc}</span>
                    </li>
                  </ul>
                </div>

                {/* Step 5: Map & My Reports */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-purple-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-400/10 text-purple-400 text-[10px] font-black">5</span>
                    {t.helpStep5Title}
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>{t.helpStep5_1}</li>
                    <li>{t.helpStep5_2}</li>
                    <li>{t.helpStep5_3}</li>
                  </ol>
                </div>

                {/* Step 6: Civic Contribution Score */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-black">6</span>
                    Civic Contribution Score
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>Earn <strong className="text-emerald-400">10 points</strong> for reporting a new civic issue.</li>
                    <li>Earn <strong className="text-emerald-400">15 bonus points</strong> when your reported issue gets confirmed by others.</li>
                    <li>Earn <strong className="text-emerald-400">7 points</strong> for confirming an existing issue reported by another neighbor.</li>
                    <li>Earn <strong className="text-emerald-400">25 bonus points</strong> when an issue you reported or confirmed reaches Resolved.</li>
                    <li>Earn <strong className="text-emerald-400">10 additional points</strong> when the resolved issue is officially Verified.</li>
                  </ol>
                </div>

                {/* Step 7: Citizen Badges & Ranks */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-rose-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-400/10 text-rose-400 text-[10px] font-black">7</span>
                    Citizen Badges & Ranks
                  </h4>
                  <p className="text-xs text-text-secondary pl-1 font-semibold">
                    Submit civic reports to unlock prestigious neighborhood titles:
                  </p>
                  <ul className="text-xs text-text-secondary space-y-2 pl-1 font-semibold">
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase shrink-0">Community Observer</span>
                      <span>Earned automatically after submitting <strong className="text-rose-400">1 report</strong>. Represents your vigilance.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/15 text-teal-400 border border-teal-500/25 uppercase shrink-0">Community Guardian</span>
                      <span>Earned after submitting <strong className="text-teal-400">5 reports</strong>. Represents active neighborhood protection.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase shrink-0">Civic Champion</span>
                      <span>Earned after submitting <strong className="text-amber-400">10 reports</strong>. The ultimate vanguard of local change.</span>
                    </li>
                  </ul>
                </div>

                {/* Step 8: Downloadable Certificate */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-400/10 text-cyan-400 text-[10px] font-black">8</span>
                    Personalized Civic Certificate
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>Submit at least 1 report to unlock your certificate under the My Reports / Honors tab.</li>
                    <li>Click the <strong className="text-cyan-400">Compile Civic Certificate</strong> button to have Gemini generate a formal, personalized citation recognizing your efforts.</li>
                    <li>Download or print your certificate directly as a high-quality PDF to showcase your community contributions!</li>
                  </ol>
                </div>

                {/* Step 9: Leaderboard & Rankings */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-black">9</span>
                    Leaderboard & Rankings
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1.5 pl-1 font-semibold">
                    <li>The community leaderboard ranks citizens in descending order of their total Civic Contribution Score.</li>
                    <li>The more issues you report, confirm, and help resolve, the higher your score and community ranking will climb.</li>
                  </ol>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border-card/50 flex items-center justify-between text-[11px] text-text-muted font-semibold">
                <span className="flex items-center gap-1 text-left max-w-[70%]">
                  <Info className="w-3.5 h-3.5 text-accent-teal shrink-0" />
                  {t.helpFooterDisclaimer}
                </span>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-bold rounded-xl shadow-md transition-all cursor-pointer transform active:scale-98"
                >
                  {t.gotIt}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
