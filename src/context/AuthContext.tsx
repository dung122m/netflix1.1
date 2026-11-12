"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import {
  syncWatchHistoryWithCloud,
  syncWatchlistWithCloud,
} from "@/lib/cloudSync";
import { clearLocalWatchHistoryOnly } from "@/lib/watchHistory";
import { clearLocalWatchlistOnly } from "@/lib/watchlist";
import { recordUserProfile } from "@/services/userService";

export interface CachedAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const CACHED_AUTH_USER_KEY = "nanaflix_cached_auth_user";

export function getCachedAuthUser(): CachedAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setCachedAuthUser(userData: CachedAuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userData) {
      localStorage.setItem(CACHED_AUTH_USER_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(CACHED_AUTH_USER_KEY);
    }
  } catch {}
}

interface AuthContextType {
  user: User | null;
  cachedUser: CachedAuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  isSyncing: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  cachedUser: null,
  loading: true,
  isConfigured: false,
  isSyncing: false,
  signInWithGoogle: async () => ({ success: false, error: "Chưa khởi tạo" }),
  logout: async () => {},
  syncNow: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [cachedUser, setCachedUser] = useState<CachedAuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isConfigured = isFirebaseConfigured();

  // Đọc cachedUser sau khi client đã mount để đảm bảo SSR và client hydration hoàn toàn khớp 100%
  useEffect(() => {
    const cached = getCachedAuthUser();
    if (cached) {
      setCachedUser(cached);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await Promise.race([
        Promise.all([
          syncWatchHistoryWithCloud(user.uid),
          syncWatchlistWithCloud(user.uid),
        ]),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (err) {
      console.warn("Lỗi sync thủ công:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const cached: CachedAuthUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        };
        setCachedUser(cached);
        setCachedAuthUser(cached);
      } else {
        setCachedUser(null);
        setCachedAuthUser(null);
      }
      setLoading(false);

      if (currentUser) {
        setIsSyncing(true);
        try {
          const PROFILE_SYNC_COOLDOWN_MS = 30 * 60 * 1000;
          let shouldSyncProfile = true;
          try {
            const syncKey = `nanaflix_profile_synced_${currentUser.uid}`;
            const lastSync = Number(sessionStorage.getItem(syncKey) || "0");
            const hasLocalProfile = Boolean(localStorage.getItem(`nanaflix_user_profile_${currentUser.uid}`));
            if (hasLocalProfile && lastSync > 0 && Date.now() - lastSync < PROFILE_SYNC_COOLDOWN_MS) {
              shouldSyncProfile = false;
            }
          } catch {}

          const tasks: Promise<unknown>[] = [
            syncWatchHistoryWithCloud(currentUser.uid),
            syncWatchlistWithCloud(currentUser.uid),
          ];
          if (shouldSyncProfile) {
            tasks.push(
              recordUserProfile(currentUser).then(() => {
                try {
                  sessionStorage.setItem(`nanaflix_profile_synced_${currentUser.uid}`, String(Date.now()));
                } catch {}
              })
            );
          }

          await Promise.race([
            Promise.all(tasks),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        } catch (err) {
          console.warn("Lỗi tự động sync khi đăng nhập:", err);
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Tự động đồng bộ lịch sử xem khi quay lại tab (Visibility Change Sync)
  useEffect(() => {
    let lastVisibilitySyncTime = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      if (!user?.uid) return; // Chỉ chạy cho authenticated user

      const now = Date.now();
      // Throttle: Tối thiểu 3 phút giữa các lần sync khi switch tab để tránh đọc Supabase liên tục
      if (now - lastVisibilitySyncTime < 3 * 60 * 1000) return;
      lastVisibilitySyncTime = now;

      try {
        await syncWatchHistoryWithCloud(user.uid);
      } catch (err) {
        console.warn("Lỗi sync watch history khi quay lại tab:", err);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.uid]);

  const signInWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!isConfigured || !auth) {
      return {
        success: false,
        error:
          "Chưa cấu hình Firebase API Keys trong .env.local. Vui lòng thêm khóa cấu hình để bắt đầu.",
      };
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setUser(res.user);
        await Promise.all([
          syncWatchHistoryWithCloud(res.user.uid),
          syncWatchlistWithCloud(res.user.uid),
          recordUserProfile(res.user),
        ]);
        return { success: true };
      }
      return { success: false, error: "Đăng nhập không thành công" };
    } catch (err: unknown) {
      console.error("Lỗi Google Sign-In:", err);
      let message = "Đã xảy ra lỗi khi đăng nhập.";
      if (typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "auth/popup-closed-by-user") {
          message = "Bạn đã đóng cửa sổ đăng nhập Google.";
        } else if (code === "auth/unauthorized-domain") {
          message =
            "Tên miền hiện tại chưa được cấp phép trong Firebase Console (Authentication > Settings > Authorized Domains).";
        } else if (code === "auth/cancelled-popup-request") {
          message = "Yêu cầu đăng nhập bị huỷ do mở nhiều cửa sổ cùng lúc.";
        }
      }
      return { success: false, error: message };
    }
  }, [isConfigured]);

  const logout = useCallback(async (): Promise<void> => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
      setCachedUser(null);
      setCachedAuthUser(null);
      // Trả máy tính về trạng thái sạch cho người tiếp theo, không lo lẫn lộn tài khoản
      clearLocalWatchHistoryOnly();
      clearLocalWatchlistOnly();
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
  }, []);

  const authValue = React.useMemo(
    () => ({
      user,
      cachedUser,
      loading,
      isConfigured,
      isSyncing,
      signInWithGoogle,
      logout,
      syncNow,
    }),
    [user, cachedUser, loading, isConfigured, isSyncing, signInWithGoogle, logout, syncNow]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
