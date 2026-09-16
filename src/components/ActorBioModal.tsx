"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, X, Sparkles, ExternalLink, Film, Loader2, BookOpen, Users } from "lucide-react";
import { ActorProfile } from "@/services/wikipediaService";
import { ActorUniverseGraph } from "./ActorUniverseGraph";

export const ActorBioModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [actorName, setActorName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ActorProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"bio" | "universe">("bio");

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
        setActiveTab("bio");
        loadActor(name);
      }
    };

    window.addEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    };
  }, []);

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
              Hồ Sơ Điện Ảnh & Vũ Trụ Diễn Viên
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

        {/* TABS SELECTOR */}
        <div className="flex items-center border-b border-white/10 bg-black/40 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("bio")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "bio"
                ? "border-netflix-red text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tiểu Sử Wikipedia</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("universe")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "universe"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-gray-400 hover:text-amber-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Vũ Trụ Bạn Diễn AI</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Mới
            </span>
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {activeTab === "bio" ? (
            loading ? (
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
                  <Link
                    href={`/browse?keyword=${encodeURIComponent(actorName)}`}
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
            )
          ) : (
            <ActorUniverseGraph
              actorName={actorName}
              onSelectActor={(nextName) => loadActor(nextName)}
              onCloseModal={() => setIsOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ActorBioModal;
