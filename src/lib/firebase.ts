import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDQIU9lgC4_KGAP5shjTAd6K9bJWWM4aa8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nanaflix-9e8f3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nanaflix-9e8f3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nanaflix-9e8f3.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "46943368699",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:46943368699:web:a4c76fe38b91d4a176075e",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.apiKey !== "YOUR_API_KEY"
  );
};

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
