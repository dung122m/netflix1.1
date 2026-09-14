import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "YOUR_API_KEY",
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

if (typeof window !== "undefined" && isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    try {
      // Fix #5: Bật IndexedDB persistent cache để:
      //   - Giữ dữ liệu khi mất mạng ngắn (offline persistence)
      //   - Đồng bộ realtime giữa nhiều tab cùng lúc (multi-tab manager)
      //   - Tự động kết nối lại sau khi mạng phục hồi hoặc tab được focus
      // Lưu ý: persistentLocalCache không dùng chung với experimentalAutoDetectLongPolling
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        ignoreUndefinedProperties: true,
      });
    } catch {
      // Nếu đã có instance (hot reload dev) thì lấy lại
      db = getFirestore(app);
    }
  } catch (error) {
    console.warn("Lỗi khởi tạo Firebase:", error);
  }
}

export { app, auth, db, googleProvider };
