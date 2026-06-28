import React, { useState, useEffect } from "react";
import { useFirebase } from "../FirebaseContext";
import { motion } from "motion/react";
import { 
  User, 
  Mail, 
  Shield, 
  Check, 
  AlertCircle, 
  Camera, 
  Loader2, 
  Award, 
  FileText, 
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Sun,
  Moon,
  Zap,
  LogOut
} from "lucide-react";
import { auth } from "../firebase";
import { EmailAuthProvider, linkWithCredential, updatePassword } from "firebase/auth";
import { translations, Language } from "../translations";

const settingsTranslations: Record<string, string> = {
  en: "Settings",
  hi: "सेटिंग्स",
  or: "ସେଟିଙ୍ଗସ",
  bn: "সেটিংস",
  ta: "அமைப்புகள்",
  te: "సెట్టింగులు",
  mr: "সেटिंग्ज",
  gu: "સેટिंग્સ",
  pa: "ਸੈਟਿੰਗਾਂ",
  kn: "ಸಂಯೋಜನೆಗಳು",
  ml: "ക്രമീകരണങ്ങൾ"
};

interface ProfileSettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: "light" | "dark" | "neon";
  setTheme: (theme: "light" | "dark" | "neon") => void;
}

export default function ProfileSettings({ 
  language, 
  setLanguage, 
  theme, 
  setTheme 
}: ProfileSettingsProps) {
  const { currentUser, updateUserProfile, updateProfilePhoto, issues, logout } = useFirebase();
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Password settings state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || "");
      setErrorMsg("");
      setSuccessMsg("");

      // Check if user has password provider linked
      if (auth.currentUser) {
        const hasPwd = auth.currentUser.providerData.some(
          (p) => p.providerId === "password"
        );
        setHasPasswordProvider(hasPwd);
      }
    }
  }, [currentUser]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!password) {
      setPwdError("Password cannot be empty.");
      return;
    }

    if (password.length < 6) {
      setPwdError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setPwdError("You must be logged in to change your password.");
      return;
    }

    setIsUpdatingPwd(true);

    try {
      if (hasPasswordProvider) {
        // Change password flow
        await updatePassword(firebaseUser, password);
        setPwdSuccess("Your password has been successfully updated!");
      } else {
        // Link password flow (Google-only user setting their first password)
        if (!firebaseUser.email) {
          throw new Error("No email associated with this account.");
        }
        const credential = EmailAuthProvider.credential(firebaseUser.email, password);
        await linkWithCredential(firebaseUser, credential);
        setPwdSuccess("Password set successfully! Your account is now linked with email/password sign-in.");
        setHasPasswordProvider(true);
      }
      setPassword("");
      setConfirmPassword("");
      setShowPwd(false);
      setShowConfirmPwd(false);
      
      // Auto clear success message after 5 seconds
      setTimeout(() => setPwdSuccess(""), 5000);
    } catch (err: any) {
      console.warn("Password change / link error:", err);
      if (err.code === "auth/requires-recent-login") {
        setPwdError("For security reasons, this action requires a recent sign-in. Please sign out and sign in again before updating your password.");
      } else {
        setPwdError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  // Calculate user contributions dynamically
  const userReports = currentUser ? issues.filter(
    (issue) => issue.reporterId === currentUser.uid || issue.reporterEmail === currentUser.email
  ) : [];
  
  const userConfirmations = currentUser ? issues.filter((issue) => 
    issue.coReporters?.some((r) => r.uid === currentUser.uid || r.email === currentUser.email)
  ) : [];

  const resolvedReports = userReports.filter(
    (issue) => issue.status === "Resolved" || issue.status === "Verified"
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await updateUserProfile(displayName);
      setSuccessMsg("Your display name has been successfully updated!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Selected image is too large. Please select an image smaller than 2MB.");
      return;
    }

    setIsSavingPhoto(true);
    setErrorMsg("");
    setSuccessMsg("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await updateProfilePhoto(base64);
        setSuccessMsg("Profile avatar updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update profile photo.");
      } finally {
        setIsSavingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="profile-settings-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#1e2330]/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-text-primary uppercase tracking-wider">
            {settingsTranslations[language] || "Settings"}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {currentUser 
              ? "Manage your credentials, preferences, theme, and track your neighborhood impact."
              : "Customize your language, interface theme, and general preferences."}
          </p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-teal/10 border border-accent-teal/20 rounded-xl text-accent-teal text-xs font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Verified Account</span>
          </div>
        )}
      </div>

      {/* Preferences Card: Theme & Language (Always Visible, Grouped Together!) */}
      <div className="bg-bg-card border border-border-card rounded-3xl p-6 sm:p-8 card-shadow-glow" id="preferences-settings-card">
        <h2 className="text-base font-black text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent-teal" />
          <span>App Preferences</span>
        </h2>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed font-medium">
          Choose your interface theme and translation language. These apply across the entire application instantly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Selector */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
              Interface Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  theme === "light"
                    ? "bg-white text-teal-950 border-white shadow-lg scale-[1.02]"
                    : "bg-bg-card/40 hover:bg-[#1e2330]/30 text-text-secondary hover:text-text-primary border-border-card"
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  theme === "dark"
                    ? "bg-rose-500 text-white border-rose-500 shadow-lg scale-[1.02]"
                    : "bg-bg-card/40 hover:bg-[#1e2330]/30 text-text-secondary hover:text-text-primary border-border-card"
                }`}
              >
                <Moon className="w-4 h-4 shrink-0" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme("neon")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  theme === "neon"
                    ? "bg-lime-400 text-black border-lime-400 shadow-lg scale-[1.02]"
                    : "bg-bg-card/40 hover:bg-[#1e2330]/30 text-text-secondary hover:text-text-primary border-border-card"
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Neon</span>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
              App Language / भाषा
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full pl-10 pr-4 py-3 bg-[#1e2330]/40 text-text-primary border border-border-card rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-accent-teal transition-colors cursor-pointer appearance-none"
              >
                <option value="en">English (US)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="or">ଓଡ଼ିଆ (Odia)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
              </select>
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-accent-teal" />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {!currentUser ? (
        /* If NOT signed in: Show login prompt card */
        <div className="bg-bg-card border border-border-card/60 p-8 sm:p-12 rounded-3xl text-center card-shadow-glow" id="settings-unauth-container">
          <div className="w-16 h-16 bg-accent-highlight/10 text-accent-highlight rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider mb-3">
            Sign In Required for Account Settings
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-sm mx-auto mb-8 leading-relaxed">
            Please sign in to access your custom profile settings, set/change password, customize your display name, and track your civic contributions.
          </p>
          <button
            onClick={() => {
              const authBtn = document.getElementById("auth-login-button");
              if (authBtn) {
                authBtn.click();
              }
            }}
            className="px-6 py-3 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            id="settings-login-trigger"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        /* If signed in: Show profile details & password setting grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Stats Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-bg-card border border-border-card rounded-3xl p-6 text-center card-shadow-glow flex flex-col items-center">
            <div className="relative group mb-5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-24 h-24 rounded-full border-4 border-accent-teal/30 object-cover shadow-xl transition-all duration-300"
                  id="settings-avatar-img"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-accent-highlight text-text-on-highlight flex items-center justify-center font-bold text-4xl border-4 border-accent-teal/30 shadow-xl" id="settings-avatar-initials">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <button
                onClick={() => document.getElementById("profile-upload-file")?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent transition-all duration-200 cursor-pointer shadow-lg active:scale-90"
                disabled={isSavingPhoto}
                title="Upload custom profile photo"
                id="settings-avatar-upload-btn"
              >
                {isSavingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                id="profile-upload-file"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <h3 className="text-base font-black text-text-primary uppercase tracking-wide truncate max-w-full leading-none">
              {currentUser.displayName}
            </h3>
            <p className="text-xs text-text-muted mt-1.5 truncate max-w-full font-medium">
              {currentUser.email}
            </p>

            <div className="w-full border-t border-border-card/40 my-5" />

            {/* Micro Stats inside Card */}
            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-bg-card/50 border border-border-card/30 p-3 rounded-2xl text-center">
                <FileText className="w-4 h-4 text-accent-highlight mx-auto mb-1.5" />
                <span className="block text-lg font-black text-text-primary leading-none">
                  {userReports.length}
                </span>
                <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-1 block">
                  Reports
                </span>
              </div>
              <div className="bg-bg-card/50 border border-border-card/30 p-3 rounded-2xl text-center">
                <Award className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
                <span className="block text-lg font-black text-text-primary leading-none">
                  {resolvedReports.length}
                </span>
                <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-1 block">
                  Resolved
                </span>
              </div>
            </div>

            <div className="w-full border-t border-border-card/40 my-4" />

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 text-rose-400 font-extrabold text-xs py-3 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-md"
              id="settings-signout-btn"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out Account</span>
            </button>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-bg-card/40 border border-border-card/40 rounded-3xl p-5 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              Profile Notice
            </span>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Updating your display name will immediately update all of your previous and existing civic complaints, co-reports, and leaderboard entries across our real-time database.
            </p>
          </div>
        </div>

        {/* Right Column: Profile Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-border-card rounded-3xl p-6 sm:p-8 card-shadow-glow">
            <h2 className="text-base font-black text-text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
              <User className="w-4 h-4 text-accent-teal" />
              <span>Personal Credentials</span>
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-6" id="profile-edit-form">
              {/* Notification Toasts/Alerts inside form */}
              {errorMsg && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed" id="profile-edit-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-bounce" id="profile-edit-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Read-Only Email field */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                  Registered Email Address <span className="text-[9px] text-text-muted/60 font-medium lowercase italic">(read-only)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-bg-card/40 text-text-muted border border-border-card/30 rounded-xl text-xs sm:text-sm font-semibold select-none opacity-70 cursor-not-allowed"
                    id="profile-email-read-only"
                  />
                </div>
              </div>

              {/* Editable Display Name field */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                  Custom Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name..."
                    maxLength={50}
                    className="w-full pl-10 pr-4 py-3 bg-[#1e2330]/40 text-text-primary border border-border-card rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-accent-teal transition-colors"
                    id="profile-name-editable"
                    required
                  />
                </div>
                <p className="text-[10px] text-text-muted font-medium italic">
                  This name will be displayed on your reports, leaderboards, and comments. It does not need to match your Google account name.
                </p>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t border-border-card/30 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || !displayName.trim() || displayName.trim() === currentUser.displayName}
                  className="px-6 py-3 bg-accent-teal hover:bg-accent-teal-hover disabled:opacity-40 disabled:hover:bg-accent-teal text-text-on-accent text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  id="profile-save-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Set / Change Password Card */}
          <div className="bg-bg-card border border-border-card rounded-3xl p-6 sm:p-8 card-shadow-glow" id="profile-password-card">
            <h2 className="text-base font-black text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent-teal" />
              <span>{hasPasswordProvider ? "Change Password" : "Set Account Password"}</span>
            </h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed font-medium">
              {hasPasswordProvider 
                ? "Your account is linked with both Google and email/password login. You can change your password below."
                : "Your account currently uses Google Sign-In only. Set a password below to link email/password login to this same account."}
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-5" id="profile-password-form">
              {pwdError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed" id="profile-password-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed" id="profile-password-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-4 pr-10 py-3 bg-[#1e2330]/40 text-text-primary border border-border-card rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-accent-teal transition-colors"
                      id="profile-new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-4 pr-10 py-3 bg-[#1e2330]/40 text-text-primary border border-border-card rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-accent-teal transition-colors"
                      id="profile-confirm-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border-card/30 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPwd || !password || !confirmPassword}
                  className="px-6 py-3 bg-accent-teal hover:bg-accent-teal-hover disabled:opacity-40 disabled:hover:bg-accent-teal text-text-on-accent text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  id="profile-submit-pwd-btn"
                >
                  {isUpdatingPwd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{hasPasswordProvider ? "Updating Password..." : "Linking Password..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{hasPasswordProvider ? "Update Password" : "Set Password & Link"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
