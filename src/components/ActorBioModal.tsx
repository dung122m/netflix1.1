"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Sparkles, ExternalLink, Film, Loader2, BookOpen, Calendar, MapPin, Globe, Tag, UserCheck } from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { splitBlockIntoNaturalParagraphs } from "@/lib/bioFormatter";
import { cleanBioExtract } from "@/services/wikipediaService";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { EnhancedActorProfile } from "@/app/api/actor-bio/route";

export interface ActorBioModalProps {
  initialActorName?: string;
  initialAvatarUrl?: string | null;
  initialCharacter?: string;
}

export const ActorBioModal: React.FC<ActorBioModalProps> = ({
  initialActorName,
  initialAvatarUrl,
  initialCharacter,
}) => {
  const [isOpen, setIsOpen] = useState(Boolean(initialActorName));
  const [actorName, setActorName] = useState<string>(initialActorName || "");
  const [initialAvatar, setInitialAvatar] = useState<string | undefined>(initialAvatarUrl || undefined);
  const [initialChar, setInitialChar] = useState<string | undefined>(initialCharacter);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<EnhancedActorProfile | null>(null);

  useBodyScrollLock(isOpen);
  const activeActorRef = useRef<string>(actorName);

  const handleClose = () => {
    activeActorRef.current = "";
    setIsOpen(false);
    setProfile(null);
    setInitialAvatar(undefined);
    setInitialChar(undefined);
  };

  const loadActor = (name: string, fallbackAvatar?: string | null, fallbackCharacter?: string) => {
    activeActorRef.current = name;
    setActorName(name);
    setInitialAvatar(fallbackAvatar || undefined);
    setInitialChar(fallbackCharacter || undefined);
    setLoading(true);
    setProfile(null);

    fetch(`/api/actor-bio?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data: EnhancedActorProfile) => {
        if (activeActorRef.current !== name) return;
        if (data && !data.notFound) {
          setProfile(data);
        } else {
          setProfile({
            name,
            title: name,
            description: fallbackCharacter || "Nghệ sĩ / Diễn viên điện ảnh",
            thumbnail: fallbackAvatar || undefined,
            extract: `Diễn viên nổi bật tham gia nhiều tác phẩm điện ảnh và truyền hình đặc sắc. Khám phá các bộ phim có sự góp mặt của ${name} ngay trên Nanaflix!`,
            notFound: true,
          });
        }
      })
      .catch(() => {
        if (activeActorRef.current !== name) return;
        setProfile({
          name,
          title: name,
          description: fallbackCharacter || "Nghệ sĩ / Diễn viên điện ảnh",
          thumbnail: fallbackAvatar || undefined,
          extract: `Khám phá các tác phẩm điện ảnh có sự tham gia của ${name} trên Nanaflix.`,
          notFound: true,
        });
      })
      .finally(() => {
        if (activeActorRef.current === name) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    const handleOpen = (e: CustomEvent<{ name: string; avatarUrl?: string; character?: string }>) => {
      const name = e.detail?.name;
      const avatarUrl = e.detail?.avatarUrl;
      const character = e.detail?.character;
      if (name) {
        setIsOpen(true);
        loadActor(name, avatarUrl, character);
      }
    };

    window.addEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    if (initialActorName) {
      loadActor(initialActorName, initialAvatarUrl, initialCharacter);
    }
    return () => {
      window.removeEventListener("open-actor-bio" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    };
  }, [initialActorName, initialAvatarUrl, initialCharacter]);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const displayTitle = profile?.title || profile?.canonicalName || actorName;
  const displayAvatar = profile?.thumbnail || initialAvatar;
  const displayRole = profile?.roles || profile?.description || initialChar || "Nghệ sĩ / Diễn viên điện ảnh";
  const rawBio = profile?.extract || "";
  const cleanedBio = cleanBioExtract(rawBio);
  const paragraphs = cleanedBio ? splitBlockIntoNaturalParagraphs(cleanedBio) : [];

  const aliasNotice = [
    profile?.canonicalName && profile.canonicalName.toLowerCase() !== actorName.toLowerCase()
      ? profile.canonicalName
      : null,
    profile?.englishName && profile.englishName.toLowerCase() !== displayTitle.toLowerCase()
      ? profile.englishName
      : null,
  ].filter(Boolean).join(" • ");

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl md:max-w-2xl bg-zinc-950/98 rounded-3xl border border-white/20 shadow-2xl shadow-black/90 overflow-hidden transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* TOP ACCENT GRADIENT */}
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-netflix-red to-transparent opacity-90 shadow-sm shadow-netflix-red/50" />

        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-zinc-900/90 gap-2">
          <div className="flex items-center gap-2 text-rose-400 min-w-0 flex-1">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
              Hồ Sơ Nghệ Sĩ & Tiểu Sử Điện Ảnh
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {loading && !profile ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-9 h-9 animate-spin text-netflix-red" />
              <p className="text-xs sm:text-sm font-medium text-zinc-300">Đang tra cứu dữ liệu nghệ sĩ về {actorName}...</p>
            </div>
          ) : (
            <>
              {/* ACTOR HERO WITH LARGE AVATAR & METADATA */}
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 flex-none shadow-2xl ring-2 ring-white/10 group">
                  <ActorAvatar
                    name={displayTitle}
                    avatarUrl={displayAvatar}
                    shape="card"
                    sizes="140px"
                    imageClassName="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {displayTitle}
                    </h3>
                    {profile?.country && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200 font-semibold flex-none">
                        {profile.country}
                      </span>
                    )}
                  </div>

                  {aliasNotice && (
                    <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Tên khác: {aliasNotice}</span>
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-rose-300 font-semibold line-clamp-2">
                    {displayRole}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-0.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-none" />
                    <span>Dữ liệu Wikipedia & TMDb</span>
                  </div>
                </div>
              </div>

              {/* QUICK STATS CHIPS BAR */}
              {(profile?.formattedBirthday || profile?.placeOfBirth || (profile?.tags && profile.tags.length > 0)) && (
                <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-xs">
                  {profile.formattedBirthday && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-rose-400 flex-none" />
                      <span>{profile.formattedBirthday} {profile.age ? `(${profile.age})` : ""}</span>
                    </div>
                  )}

                  {profile.placeOfBirth && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 font-medium truncate max-w-full">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                      <span className="truncate">{profile.placeOfBirth}</span>
                    </div>
                  )}

                  {profile.tags && profile.tags.slice(0, 3).map((tag) => (
                    <div key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-zinc-300">
                      <Tag className="w-3 h-3 text-amber-400 flex-none" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CLEANED BIO EXTRACT */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-white/10 text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-60 sm:max-h-72 overflow-y-auto pr-3 custom-scrollbar">
                {paragraphs.length > 0 ? (
                  <div className="space-y-3">
                    {paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="leading-relaxed text-zinc-300">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400">Khám phá các tác phẩm điện ảnh đặc sắc có sự tham gia của {displayTitle} trên Nanaflix.</p>
                )}
              </div>

              {/* ACTIONS FOOTER */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                <Link
                  href={`/browse?actor=${encodeURIComponent(displayTitle)}`}
                  onClick={() => setIsOpen(false)}
                  className="min-h-[46px] h-11 px-5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-netflix-red/30 active:scale-[0.99] cursor-pointer w-full sm:flex-1 shrink-0"
                >
                  <Film className="w-4 h-4 flex-none" />
                  <span className="truncate">Xem phim của {displayTitle}</span>
                </Link>

                {profile?.slug && (
                  <Link
                    href={`/dien-vien/${profile.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="min-h-[46px] h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-white/15 cursor-pointer whitespace-nowrap w-full sm:w-auto shrink-0"
                  >
                    <span>Trang nghệ sĩ</span>
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  </Link>
                )}

                {profile?.wikiUrl && (
                  <a
                    href={profile.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[46px] h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-white/15 cursor-pointer whitespace-nowrap w-full sm:w-auto shrink-0"
                  >
                    <span>Wikipedia</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
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
