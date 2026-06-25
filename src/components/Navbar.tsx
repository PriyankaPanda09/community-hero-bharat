import React from "react";
import { CivicUser } from "../types";
import AuthSim from "./AuthSim";
import { useFirebase } from "../FirebaseContext";
import { ShieldAlert, PlusCircle, Map, List, BarChart3, Sun, Moon, Zap, Bell, CheckCheck, Trash2, MessageSquare } from "lucide-react";

interface NavbarProps {
  currentUser: CivicUser | null;
  onLogin: (user: CivicUser) => void;
  onLogout: () => void;
  activeTab: "browse" | "report" | "dashboard" | "map";
  setActiveTab: (tab: "browse" | "report" | "dashboard" | "map") => void;
  theme: "light" | "dark" | "neon";
  setTheme: (theme: "light" | "dark" | "neon") => void;
}

export default function Navbar({
  currentUser,
  onLogin,
  onLogout,
  activeTab,
  setActiveTab,
  theme,
  setTheme,
}: NavbarProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications } = useFirebase();
  const [showNotifDropdown, setShowNotifDropdown] = React.useState(false);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-nav-bg text-white shadow-lg border-b border-white/5 px-4 md:px-6 transition-colors duration-300" id="app-navbar">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab("browse")}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          id="brand-logo"
        >
          <div className="w-9 h-9 bg-accent-highlight rounded-xl flex items-center justify-center font-bold text-slate-950 shadow-md transition-transform duration-200 group-hover:scale-105">
            <ShieldAlert className="w-5.5 h-5.5 shrink-0 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-display font-black tracking-tight leading-none text-white">
              Community<span className="text-accent-highlight">Hero</span>
            </h1>
            <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5 leading-none">
              Bharat Civic Hub
            </p>
          </div>
        </div>

        {/* Navigation Tabs - Desktop */}
        <nav className="hidden md:flex items-center gap-1.5" id="desktop-navigation">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "browse"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <List className="w-4 h-4 shrink-0" />
            <span>Browse Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "map"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <Map className="w-4 h-4 shrink-0" />
            <span>Map View</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "report"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Report Issue</span>
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer transform hover:scale-102 duration-200 ${
              activeTab === "dashboard"
                ? "bg-white/15 text-white border border-white/10 shadow-inner"
                : "text-white/80 hover:text-white hover:bg-white/5 opacity-90"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>
        </nav>

        {/* Right side Actions: Theme Switcher & Auth */}
        <div className="flex items-center gap-4">
          {/* Notification Bell Dropdown */}
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
                <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-[#161a23] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all text-left">
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

          {/* Advanced Mode Switcher Pill */}
          <div className="flex items-center gap-0.5 bg-black/25 p-0.5 rounded-xl border border-white/10 shadow-inner" id="theme-pill-selector">
            <button
              onClick={() => setTheme("light")}
              className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "bg-white text-teal-900 scale-105 shadow-md"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Light Mode (☀️)"
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                theme === "dark"
                  ? "bg-rose-500 text-white scale-105 shadow-md"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Dark Mode (🌙)"
            >
              <Moon className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              onClick={() => setTheme("neon")}
              className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                theme === "neon"
                  ? "bg-lime-400 text-black scale-105 shadow-md"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Neon Cyber (⚡)"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          {/* Auth Simulation / Firebase Login */}
          <div className="flex items-center gap-2" id="navbar-auth-container">
            <AuthSim currentUser={currentUser} onLogin={onLogin} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
