"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

type LoadedFirebaseAuth = {
  auth: import("firebase/auth").Auth | null;
  googleProvider: import("firebase/auth").GoogleAuthProvider;
  signInWithPopup: typeof import("firebase/auth").signInWithPopup;
  signOut: typeof import("firebase/auth").signOut;
  onAuthStateChanged: typeof import("firebase/auth").onAuthStateChanged;
};

let firebaseAuthPromise: Promise<LoadedFirebaseAuth> | null = null;

function loadFirebaseAuth(): Promise<LoadedFirebaseAuth> {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([
      import("@/lib/firebase"),
      import("firebase/auth"),
    ]).then(([fb, authMod]) => ({
      auth: fb.auth,
      googleProvider: fb.googleProvider,
      signInWithPopup: authMod.signInWithPopup,
      signOut: authMod.signOut,
      onAuthStateChanged: authMod.onAuthStateChanged,
    }));
  }
  return firebaseAuthPromise;
}

function hasAuthSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CACHED_AUTH_USER_KEY)) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("firebase:authUser:")) return true;
    }
  } catch {}
  return false;
}
import {
  syncWatchHistoryWithCloud,
  syncWatchlistWithCloud,
  syncFavoriteActorsWithCloud,
  cancelPendingCloudSync,
} from "@/lib/cloudSync";
import { clearLocalWatchHistoryOnly } from "@/lib/watchHistory";
import { clearLocalWatchlistOnly } from "@/lib/watchlist";
import { clearLocalFavoriteActorsOnly } from "@/services/actor/favoriteActors";
import {
  recordUserProfile,
  clearLocalPlayerSettings,
  cancelPendingUserServiceTimers,
} from "@/services/userService";

