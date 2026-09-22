import { FollowedActorItem } from "@/types/user";

export type { FollowedActorItem };

const FOLLOWED_ACTORS_PREFIX = "nanaflix_followed_actors_";

/**
 * Lấy danh sách diễn viên/nghệ sĩ đang theo dõi từ LocalStorage cache
 */
export function getLocalFollowedActors(userId: string): FollowedActorItem[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${FOLLOWED_ACTORS_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

/**
 * Lưu danh sách diễn viên/nghệ sĩ vào LocalStorage cache
 */
export function setLocalFollowedActors(userId: string, items: FollowedActorItem[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${FOLLOWED_ACTORS_PREFIX}${userId}`, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("followed-actors-updated", { detail: { userId, items } }));
  } catch {}
}

/**
 * Lấy token Firebase ID cho các yêu cầu xác thực API
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
  } catch {}
  return { "Content-Type": "application/json" };
}

/**
 * Lấy danh sách diễn viên theo dõi từ Cloud Supabase và đồng bộ local cache
 */
export async function getFollowedActors(userId: string): Promise<FollowedActorItem[]> {
  if (!userId) return [];

  // 1. Phục vụ ngay từ Local cache (0ms)
  const local = getLocalFollowedActors(userId);

  // 2. Tải bản mới nhất từ API Server
  try {
    const headers = await getAuthHeader();
    if (headers.Authorization) {
      const res = await fetch("/api/user/actors", {
        method: "GET",
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          setLocalFollowedActors(userId, json.items);
          return json.items;
        }
      }
    }
  } catch (err) {
    console.warn("[actorFollowService] Failed to fetch remote followed actors:", err);
  }

  return local;
}

/**
 * Kiểm tra nhanh xem người dùng có đang theo dõi diễn viên này không (0ms)
 */
export function isFollowingActorSync(userId: string, actorIdentifier: string): boolean {
  if (!userId || !actorIdentifier) return false;
  const list = getLocalFollowedActors(userId);
  const target = actorIdentifier.toLowerCase().trim();
  return list.some(
    (item) =>
      item.actorId.toLowerCase().trim() === target ||
      item.actorName.toLowerCase().trim() === target
  );
}

/**
 * Bật/Tắt theo dõi nghệ sĩ
 * Trả về true nếu vừa follow, false nếu vừa unfollow
 */
export async function toggleFollowActor(
  userId: string,
  actor: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
  }
): Promise<boolean> {
  if (!userId || !actor.actorName) return false;

  const cleanActorId = actor.actorId || actor.actorName.toLowerCase().replace(/\s+/g, "-");
  const list = getLocalFollowedActors(userId);
  const targetId = cleanActorId.toLowerCase().trim();
  const targetName = actor.actorName.toLowerCase().trim();

  const existingIndex = list.findIndex(
    (item) =>
      item.actorId.toLowerCase().trim() === targetId ||
      item.actorName.toLowerCase().trim() === targetName
  );

  let isNowFollowing = false;
  let updatedList: FollowedActorItem[];

  if (existingIndex >= 0) {
    // Unfollow
    updatedList = list.filter((_, idx) => idx !== existingIndex);
    isNowFollowing = false;
    setLocalFollowedActors(userId, updatedList);

    // Call API async
    try {
      const headers = await getAuthHeader();
      if (headers.Authorization) {
        fetch(`/api/user/actors?actorId=${encodeURIComponent(cleanActorId)}`, {
          method: "DELETE",
          headers,
        }).catch(() => {});
      }
    } catch {}
  } else {
    // Follow
    const newItem: FollowedActorItem = {
      actorId: cleanActorId,
      actorName: actor.actorName,
      actorAvatar: actor.actorAvatar,
      createdAt: Date.now(),
    };
    updatedList = [newItem, ...list];
    isNowFollowing = true;
    setLocalFollowedActors(userId, updatedList);

    // Call API async
    try {
      const headers = await getAuthHeader();
      if (headers.Authorization) {
        fetch("/api/user/actors", {
          method: "POST",
          headers,
          body: JSON.stringify({
            actorId: cleanActorId,
            actorName: actor.actorName,
            actorAvatar: actor.actorAvatar,
          }),
        }).catch(() => {});
      }
    } catch {}
  }

  return isNowFollowing;
}

/**
 * Đăng ký lắng nghe danh sách diễn viên theo dõi thời gian thực
 */
export function subscribeFollowedActors(
  userId: string,
  onUpdate: (items: FollowedActorItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // Khởi tạo ngay từ local
  const initial = getLocalFollowedActors(userId);
  onUpdate(initial);

  // Tải đồng bộ cloud ngầm
  getFollowedActors(userId).then((items) => {
    if (items) onUpdate(items);
  });

  const handleUpdate = (e: Event) => {
    const customEv = e as CustomEvent<{ userId?: string; items?: FollowedActorItem[] }>;
    if (!customEv.detail?.userId || customEv.detail.userId === userId) {
      const fresh = customEv.detail?.items || getLocalFollowedActors(userId);
      onUpdate(fresh);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("followed-actors-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("followed-actors-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    }
  };
}
