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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isSyncing: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
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
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isConfigured = isFirebaseConfigured();

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
      setLoading(false);

      if (currentUser) {
        setIsSyncing(true);
        try {
          await Promise.race([
            Promise.all([
              syncWatchHistoryWithCloud(currentUser.uid),
              syncWatchlistWithCloud(currentUser.uid),
              recordUserProfile(currentUser),
            ]),
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const logout = useCallback(async (): Promise<void> => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
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
      loading,
      isConfigured,
      isSyncing,
      signInWithGoogle,
      logout,
      syncNow,
    }),
    [user, loading, isConfigured, isSyncing, signInWithGoogle, logout, syncNow]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
