import React, { useState } from "react";
import { CivicUser } from "../types";
import { 
  LogIn, 
  Shield, 
  X, 
  Camera, 
  Mail, 
  Lock, 
  User, 
  KeyRound, 
  Info, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../FirebaseContext";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile 
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

interface AuthSimProps {
  onLogin: (user: CivicUser) => void;
  currentUser: CivicUser | null;
  onLogout: () => void;
}

type AuthMode = "signin" | "register" | "forgot_password";

export default function AuthSim({ onLogin, currentUser, onLogout }: AuthSimProps) {
  const { loginWithGoogle, updateProfilePhoto } = useFirebase();
  const [showModal, setShowModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Auth Form states
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");

  // Helper to map Firebase Auth error codes to friendly messages
  const getReadableAuthError = (err: any): string => {
    const code = err?.code || "";
    switch (code) {
      case "auth/invalid-email":
        return "The email address is badly formatted.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account exists with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please verify and try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak. It must be at least 6 characters.";
      case "auth/missing-password":
        return "Please fill in the password field.";
      case "auth/invalid-credential":
        return "Incorrect email or password. Please verify your credentials.";
      default:
        return err?.message || "An unexpected error occurred during authentication.";
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setAuthFeedback("");
      const user = await loginWithGoogle();
      if (onLogin) onLogin(user);
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      setError(getReadableAuthError(err));
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthFeedback("");

    // Simple validations
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "signin") {
        if (!password) {
          setError("Please enter your password.");
          setSubmitting(false);
          return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const civicUser: CivicUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Citizen Hero",
          email: fbUser.email || "",
          photoURL: fbUser.photoURL || "",
        };

        if (onLogin) onLogin(civicUser);
        setShowModal(false);

      } else if (mode === "register") {
        if (!name.trim()) {
          setError("Please enter your full name.");
          setSubmitting(false);
          return;
        }
        if (!password) {
          setError("Please enter a password.");
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setSubmitting(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        // Update auth profile
        await updateProfile(fbUser, { displayName: name });

        // Save metadata schema in users Firestore collection
        await setDoc(doc(db, "users", fbUser.uid), {
          displayName: name,
          email: email,
          photoURL: "",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const civicUser: CivicUser = {
          uid: fbUser.uid,
          displayName: name,
          email: fbUser.email || "",
          photoURL: "",
        };

        if (onLogin) onLogin(civicUser);
        setAuthFeedback("Registration successful! Welcome to Citizen Hub.");
        setTimeout(() => setShowModal(false), 1500);

      } else if (mode === "forgot_password") {
        await sendPasswordResetEmail(auth, email);
        setAuthFeedback("A password reset link has been sent to your email!");
        // Back to login after a short delay
        setTimeout(() => setMode("signin"), 3500);
      }

    } catch (err: any) {
      console.error(err);
      setError(getReadableAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError("");

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setError("Could not create drawing canvas.");
            setUploadingPhoto(false);
            return;
          }

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const base64Photo = canvas.toDataURL("image/jpeg", 0.85);
          
          await updateProfilePhoto(base64Photo);
          setUploadingPhoto(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError("Failed to compress or save custom profile picture.");
      setUploadingPhoto(false);
    }
  };

  const resetFormState = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setAuthFeedback("");
    setPassword("");
    setConfirmPassword("");
    // keep email filled in for convenience if switching to reset
  };

  return (
    <div className="relative inline-block text-left" id="auth-simulator-root">
      {currentUser ? (
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/15 active:bg-white/20 duration-150 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-md cursor-pointer"
            id="auth-profile-pill"
          >
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-7 h-7 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
                id="user-profile-avatar"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent-highlight text-white flex items-center justify-center font-bold text-xs" id="user-profile-avatar-initials">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-white font-extrabold leading-none">{currentUser.displayName}</p>
                {currentUser.email === "priyapanda959@gmail.com" && (
                  <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wide leading-none" id="admin-badge">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[9px] text-white/70 leading-none mt-1 truncate max-w-[110px]">
                {currentUser.email}
              </p>
            </div>
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setProfileMenuOpen(false)} 
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-2.5 w-64 bg-bg-card border border-border-card text-text-primary rounded-2xl shadow-2xl p-4.5 z-50 space-y-4 backdrop-blur-md"
                  id="auth-profile-dropdown"
                >
                  <div className="flex flex-col items-center text-center pb-3 border-b border-border-card/40">
                    <div className="relative group mb-2.5">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName}
                          className="w-16 h-16 rounded-full border-2 border-accent-teal object-cover shadow-lg"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-accent-highlight text-white flex items-center justify-center font-bold text-2xl border-2 border-accent-teal shadow-lg">
                          {currentUser.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wide leading-none flex items-center gap-1.5 justify-center">
                      <span>{currentUser.displayName}</span>
                      {currentUser.email === "priyapanda959@gmail.com" && (
                        <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </h4>
                    <p className="text-[9px] text-text-muted mt-1 truncate max-w-full font-medium">
                      {currentUser.email}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => document.getElementById("profile-photo-input")?.click()}
                      className="w-full flex items-center justify-center gap-2 bg-accent-teal hover:bg-accent-teal-hover disabled:bg-accent-teal/40 text-white text-[11px] font-extrabold py-2.5 px-3 rounded-xl cursor-pointer transition-all shadow-md transform hover:-translate-y-0.5"
                      disabled={uploadingPhoto}
                      id="change-photo-btn"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{uploadingPhoto ? "Saving Photo..." : "Change Photo"}</span>
                    </button>
                    <input
                      id="profile-photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>

                  {error && (
                    <p className="text-[10px] text-rose-500 font-bold text-center leading-relaxed">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-rose-500 hover:text-white hover:bg-rose-500/10 py-2.5 rounded-xl transition-all cursor-pointer border border-rose-500/20"
                    id="auth-logout-button-dropdown"
                  >
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button
          onClick={() => {
            resetFormState("signin");
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 bg-accent-highlight hover:bg-accent-highlight-hover text-white font-bold text-xs px-4 py-2 rounded-xl transition-all duration-200 shadow-md cursor-pointer transform hover:-translate-y-0.5"
          id="auth-login-button"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="glass-panel p-0 bg-bg-card/95 border border-border-card text-text-primary rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
              id="auth-modal"
            >
              {/* Header banner */}
              <div className="hero-gradient-animated text-white p-6 relative flex flex-col justify-between shrink-0">
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xl font-display font-black leading-none flex items-center gap-1.5">
                    <Shield className="w-5.5 h-5.5" />
                    <span>Citizen Hub Portal</span>
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider cursor-pointer border border-white/10"
                    id="close-skip-btn"
                  >
                    <span>Skip</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-teal-50 text-xs mt-3 font-medium leading-relaxed">
                  Join community action and report municipal concerns seamlessly with local authentication.
                </p>
              </div>

              {/* Body form contents container - fully scrollable */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[62vh]" id="auth-modal-scrollable-content">
                
                {/* 1. Real Google Auth Button (Primary, always first) */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-text-secondary uppercase tracking-wider">Fast-track Authentication</span>
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 bg-accent-teal hover:bg-accent-teal-hover text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--glow)]"
                    id="google-signin-primary-btn"
                  >
                    <LogIn className="w-4.5 h-4.5 shrink-0" />
                    <span>Sign In with Google Account</span>
                  </button>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="h-[1px] bg-border-card/50 flex-1" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">or email account</span>
                  <div className="h-[1px] bg-border-card/50 flex-1" />
                </div>

                {/* 2. Manual Form section */}
                <form onSubmit={handleManualAuth} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-accent-teal tracking-wide">
                      {mode === "signin" && "Manual Sign In"}
                      {mode === "register" && "Create New Account"}
                      {mode === "forgot_password" && "Password Recovery"}
                    </h4>
                    {mode !== "forgot_password" && (
                      <button
                        type="button"
                        onClick={() => resetFormState(mode === "signin" ? "register" : "signin")}
                        className="text-[11px] text-accent-highlight hover:underline font-extrabold"
                        id="auth-mode-toggle"
                      >
                        {mode === "signin" ? "Need an Account?" : "Have an Account?"}
                      </button>
                    )}
                  </div>

                  {/* Manual forms body */}
                  <div className="space-y-3.5">
                    {mode === "register" && (
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-text-muted" />
                          <span>Full Name</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alexis Carter"
                          className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                          id="manual-name-input"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-text-muted" />
                        <span>Email Address</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                        id="manual-email-input"
                      />
                    </div>

                    {mode !== "forgot_password" && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-text-secondary flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-text-muted" />
                            <span>Password</span>
                          </label>
                          {mode === "signin" && (
                            <button
                              type="button"
                              onClick={() => resetFormState("forgot_password")}
                              className="text-[10px] text-text-muted hover:text-accent-teal font-extrabold"
                              id="forgot-password-link"
                            >
                              Forgot Password?
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                          id="manual-password-input"
                        />
                      </div>
                    )}

                    {mode === "register" && (
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-text-muted" />
                          <span>Confirm Password</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                          id="manual-confirm-password-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Feedback messaging */}
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {authFeedback && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>{authFeedback}</span>
                    </div>
                  )}

                  {/* Form Submission Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-accent-highlight hover:bg-accent-highlight-hover disabled:bg-accent-highlight/40 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md transform hover:-translate-y-0.5 text-center"
                      id="manual-auth-submit-btn"
                    >
                      {submitting ? (
                        <span>Processing request...</span>
                      ) : (
                        <>
                          {mode === "signin" && "Sign In with Email"}
                          {mode === "register" && "Register Account"}
                          {mode === "forgot_password" && "Send Reset Link"}
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {mode === "forgot_password" && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => resetFormState("signin")}
                      className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary font-extrabold"
                      id="back-to-signin-btn"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Info bar */}
              <div className="bg-bg-card/75 border-t border-border-card/40 p-3.5 text-center shrink-0">
                <p className="text-[9px] text-text-muted flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-accent-teal shrink-0 animate-pulse" />
                  Secure Citizen Portal Gatekeeper
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
