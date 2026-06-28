import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CommunityIllustration } from "../App";
import { Sparkles, MapPin, CheckCircle, Users, ArrowRight, ArrowDown, LogIn, Award, Sun, Moon, Zap } from "lucide-react";
import { Language, translations } from "../translations";
import AuthSim from "./AuthSim";

interface LandingPageProps {
  onEnterApp: (targetTab?: "browse" | "report" | "profile") => void;
  issuesCount: number;
  theme: "light" | "dark" | "neon";
  setTheme: (theme: "light" | "dark" | "neon") => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: any;
  onLogin: (user: any) => void;
  onLogout: () => void;
}

// Custom Self-Contained Count-Up Animation
export function AnimatedCounter({ value, duration = 1800 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 16);
    
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

export default function LandingPage({
  onEnterApp,
  issuesCount,
  theme,
  setTheme,
  language,
  setLanguage,
  currentUser,
  onLogin,
  onLogout,
}: LandingPageProps) {
  const isAdmin = currentUser?.email === "priyapanda959@gmail.com";
  const [scrollY, setScrollY] = useState(0);
  const t = translations[language] || translations["en"];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme-specific background and accent styles
  const isNeon = theme === "neon";
  const isDark = theme === "dark";

  // Framer Motion staggered heading animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-x-hidden" id="cinematic-landing-root">
      
      {/* Cinematic Top Navigation Overlay */}
      <nav className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 bg-accent-highlight rounded-lg flex items-center justify-center font-bold text-slate-950 shadow-md">
            <span className="text-white text-base">🇮🇳</span>
          </div>
          <div>
            <span className="text-base font-display font-black tracking-tight text-text-primary">
              Community<span className="text-accent-highlight">Hero</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={() => {
              if (theme === "light") {
                setTheme("dark");
              } else if (theme === "dark") {
                setTheme("neon");
              } else {
                setTheme("light");
              }
            }}
            className="flex items-center justify-center p-2 rounded-lg bg-bg-card/60 backdrop-blur-md border border-border-card/50 text-text-primary hover:bg-bg-card hover:border-accent-teal/50 transition-all cursor-pointer"
            title={`Switch Theme (Current: ${theme})`}
            id="landing-theme-toggle"
          >
            {theme === "light" && <Sun className="w-4.5 h-4.5 text-amber-500" />}
            {theme === "dark" && <Moon className="w-4.5 h-4.5 text-rose-500" />}
            {theme === "neon" && <Zap className="w-4.5 h-4.5 text-lime-400" />}
          </button>

          {/* Always Visible Auth / Profile simulation */}
          <div className="flex items-center" id="landing-auth-container">
            <AuthSim 
              currentUser={currentUser} 
              onLogin={onLogin} 
              onLogout={onLogout} 
              onNavigateToProfile={() => onEnterApp("profile")}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex flex-col justify-center items-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Cinematic Background elements with parallax */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Ambient Glows */}
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-teal/5 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] rounded-full bg-accent-highlight/4 blur-[140px] mix-blend-screen" />
          
          {/* Parallaxing Decorative Grid dots */}
          <div 
            className="absolute inset-0 bg-[radial-gradient(var(--border-card)_1px,transparent_1px)] [background-size:24px_24px] opacity-15"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          />

          {/* Drifting enlarged vector illustration background */}
          <div 
            className="absolute right-[-10%] top-[15%] w-[80%] md:w-[50%] max-w-[800px] aspect-square opacity-10 md:opacity-20"
            style={{ 
              transform: `translateY(${scrollY * 0.18}px) rotate(${scrollY * 0.02}deg) scale(1.1)`,
            }}
          >
            <CommunityIllustration />
          </div>
          
          {/* Parallaxing geometric elements */}
          <motion.div 
            animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[10%] top-[30%] w-12 h-12 rounded-2xl border border-accent-teal/20 backdrop-blur-xs flex items-center justify-center opacity-30"
            style={{ transform: `translateY(${scrollY * -0.05}px)` }}
          >
            <Sparkles className="w-6 h-6 text-accent-teal" />
          </motion.div>
          
          <motion.div 
            animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-[15%] bottom-[25%] w-16 h-16 rounded-full border border-accent-highlight/25 backdrop-blur-xs flex items-center justify-center opacity-30"
            style={{ transform: `translateY(${scrollY * -0.12}px)` }}
          >
            <MapPin className="w-8 h-8 text-accent-highlight" />
          </motion.div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Block - Text Content */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6"
          >
            <motion.span 
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent-teal/10 border border-accent-teal/25 text-accent-teal shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Bharat Civic Hub Initiative</span>
            </motion.span>

            {/* Cinematic Large Heading */}
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight leading-[1.05] text-text-primary"
            >
              Clean Up, <br />
              Light Up, <br />
              <span className="bg-gradient-to-r from-accent-highlight to-amber-500 bg-clip-text text-transparent">
                Unite Bharat
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-sm sm:text-base text-text-secondary max-w-lg leading-relaxed font-medium"
            >
              Report neighborhood garbage, non-functional streetlights, water leaks, or broken paths. Empowered by visual AI confirmation and citizen collaboration to build clean, safe, and proud smart-communities across Bharat.
            </motion.p>

            {/* Launch Buttons with smooth interactive scaling */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4"
            >
              <button
                onClick={() => onEnterApp("browse")}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-accent-teal to-accent-teal-hover hover:from-accent-teal-hover hover:to-accent-teal text-text-on-accent font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:shadow-[0_0_25px_var(--glow)] transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer active:scale-95"
              >
                <span>Launch Civic Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!isAdmin && (
                <button
                  onClick={() => onEnterApp("report")}
                  className="w-full sm:w-auto px-8 py-4 bg-bg-card border border-border-card hover:bg-bg-card/80 text-text-primary font-extrabold text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer active:scale-95"
                >
                  <span>Report Local Issue</span>
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* Right Block - Enlarged Main Illustration Layer */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 hidden lg:flex justify-center items-center relative"
          >
            {/* Smooth floating container wrapper */}
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full max-w-[450px] aspect-[4/3] bg-bg-card/40 border border-border-card/60 rounded-[36px] p-6 shadow-2xl backdrop-blur-md"
              style={{ transform: `translateY(${scrollY * -0.04}px)` }}
            >
              <div className="absolute inset-0 bg-radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.04),transparent_70%) pointer-events-none rounded-[36px]" />
              <CommunityIllustration />
              
              {/* Dynamic Overlay tags to simulate active ecosystem */}
              <div className="absolute -top-4 -left-4 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Verified Clean-ups</span>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-accent-highlight text-slate-950 font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>2,400+ Citizens Joined</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Smooth Scroll Indicator */}
        <div className="absolute bottom-6 flex flex-col items-center gap-1 text-text-muted opacity-80 hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-black uppercase tracking-widest">Scroll To Explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown className="w-4 h-4 text-accent-teal" />
          </motion.div>
        </div>
      </section>

      {/* Cinematic Stats Section with Smooth Reveal */}
      <section className="relative w-full py-20 px-6 max-w-7xl mx-auto z-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Card 1 - Animated Reports Counter */}
          <div className="glass-panel p-8 bg-bg-card/50 border-border-card/50 rounded-3xl flex flex-col items-center text-center shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-teal/5 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-accent-teal mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-black mb-1">
              Active Community Hub
            </span>
            <div className="text-5xl font-display font-black text-accent-teal tracking-tight mb-2">
              <AnimatedCounter value={issuesCount || 12} />
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
              Verified civic reports pending or actively resolved by city officers and volunteers.
            </p>
          </div>

          {/* Card 2 - Citizens Contribution */}
          <div className="glass-panel p-8 bg-bg-card/50 border-border-card/50 rounded-3xl flex flex-col items-center text-center shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-highlight/5 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-accent-highlight/10 border border-accent-highlight/20 flex items-center justify-center text-accent-highlight mb-4">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-black mb-1">
              Neighbor Multiplier
            </span>
            <div className="text-5xl font-display font-black text-accent-highlight tracking-tight mb-2">
              <AnimatedCounter value={247} />
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
              Active local co-reporters validating problems and boosting civic priorities on the map.
            </p>
          </div>

          {/* Card 3 - Municipal Success */}
          <div className="glass-panel p-8 bg-bg-card/50 border-border-card/50 rounded-3xl flex flex-col items-center text-center shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-black mb-1">
              Resolved & Verified
            </span>
            <div className="text-5xl font-display font-black text-emerald-400 tracking-tight mb-2">
              <AnimatedCounter value={94} />%
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
              On-ground issues successfully addressed and confirmed by actual neighborhood validators.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Cinematic Feature/Process Scroll Reveal Section */}
      <section className="relative w-full py-16 px-6 max-w-7xl mx-auto z-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[9px] font-black uppercase tracking-widest text-accent-teal px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/25">
            Ecosystem Overview
          </span>
          <h2 className="text-3xl font-display font-black tracking-tight text-text-primary mt-3">
            Building Proud Communities
          </h2>
          <p className="text-xs text-text-secondary mt-2 max-w-md mx-auto">
            Our technology connects active citizens directly with municipal action and local peer validation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feature 1 - Clean Up */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group glass-panel p-8 bg-bg-card/40 hover:bg-bg-card/60 border-border-card/40 hover:border-border-card/80 transition-all rounded-3xl shadow-lg flex flex-col space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 font-extrabold text-xs">
              01
            </div>
            <h3 className="text-lg font-display font-black tracking-wide text-text-primary uppercase">
              Clean Up Waste
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Snap high-quality pictures of garbage piles or illegal dumps. Our smart system coordinates reports automatically so sanitation teams can sweep the streets.
            </p>
          </motion.div>

          {/* Feature 2 - Light Up */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group glass-panel p-8 bg-bg-card/40 hover:bg-bg-card/60 border-border-card/40 hover:border-border-card/80 transition-all rounded-3xl shadow-lg flex flex-col space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 font-extrabold text-xs">
              02
            </div>
            <h3 className="text-lg font-display font-black tracking-wide text-text-primary uppercase">
              Light Up Dark Corners
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Map non-functioning streetlights or dark zones instantly. Boosting priorities alerts energy departments to keep sidewalks safe and brightly lit.
            </p>
          </motion.div>

          {/* Feature 3 - Unite Bharat */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group glass-panel p-8 bg-bg-card/40 hover:bg-bg-card/60 border-border-card/40 hover:border-border-card/80 transition-all rounded-3xl shadow-lg flex flex-col space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 font-extrabold text-xs">
              03
            </div>
            <h3 className="text-lg font-display font-black tracking-wide text-text-primary uppercase">
              Unite & Validate
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Prevent duplicate work! Upvote neighbor issues as a Co-Reporter. Verify completed actions in real-time to earn premium Civic Contribution points.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cinematic Call-To-Action (CTA) Banner with reveal */}
      <section className="relative w-full py-20 px-6 max-w-5xl mx-auto z-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 45 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative bg-gradient-to-r from-accent-teal/15 to-accent-highlight/10 border border-accent-teal/20 backdrop-blur-md rounded-[32px] p-8 md:p-14 overflow-hidden shadow-2xl"
        >
          {/* Background circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-teal/5 rounded-full blur-[80px]" />
          
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-highlight flex items-center justify-center gap-1">
              <Award className="w-4 h-4" />
              <span>Earn Honors & Badges</span>
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight text-text-primary uppercase">
              Ready to Shape Your Neighborhood?
            </h2>
            <p className="text-xs md:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
              Step inside the portal. Report problems, confirm issues reported by others, earn honors, and lead the community to progress.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onEnterApp("browse")}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-accent-highlight to-amber-500 hover:from-amber-500 hover:to-accent-highlight text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Launch Community Hub
              </button>
              {!isAdmin && (
                <button
                  onClick={() => onEnterApp("report")}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  File Quick Report
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Landing Footer */}
      <footer className="mt-auto py-10 border-t border-border-card/30 text-center text-[10px] text-text-muted tracking-wide max-w-7xl mx-auto w-full px-6">
        <p>© 2026 Bharat Civic Hub Initiative. Connected & Secured.</p>
      </footer>
    </div>
  );
}
