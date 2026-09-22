"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, X, Sparkles, ExternalLink, Film, Loader2, BookOpen, Check } from "lucide-react";
import { ActorProfile } from "@/services/wikipediaService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/Toast";
import {
  isFollowingActorSync,
  toggleFollowActor,
  subscribeFollowedActors,
} from "@/services/actorFollowService";

export interface ActorBioModalProps {
  initialActorName?: string;
}

export const ActorBioModal: React.FC<ActorBioModalProps> = ({ initialActorName }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(Boolean(initialActorName));
  const [actorName, setActorName] = useState<string>(initialActorName || "");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ActorProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Cập nhật trạng thái follow khi actorName hoặc user thay đổi
  useEffect(() => {
    if (!user?.uid || !actorName) {
      setIsFollowing(false);
      return;
    }
    setIsFollowing(isFollowingActorSync(user.uid, actorName));
    const unsub = subscribeFollowedActors(user.uid, (items) => {
      const target = actorName.toLowerCase().trim();
      const match = items.some(
        (it) => it.actorName.toLowerCase().trim() === target || it.actorId.toLowerCase().trim() === target
      );
      setIsFollowing(match);
    });
    return () => unsub();
  }, [user?.uid, actorName]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast.info("Vui lòng đăng nhập để theo dõi nghệ sĩ yêu thích!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
      }
      return;
    }

    try {
      setIsFollowLoading(true);
      const newStatus = await toggleFollowActor(user.uid, {
        actorId: actorName.toLowerCase().replace(/\s+/g, "-"),
        actorName,
        actorAvatar: profile?.thumbnail,
      });
      setIsFollowing(newStatus);
      if (newStatus) {
        toast.success(`Đã theo dõi diễn viên ${actorName}`);
      } else {
        toast.info(`Đã bỏ theo dõi diễn viên ${actorName}`);
      }
    } catch {
      toast.error("Không thể cập nhật theo dõi, vui lòng thử lại sau");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const loadActor = (name: string) => {
    setActorName(name);
    setLoading(true);
    setProfile(null);

    fetch(`/api/actor-bio?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.notFound) {
          setProfile(data);
        } else {
          setProfile({
            name,
            title: name,
            description: "Nghệ sĩ / Diễn viên điện ảnh",
            extract: `Diễn viên nổi bật tham gia nhiều tác phẩm điện ảnh và truyền hình đặc sắc. Khám phá các bộ phim có sự góp mặt của ${name} ngay trên Nanaflix!`,
          });
        }
      })
      .catch(() => {
        setProfile({
          name,
          title: name,
          description: "Nghệ sĩ / Diễn viên điện ảnh",
          extract: `Khám phá các tác phẩm điện ảnh có sự tham gia của ${name} trên Nanaflix.`,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const handleOpen = (e: CustomEvent<{ name: string }>) => {
      const name = e.detail?.name;
      if (name) {
        setIsOpen(true);
        loadActor(name);
      }
    };

    window.addEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    if (initialActorName) {
      loadActor(initialActorName);
    }
    return () => {
      window.removeEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    };
  }, [initialActorName]);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-zinc-950 rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-900/90">
          <div className="flex items-center gap-2 text-rose-400">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Hồ Sơ Nghệ Sĩ & Tiểu Sử Điện Ảnh
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-netflix-red" />
              <p className="text-xs font-medium">Đang tra cứu dữ liệu Wikipedia về {actorName}...</p>
            </div>
          ) : (
            <>
              {/* ACTOR HEADER WITH PHOTO */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 flex-none shadow-xl">
                  {profile?.thumbnail ? (
                    <Image
                      src={profile.thumbnail}
                      alt={profile.title || actorName}
                      fill
                      unoptimized
                      className="object-cover object-top"
                      sizes="100px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                    {profile?.title || actorName}
                  </h3>
                  {profile?.description && (
                    <p className="text-xs text-rose-300 font-semibold line-clamp-2">
                      {profile.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-0.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-none" />
                    <span>Nguồn dữ liệu bách khoa toàn thư Wikipedia</span>
                  </div>
                </div>
              </div>

              {/* BIO EXTRACT */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 text-xs sm:text-sm text-gray-200 leading-relaxed max-h-56 overflow-y-auto">
                <p>{profile?.extract || "Chưa có thêm mô tả chi tiết."}</p>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isFollowLoading}
                  onClick={handleToggleFollow}
                  className={`w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer border active:scale-95 ${
                    isFollowing
                      ? "bg-emerald-500/20 hover:bg-rose-500/20 border-emerald-500/40 hover:border-rose-500/40 text-emerald-300 hover:text-rose-300"
                      : "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 hover:text-amber-200"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Đang theo dõi</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>+ Theo dõi diễn viên</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/?actor=${encodeURIComponent(actorName)}`}
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg active:scale-98 cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  <span>Xem phim của {actorName}</span>
                </Link>

                {profile?.wikiUrl && (
                  <a
                    href={profile.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition border border-white/15 cursor-pointer"
                  >
                    <span>Wikipedia</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;
