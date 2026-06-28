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
  removeConfirmation: (
    issueId: string,
    userUid: string
  ) => Promise<void>;
  updateIssueStatus: (issueId: string, status: IssueStatus, extraData?: any) => Promise<void>;
  escalateIssue: (issueId: string) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  updateProfilePhoto: (base64Photo: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  clearAllIssues: () => Promise<void>;
  clearDemoIssues: () => Promise<void>;
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
        state: issueData.location.state || "",
        city: issueData.location.city || "",
        streetAddress: issueData.location.streetAddress || "",
        zipCode: issueData.location.zipCode || "",
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

  // Update issue status in real Firestore database with strict lifecycle and role checks
  const updateIssueStatus = async (issueId: string, status: IssueStatus, extraData: any = {}) => {
    // 1. Retrieve the issue from local state
    const currentIssue = issues.find((i) => i.id === issueId);
    if (!currentIssue) {
      throw new Error("Grievance report not found.");
    }

    const currentStatus = currentIssue.status;

    // 2. Enforce strict sequential order: Open -> In Progress -> Resolved -> Verified
    const STATUS_ORDER: IssueStatus[] = ["Open", "In Progress", "Resolved", "Verified"];
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const newIndex = STATUS_ORDER.indexOf(status);

    if (currentIndex === -1 || newIndex === -1) {
      throw new Error(`Invalid status values detected. Current: ${currentStatus}, Requested: ${status}`);
    }

    // Only allow moving forward exactly one step. Never skip, never go backward, and never change from terminal state.
    if (newIndex !== currentIndex + 1) {
      throw new Error(
        `Invalid status transition from "${currentStatus}" to "${status}". Status must progress strictly in sequence: Open → In Progress → Resolved → Verified.`
      );
    }

    // 3. Enforce strict role validation based on the transition step
    const isAdmin = currentUser?.email === "priyapanda959@gmail.com";

    if (status === "Verified") {
      // "only the original reporter (or a confirmed co-reporter) should be able to mark an issue as 'Verified,' and only after it is already in 'Resolved' status."
      const isReporter = currentUser && (currentUser.uid === currentIssue.reporterId || currentUser.email === currentIssue.reporterEmail);
      const isCoReporter = currentUser && !!currentIssue.coReporters?.some((c) => c.uid === currentUser.uid || c.email === currentUser.email);

      if (isAdmin) {
        throw new Error("Administrators are not permitted to set the status to Verified. The final verification must be logged by the reporter or community.");
      }

      if (!isReporter && !isCoReporter) {
        throw new Error("Only the original reporter or a confirmed co-reporter of this grievance can mark it as Verified.");
      }

      if (currentStatus !== "Resolved") {
        throw new Error("An issue can only be marked as Verified once it has been Resolved.");
      }
    } else {
      // Moving to "In Progress" or "Resolved" must be performed by the admin
      if (!isAdmin) {
        throw new Error("Only administrators are permitted to transition reports to In Progress or Resolved.");
      }
    }

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
      const issue = issues.find((i) => i.id === issueId);
      let complaintLetter = "";
      if (issue) {
        try {
          const res = await fetch("/api/generate-complaint-letter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              category: issue.category,
              description: issue.description,
              address: issue.location.address,
              timestamp: issue.timestamp,
              confirmationCount: issue.confirmationCount || (issue.confirmationPhotos?.length || 0),
              reporterName: issue.reporterName,
              id: issue.id
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.letter) {
              complaintLetter = data.letter;
            }
          }
        } catch (err) {
          console.error("Failed to generate custom complaint letter during escalation:", err);
        }
      }

      const updatePayload: any = {
        isEscalated: true,
        escalatedAt: new Date().toISOString()
      };
      if (complaintLetter) {
        updatePayload.complaintLetter = complaintLetter;
      }

      await updateDoc(doc(db, "issues", issueId), updatePayload);
      console.log("Firestore issue successfully escalated with complaint letter:", issueId);
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
        existingCoReporters.some((r) => r.uid === reporter.uid || r.email === reporter.email) ||
        existingIssue?.reporterId === reporter.uid ||
        existingIssue?.reporterEmail === reporter.email;

      if (isAlreadyCoReporter) {
        throw new Error("You have already reported or confirmed this civic issue. A single user can only contribute one confirmation or report per issue.");
      }

      const updatedCoReporters = [...existingCoReporters];
      const newCoReporter = {
        uid: reporter.uid,
        displayName: reporter.displayName,
        email: reporter.email,
        photoURL: reporter.photoURL || "",
        timestamp: new Date().toISOString(),
      };
      updatedCoReporters.push(newCoReporter);

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

  const removeConfirmation = async (issueId: string, userUid: string) => {
    try {
      const issueRef = doc(db, "issues", issueId);
      const existingIssue = issues.find((i) => i.id === issueId);
      if (!existingIssue) return;

      const existingCoReporters = existingIssue.coReporters || [];
      const updatedCoReporters = existingCoReporters.filter((r) => r.uid !== userUid);

      const existingConfirmationPhotos = existingIssue.confirmationPhotos || [];
      const updatedConfirmationPhotos = existingConfirmationPhotos.filter((p) => p.reporterId !== userUid);

      const newCount = Math.max(0, (existingIssue.confirmationCount || 0) - 1);

      const updatePayload: any = {
        coReporters: updatedCoReporters,
        confirmationCount: newCount,
        confirmationPhotos: updatedConfirmationPhotos,
      };

      await updateDoc(issueRef, updatePayload);
      console.log(`Successfully removed confirmation of ${userUid} from ${issueId}`);
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

  // Update display name and save to Firestore, updating all relevant user records dynamically
  const updateUserProfile = async (displayName: string) => {
    if (!currentUser?.uid) {
      throw new Error("No authenticated user found.");
    }
    const uid = currentUser.uid;
    const cleanName = displayName.trim();
    if (!cleanName) {
      throw new Error("Display name cannot be empty.");
    }

    try {
      // 1. Update user profile document in Firestore
      await setDoc(doc(db, "users", uid), {
        displayName: cleanName,
        email: currentUser.email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 2. Local state and localStorage update
      const updatedUser = {
        ...currentUser,
        displayName: cleanName,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("civic_current_user", JSON.stringify(updatedUser));

      // 3. Update all issues where this user is the reporter, co-reporter, or has co-reporter photos
      const { writeBatch, getDocs } = await import("firebase/firestore");
      const querySnapshot = await getDocs(collection(db, "issues"));
      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((issueDoc) => {
        const data = issueDoc.data();
        let changed = false;
        const updatePayload: any = {};

        // If user is primary reporter
        if (data.reporterId === uid || (data.reporterEmail && data.reporterEmail === currentUser.email)) {
          updatePayload.reporterName = cleanName;
          changed = true;
        }

        // If user is in coReporters list
        if (data.coReporters && Array.isArray(data.coReporters)) {
          const updatedCoReporters = data.coReporters.map((co: any) => {
            if (co.uid === uid || co.email === currentUser.email) {
              changed = true;
              return { ...co, displayName: cleanName };
            }
            return co;
          });
          if (changed) {
            updatePayload.coReporters = updatedCoReporters;
          }
        }

        // If user is in confirmationPhotos list
        if (data.confirmationPhotos && Array.isArray(data.confirmationPhotos)) {
          const updatedPhotos = data.confirmationPhotos.map((photo: any) => {
            if (photo.reporterId === uid) {
              changed = true;
              return { ...photo, reporterName: cleanName };
            }
            return photo;
          });
          if (changed) {
            updatePayload.confirmationPhotos = updatedPhotos;
          }
        }

        if (changed) {
          batch.update(issueDoc.ref, updatePayload);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Successfully updated profile name on ${count} issues.`);
      }

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

  // Delete all demo/seed issues in Firestore (Batch delete)
  const clearDemoIssues = async () => {
    try {
      const { writeBatch, getDocs } = await import("firebase/firestore");
      const querySnapshot = await getDocs(collection(db, "issues"));
      const batch = writeBatch(db);
      let count = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
        const reporterId = data.reporterId || "";
        const reporterEmail = data.reporterEmail || "";
        const isDemo = id.startsWith("seed_") || 
                       reporterId.startsWith("seed_user") || 
                       reporterEmail === "saroja.s@bharat-civic.org" || 
                       reporterEmail === "milind.j@my-neighborhood.net" || 
                       reporterEmail === "esha.r@eco-action.org";
        if (isDemo) {
          batch.delete(doc.ref);
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      console.log(`Firestore successfully deleted ${count} demo issues.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "issues/demo");
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
        removeConfirmation,
        updateIssueStatus,
        escalateIssue,
        deleteIssue,
        updateProfilePhoto,
        updateUserProfile,
        clearAllIssues,
        clearDemoIssues,
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
