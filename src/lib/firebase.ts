import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

export { isFirebaseConfigured };

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
// Firestore has been completely removed in favor of Supabase PostgreSQL
const db = null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

if (typeof window !== "undefined" && isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.warn("Lỗi khởi tạo Firebase Auth:", error);
  }
}

export { app, auth, db, googleProvider };
