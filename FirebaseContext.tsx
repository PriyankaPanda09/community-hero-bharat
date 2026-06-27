import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { CivicUser, CivicIssue, IssueStatus, InAppNotification } from "./types";
import { auth, db, provider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(rawMessage);
}

interface FirebaseContextType {
  currentUser: CivicUser | null;
  loadingAuth: boolean;
  issues: CivicIssue[];
  loadingIssues: boolean;
  loginWithGoogle: () => Promise<CivicUser>;
  loginCustom: (name: string, email: string) => Promise<CivicUser>;
  logout: () => Promise<void>;
  createIssue: (issueData: Omit<CivicIssue, "id">) => Promise<void>;
  addCoReporter: (
    issueId: string,
    reporter: { uid: string; displayName: string; email: string; photoURL?: string },
    proofPhoto?: string,
    note?: string
  ) => Promise<void>;
  updateIssueStatus: (issueId: string, status: IssueStatus, extraData?: any) => Promise<void>;
  escalateIssue: (issueId: string) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  updateProfilePhoto: (base64Photo: string) => Promise<void>;
  clearAllIssues: () => Promise<void>;
  activeDatabase: "firestore" | "sheets";
  cachedAccessToken: string | null;
  notifications: InAppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  adminReadIssues: string[];
  markAdminIssuesAsRead: () => void;
  markAdminIssueAsRead: (id: string) => void;
  setIssues: React.Dispatch<React.SetStateAction<CivicIssue[]>>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);



