"use client";

import { useState, useEffect, useCallback } from "react";
import { FootballMatch } from "@/services/liveFootballService";
import { useAuth } from "@/context/AuthContext";
import { getMatchRemindersSupabase } from "@/services/supabaseService";

export interface MatchReminder {
  id: string;
  title: string;
  team1: string;
  team2: string;
  time?: string;
  timestamp: number;
  group?: string;
  tournament?: string;
  homeLogo?: string;
  awayLogo?: string;
  notified10m?: boolean;
  notifiedStart?: boolean;
  createdAt: number;
}

const STORAGE_KEY = "nanaflix_match_reminders";

// Phát âm thanh chuông nhẹ nhàng thông qua Web Audio API (không cần tải file mp3)
export function playChimeSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.15);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  } catch {
    // Ignore audio error
  }
}

export function useMatchReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<MatchReminder[]>([]);

  // Đọc từ localStorage & Supabase
  const loadReminders = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: MatchReminder[] = JSON.parse(stored);
        setReminders(parsed);
      } else {
        setReminders([]);
      }
    } catch {
      setReminders([]);
    }
  }, []);

  // Tải từ Server API khi user đăng nhập
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/user/reminders", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.items) && json.items.length > 0) {
            setReminders((prev) => {
              const mergedMap = new Map<string, MatchReminder>();
              prev.forEach((p) => mergedMap.set(p.id, p));
              json.items.forEach((c: { matchId: string; homeTeam: string; awayTeam: string; matchTime: number; tournament?: string; isNotified?: boolean; createdAt?: number }) => {
                if (!mergedMap.has(c.matchId)) {
                  mergedMap.set(c.matchId, {
                    id: c.matchId,
                    title: `${c.homeTeam} vs ${c.awayTeam}`,
                    team1: c.homeTeam,
                    team2: c.awayTeam,
                    timestamp: c.matchTime,
                    tournament: c.tournament,
                    notified10m: c.isNotified,
                    notifiedStart: c.isNotified,
                    createdAt: c.createdAt || Date.now(),
                  });
                }
              });
              const mergedList = Array.from(mergedMap.values());
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
              } catch {}
              return mergedList;
            });
            return;
          }
        }
      } catch {}

      getMatchRemindersSupabase(user.uid).then((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setReminders((prev) => {
            const mergedMap = new Map<string, MatchReminder>();
            prev.forEach((p) => mergedMap.set(p.id, p));
            cloudItems.forEach((c) => {
              if (!mergedMap.has(c.matchId)) {
                mergedMap.set(c.matchId, {
                  id: c.matchId,
                  title: `${c.homeTeam} vs ${c.awayTeam}`,
                  team1: c.homeTeam,
                  team2: c.awayTeam,
                  timestamp: c.matchTime,
                  tournament: c.tournament,
                  notified10m: c.isNotified,
                  notifiedStart: c.isNotified,
                  createdAt: c.createdAt,
                });
              }
            });
            const mergedList = Array.from(mergedMap.values());
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));
            } catch {}
            return mergedList;
          });
        }
      }).catch(() => {});
    })();
  }, [user]);

  useEffect(() => {
    loadReminders();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadReminders();
      }
    };

    const handleCustomEvent = () => {
      loadReminders();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("match-reminders-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("match-reminders-updated", handleCustomEvent);
    };
  }, [loadReminders]);

  const saveReminders = (newList: MatchReminder[]) => {
    setReminders(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      window.dispatchEvent(new CustomEvent("match-reminders-updated"));
    } catch {}
  };

  // Xin quyền thông báo trình duyệt
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const res = await Notification.requestPermission();
      return res === "granted";
    }
    return false;
  };

  // Thêm trận vào danh sách nhắc
  const addReminder = async (match: FootballMatch): Promise<boolean> => {
    await requestPermission();

    const current = [...reminders];
    if (current.some((r) => r.id === match.id)) return true;

    const newReminder: MatchReminder = {
      id: match.id,
      title: match.title,
      team1: match.team1,
      team2: match.team2,
      time: match.time,
      timestamp: match.timestamp,
      group: match.group,
      tournament: match.tournament,
      homeLogo: match.homeLogo,
      awayLogo: match.awayLogo,
      notified10m: false,
      notifiedStart: false,
      createdAt: Date.now(),
    };

    saveReminders([newReminder, ...current]);
    playChimeSound();

    if (user?.uid) {
      user.getIdToken().then((idToken) => {
        fetch("/api/user/reminders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            matchId: match.id,
            homeTeam: match.team1,
            awayTeam: match.team2,
            matchTime: match.timestamp,
            tournament: match.tournament || match.group,
          }),
        }).catch(() => {});
      }).catch(() => {});
    }

    return true;
  };

  // Hủy nhắc trận
  const removeReminder = (id: string) => {
    const filtered = reminders.filter((r) => r.id !== id);
    saveReminders(filtered);

    if (user?.uid) {
      user.getIdToken().then((idToken) => {
        fetch(`/api/user/reminders?matchId=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }).catch(() => {});
      }).catch(() => {});
    }
  };

  // Kiểm tra 1 trận đã hẹn chưa
  const isReminded = (id: string): boolean => {
    return reminders.some((r) => r.id === id);
  };

  // Xóa toàn bộ lịch nhắc
  const clearAllReminders = () => {
    saveReminders([]);
  };

  // Background worker kiểm tra mốc thời gian và bắn thông báo
  useEffect(() => {
    const checkSchedule = () => {
      if (typeof window === "undefined" || reminders.length === 0) return;
      const now = Date.now();
      let updated = false;

      const newList = reminders.map((r) => {
        // Nếu trận đã kết thúc hơn 3 giờ -> tự động dọn dẹp
        if (r.timestamp !== Number.MAX_SAFE_INTEGER && now - r.timestamp > 3 * 3600 * 1000) {
          updated = true;
          return null;
        }

        const diff = r.timestamp - now;
        const tenMins = 10 * 60 * 1000;

        // 1. Mốc 10 phút trước trận
        if (!r.notified10m && diff <= tenMins && diff > 0) {
          updated = true;
          playChimeSound();

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`⏰ 10 phút nữa bóng lăn: ${r.team1} vs ${r.team2}`, {
                body: `Trận đấu thuộc ${r.tournament || r.group || "Bóng đá trực tiếp"} sắp bắt đầu. Bấm để xem ngay trên Nanaflix!`,
                icon: r.homeLogo || "/logo.png",
                tag: `reminder-10m-${r.id}`,
              });
            } catch {}
          }
          return { ...r, notified10m: true };
        }

        // 2. Mốc trận đấu bắt đầu
        if (!r.notifiedStart && now >= r.timestamp && now - r.timestamp < 15 * 60 * 1000) {
          updated = true;
          playChimeSound();

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`🔴 TRẬN ĐẤU ĐÃ BẮT ĐẦU: ${r.team1} vs ${r.team2}`, {
                body: `Trận cầu nảy lửa đang trực tiếp với BLV tiếng Việt. Vào xem ngay nào!`,
                icon: r.homeLogo || "/logo.png",
                tag: `reminder-start-${r.id}`,
              });
            } catch {}
          }
          return { ...r, notifiedStart: true };
        }

        return r;
      });

      if (updated) {
        saveReminders(newList.filter(Boolean) as MatchReminder[]);
      }
    };

    // Chỉ kiểm tra khi có lời nhắc được đặt
    if (!reminders || reminders.length === 0) return;

    // Kiểm tra định kỳ mỗi 60 giây
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule();

    return () => clearInterval(interval);
  }, [reminders]);

  return {
    reminders,
    addReminder,
    removeReminder,
    isReminded,
    clearAllReminders,
    requestPermission,
  };
}