function clearSessionLocalCaches(previousUid?: string | null): void {
  cancelPendingCloudSync();
  cancelPendingUserServiceTimers();
  clearLocalWatchHistoryOnly();
  clearLocalWatchlistOnly();
  clearLocalFavoriteActorsOnly();
  clearLocalPlayerSettings(previousUid || undefined);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("nanaflix_foryou_cache_v10");
      localStorage.removeItem("nanaflix_foryou_cache_v10");
      sessionStorage.removeItem("nanaflix_for_you_cache_v3");
      localStorage.removeItem("nanaflix_for_you_cache_v3");
    } catch {}
  }
}

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
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  cachedUser: null,
  loading: true,
  isConfigured: false,
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
    try {
      await Promise.race([
        Promise.all([
          syncWatchHistoryWithCloud(user.uid),
          syncWatchlistWithCloud(user.uid),
          syncFavoriteActorsWithCloud(user.uid, true),
        ]),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (err) {
      console.warn("Lỗi sync thủ công:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const initAuthListener = async () => {
      try {
        const { auth, onAuthStateChanged } = await loadFirebaseAuth();
        if (cancelled || !auth) {
          if (!cancelled) setLoading(false);
          return;
        }

        let prevUid: string | null = getCachedAuthUser()?.uid || null;
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (cancelled) return;
          const nextUid = currentUser?.uid || null;
          if ((prevUid && prevUid !== nextUid) || (!currentUser && prevUid)) {
            clearSessionLocalCaches(prevUid);
          }
          prevUid = nextUid;

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
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("nanaflix-auth-synced", { detail: { uid: null } })
              );
            }
          }
          setLoading(false);

          if (currentUser) {
            try {
              const PROFILE_SYNC_COOLDOWN_MS = 30 * 60 * 1000;
              const DATA_SYNC_COOLDOWN_MS = 10 * 60 * 1000; // 10 phút cooldown cho lịch sử xem & watchlist để giảm 80% Serverless calls
              let shouldSyncProfile = true;
              let shouldSyncData = true;

              try {
                const syncKey = `nanaflix_profile_synced_${currentUser.uid}`;
                const lastSync = Number(sessionStorage.getItem(syncKey) || "0");
                const hasLocalProfile = Boolean(localStorage.getItem(`nanaflix_user_profile_${currentUser.uid}`));
                if (hasLocalProfile && lastSync > 0 && Date.now() - lastSync < PROFILE_SYNC_COOLDOWN_MS) {
                  shouldSyncProfile = false;
                }

                const dataSyncKey = `nanaflix_data_synced_${currentUser.uid}`;
                const lastDataSync = Number(sessionStorage.getItem(dataSyncKey) || "0");
                if (lastDataSync > 0 && Date.now() - lastDataSync < DATA_SYNC_COOLDOWN_MS) {
                  shouldSyncData = false;
                }
              } catch {}

              const tasks: Promise<unknown>[] = [];
              if (shouldSyncData) {
                tasks.push(
                  syncWatchHistoryWithCloud(currentUser.uid),
                  syncWatchlistWithCloud(currentUser.uid),
                  syncFavoriteActorsWithCloud(currentUser.uid),
                );
                try {
                  sessionStorage.setItem(`nanaflix_data_synced_${currentUser.uid}`, String(Date.now()));
                } catch {}
              }

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
              if (!cancelled && typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("nanaflix-auth-synced", { detail: { uid: currentUser.uid } })
                );
              }
            } catch (err) {
              console.warn("Lỗi tự động sync khi đăng nhập:", err);
            }
          }
        });
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    if (hasAuthSessionHint()) {
      void initAuthListener();
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    // Khách vãng lai: bỏ trạng thái loading ngay và trì hoãn nạp SDK Firebase Auth để không chặn TBT/main-thread lúc đầu
    setLoading(false);
    const timerHandle = setTimeout(() => {
      if (!cancelled) void initAuthListener();
    }, 3500);

    return () => {
      cancelled = true;
      clearTimeout(timerHandle);
      unsubscribe?.();
    };
  }, [isConfigured]);

  // Tự động đồng bộ lịch sử xem khi quay lại tab (Visibility Change Sync)
  useEffect(() => {
    let lastVisibilitySyncTime = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      if (!user?.uid) return; // Chỉ chạy cho authenticated user

      const now = Date.now();
      // Throttle: Tối thiểu 10 phút giữa các lần sync khi switch tab để tránh gọi /api/user/history liên tục
      if (now - lastVisibilitySyncTime < 10 * 60 * 1000) return;
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
    if (!isConfigured) {
      return {
        success: false,
        error:
          "Chưa cấu hình Firebase API Keys trong .env.local. Vui lòng thêm khóa cấu hình để bắt đầu.",
      };
    }

    try {
      const { auth, googleProvider, signInWithPopup } = await loadFirebaseAuth();
      if (!auth) {
        return {
          success: false,
          error:
            "Chưa cấu hình Firebase API Keys trong .env.local. Vui lòng thêm khóa cấu hình để bắt đầu.",
        };
      }
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const cached: CachedAuthUser = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        };
        setUser(res.user);
        setCachedUser(cached);
        setCachedAuthUser(cached);
        try {
          sessionStorage.setItem(`nanaflix_data_synced_${res.user.uid}`, String(Date.now()));
          sessionStorage.setItem(`nanaflix_profile_synced_${res.user.uid}`, String(Date.now()));
        } catch {}
        await Promise.race([
          Promise.all([
            syncWatchHistoryWithCloud(res.user.uid, true),
            syncWatchlistWithCloud(res.user.uid),
            syncFavoriteActorsWithCloud(res.user.uid, true),
            recordUserProfile(res.user),
          ]),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("nanaflix-auth-synced", { detail: { uid: res.user.uid } })
          );
        }
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
    try {
      const { auth, signOut } = await loadFirebaseAuth();
      if (!auth) return;
      const prevUid = auth.currentUser?.uid || getCachedAuthUser()?.uid || null;
      await signOut(auth);
      setUser(null);
      setCachedUser(null);
      setCachedAuthUser(null);
      // Trả máy tính về trạng thái sạch cho người tiếp theo, không lo lẫn lộn tài khoản
      clearSessionLocalCaches(prevUid);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nanaflix-auth-synced", { detail: { uid: null } })
        );
      }
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
      signInWithGoogle,
      logout,
      syncNow,
    }),
    [user, cachedUser, loading, isConfigured, signInWithGoogle, logout, syncNow]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