export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CivicUser | null>(() => {
    const saved = localStorage.getItem("civic_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [activeDatabase] = useState<"firestore" | "sheets">("firestore");
  const [cachedAccessToken] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    const saved = localStorage.getItem("civic_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  const [adminReadIssues, setAdminReadIssues] = useState<string[]>(() => {
    const saved = localStorage.getItem("civic_admin_read_issues");
    return saved ? JSON.parse(saved) : [];
  });

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("civic_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("civic_notifications");
  };

  const markAdminIssuesAsRead = () => {
    const allIssueIds = issues.map((i) => i.id);
    setAdminReadIssues(allIssueIds);
    localStorage.setItem("civic_admin_read_issues", JSON.stringify(allIssueIds));
  };

  const markAdminIssueAsRead = (id: string) => {
    setAdminReadIssues((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem("civic_admin_read_issues", JSON.stringify(updated));
      return updated;
    });
  };

  const prevIssuesRef = useRef<CivicIssue[]>([]);

  useEffect(() => {
    if (loadingIssues) return;

    if (prevIssuesRef.current.length > 0) {
      const previousIssues = prevIssuesRef.current;

      issues.forEach((curr) => {
        const prev = previousIssues.find((p) => p.id === curr.id);

        if (prev) {
          if (prev.status !== curr.status) {
            const userEmail = currentUser?.email || "";
            const isReporter = userEmail && curr.reporterEmail === userEmail;

            if (isReporter) {
              const newNotif: InAppNotification = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                message: `Your issue #${curr.id.substring(0, 6)}... has been updated to "${curr.status}"`,
                timestamp: new Date().toISOString(),
                read: false,
                issueId: curr.id,
                status: curr.status,
              };

              setNotifications((prevList) => {
                const updated = [newNotif, ...prevList];
                localStorage.setItem("civic_notifications", JSON.stringify(updated));
                return updated;
              });
            }
          }
        }
      });
    }

    prevIssuesRef.current = issues;
  }, [issues, currentUser, loadingIssues]);

  // 1. Listen for Auth changes & Sync custom user profile from Firestore
  useEffect(() => {
    setLoadingAuth(true);
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous user doc listener if any
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        const initialCivicUser: CivicUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Citizen Hero",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
        };
        setCurrentUser(initialCivicUser);
        localStorage.setItem("civic_current_user", JSON.stringify(initialCivicUser));

        // Start real-time snapshot listener on their Firestore user document to sync custom profile photo
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser((prev) => {
              if (!prev) return null;
              const updated = {
                ...prev,
                photoURL: data.photoURL || prev.photoURL,
                displayName: data.displayName || prev.displayName,
              };
              localStorage.setItem("civic_current_user", JSON.stringify(updated));
              return updated;
            });
          }
        }, (error) => {
          console.warn("User profile sync error:", error);
        });

      } else {
        const saved = localStorage.getItem("civic_current_user");
        if (saved) {
          try {
            const userObj = JSON.parse(saved);
            if (userObj.uid && userObj.uid.startsWith("user_")) {
              setCurrentUser(userObj);
            } else {
              setCurrentUser(null);
            }
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoadingAuth(false);
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) {
        unsubUserDoc();
      }
    };
  }, []);

  // 2. Real-time Firestore synchronizer for issues
  useEffect(() => {
    setLoadingIssues(true);
    const unsubscribe = onSnapshot(
      collection(db, "issues"),
      async (snapshot) => {
        const items: CivicIssue[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
          } as CivicIssue);
        });

        // Sort by timestamp descending
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setIssues(items);
        setLoadingIssues(false);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
        handleFirestoreError(error, OperationType.LIST, "issues");
        setLoadingIssues(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Login via custom mock username/email
  const loginCustom = async (name: string, email: string): Promise<CivicUser> => {
    const civicUser: CivicUser = {
      uid: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      displayName: name,
      email: email,
      photoURL: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`,
    };
    
    // Sign out from real Firebase first to avoid conflict
    await signOut(auth);

    setCurrentUser(civicUser);
    localStorage.setItem("civic_current_user", JSON.stringify(civicUser));
    
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);

    return civicUser;
  };

  // Google Authentication via Real Firebase Config
  const loginWithGoogle = async (): Promise<CivicUser> => {
    setLoadingAuth(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const civicUser: CivicUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Citizen Hero",
        email: firebaseUser.email || "",
        photoURL: firebaseUser.photoURL || "",
      };
      setCurrentUser(civicUser);
      localStorage.setItem("civic_current_user", JSON.stringify(civicUser));
      
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);

      return civicUser;
    } catch (error: any) {
      console.error("Google sign in popup failed:", error);
      throw error;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Logout from both Google & Mock Session
  const logout = async () => {
    setLoadingAuth(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem("civic_current_user");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  // Create issue in real Firestore database
  const createIssue = async (issueData: Omit<CivicIssue, "id">) => {
    const uniqueId = `issue_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const payload = {
      photoUrl: issueData.photoUrl,
      category: issueData.category,
      severity: issueData.severity,
      description: issueData.description,
      location: {
        address: issueData.location.address,
        lat: Number(issueData.location.lat) || 12.9716,
        lng: Number(issueData.location.lng) || 77.5946,
      },
      status: issueData.status || "Open",
      reporterId: currentUser?.uid || issueData.reporterId || "guest",
      reporterName: currentUser?.displayName || issueData.reporterName || "Anonymous Reporter",
      reporterEmail: currentUser?.email || issueData.reporterEmail || "guest@hub.org",
      reporterPhoto: currentUser?.photoURL || issueData.reporterPhoto || "",
      note: issueData.note || "",
      timestamp: issueData.timestamp || new Date().toISOString(),
      timeline: {
        reportedAt: issueData.timestamp || new Date().toISOString(),
      },
    };

    try {
      await setDoc(doc(db, "issues", uniqueId), payload);
      console.log("Firestore successfully saved:", uniqueId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `issues/${uniqueId}`);
    }
  };

  // Update issue status in real Firestore database
  const updateIssueStatus = async (issueId: string, status: IssueStatus, extraData: any = {}) => {
    try {
      const updatePayload: any = { status };
      
      if (status === "In Progress") {
        updatePayload["timeline.inProgressAt"] = new Date().toISOString();
      } else if (status === "Resolved") {
        updatePayload["timeline.resolvedAt"] = new Date().toISOString();
        if (extraData?.resolvedPhoto) {
          updatePayload.resolvedPhoto = extraData.resolvedPhoto;
        }
      } else if (status === "Verified") {
        updatePayload["timeline.verifiedAt"] = new Date().toISOString();
      }

      await updateDoc(doc(db, "issues", issueId), updatePayload);
      console.log("Firestore status successfully updated for:", issueId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Escalate an issue as urgent in the database
  const escalateIssue = async (issueId: string) => {
    try {
      const updatePayload = {
        isEscalated: true,
        escalatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, "issues", issueId), updatePayload);
      console.log("Firestore issue successfully escalated:", issueId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Delete issue from real Firestore database
  const deleteIssue = async (issueId: string) => {
    try {
      await deleteDoc(doc(db, "issues", issueId));
      console.log("Firestore successfully deleted issue:", issueId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `issues/${issueId}`);
    }
  };

  // Add co-reporter to an existing issue in Firestore
  const addCoReporter = async (
    issueId: string,
    reporter: { uid: string; displayName: string; email: string; photoURL?: string },
    proofPhoto?: string,
    note?: string
  ) => {
    try {
      const issueRef = doc(db, "issues", issueId);
      const existingIssue = issues.find((i) => i.id === issueId);

      const existingCoReporters = existingIssue?.coReporters || [];
      const isAlreadyCoReporter =
        existingCoReporters.some((r) => r.uid === reporter.uid) ||
        existingIssue?.reporterId === reporter.uid;

      const updatedCoReporters = [...existingCoReporters];
      if (!isAlreadyCoReporter) {
        const newCoReporter = {
          uid: reporter.uid,
          displayName: reporter.displayName,
          email: reporter.email,
          photoURL: reporter.photoURL || "",
          timestamp: new Date().toISOString(),
        };
        updatedCoReporters.push(newCoReporter);
      }

      const existingConfirmationPhotos = existingIssue?.confirmationPhotos || [];
      const updatedConfirmationPhotos = [...existingConfirmationPhotos];
      if (proofPhoto) {
        updatedConfirmationPhotos.push({
          url: proofPhoto,
          reporterId: reporter.uid,
          reporterName: reporter.displayName,
          reporterPhoto: reporter.photoURL || "",
          note: note || "",
          timestamp: new Date().toISOString(),
        });
      }

      const newCount = (existingIssue?.confirmationCount || 0) + 1;

      const updatePayload: any = {
        coReporters: updatedCoReporters,
        confirmationCount: newCount,
      };

      if (proofPhoto) {
        updatePayload.confirmationPhotos = updatedConfirmationPhotos;
      }

      await updateDoc(issueRef, updatePayload);
      console.log(`Successfully added ${reporter.displayName} as co-reporter to ${issueId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Update profile photo in real Firestore database
  const updateProfilePhoto = async (base64Photo: string) => {
    if (!currentUser?.uid) {
      throw new Error("No authenticated user found.");
    }
    const uid = currentUser.uid;
    try {
      await setDoc(doc(db, "users", uid), {
        photoURL: base64Photo,
        displayName: currentUser.displayName,
        email: currentUser.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log("Firestore successfully saved custom profile photo for:", uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Delete all issues in Firestore (Batch delete)
  const clearAllIssues = async () => {
    try {
      const { writeBatch, getDocs } = await import("firebase/firestore");
      const querySnapshot = await getDocs(collection(db, "issues"));
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log("Firestore successfully deleted all issues.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "issues");
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        loadingAuth,
        issues,
        loadingIssues,
        loginWithGoogle,
        loginCustom,
        logout,
        createIssue,
        addCoReporter,
        updateIssueStatus,
        escalateIssue,
        deleteIssue,
        updateProfilePhoto,
        clearAllIssues,
        activeDatabase,
        cachedAccessToken,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        adminReadIssues,
        markAdminIssuesAsRead,
        markAdminIssueAsRead,
        setIssues,
      }}
    >
      {children}

      {/* Floating Green connected toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-3.5 rounded-xl shadow-2xl border border-emerald-400/20 flex items-center gap-2.5 transition-colors cursor-pointer"
            onClick={() => setShowToast(false)}
            id="db-connected-toast"
          >
            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
            <span>Successfully Signed In!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};
