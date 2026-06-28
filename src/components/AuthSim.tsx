import React, { useState, useEffect } from "react";
import { CivicUser } from "../types";
import { 
  LogIn, 
  Shield, 
  X, 
  Mail, 
  Lock, 
  User, 
  KeyRound, 
  Info, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../FirebaseContext";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

interface AuthSimProps {
  onLogin: (user: CivicUser) => void;
  currentUser: CivicUser | null;
  onLogout: () => void;
  onNavigateToProfile?: () => void;
}

type AuthMode = "signin" | "register" | "forgot_password";

export default function AuthSim({ onLogin, currentUser, onLogout, onNavigateToProfile }: AuthSimProps) {
  const { loginWithGoogle } = useFirebase();
  const [showModal, setShowModal] = useState(false);
  
  // Auth Form states
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleOnlyUser, setIsGoogleOnlyUser] = useState(false);

  // Clear all typed but unsaved fields, passwords, and errors when currentUser changes or modal toggles
  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setAuthFeedback("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMode("signin");
  }, [currentUser?.email, showModal]);

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
      console.warn("Google login error:", err);
      setError(getReadableAuthError(err));
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthFeedback("");
    setIsGoogleOnlyUser(false);

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

        try {
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
        } catch (signInErr: any) {
          console.warn("Manual sign in failed:", signInErr);
          const errCode = signInErr?.code || "";

          // Check if this user originally signed up via Google only
          let isGoogleOnly = false;
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes("google.com") && !methods.includes("password")) {
              isGoogleOnly = true;
            }
          } catch (fetchErr) {
            console.warn("Could not fetch sign in methods:", fetchErr);
          }

          if (isGoogleOnly) {
            setIsGoogleOnlyUser(true);
            setError("This account uses Google Sign-In. Please use the Google button below, or sign in once with Google and set a password from Settings.");
          } else {
            setError(getReadableAuthError(signInErr));
          }
        }

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
      console.warn("Manual auth flow error:", err);
      setError(getReadableAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormState = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setAuthFeedback("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsGoogleOnlyUser(false);
    // keep email filled in for convenience if switching to reset
  };

  return (
    <div className="relative inline-block text-left" id="auth-simulator-root">
      {currentUser ? (
        <button
          onClick={onNavigateToProfile}
          className="flex items-center gap-3 bg-white/10 hover:bg-white/15 active:bg-white/20 hover:scale-105 duration-150 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-md cursor-pointer transition-all"
          id="auth-profile-pill"
          title="Go to Settings"
        >
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="w-7 h-7 rounded-full border border-white/20 object-cover shrink-0"
              referrerPolicy="no-referrer"
              id="user-profile-avatar"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent-highlight text-text-on-highlight flex items-center justify-center font-bold text-xs shrink-0" id="user-profile-avatar-initials">
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:flex flex-col text-left min-w-0 max-w-[100px] md:max-w-[140px]" id="navbar-profile-text-block">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-[11px] text-white font-extrabold leading-none truncate flex-1" title={currentUser.displayName}>
                {currentUser.displayName}
              </p>
              {currentUser.email === "priyapanda959@gmail.com" && (
                <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wide leading-none shrink-0" id="admin-badge">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[9px] text-white/70 leading-none mt-1 truncate" title={currentUser.email}>
              {currentUser.email}
            </p>
          </div>
        </button>
      ) : (
        <button
          onClick={() => {
            resetFormState("signin");
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 bg-accent-highlight hover:bg-accent-highlight-hover text-text-on-highlight font-bold text-xs px-4 py-2 rounded-xl transition-all duration-200 shadow-md cursor-pointer transform hover:-translate-y-0.5"
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
                    className="w-full flex items-center justify-center gap-2.5 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--glow)]"
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
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setIsGoogleOnlyUser(false);
                          setError("");
                        }}
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
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-bg-card/50 pl-3.5 pr-10 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                            id="manual-password-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none p-1 cursor-pointer flex items-center justify-center"
                            title={showPassword ? "Hide password" : "Show password"}
                            id="toggle-password-visibility-btn"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === "register" && (
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary mb-1 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-text-muted" />
                          <span>Confirm Password</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-bg-card/50 pl-3.5 pr-10 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                            id="manual-confirm-password-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none p-1 cursor-pointer flex items-center justify-center"
                            title={showConfirmPassword ? "Hide password" : "Show password"}
                            id="toggle-confirm-password-visibility-btn"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feedback messaging */}
                  {error && !isGoogleOnlyUser && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2" id="signin-generic-error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {isGoogleOnlyUser && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-semibold p-4 rounded-xl space-y-3" id="google-only-warning-card">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-300">Google Sign-In Account Detected</p>
                          <p className="text-[11px] text-text-secondary leading-relaxed font-medium font-semibold">
                            This account uses Google Sign-In. Please use the Google button below, or sign in once with Google and set a password from Settings.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="flex-1 bg-accent-teal hover:bg-accent-teal-hover text-text-on-accent text-[11px] font-extrabold py-2 px-3 rounded-lg cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
                          id="google-only-login-redirect"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Use Google Button</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSubmitting(true);
                              setError("");
                              await sendPasswordResetEmail(auth, email);
                              setAuthFeedback("A password reset link has been sent! Check your inbox to set a password for email login.");
                              setIsGoogleOnlyUser(false);
                            } catch (resetErr: any) {
                              setError(getReadableAuthError(resetErr));
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          className="flex-1 bg-[#1e2330]/60 hover:bg-[#2a3042]/60 border border-border-card text-white text-[11px] font-extrabold py-2 px-3 rounded-lg cursor-pointer transition-all active:scale-95 text-center"
                          id="google-only-reset-trigger"
                        >
                          Set a Password Now
                        </button>
                      </div>
                    </div>
                  )}

                  {authFeedback && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2" id="signin-success-feedback">
                      <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>{authFeedback}</span>
                    </div>
                  )}

                  {/* Form Submission Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-accent-highlight hover:bg-accent-highlight-hover disabled:bg-accent-highlight/40 text-text-on-highlight font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md transform hover:-translate-y-0.5 text-center"
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
