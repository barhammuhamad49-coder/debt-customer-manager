import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { StoreData } from "../types";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use initializeFirestore with experimentalAutoDetectLongPolling to avoid 10s timeout in sandboxed iframe environment
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Auth helper functions
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error("Sign out error:", error);
    throw error;
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// Cloud Storage helper functions
export async function saveToCloud(userId: string, data: StoreData): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, "users", userId, "data", "store");
    const cleanData = JSON.parse(JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
    await setDoc(userDocRef, cleanData, { merge: true });
    
    // Also save user profile record
    const userProfileRef = doc(db, "users", userId);
    if (auth.currentUser) {
      await setDoc(userProfileRef, {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || "",
        displayName: auth.currentUser.displayName || "",
        photoURL: auth.currentUser.photoURL || "",
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error saving to Firestore Cloud:", error);
    throw error;
  }
}

export async function loadFromCloud(userId: string): Promise<StoreData | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, "users", userId, "data", "store");
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as StoreData;
    }
    return null;
  } catch (error) {
    console.error("Error loading from Firestore Cloud:", error);
    return null;
  }
}

export function subscribeToCloudStore(
  userId: string,
  onDataChanged: (data: StoreData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const userDocRef = doc(db, "users", userId, "data", "store");
  
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        const formatted: StoreData = {
          customers: raw.customers || [],
          transactions: raw.transactions || [],
          lastUserId: raw.lastUserId || null,
          savedItems: raw.savedItems || ["مریشک", "کارەبایی", "پیاواز", "مەریوان", "بەرهەم"],
          dailyRequests: raw.dailyRequests || [],
          deletedCustomers: raw.deletedCustomers || [],
          deletedTransactions: raw.deletedTransactions || [],
        };
        onDataChanged(formatted);
      }
    },
    (err) => {
      console.error("Realtime Cloud Sync Error:", err);
      if (onError) onError(err);
    }
  );
}
