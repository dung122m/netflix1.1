"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Tv,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PictureInPicture2,
  Zap,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  List,
  RotateCcw,
  Mic,
} from "lucide-react";
import { FootballMatch, StreamServer } from "@/services/liveFootballService";
import { LiveShortcutPopover } from "./LiveShortcutPopover";

// Logo hiển thị trong drawer danh sách kênh & trận đấu
function MatchRailLogo({ option }: { option: FootballMatch }) {
  const [error, setError] = useState(false);
  const logo = option.logo || option.homeLogo;

  if (logo && !error && !logo.includes("tinhlagi.pro/logo.jpg")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={option.title}
        className="w-full h-full object-contain filter drop-shadow-sm"
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
      />
    );
  }

  if (option.group.includes("FPT")) {
    return (
      <span className="text-[10px] font-black text-orange-400 font-mono">FPT</span>
    );
  }

  if (option.isEvent || option.time === "24/7") {
    return <Tv className="w-4 h-4 text-sky-400" />;
  }

  return <Radio className="w-4 h-4 text-rose-400" />;
}

function getTeamInitials(teamName: string): string {
  if (!teamName) return "⚽";
  const clean = teamName
    .replace(/^CLB\s+/i, "")
    .replace(/^FC\s+/i, "")
    .replace(/^SSC\s+/i, "")
    .replace(/^U\d+\s+/i, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// Equalizer hoạt ảnh cho kênh đang phát sóng
function PlayingEqualizer() {
  return (
    <div className="flex items-end gap-0.5 h-3 px-1">
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3" />
    </div>
  );
}

// Diagnostic helper: tính toán lượng buffer phía trước vị trí phát hiện tại (giây)
function getForwardBuffer(v: HTMLVideoElement): number {
  try {
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
        return +(v.buffered.end(i) - v.currentTime).toFixed(2);
      }
    }
  } catch {}
  return 0;
}

/**
 * Tính toán độ trễ so với Live Edge (giây) an toàn, triệt tiêu số ảo (-9000s, NaN, Infinity)
 * Latency = liveEdge - currentTime
 */
function calculateLiveLatency(
  v: HTMLVideoElement | null,
  hls: Hls | null,
): { latencySec: number; isLive: boolean } {
  if (!v) return { latencySec: 0, isLive: true };

  const curTime = v.currentTime;
  if (!Number.isFinite(curTime) || curTime < 0) {
    return { latencySec: 0, isLive: true };
  }

  const seekable = v.seekable;
  const hasSeekable = Boolean(seekable && seekable.length > 0);
  const seekableStart = hasSeekable && seekable ? seekable.start(0) : null;
  const seekableEnd =
    hasSeekable && seekable ? seekable.end(seekable.length - 1) : null;

  const livePos = hls?.liveSyncPosition;
  const hasValidLivePos =
    livePos !== undefined &&
    livePos !== null &&
    Number.isFinite(livePos) &&
    livePos > 0;

  // 1. Xác định liveEdge thực tế đáng tin cậy nhất
  let liveEdge: number | null = null;

  if (
    hasSeekable &&
    seekableEnd !== null &&
    Number.isFinite(seekableEnd) &&
    seekableEnd > 0
  ) {
    if (
      hasValidLivePos &&
      seekableStart !== null &&
      livePos >= seekableStart - 1 &&
      livePos <= seekableEnd + 2
    ) {
      liveEdge = livePos;
    } else {
      liveEdge = seekableEnd;
    }
  } else if (hasValidLivePos) {
    liveEdge = livePos;
  }

  // Nếu không có liveEdge hợp lệ -> Mặc định coi là đang ở Live Edge
  if (liveEdge === null || !Number.isFinite(liveEdge)) {
    return { latencySec: 0, isLive: true };
  }

  // 2. Tính toán: liveEdge - currentTime
  const rawLag = liveEdge - curTime;
  if (!Number.isFinite(rawLag)) {
    return { latencySec: 0, isLive: true };
  }

  // 3. Giới hạn cửa sổ trễ tối đa (clamp)
  let maxPossibleLag = 300; // Mặc định 5 phút cho sliding window
  if (hasSeekable && seekableStart !== null && seekableEnd !== null) {
    const windowDuration = seekableEnd - seekableStart;
    if (
      Number.isFinite(windowDuration) &&
      windowDuration > 0 &&
      windowDuration < 1800
    ) {
      maxPossibleLag = windowDuration;
    }
  }

  // Triệt tiêu số âm do jitter timestamp và clamp không vượt quá cửa sổ live
  const clampedLag = Math.max(
    0,
    Math.min(Math.round(rawLag), Math.round(maxPossibleLag)),
  );

  // Độ lệch <= 4 giây là dung sai bình thường của HLS segment -> đang ở Live Edge
  const isLive = clampedLag <= 4;

  return {
    latencySec: isLive ? 0 : clampedLag,
    isLive,
  };
}

export interface LiveStallRecord {
  id: number;
  timestamp: string;
  durationMs: number;
  currentTime: number;
  readyState: number;
  readyStateText: string;
  forwardBufferSec: number;
  liveLatencySec: number | "N/A";
  seekableStart: number | null;
  seekableEnd: number | null;
  level: number;
  bitrate: string;
}

declare global {
  interface Window {
    __liveStalls?: LiveStallRecord[];
  }
}

interface LivePlayerProps {
  match?: FootballMatch;
  title: string;
  servers: StreamServer[];
  blv?: string;
  time?: string;
  group?: string;
  team1?: string;
  team2?: string;
  isEvent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  logo?: string;
  isActive?: boolean;
  matchOptions?: FootballMatch[];
  showMatchRail?: boolean;
  onToggleMatchRail?: () => void;
  onCloseMatchRail?: () => void;
  onSelectMatch?: (match: FootballMatch) => void;
}

/**
 * Xác định chất lượng nguồn phát từ metadata của StreamServer:
 * - 1080p, 1080, FHD, Full HD -> "FHD"
 * - 720p, 720, HD -> "HD"
 * - Không xác định -> null (không tự gán)
 */
export function getSourceQuality(
  server?: Partial<StreamServer>,
): "FHD" | "HD" | null {
  if (!server) return null;

  // 1. Kiểm tra trường quality từ metadata nếu có
  const quality = (server.quality || "").toString().trim().toUpperCase();
  if (
    quality === "FHD" ||
    quality === "1080P" ||
    quality === "1080" ||
    quality === "FULL HD"
  ) {
    return "FHD";
  }
  if (quality === "HD" || quality === "720P" || quality === "720") {
    return "HD";
  }

  // 2. Kiểm tra tên máy chủ hoặc resolution
  const rawText = `${server.name || ""} ${
    (server as Record<string, unknown>).resolution || ""
  }`.toLowerCase();

  if (
    /\b(1080p|1080|fhd|full\s*hd)\b/i.test(rawText) ||
    /\[fhd\]/i.test(rawText) ||
    /fhd/i.test(server.name || "")
  ) {
    return "FHD";
  }

  if (
    /\b(720p|720|hd)\b/i.test(rawText) ||
    /\[hd\]/i.test(rawText) ||
    /\bhd\b/i.test(server.name || "")
  ) {
    return "HD";
  }

  return null;
}

/**
 * Điểm ưu tiên chất lượng nguồn phát:
 * FHD (2) > HD (1) > Không xác định (0)
 */
export function getQualityPriorityScore(
  server?: Partial<StreamServer>,
): number {
  const q = getSourceQuality(server);
  if (q === "FHD") return 2;
  if (q === "HD") return 1;
  return 0;
}

/**
 * Chuẩn hóa URL nguồn phát về dạng canonical để không bị lệch giữa direct URL và proxy URL
 */
export function toCanonicalSourceUrl(url?: string | null): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("/api/live-football/proxy?url=")) {
    try {
      const match = clean.match(/url=([^&]+)/);
      if (match) {
        clean = decodeURIComponent(match[1]).trim();
      }
    } catch {}
  }
  return clean;
}

/**
 * Làm sạch tên nền tảng/nhóm nguồn để hiển thị gọn gàng, hiện đại (ví dụ: Xôi Lạc, Gà Vàng, Cola TV...)
 */
export function cleanPlatformName(name?: string): string {
  if (!name) return "";
  const trimmed = name.replace(/^[🔴🟢🟡⚪🟠📡\s]+/, "").trim();
  if (
    /^(?:other|live football|bóng đá|thể thao|livetv|sports)$/i.test(trimmed)
  ) {
    return "";
  }
  let clean = trimmed
    .replace(/^(?:xoilac|xôi\s*lạc)(?:\s*z)?(?:\s*tv)?$/i, "Xôi Lạc")
    .replace(/^(?:gà\s*vàng|gavang)(?:\s*\d+h?)?(?:\s*tv)?$/i, "Gà Vàng")
    .replace(/\s*Z\s*TV$/i, "")
    .replace(/\s*\d+h?\s*TV$/i, "");

  return clean.trim();
}

/**
 * Trích xuất tên BLV hoặc tên nguồn thân thiện kèm tên nền tảng theo Kiểu 1 (BLV ... · Nền tảng)
 */
export function parseServerDisplayLabel(
  server?: StreamServer,
  index: number = 0,
): string {
  if (!server) return `Nguồn ${index + 1}`;

  const platform = cleanPlatformName(server.sourceName);

  const formatWithPlatform = (blv: string): string => {
    if (!platform) return blv;
    if (blv.toLowerCase().includes(platform.toLowerCase())) return blv;
    return `${blv} · ${platform}`;
  };

  // 1. Tên BLV trong ngoặc: "(BLV Lê Hoàn)", "(Bình luận viên Batman)", "(HD ASTRA)"
  const matchParen = server.name.match(
    /\((?:blv\s+|bình luận viên\s+)?([^)]+)\)/i,
  );
  if (matchParen && matchParen[1]) {
    const candidate = matchParen[1]
      .replace(/^(?:blv|bình luận viên)\s+/i, "")
      .replace(/^(?:hd|fhd|4k|sd)\s+/i, "")
      .replace(/\s+(?:hd|fhd|4k|sd)$/i, "")
      .trim();
    if (
      candidate &&
      !/^\d+$/.test(candidate) &&
      !/^(?:fhd|hd|4k|sd|hls|flv)$/i.test(candidate)
    ) {
      return formatWithPlatform(`BLV ${candidate}`);
    }
  }

  // 2. Tên BLV dạng "BLV ..." hoặc "Bình luận viên ..."
  const matchInline = server.name.match(
    /(?:blv|bình luận viên)\s+([^\s#\[\]()]+(?:\s+[^\s#\[\]()]+)?)/i,
  );
  if (matchInline && matchInline[1]) {
    const candidate = matchInline[1]
      .replace(/^(?:hd|fhd|4k|sd)\s+/i, "")
      .replace(/\s+(?:hd|fhd|4k|sd)$/i, "")
      .trim();
    return formatWithPlatform(`BLV ${candidate}`);
  }

  // 3. Tên nhóm nguồn sạch (ví dụ: FPT Play, K+ SPORT, Xoilac)
  if (platform) {
    return `${platform} · Nguồn ${index + 1}`;
  }

  // 4. Loại bỏ các nhãn kỹ thuật [FHD], [HD], #1, Server 1...
  const cleaned = server.name
    .replace(/\s*\[(?:FHD|HD|4K|SD|HLS|FLV)\]/gi, "")
    .replace(/#\d+/g, "")
    .trim();

  if (
    !cleaned ||
    /^(?:server|máy chủ|nguồn|link|stream)(?:\s*(?:#?\d+))?$/i.test(cleaned) ||
    /^\d+$/.test(cleaned)
  ) {
    return `Nguồn ${index + 1}`;
  }

  const stripped = cleaned
    .replace(/^(?:server|máy chủ|nguồn)\s*(?:#?\d+)?\s*[-:·]?\s*/i, "")
    .trim();
  if (stripped && stripped.length > 2 && !/^\d+$/.test(stripped)) {
    return stripped;
  }

  if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
    return cleaned;
  }

  return `Nguồn ${index + 1}`;
}

/**
 * Tìm máy chủ khởi tạo tối ưu theo thứ tự ưu tiên:
 * FHD / 1080p -> HD / 720p -> Không xác định
 */
export function findBestInitialServerIndex(
  serverList: StreamServer[],
  failedSet: Set<string> = new Set(),
): number {
  if (!serverList || serverList.length === 0) return 0;
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < serverList.length; i++) {
    const s = serverList[i];
    const canonical = toCanonicalSourceUrl(s?.url);
    if (canonical && failedSet.has(canonical)) continue;
    const score = getQualityPriorityScore(s);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      if (score === 2) {
        break; // FHD là chất lượng cao nhất, chọn ngay máy chủ đầu tiên đạt FHD
      }
    }
  }
  return bestIdx;
}

/**
 * Tìm máy chủ dự phòng tiếp theo:
 * Ưu tiên:
 * 1. Không nằm trong danh sách failed (đối chiếu bằng canonical URL)
 * 2. Điểm chất lượng cao hơn (FHD > HD > Khác)
 * 3. Duyệt xoay vòng tự nhiên sau currentIndex để tránh nhảy hỗn loạn
 * Nếu không còn nguồn nào -> trả về -1
 */
export function findNextFallbackServerIndex(
  serverList: StreamServer[],
  failedSet: Set<string>,
  currentIndex: number,
): number {
  if (!serverList || serverList.length === 0) return -1;

  const available: { index: number; score: number }[] = [];
  serverList.forEach((s, idx) => {
    const canonical = toCanonicalSourceUrl(s?.url);
    if (!canonical || !failedSet.has(canonical)) {
      available.push({
        index: idx,
        score: getQualityPriorityScore(s),
      });
    }
  });

  if (available.length === 0) return -1;

  available.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aAfter = a.index > currentIndex ? 1 : 0;
    const bAfter = b.index > currentIndex ? 1 : 0;
    if (bAfter !== aAfter) {
      return bAfter - aAfter;
    }
    return a.index - b.index;
  });

  return available[0].index;
}

function LivePlayerInner({
  match,
  title,
  servers,
  blv = match?.blv,
  time = match?.time,
  group = match?.group,
  team1 = match?.team1,
  team2 = match?.team2,
  isEvent = match?.isEvent,
  homeLogo = match?.homeLogo,
  awayLogo = match?.awayLogo,
  isActive = true,
  matchOptions = [],
  showMatchRail = false,
  onToggleMatchRail,
  onCloseMatchRail,
  onSelectMatch,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const lastLoadedUrlRef = useRef<string>("");
  const retryCountRef = useRef<number>(0);
  const fallbackCountRef = useRef<number>(0);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptIdRef = useRef<number>(0);
  const failedServersRef = useRef<Set<number>>(new Set());
  const [failedSourcesByMatch, setFailedSourcesByMatch] = useState<
    Record<string, Set<string>>
  >({});
  const failedSourcesByMatchRef = useRef<Record<string, Set<string>>>({});
  const prevMatchIdRef = useRef<string | undefined>(match?.id);

  const activeMatchId = match?.id || "default";

  const currentMatchFailedUrls = useMemo(() => {
    return failedSourcesByMatch[activeMatchId] || new Set<string>();
  }, [failedSourcesByMatch, activeMatchId]);

  const markSourceFailed = useCallback(
    (rawUrl?: string | null, serverIndex?: number) => {
      if (serverIndex !== undefined && serverIndex >= 0) {
        failedServersRef.current.add(serverIndex);
      }
      const canonical = toCanonicalSourceUrl(rawUrl);
      if (!canonical) return;

      const currentSet =
        failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();
      if (currentSet.has(canonical)) return;

      const nextSet = new Set(currentSet);
      nextSet.add(canonical);
      failedSourcesByMatchRef.current[activeMatchId] = nextSet;

      setFailedSourcesByMatch((prev) => ({
        ...prev,
        [activeMatchId]: nextSet,
      }));
    },
    [activeMatchId],
  );
  const serversRef = useRef(servers);
  serversRef.current = servers;
  const isStoppedRef = useRef<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const [selectedServerIndex, setSelectedServerIndex] = useState(() => {
    return findBestInitialServerIndex(servers);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [useProxyFallback, setUseProxyFallback] = useState<boolean>(false);
  const useProxyFallbackRef = useRef<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showAllServers, setShowAllServers] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek";
    text?: string;
  } | null>(null);

  // Xác định trận đấu có đang trước giờ bóng lăn (kickoff) hay không
  const isPreKickoff = useMemo(() => {
    const ts = match?.timestamp;
    const hasValidTimestamp =
      typeof ts === "number" &&
      ts > 0 &&
      ts !== Number.MAX_SAFE_INTEGER;
    if (hasValidTimestamp) {
      return Date.now() < ts;
    }
    return match?.timeline === "upcoming";
  }, [match?.timestamp, match?.timeline]);

  // Trạng thái đồng bộ Live Edge & Tua thời gian (Seek)
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const lastTargetTimeRef = useRef<number | null>(null);
  const seekThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const accumulatedSeekDeltaRef = useRef<number>(0);
  const seekDeltaResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trạng thái drawer danh sách kênh & trận đấu (như bên Truyền hình)
  const [internalMatchRail, setInternalMatchRail] = useState(false);
  const [railSearch, setRailSearch] = useState("");
  const [railFilter, setRailFilter] = useState<"all" | "live" | "fpt">("all");
  const activeOptionRef = useRef<HTMLButtonElement | null>(null);
  const drawerListRef = useRef<HTMLDivElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => setIsMobileScreen(window.innerWidth < 640);
    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const useMobilePortal =
    isMounted && isMobileScreen && !isFullscreen && typeof document !== "undefined";

  const isRailVisible =
    showMatchRail !== undefined ? showMatchRail : internalMatchRail;

  const toggleRail = useCallback(() => {
    if (onToggleMatchRail) {
      onToggleMatchRail();
    } else {
      setInternalMatchRail((prev) => !prev);
    }
  }, [onToggleMatchRail]);

  const closeRail = useCallback(() => {
    if (onCloseMatchRail) {
      onCloseMatchRail();
    } else {
      setInternalMatchRail(false);
    }
  }, [onCloseMatchRail]);

  // Cuộn mượt CHỈ bên trong danh sách drawer, tuyệt đối không gọi element.scrollIntoView() gây giật/dịch ngang trang
  useEffect(() => {
    if (!isRailVisible) return;
    const rafId = requestAnimationFrame(() => {
      const container = drawerListRef.current;
      const activeEl = activeOptionRef.current;
      if (!container || !activeEl) return;

      const itemTop = activeEl.offsetTop - container.offsetTop;
      const itemHeight = activeEl.clientHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;

      if (
        itemTop < currentScrollTop ||
        itemTop + itemHeight > currentScrollTop + containerHeight
      ) {
        container.scrollTo({
          top: Math.max(0, itemTop - containerHeight / 2 + itemHeight / 2),
          behavior: "smooth",
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isRailVisible, match?.id]);

  // Reset trạng thái server & player khi chuyển sang trận đấu khác
  useEffect(() => {
    if (prevMatchIdRef.current !== match?.id) {
      prevMatchIdRef.current = match?.id;
      const newMatchId = match?.id || "default";

      // Reset failed-source state của trận mới
      failedServersRef.current.clear();
      delete failedSourcesByMatchRef.current[newMatchId];
      setFailedSourcesByMatch((prev) => {
        const next = { ...prev };
        delete next[newMatchId];
        return next;
      });

      isStoppedRef.current = false;
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);
      fallbackCountRef.current = 0;
      userPausedRef.current = false;
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);

      // Tự chọn source tốt nhất của trận mới theo FHD > HD > unknown
      const initialBestIdx = findBestInitialServerIndex(serversRef.current);
      setSelectedServerIndex(initialBestIdx);
      setRetryNonce((prev) => prev + 1);
    }
  }, [match?.id]);

  // Reset proxy fallback khi chuyển đổi server (chỉ thử proxy khi server hiện tại gặp lỗi)
  useEffect(() => {
    useProxyFallbackRef.current = false;
    setUseProxyFallback(false);
  }, [selectedServerIndex]);

  const liveOptionsCount = useMemo(() => {
    return matchOptions.filter((m) => m.timeline === "live").length;
  }, [matchOptions]);

  const filteredRailOptions = useMemo(() => {
    let list = matchOptions;
    if (railFilter === "live") {
      list = list.filter((m) => m.timeline === "live");
    } else if (railFilter === "fpt") {
      list = list.filter(
        (m) =>
          m.group.includes("FPT") ||
          m.servers.some((s) => s.url.includes("fptplay")),
      );
    }
    if (railSearch.trim()) {
      const q = railSearch.toLowerCase().trim();
      list = list.filter((m) => {
        const inTitle = m.title.toLowerCase().includes(q);
        const inTeam1 = m.team1.toLowerCase().includes(q);
        const inTeam2 = m.team2.toLowerCase().includes(q);
        const inBlv = m.blv?.toLowerCase().includes(q);
        const inGroup = m.group.toLowerCase().includes(q);
        return inTitle || inTeam1 || inTeam2 || inBlv || inGroup;
      });
    }
    return list;
  }, [matchOptions, railFilter, railSearch]);

  // Danh sách các máy chủ còn hoạt động (nguồn lỗi bị ẩn hoàn toàn theo match.id)
  const availableServers = useMemo(() => {
    return servers.filter((s) => {
      if (!s.url) return false;
      const canonical = toCanonicalSourceUrl(s.url);
      return !currentMatchFailedUrls.has(canonical);
    });
  }, [servers, currentMatchFailedUrls]);

  // Sắp xếp nguồn theo thứ tự ưu tiên FHD > HD > SD cho menu chọn nguồn
  const sortedAvailableServers = useMemo(() => {
    return [...availableServers].sort((a, b) => {
      return getQualityPriorityScore(b) - getQualityPriorityScore(a);
    });
  }, [availableServers]);

  // Máy chủ hiện tại đang phát (ưu tiên máy chủ được chọn nếu còn sống, hoặc fallback sang nguồn tốt nhất)
  const currentServer = useMemo<StreamServer | null>(() => {
    const chosen = servers[selectedServerIndex];
    if (
      chosen &&
      chosen.url &&
      !currentMatchFailedUrls.has(toCanonicalSourceUrl(chosen.url))
    ) {
      return chosen;
    }
    if (availableServers.length > 0) {
      const sorted = [...availableServers].sort(
        (a, b) => getQualityPriorityScore(b) - getQualityPriorityScore(a),
      );
      return sorted[0];
    }
    return null;
  }, [servers, selectedServerIndex, currentMatchFailedUrls, availableServers]);

  const INITIAL_SERVER_LIMIT = 8;
  const hasMoreServers = availableServers.length > INITIAL_SERVER_LIMIT;

  const currentAvailableIdx = useMemo(() => {
    return availableServers.findIndex(
      (s) =>
        toCanonicalSourceUrl(s.url) === toCanonicalSourceUrl(currentServer?.url),
    );
  }, [availableServers, currentServer?.url]);

  useEffect(() => {
    if (currentAvailableIdx >= INITIAL_SERVER_LIMIT) {
      setShowAllServers(true);
    }
  }, [currentAvailableIdx]);

  const displayedServers =
    showAllServers || !hasMoreServers
      ? availableServers
      : availableServers.slice(0, INITIAL_SERVER_LIMIT);

  const [homeImgError, setHomeImgError] = useState(false);
  const [awayImgError, setAwayImgError] = useState(false);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const userMutedRef = useRef<boolean>(false);

  // Hiển thị visual feedback overlay tạm thời
  const triggerActionFeedback = useCallback(
    (
      icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek",
      text?: string,
    ) => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      setActionFeedback({ icon, text });
      actionTimeoutRef.current = setTimeout(() => {
        setActionFeedback(null);
      }, 700);
    },
    [],
  );

  // Thử lại từ đầu tất cả máy chủ khi gặp lỗi hoặc người dùng bấm Thử lại
  const handleRetry = useCallback(() => {
    isStoppedRef.current = false;
    failedServersRef.current.clear();
    // retryNonce và handleRetry KHÔNG reset failed state - source đã failed phải tiếp tục bị ẩn
    fallbackCountRef.current = 0;
    useProxyFallbackRef.current = false;
    setUseProxyFallback(false);
    lastLoadedUrlRef.current = "";
    userPausedRef.current = false;
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    const bestIdx = findBestInitialServerIndex(servers, currentMatchFailedUrls);
    setSelectedServerIndex(bestIdx);
    setRetryNonce((prev) => prev + 1);
    triggerActionFeedback("server", "Đang thử kết nối lại...");
  }, [servers, currentMatchFailedUrls, triggerActionFeedback]);

  // Khôi phục mức âm lượng đã lưu từ localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem("nanaflix_live_volume");
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val > 0 && val <= 1) {
          setVolume(val);
          volumeRef.current = val;
        } else {
          setVolume(0.9);
          volumeRef.current = 0.9;
        }
      } else {
        setVolume(0.9);
        volumeRef.current = 0.9;
      }
    } catch {
      setVolume(0.9);
      volumeRef.current = 0.9;
    }
  }, []);

  // Chặn và triệt tiêu các lỗi Unhandled Rejection do browser extensions tự tiêm vào (e.g. Coco, Media Downloader, M_ID)
  useEffect(() => {
    const isExtensionError = (err: any, reason: any) => {
      const str = `${err?.stack || err?.message || ""} ${reason?.stack || reason?.message || reason || ""}`;
      return (
        str.includes("chrome-extension://") ||
        str.includes("moz-extension://") ||
        str.includes("safari-extension://") ||
        str.includes("M_ID")
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExtensionError(event.reason, event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        isExtensionError(event.error, event.message) ||
        (event.filename && event.filename.includes("-extension://"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  // Đồng bộ volume & muted sang video element mà KHÔNG khởi động lại HLS
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Tự động chuyển đổi link FLV sang HLS nếu nhà đài hỗ trợ
  const toPlayableHlsUrl = (url: string): string => {
    if (!url) return "";
    if (url.includes("lauthaitv.cc") && url.includes(".flv")) {
      return url
        .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
        .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
    }
    if (url.includes(".flv")) {
      return url.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
    }
    return url;
  };

  // Tạo URL tối ưu: Direct-first cho HTTPS (tránh bị 403 Vercel Proxy) & Proxy cho HTTP (tránh Mixed Content)
  const getStreamUrl = (rawUrl: string, isHls: boolean) => {
    if (!rawUrl) return "";
    const playableUrl = toPlayableHlsUrl(rawUrl).trim();
    let finalUrl = playableUrl;
    // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
    if (
      finalUrl.startsWith("http://") &&
      /fptplay|akamaized|cloudfront|vtv|cdn|vietnam/i.test(finalUrl)
    ) {
      finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
    }

    const finalIsHls = isHls || finalUrl.includes(".m3u8");
    if (finalIsHls) {
      // Ưu tiên phát trực tiếp từ trình duyệt cho các link HTTPS; chỉ qua Proxy khi gặp lỗi network/CORS
      if (finalUrl.startsWith("https://")) {
        if (useProxyFallback) {
          return `/api/live-football/proxy?url=${encodeURIComponent(finalUrl)}`;
        }
        return finalUrl;
      }
      // Link HTTP thuần cần qua Proxy để không bị chặn Mixed Content trên trang HTTPS
      if (finalUrl.startsWith("http://")) {
        return `/api/live-football/proxy?url=${encodeURIComponent(finalUrl)}`;
      }
    }
    return finalUrl;
  };

  const activeUrl = currentServer
    ? getStreamUrl(currentServer.url, currentServer.isHls)
    : "";

  // Tự động ẩn controls sau 3.5s nếu không di chuyển chuột
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Xử lý khi tab thay đổi (isActive true/false) hoặc minimize tab - Cleanup triệt để tránh rò rỉ RAM
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      lastLoadedUrlRef.current = "";
      if (
        typeof document !== "undefined" &&
        document.pictureInPictureElement === video
      ) {
        document.exitPictureInPicture().catch(() => {});
        setIsPip(false);
      }
    }
  }, [isActive]);

  // Phát hiện nếu nguồn chỉ hỗ trợ iframe/embed
  const isIframe = useMemo(() => {
    if (!currentServer?.url) return false;
    const lower = currentServer.url.toLowerCase();
    return (
      lower.includes("/embed/") ||
      lower.includes("youtube.com/embed") ||
      lower.includes("youtu.be/") ||
      lower.includes("player.") ||
      lower.includes("iframe") ||
      lower.endsWith(".html") ||
      lower.endsWith(".htm")
    );
  }, [currentServer?.url]);

  // Xử lý chuyển máy chủ dự phòng tự động khi luồng phát hiện tại gặp sự cố / không phản hồi
  const executeServerFallback = useCallback(
    (customReason?: string) => {
      if (isStoppedRef.current) return;

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      attemptIdRef.current++;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
      lastLoadedUrlRef.current = "";

      const currentUrl = currentServer?.url || "";
      const isHttpsDirect =
        currentUrl.startsWith("https://") ||
        (currentUrl.startsWith("http://") &&
          /fptplay|akamaized|cloudfront|vtv|cdn|vietnam/i.test(currentUrl));

      const isPreKickoffNow = Boolean(
        (match?.timestamp &&
          match.timestamp > 0 &&
          match.timestamp !== Number.MAX_SAFE_INTEGER &&
          Date.now() < match.timestamp) ||
        match?.timeline === "upcoming"
      );

      const isNotFoundOrForbidden =
        customReason?.includes("404") ||
        customReason?.includes("403") ||
        customReason?.includes("không tồn tại");

      // 1. TRẬN CHƯA KICKOFF:
      // Tuyệt đối không gọi proxy để tránh spam khi chưa có tín hiệu phát.
      // Mỗi server/URL chỉ được thử trực tiếp tối đa 1 lần.
      if (isPreKickoffNow) {
        failedServersRef.current.add(selectedServerIndex);
        if (currentUrl) {
          markSourceFailed(currentUrl, selectedServerIndex);
        }
        useProxyFallbackRef.current = false;
        setUseProxyFallback(false);

        const currentFailed =
          failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();
        const nextIndex = findNextFallbackServerIndex(
          servers,
          currentFailed,
          selectedServerIndex,
        );

        if (nextIndex !== -1) {
          fallbackCountRef.current += 1;
          const toastText = `Máy chủ #${selectedServerIndex + 1} chưa có tín hiệu, đang thử máy chủ #${nextIndex + 1}...`;
          triggerActionFeedback("server", toastText);
          setIsLoading(true);
          setHasError(false);
          setErrorMessage("");
          setSelectedServerIndex(nextIndex);
          return;
        }

        // Tất cả server đều thất bại trước giờ bóng lăn -> DỪNG HOÀN TOÀN, không lặp lại
        isStoppedRef.current = true;
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Chưa có tín hiệu phát");
        return;
      }

      // 2. KHI TRẬN ĐÃ KICKOFF (HOẶC LIVE):
      // Nếu HTTPS trực tiếp gặp sự cố kết nối/CORS và chưa thử qua Proxy (và không phải 404/403) -> thử Proxy trước
      if (isHttpsDirect && !useProxyFallbackRef.current && !isNotFoundOrForbidden) {
        useProxyFallbackRef.current = true;
        setUseProxyFallback(true);
        const toastText = `Máy chủ #${selectedServerIndex + 1} ${customReason || "kết nối trực tiếp thất bại"}, đang thử qua cổng dự phòng (Proxy)...`;
        triggerActionFeedback("server", toastText);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage("");
        return;
      }

      // Đã thử qua Proxy hoặc link gặp lỗi thực sự -> Đánh dấu server & URL đã fail (tự động ẩn khỏi danh sách)
      failedServersRef.current.add(selectedServerIndex);
      if (currentUrl) {
        markSourceFailed(currentUrl, selectedServerIndex);
      }
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);

      // Tìm máy chủ tiếp theo có chất lượng cao nhất chưa failed (FHD -> HD -> Khác)
      const currentFailed =
        failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();
      const nextIndex = findNextFallbackServerIndex(
        servers,
        currentFailed,
        selectedServerIndex,
      );

      if (nextIndex !== -1) {
        fallbackCountRef.current += 1;
        const nextQuality = getSourceQuality(servers[nextIndex]);
        const qualityTag = nextQuality ? ` [${nextQuality}]` : "";
        const toastText = `Máy chủ #${selectedServerIndex + 1} ${customReason || "không phản hồi"}, đang chuyển sang máy chủ #${nextIndex + 1}${qualityTag}...`;
        triggerActionFeedback("server", toastText);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage("");
        setSelectedServerIndex(nextIndex);
        return;
      }

      // Tất cả máy chủ đều không phản hồi -> DỪNG HOÀN TOÀN, không lặp lại
      isStoppedRef.current = true;
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Không có nguồn phát khả dụng");
    },
    [
      servers,
      selectedServerIndex,
      currentServer?.url,
      match?.timestamp,
      match?.timeline,
      triggerActionFeedback,
      markSourceFailed,
      activeMatchId,
    ],
  );

  // Khởi tạo luồng phát HLS tối ưu độ trễ thấp (Ultra Low Latency) + Auto ABR + Watchdog bảo vệ không bị treo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentServer || !isActive) return;

    if (isStoppedRef.current) {
      return;
    }

    if (isIframe) {
      setIsLoading(false);
      setHasError(false);
      setIsPlaying(true);
      return;
    }

    if (activeUrl === lastLoadedUrlRef.current && hlsRef.current) {
      return;
    }

    lastLoadedUrlRef.current = activeUrl;
    userPausedRef.current = false;
    retryCountRef.current = 0;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const effectiveUrl = toPlayableHlsUrl(currentServer.url);
    const isEffectiveHls =
      currentServer.isHls || effectiveUrl.includes(".m3u8");

    if (!isEffectiveHls && currentServer.format === "flv") {
      failedServersRef.current.add(selectedServerIndex);
      if (currentServer.url) {
        markSourceFailed(currentServer.url, selectedServerIndex);
      }

      const nextHlsIdx = servers.findIndex(
        (s, idx) =>
          !failedServersRef.current.has(idx) &&
          (s.isHls || toPlayableHlsUrl(s.url).includes(".m3u8")),
      );
      if (nextHlsIdx !== -1) {
        fallbackCountRef.current += 1;
        setSelectedServerIndex(nextHlsIdx);
        return;
      }

      isStoppedRef.current = true;
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(
        "Định dạng này chưa được hỗ trợ trên trình duyệt này. Hãy chọn máy chủ HLS khác để xem trực tiếp!",
      );
      return;
    }

    // Khởi động Playback Watchdog: Tối đa 8 giây nếu không phát được hình ảnh thật sẽ tự động chuyển server
    const currentAttemptId = ++attemptIdRef.current;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    watchdogTimerRef.current = setTimeout(() => {
      if (currentAttemptId !== attemptIdRef.current) return;
      if (isStoppedRef.current) return;
      const v = videoRef.current;
      const isActuallyPlaying =
        v && !v.paused && (v.currentTime > 0.05 || v.readyState >= 3);
      if (isActuallyPlaying) {
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        setIsLoading(false);
        return;
      }

      executeServerFallback("không phản hồi");
    }, 12000);

    // Xác nhận luồng phát thực sự chạy mượt mà (chỉ gỡ watchdog khi video đã chạy thật)
    const onPlaybackConfirmed = () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsLoading(false);
      setHasError(false);
      setIsPlaying(true);
    };

    const onTimeUpdateCheck = () => {
      const v = videoRef.current;
      if (v && v.currentTime > 0.05) {
        onPlaybackConfirmed();
      }
    };

    video.addEventListener("playing", onPlaybackConfirmed);
    video.addEventListener("timeupdate", onTimeUpdateCheck);

    let cleanupDiagnosticListeners = () => {};
    let onNativeLoadedMetadata: (() => void) | null = null;
    let onNativeError: (() => void) | null = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxLiveSyncPlaybackRate: 1.08,
        backBufferLength: 15,
        maxBufferLength: 12,
        maxMaxBufferLength: 20,
        maxBufferSize: 15 * 1000 * 1000,
        abrEwmaDefaultEstimate: 5_000_000,
        capLevelToPlayerSize: false,
        startLevel: -1,
        // Cấu hình timeout & retry nhanh để không bắt người dùng chờ lâu khi server chết
        manifestLoadingTimeOut: 4000,
        levelLoadingTimeOut: 4000,
        fragLoadingTimeOut: 4500,
        fragLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        manifestLoadingMaxRetry: 2,
        fragLoadingMaxRetryTimeout: 1000,
        levelLoadingMaxRetryTimeout: 1000,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Lưu ý: KHÔNG hủy watchdog ở đây vì manifest parsed chưa đảm bảo video segment có thể tải được
        hls.currentLevel = -1;
        hls.loadLevel = -1;
        hls.nextLevel = -1;
        const curVol = volumeRef.current || 0.9;
        video.volume = curVol;
        video.muted = userMutedRef.current;

        if (isActive && !userPausedRef.current) {
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              setIsMuted(video.muted || video.volume === 0);
            })
            .catch(() => {
              video.muted = true;
              setIsMuted(true);
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsMuted(true);
                })
                .catch(() => {});
            });
        }
      });

      // ============================================================
      // DIAGNOSTIC-ONLY: Tự động ghi nhận tối đa 20 lần stall/ngắt hình ngắn
      // ============================================================
      let pendingStallSnapshot: {
        startTime: number;
        currentTime: number;
        readyState: number;
        readyStateText: string;
        forwardBufferSec: number;
        liveLatencySec: number | "N/A";
        seekableStart: number | null;
        seekableEnd: number | null;
        level: number;
        bitrate: string;
      } | null = null;

      const readyStateMap = [
        "HAVE_NOTHING",
        "HAVE_METADATA",
        "HAVE_CURRENT_DATA",
        "HAVE_FUTURE_DATA",
        "HAVE_ENOUGH_DATA",
      ];

      const onWaiting = () => {
        const v = videoRef.current;
        if (!v) return;
        const now = performance.now();
        const forwardBuf = getForwardBuffer(v);
        const latency = calculateLiveLatency(v, hls).latencySec;
        const sStart =
          v.seekable && v.seekable.length > 0
            ? +v.seekable.start(0).toFixed(2)
            : null;
        const sEnd =
          v.seekable && v.seekable.length > 0
            ? +v.seekable.end(v.seekable.length - 1).toFixed(2)
            : null;
        const curLvl = hls.currentLevel;
        const lvlData = curLvl >= 0 ? hls.levels[curLvl] : null;
        const bitrate = lvlData
          ? `${((lvlData.bitrate || 0) / 1000000).toFixed(2)} Mbps`
          : "Auto";

        pendingStallSnapshot = {
          startTime: now,
          currentTime: +v.currentTime.toFixed(2),
          readyState: v.readyState,
          readyStateText: readyStateMap[v.readyState] || String(v.readyState),
          forwardBufferSec: forwardBuf,
          liveLatencySec: latency,
          seekableStart: sStart,
          seekableEnd: sEnd,
          level: curLvl,
          bitrate,
        };
      };

      const onPlayingDiagnostic = () => {
        if (pendingStallSnapshot) {
          const durationMs = Math.round(
            performance.now() - pendingStallSnapshot.startTime,
          );
          const snap = pendingStallSnapshot;
          pendingStallSnapshot = null;

          if (durationMs >= 100) {
            if (typeof window !== "undefined") {
              window.__liveStalls = window.__liveStalls || [];
              const recId = window.__liveStalls.length + 1;
              const record: LiveStallRecord = {
                id: recId,
                timestamp: new Date().toLocaleTimeString(),
                durationMs,
                currentTime: snap.currentTime,
                readyState: snap.readyState,
                readyStateText: snap.readyStateText,
                forwardBufferSec: snap.forwardBufferSec,
                liveLatencySec: snap.liveLatencySec,
                seekableStart: snap.seekableStart,
                seekableEnd: snap.seekableEnd,
                level: snap.level,
                bitrate: snap.bitrate,
              };

              window.__liveStalls.push(record);
              if (window.__liveStalls.length > 20) {
                window.__liveStalls.shift();
              }
            }
          }
        }
      };

      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlayingDiagnostic);
      cleanupDiagnosticListeners = () => {
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlayingDiagnostic);
        pendingStallSnapshot = null;
      };

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (isStoppedRef.current) return;

        // Bắt lỗi HTTP 404, 403, 5xx từ response mạng
        const httpStatus = data.response?.code;
        if (
          typeof httpStatus === "number" &&
          (httpStatus === 404 || httpStatus === 403 || httpStatus >= 500)
        ) {
          executeServerFallback(`lỗi HTTP ${httpStatus}`);
          return;
        }

        // Bắt lỗi manifest không tồn tại hoặc parse lỗi nghiêm trọng
        if (
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
        ) {
          executeServerFallback("không tải được luồng phát (m3u8)");
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              const isOutsideSeekable =
                videoRef.current &&
                videoRef.current.seekable &&
                videoRef.current.seekable.length > 0 &&
                videoRef.current.currentTime < videoRef.current.seekable.start(0);
              const isCriticallyBehind =
                videoRef.current &&
                hls.liveSyncPosition &&
                Number.isFinite(hls.liveSyncPosition) &&
                hls.liveSyncPosition - videoRef.current.currentTime > 38;

              if (
                videoRef.current &&
                hls.liveSyncPosition &&
                Number.isFinite(hls.liveSyncPosition) &&
                (isOutsideSeekable || isCriticallyBehind)
              ) {
                videoRef.current.currentTime = hls.liveSyncPosition;
                setIsAtLiveEdge(true);
                setLiveLatency(0);
                hls.startLoad();
                return;
              }

              executeServerFallback("bị gián đoạn kết nối");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              executeServerFallback("gặp sự cố luồng phát");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Hỗ trợ Native HLS (Safari/iOS) với cùng cơ chế Watchdog
      video.src = activeUrl;
      const curVol = volumeRef.current || 0.9;
      video.volume = curVol;
      video.muted = isMutedRef.current;

      onNativeLoadedMetadata = () => {
        if (isActive && !userPausedRef.current) {
          video
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              setIsMuted(true);
              video.muted = true;
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {});
            });
        }
      };

      onNativeError = () => {
        if (isStoppedRef.current) return;
        executeServerFallback("không thể phát trên thiết bị này");
      };

      video.addEventListener("loadedmetadata", onNativeLoadedMetadata);
      video.addEventListener("error", onNativeError);
    }

    return () => {
      cleanupDiagnosticListeners();
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("playing", onPlaybackConfirmed);
      video.removeEventListener("timeupdate", onTimeUpdateCheck);
      if (onNativeLoadedMetadata) {
        video.removeEventListener("loadedmetadata", onNativeLoadedMetadata);
      }
      if (onNativeError) {
        video.removeEventListener("error", onNativeError);
      }
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [
    selectedServerIndex,
    currentServer,
    activeUrl,
    isActive,
    servers,
    isIframe,
    executeServerFallback,
    retryNonce,
  ]);

  // Bắt Live Edge tức thì
  const goToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;
    lastTargetTimeRef.current = null;
    const livePos = hls?.liveSyncPosition;
    if (livePos && Number.isFinite(livePos) && livePos > 0) {
      video.currentTime = livePos;
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 1);
    } else if (video.duration && Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1800) {
      video.currentTime = Math.max(0, video.duration - 1);
    }
    setIsAtLiveEdge(true);
    setLiveLatency(0);
    triggerActionFeedback("seek", "🔴 VỀ LIVE");
  }, [triggerActionFeedback]);

  // Điều khiển Play / Pause - Chỉ bắt Live Edge khi unpause nếu stream đã rơi ra ngoài seekable window
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      userPausedRef.current = true;
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      triggerActionFeedback("pause");
    } else {
      userPausedRef.current = false;
      const video = videoRef.current;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      // Chỉ đưa về live edge khi unpause nếu vị trí hiện tại đã trôi ra ngoài seekable window hoặc trễ quá 38s
      const isOutsideSeekable =
        video.seekable &&
        video.seekable.length > 0 &&
        video.currentTime < video.seekable.start(0);
      const isCriticallyBehind =
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0 &&
        livePos - video.currentTime > 38;

      if (
        (isOutsideSeekable || isCriticallyBehind) &&
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0
      ) {
        video.currentTime = livePos;
        setIsAtLiveEdge(true);
        setLiveLatency(0);
      }

      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
      triggerActionFeedback("play");
      resetControlsTimeout();
    }
  }, [isPlaying, resetControlsTimeout, triggerActionFeedback]);

  // Bật tiếng
  const unmuteSound = useCallback(() => {
    userMutedRef.current = false;
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
      if (!userPausedRef.current && isActive) {
        videoRef.current.play().catch(() => {});
      }
    }
    triggerActionFeedback("volume", `${Math.round(targetVol * 100)}%`);
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume, isActive, triggerActionFeedback]);

  // Bật / Tắt tiếng
  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      triggerActionFeedback("mute", "Tắt tiếng");
    }
  }, [isMuted, unmuteSound, triggerActionFeedback]);

  // Thay đổi âm lượng
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      setVolume(clamped);
      const shouldMute = clamped === 0;
      userMutedRef.current = shouldMute;
      setIsMuted(shouldMute);

      if (videoRef.current) {
        videoRef.current.volume = clamped;
        videoRef.current.muted = shouldMute;
      }

      triggerActionFeedback(
        shouldMute ? "mute" : "volume",
        shouldMute ? "Tắt tiếng" : `${Math.round(clamped * 100)}%`,
      );

      try {
        localStorage.setItem("nanaflix_live_volume", String(clamped));
      } catch {}
    },
    [triggerActionFeedback],
  );


  // Khóa hướng màn hình xoay ngang tự động trên thiết bị di động khi phóng to
  const lockLandscape = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ori = (screen?.orientation || (screen as any)?.mozOrientation || (screen as any)?.msOrientation) as any;
      if (ori && typeof ori.lock === "function") {
        await ori.lock("landscape").catch(() => {
          return ori.lock("landscape-primary").catch(() => {});
        });
      }
    } catch {}
  }, []);

  // Mở khóa xoay màn hình tự do khi thoát toàn màn hình
  const unlockOrientation = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ori = (screen?.orientation || (screen as any)?.mozOrientation || (screen as any)?.msOrientation) as any;
      if (ori && typeof ori.unlock === "function") {
        ori.unlock();
      }
    } catch {}
  }, []);

  // Toàn màn hình hỗ trợ đa nền tảng (Desktop, Android, iOS Safari)
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;

    // Kiểm tra trạng thái fullscreen hiện tại
    const isDocFs = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element })
        .webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element })
        .mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element })
        .msFullscreenElement,
    );

    // Kiểm tra trạng thái fullscreen riêng của iOS Safari trên video element
    const isVideoFs = Boolean(
      video &&
      (video as unknown as { webkitDisplayingFullscreen?: boolean })
        .webkitDisplayingFullscreen,
    );

    if (isDocFs || isVideoFs || isFullscreen) {
      // Thoát toàn màn hình
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => void })
          .webkitExitFullscreen
      ) {
        (
          document as unknown as { webkitExitFullscreen: () => void }
        ).webkitExitFullscreen();
      } else if (
        (document as unknown as { mozCancelFullScreen?: () => void })
          .mozCancelFullScreen
      ) {
        (
          document as unknown as { mozCancelFullScreen: () => void }
        ).mozCancelFullScreen();
      } else if (
        (document as unknown as { msExitFullscreen?: () => void })
          .msExitFullscreen
      ) {
        (
          document as unknown as { msExitFullscreen: () => void }
        ).msExitFullscreen();
      }
      setIsFullscreen(false);
      unlockOrientation();
    } else {
      // Bật toàn màn hình
      if (container && container.requestFullscreen) {
        const p = container.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions).catch(() => {
          return container.requestFullscreen().catch(() => {
            // Fallback cho iOS Safari
            if (
              video &&
              (video as unknown as { webkitEnterFullscreen?: () => void })
                .webkitEnterFullscreen
            ) {
              (
                video as unknown as { webkitEnterFullscreen: () => void }
              ).webkitEnterFullscreen();
            }
          });
        });

        if (p && typeof p.then === "function") {
          p.then(lockLandscape).catch(() => {});
        } else {
          lockLandscape();
        }
      } else if (
        container &&
        (container as unknown as { webkitRequestFullscreen?: () => void })
          .webkitRequestFullscreen
      ) {
        (
          container as unknown as { webkitRequestFullscreen: () => void }
        ).webkitRequestFullscreen();
        lockLandscape();
      } else if (
        container &&
        (container as unknown as { mozRequestFullScreen?: () => void })
          .mozRequestFullScreen
      ) {
        (
          container as unknown as { mozRequestFullScreen: () => void }
        ).mozRequestFullScreen();
        lockLandscape();
      } else if (
        container &&
        (container as unknown as { msRequestFullscreen?: () => void })
          .msRequestFullscreen
      ) {
        (
          container as unknown as { msRequestFullscreen: () => void }
        ).msRequestFullscreen();
        lockLandscape();
      } else if (
        video &&
        (video as unknown as { webkitEnterFullscreen?: () => void })
          .webkitEnterFullscreen
      ) {
        // iOS Safari trên iPhone bắt buộc dùng webkitEnterFullscreen trên video element
        (
          video as unknown as { webkitEnterFullscreen: () => void }
        ).webkitEnterFullscreen();
      }
      setIsFullscreen(true);
    }
  }, [isFullscreen, lockLandscape, unlockOrientation]);

  // Picture in Picture (PiP)
  const togglePip = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch {
      // Ignore PiP error
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element })
          .webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element })
          .mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element })
          .msFullscreenElement,
      );
      setIsFullscreen(isFs);
      if (isFs) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    };

    const video = videoRef.current;
    const handleVideoBeginFs = () => {
      setIsFullscreen(true);
      lockLandscape();
    };
    const handleVideoEndFs = () => {
      setIsFullscreen(false);
      unlockOrientation();
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleVideoBeginFs);
      video.addEventListener("webkitendfullscreen", handleVideoEndFs);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleVideoBeginFs);
        video.removeEventListener("webkitendfullscreen", handleVideoEndFs);
      }
    };
  }, [lockLandscape, unlockOrientation]);

  // Chuyển sang máy chủ tiếp theo / trước đó
  const handleSwitchServer = useCallback(
    (direction: "next" | "prev") => {
      if (availableServers.length <= 1) return;
      fallbackCountRef.current = 0;
      const currentIdx = availableServers.findIndex(
        (s) => toCanonicalSourceUrl(s.url) === toCanonicalSourceUrl(currentServer?.url),
      );
      let targetAvailableIdx = 0;
      if (currentIdx !== -1) {
        targetAvailableIdx =
          direction === "next"
            ? (currentIdx + 1) % availableServers.length
            : (currentIdx - 1 + availableServers.length) % availableServers.length;
      } else {
        targetAvailableIdx = direction === "next" ? 0 : availableServers.length - 1;
      }
      const targetServer = availableServers[targetAvailableIdx];
      if (!targetServer) return;

      const targetIdx = servers.findIndex(
        (s) => toCanonicalSourceUrl(s.url) === toCanonicalSourceUrl(targetServer.url),
      );
      if (targetIdx === -1) return;

      isStoppedRef.current = false;
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);
      lastLoadedUrlRef.current = "";
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);
      setSelectedServerIndex(targetIdx);
      setRetryNonce((prev) => prev + 1);
      const q = getSourceQuality(targetServer);
      const qBadge = q ? ` [${q}]` : "";
      const displayLabel = parseServerDisplayLabel(targetServer, targetIdx);
      triggerActionFeedback(
        "server",
        `${displayLabel}${qBadge}`,
      );
    },
    [availableServers, currentServer?.url, servers, triggerActionFeedback],
  );

  // Chuyển sang trận đấu / sự kiện thể thao tiếp theo hoặc trước đó
  const handleSwitchMatch = useCallback(
    (direction: "next" | "prev") => {
      if (!matchOptions || matchOptions.length <= 1 || !match) {
        handleSwitchServer(direction);
        return;
      }
      const currentIdx = matchOptions.findIndex(
        (m) =>
          m.id === match.id ||
          m.title.toLowerCase() === match.title.toLowerCase(),
      );
      let targetIdx = 0;
      if (currentIdx !== -1) {
        targetIdx =
          direction === "next"
            ? (currentIdx + 1) % matchOptions.length
            : (currentIdx - 1 + matchOptions.length) % matchOptions.length;
      }
      if (onSelectMatch && matchOptions[targetIdx]) {
        onSelectMatch(matchOptions[targetIdx]);
        triggerActionFeedback("match", matchOptions[targetIdx].title);
      }
    },
    [matchOptions, match, onSelectMatch, handleSwitchServer, triggerActionFeedback],
  );

  // Tua thời gian (Seek ±5s) - Phản hồi tức thì (0ms), gom nhóm nếu nhấn liên tục và clamp chuẩn theo seekable window
  const handleSeek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      // 1. Tích lũy delta để hiển thị visual feedback overlay (+5s, +10s, -15s...)
      if (seekDeltaResetTimerRef.current) {
        clearTimeout(seekDeltaResetTimerRef.current);
      }
      accumulatedSeekDeltaRef.current += seconds;
      const totalDelta = accumulatedSeekDeltaRef.current;
      triggerActionFeedback(
        "seek",
        totalDelta > 0 ? `+${totalDelta}s ⏩` : `${totalDelta}s ⏪`,
      );
      seekDeltaResetTimerRef.current = setTimeout(() => {
        accumulatedSeekDeltaRef.current = 0;
      }, 800);

      // 2. Xác định giới hạn tua an toàn dựa trên video.seekable (không dùng duration/Infinity)
      const seekable = video.seekable;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      let minSeek = 0;
      let maxSeek = video.currentTime;

      if (seekable && seekable.length > 0) {
        minSeek = seekable.start(0);
        maxSeek = seekable.end(seekable.length - 1);
      } else if (livePos && Number.isFinite(livePos) && livePos > 0) {
        maxSeek = livePos;
        minSeek = Math.max(0, livePos - 40);
      }

      // Giới hạn maxSeek không vượt quá Live Edge để tránh đụng đầu live chưa có segment
      if (livePos && Number.isFinite(livePos) && livePos > 0) {
        maxSeek = Math.min(maxSeek, livePos);
      }

      // 3. Tính toán target từ mốc hiện tại hoặc mốc đang dồn dập seek
      const baseTime =
        lastTargetTimeRef.current !== null
          ? lastTargetTimeRef.current
          : video.currentTime || 0;

      let target = baseTime + seconds;
      if (target < minSeek) {
        target = minSeek;
      } else if (target > maxSeek) {
        target = maxSeek;
      }

      lastTargetTimeRef.current = target;

      // 4. Cơ chế thực thi seek: Ngay lập tức cho 1 lần bấm, hoãn nhẹ nếu spam phím siêu nhanh (<120ms)
      const now = performance.now();
      const isRapid = now - lastSeekTimestampRef.current < 120;
      lastSeekTimestampRef.current = now;

      const commitSeek = () => {
        if (videoRef.current) {
          try {
            videoRef.current.currentTime = target;
          } catch {}
        }
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
          seekThrottleTimerRef.current = null;
        }
      };

      if (!isRapid) {
        // Lần bấm đầu tiên hoặc bấm cách quãng: seek NGAY LẬP TỨC (0ms delay)
        commitSeek();
      } else {
        // Bấm dồn dập liên tiếp: hoãn nhẹ 80ms để tránh spam decoder trình duyệt
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
        }
        seekThrottleTimerRef.current = setTimeout(commitSeek, 80);
      }

      // Đặt timer giải phóng target reference sau khi ngừng bấm 450ms
      if (targetClearTimerRef.current) {
        clearTimeout(targetClearTimerRef.current);
      }
      targetClearTimerRef.current = setTimeout(() => {
        lastTargetTimeRef.current = null;
      }, 450);
    },
    [triggerActionFeedback],
  );

  // Phím tắt bàn phím dùng chung cho Live Football Player
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      if (
        ["input", "textarea", "select"].includes(tagName) ||
        Boolean(target?.isContentEditable) ||
        target?.getAttribute?.("role") === "textbox" ||
        target?.getAttribute?.("role") === "searchbox"
      ) {
        return;
      }

      // Bỏ qua nếu người dùng đang dùng tổ hợp phím hệ thống (Ctrl + C copy, Cmd + C, Ctrl + V, Alt + ...)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Chỉ xử lý shortcut khi focus thực sự nằm trong vùng Live Player (hoặc đang tương tác với player)
      const active = document.activeElement as HTMLElement | null;
      const activeTagName = typeof active?.tagName === "string" ? active.tagName.toLowerCase() : "";
      const isPlayerContainer = Boolean(
        containerRef.current &&
          active &&
          containerRef.current.contains(active)
      );

      // Nếu focus đang ở ngoài player trên các input, form, textarea hoặc thẻ nút danh sách -> nhường quyền TV navigation
      if (!isPlayerContainer && (["input", "textarea", "select"].includes(activeTagName) || (!isFullscreen && (activeTagName === "button" || activeTagName === "a")))) {
        return;
      }

      if (e.code === "Space" || e.key === "Enter") {
        if (activeTagName === "button" || activeTagName === "input" || activeTagName === "a") {
          return;
        }
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key === "ArrowUp") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
        }
      } else if (e.key === "ArrowDown") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "n" || e.key === "N" || e.key === "PageDown") {
        e.preventDefault();
        handleSwitchServer("next");
      } else if (e.key === "p" || e.key === "P" || e.key === "PageUp") {
        e.preventDefault();
        handleSwitchServer("prev");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        goToLiveEdge();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        togglePip();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleRail();
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "Escape") {
        if (isRailVisible) {
          e.preventDefault();
          closeRail();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    goToLiveEdge,
    handleVolumeChange,
    handleSwitchServer,
    handleSeek,
    toggleRail,
    closeRail,
    isRailVisible,
    volume,
    isFullscreen,
  ]);

  const handleCopyStream = () => {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      currentServer
    ) {
      navigator.clipboard.writeText(currentServer.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const sourceDrawerMarkup =
    servers && servers.length > 0 ? (
      <>
        {/* BACKDROP KHI MỞ DRAWER CHỌN NGUỒN PHÁT TRÊN MOBILE & DESKTOP */}
        <div
          className={`${
            useMobilePortal
              ? "fixed inset-0 z-[9998] bg-black/80"
              : "fixed inset-0 sm:absolute sm:inset-0 z-40 bg-black/75 sm:bg-black/40"
          } backdrop-blur-sm transition-all duration-300 ${
            isRailVisible
              ? "opacity-100 pointer-events-auto visible"
              : "opacity-0 pointer-events-none invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            closeRail();
          }}
        />

        {/* DRAWER / BOTTOM SHEET CHỌN NGUỒN PHÁT CỦA TRẬN ĐANG XEM (TỐI ƯU CẢM ỨNG MOBILE) */}
        <aside
          className={`${
            useMobilePortal
              ? "fixed inset-x-0 bottom-0 z-[9999] w-full max-h-[85vh] rounded-t-3xl border-t border-white/20 bg-zinc-950/98 p-4 pb-6 shadow-2xl backdrop-blur-2xl"
              : "fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[360px] max-h-[85vh] sm:max-h-full rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-white/20 bg-zinc-950/98 sm:bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl"
          } transition-all duration-300 flex flex-col ${
            isRailVisible
              ? "translate-y-0 sm:translate-x-0 opacity-100 pointer-events-auto visible"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 pointer-events-none invisible"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {/* THANH VUỐT KÉO GỢI Ý TRÊN MOBILE */}
          <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                  Nguồn phát trực tiếp
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                  {sortedAvailableServers.length}
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-bold text-white">
                {title}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeRail();
              }}
              className="rounded-full p-2 text-white hover:bg-white/20 active:scale-95 bg-white/10 transition flex-shrink-0 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center border border-white/15 shadow-sm"
              title="Đóng danh sách nguồn phát"
              aria-label="Đóng"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* DANH SÁCH NGUỒN PHÁT (TOUCH-FRIENDLY, FHD > HD, TRUNCATE BLV DÀI) */}
          <div
            ref={drawerListRef}
            className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin overscroll-contain"
          >
            {sortedAvailableServers.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-red-950/20 border border-red-900/30 text-gray-300 text-xs flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <span>Tất cả nguồn phát đang gặp sự cố hoặc gián đoạn tín hiệu.</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold transition flex items-center gap-2 cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thử kết nối lại</span>
                </button>
              </div>
            ) : (
              sortedAvailableServers.map((s, idx) => {
                const isSelected =
                  toCanonicalSourceUrl(currentServer?.url) ===
                  toCanonicalSourceUrl(s.url);
                const quality = getSourceQuality(s);
                const displayLabel = parseServerDisplayLabel(s, idx);

                return (
                  <button
                    key={`${toCanonicalSourceUrl(s.url) || "srv"}-${idx}`}
                    type="button"
                    onClick={() => {
                      const origIdx = servers.findIndex(
                        (srv) =>
                          toCanonicalSourceUrl(srv.url) ===
                          toCanonicalSourceUrl(s.url),
                      );
                      const targetIdx = origIdx !== -1 ? origIdx : 0;
                      fallbackCountRef.current = 0;
                      isStoppedRef.current = false;
                      useProxyFallbackRef.current = false;
                      setUseProxyFallback(false);
                      lastLoadedUrlRef.current = "";
                      setHasError(false);
                      setErrorMessage("");
                      setIsLoading(true);
                      setSelectedServerIndex(targetIdx);
                      triggerActionFeedback(
                        "server",
                        `${quality ? `[${quality}] ` : ""}${displayLabel}`,
                      );
                      closeRail();
                    }}
                    ref={isSelected ? activeOptionRef : undefined}
                    className={`w-full rounded-xl border p-3 text-left transition flex items-center gap-2.5 cursor-pointer min-h-[48px] active:scale-[0.99] touch-manipulation ${
                      isSelected
                        ? "border-netflix-red/90 bg-red-500/15 text-white shadow-md shadow-red-950/40 ring-1 ring-netflix-red/40"
                        : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    {/* Biểu tượng Check nếu đang chọn */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isSelected ? (
                        <Check className="w-4 h-4 text-emerald-400 font-bold" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-white/20" />
                      )}
                    </div>

                    {/* Badge chất lượng FHD / HD */}
                    <div className="shrink-0 flex items-center">
                      {quality === "FHD" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <span>🟡</span>
                          <span>FHD</span>
                        </span>
                      ) : quality === "HD" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          <span>🔵</span>
                          <span>HD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-white/10 text-gray-300 border border-white/15">
                          <span>⚪</span>
                          <span>SD</span>
                        </span>
                      )}
                    </div>

                    {/* Dấu phân cách */}
                    <span className="text-gray-500 text-xs shrink-0">·</span>

                    {/* Tên BLV / Tên nguồn đã làm sạch */}
                    <span className="truncate text-xs sm:text-sm font-semibold text-gray-100 flex-1 min-w-0">
                      {displayLabel}
                    </span>

                    {/* Icon sóng động nếu đang phát */}
                    {isSelected && isPlaying && !isLoading && !hasError && (
                      <div className="shrink-0">
                        <PlayingEqualizer />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* NÚT ĐÓNG TO RÕ Ở CUỐI DRAWER DÀNH RIÊNG CHO MOBILE */}
          <div className="pt-2.5 mt-2 border-t border-white/10 flex-shrink-0 sm:hidden">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeRail();
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-bold text-xs transition border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đóng danh sách</span>
            </button>
          </div>
        </aside>
      </>
    ) : null;

  return (
    <div className="space-y-4">
      {/* 1. SCOREBOARD HEADER SÂN CỎ ĐỈNH CAO: AMBIENT GLOW & HUY HIỆU CLB SẮC NÉT */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-3 sm:p-4 shadow-2xl overflow-hidden w-full min-w-0 backdrop-blur-xl">
        {/* Glow hiệu ứng sân vận động 2 bên */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {isEvent || !team1 || !team2 || team1.trim().toLowerCase() === team2.trim().toLowerCase() ? (
            <div className="flex-1 w-full flex flex-col items-center justify-center text-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                  Kênh / Sự kiện
                </span>
                {time && time !== "Trực tiếp" && (
                  <span className="text-[10px] sm:text-xs font-bold text-gray-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    ⏰ {time}
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-lg sm:text-2xl font-black text-white tracking-wide">
                {title}
              </h2>
            </div>
          ) : (
            <>
              {/* KHU VỰC 2 ĐỘI & HUY HIỆU CLB */}
              <div className="flex-1 w-full flex items-center justify-around sm:justify-center gap-2 sm:gap-4">
                {/* ĐỘI NHÀ (TEAM 1) */}
                <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[150px] group">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-1.5 sm:p-2 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/70 group-hover:shadow-red-950/60">
                    {!homeImgError &&
                    homeLogo &&
                    !homeLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={homeLogo}
                        alt={team1 || "Đội nhà"}
                        className="w-full h-full object-contain filter drop-shadow-xl"
                        onError={() => setHomeImgError(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base sm:text-xl font-black text-rose-400 tracking-wider">
                          {team1
                            ? team1
                                .replace(/^CLB\s+/i, "")
                                .replace(/^FC\s+/i, "")
                                .slice(0, 2)
                                .toUpperCase()
                            : "H"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                          CLB
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-1 text-[11px] sm:text-xs font-black text-white line-clamp-1 leading-tight">
                    {team1}
                  </h3>
                </div>

                {/* TRUNG TÂM VS & THỜI GIAN TRẬN ĐẤU */}
                <div className="flex flex-col items-center flex-shrink-0 px-1 sm:px-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[9px] sm:text-[10px] font-black animate-pulse mb-0.5 sm:mb-1 shadow-sm">
                    <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>TRỰC TIẾP</span>
                  </div>

                  <div className="px-2.5 py-0.5 rounded-lg bg-zinc-800/90 border border-white/15 text-xs sm:text-sm font-black text-rose-400 tracking-wider shadow-inner">
                    VS
                  </div>

                  {time && (
                    <span className="mt-1 text-[9px] sm:text-[10px] text-gray-300 font-semibold bg-white/10 px-1.5 py-0.5 rounded-full border border-white/10 whitespace-nowrap">
                      ⏰ {time}
                    </span>
                  )}
                </div>

                {/* ĐỘI KHÁCH (TEAM 2) */}
                <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[150px] group">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-1.5 sm:p-2 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-sky-500/70 group-hover:shadow-sky-950/60">
                    {!awayImgError &&
                    awayLogo &&
                    !awayLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={awayLogo}
                        alt={team2 || "Đội khách"}
                        className="w-full h-full object-contain filter drop-shadow-xl"
                        onError={() => setAwayImgError(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base sm:text-xl font-black text-sky-400 tracking-wider">
                          {team2
                            ? team2
                                .replace(/^CLB\s+/i, "")
                                .replace(/^FC\s+/i, "")
                                .slice(0, 2)
                                .toUpperCase()
                            : "A"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                          CLB
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-1 text-[11px] sm:text-xs font-black text-white line-clamp-1 leading-tight">
                    {team2 || "Đối thủ"}
                  </h3>
                </div>
              </div>
            </>
          )}

          {/* META INFO BÊN PHẢI (GIẢI ĐẤU, BLV, CHẤT LƯỢNG) */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-1 sm:gap-1.5 border-t md:border-t-0 border-white/10 pt-1.5 md:pt-0">
            {group && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-200 text-[11px] font-bold shadow-sm">
                🏆 {group}
              </span>
            )}
            {blv && (
              <span
                className="px-2.5 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 text-[11px] font-extrabold shadow-sm max-w-[200px] sm:max-w-xs truncate"
                title={`BLV: ${blv}`}
              >
                🎙️ {(() => {
                  const raw = blv.replace(/^(?:blv|bình luận viên)\s+/i, "");
                  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
                  if (parts.length <= 2) return `BLV ${parts.join(", ")}`;
                  return `BLV ${parts.slice(0, 2).join(", ")} (+${parts.length - 2})`;
                })()}
              </span>
            )}
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                <span>{currentServer?.quality || "FHD 1080p"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={resetControlsTimeout}
        onFocus={() => {
          setShowControls(true);
          resetControlsTimeout();
        }}
        onClick={() => {
          // Trên màn hình cảm ứng & web: Nếu controls đang ẩn -> chạm để HIỆN lại controls, KHÔNG pause video!
          if (!showControls) {
            setShowControls(true);
            resetControlsTimeout();
            return;
          }
          // Nếu controls đang hiện và bấm vào nền video trống -> ẩn controls
          setShowControls(false);
        }}
        onDoubleClick={toggleFullscreen}
        className={`relative w-full aspect-video lg:max-h-[calc(100vh-210px)] lg:max-w-[calc((100vh-210px)*16/9)] mx-auto bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none ring-1 ring-white/10 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black contain-paint isolate ${
          showControls ? "cursor-default" : "cursor-none"
        }`}
      >
        {isIframe ? (
          <iframe
            src={currentServer?.url}
            title={title}
            className="w-full h-full object-contain bg-black border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain pointer-events-none bg-black transform-gpu will-change-transform"
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const hls = hlsRef.current;
              const { latencySec, isLive } = calculateLiveLatency(v, hls);
              setLiveLatency(latencySec);
              setIsAtLiveEdge(isLive);
            }}
            onVolumeChange={(e) => {
              const v = e.currentTarget;
              const isActuallyMuted = v.muted || v.volume === 0;
              setIsMuted(isActuallyMuted);
              if (!isActuallyMuted) {
                setVolume(v.volume);
                try {
                  localStorage.setItem("nanaflix_live_volume", String(v.volume));
                } catch {}
              }
            }}
          />
        )}

        {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI: BẤM ĐỂ QUAY VỀ LIVE EDGE */}
        <div
          className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {isAtLiveEdge ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToLiveEdge();
              }}
              title="Đang phát trực tiếp (Bấm để đồng bộ)"
              className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(229,9,20,0.5)] border border-red-400/40 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer select-none"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span>TRỰC TIẾP</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToLiveEdge();
              }}
              title={
                liveLatency > 0
                  ? `Đang trễ ~${liveLatency}s so với trực tiếp. Bấm để quay về Live Edge`
                  : "Bấm để quay về Live Edge"
              }
              className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(245,158,11,0.5)] border border-amber-300/60 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer animate-pulse select-none"
            >
              <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300" />
              <span>
                {liveLatency > 0 ? `VỀ LIVE (-${liveLatency}s)` : "VỀ LIVE"}
              </span>
            </button>
          )}
        </div>

        {!useMobilePortal && sourceDrawerMarkup}

        {/* NÚT BẬT ÂM THANH NỔI BẬT KHI ĐANG MUTE Ở GÓC TRÊN PHẢI (ẨN KHI KHÔNG TƯƠNG TÁC) */}
        {isPlaying && isMuted && !isLoading && !hasError && (
          <div
            className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-30 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unmuteSound();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[11px] sm:text-xs font-black shadow-2xl border border-white/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
            >
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              <span>BẬT TIẾNG</span>
            </button>
          </div>
        )}

        {/* ACTION FEEDBACK OVERLAY (PLAY, PAUSE, VOLUME, SERVER SWITCH) */}
        {actionFeedback && (
          <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
            <div className="flex flex-col items-center justify-center px-6 py-4 rounded-3xl bg-black/75 border border-white/25 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-200">
              {actionFeedback.icon === "play" && (
                <Play className="w-12 h-12 text-white fill-white ml-1" />
              )}
              {actionFeedback.icon === "pause" && (
                <Pause className="w-12 h-12 text-white fill-white" />
              )}
              {actionFeedback.icon === "volume" && (
                <Volume2 className="w-12 h-12 text-white" />
              )}
              {actionFeedback.icon === "mute" && (
                <VolumeX className="w-12 h-12 text-rose-400" />
              )}
              {actionFeedback.icon === "server" && (
                <Sparkles className="w-10 h-10 text-amber-400" />
              )}
              {actionFeedback.icon === "seek" && (
                <Zap className="w-10 h-10 text-cyan-400 fill-cyan-400" />
              )}
              {actionFeedback.text && (
                <span className="mt-2 text-xs sm:text-sm font-bold text-white font-mono">
                  {actionFeedback.text}
                </span>
              )}
            </div>
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-3 shadow-lg" />
            <p className="text-xs sm:text-sm font-bold text-gray-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Đang kết nối luồng phát sóng trực tiếp...</span>
            </p>
          </div>
        )}

        {/* THÔNG BÁO LỖI VÀ GỢI Ý CHUYỂN SERVER */}
        {hasError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white mb-1">
              {errorMessage === "Chưa có tín hiệu phát" || isPreKickoff
                ? "Chưa có tín hiệu phát"
                : "Chưa nhận được tín hiệu hình ảnh"}
            </h4>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">
              {errorMessage && errorMessage !== "Chưa có tín hiệu phát"
                ? errorMessage
                : isPreKickoff
                ? "Trận đấu chưa bắt đầu hoặc luồng phát pre-match chưa mở. Vui lòng bấm Thử lại sát giờ thi đấu."
                : "Luồng phát bóng đá thường mở trước giờ bóng lăn 15-30 phút. Hãy bấm thử lại hoặc chuyển sang máy chủ khác."}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/10 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>

              {servers.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSwitchServer("next")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Đổi Máy Chủ #
                    {((selectedServerIndex + 1) % servers.length) + 1}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTROLS OVERLAY BOTTOM BAR */}
        <div
          className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-t from-black/95 via-black/80 to-transparent p-1.5 sm:p-4 pt-4 sm:pt-8 flex items-center justify-between gap-1 sm:gap-4 select-none"
          >
            {/* CỤM TRÁI: PLAY/PAUSE + ĐỔI TRẬN NHANH + ÂM LƯỢNG */}
            <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink-0">
              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 shrink-0 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* NÚT ĐỔI NGUỒN PHÁT TRƯỚC / SAU TRÊN THANH CONTROL */}
              <div className="h-8 sm:h-10 flex items-center bg-black/60 rounded-full border border-white/20 px-0.5 sm:px-1 backdrop-blur-md shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchServer("prev")}
                  disabled={availableServers.length <= 1}
                  title="Nguồn phát trước (Phím P hoặc PageUp)"
                  className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition ${
                    availableServers.length <= 1
                      ? "text-gray-500 cursor-not-allowed opacity-50"
                      : "text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <span className="text-[10px] sm:text-xs font-semibold px-1 sm:px-2 text-amber-300 whitespace-nowrap select-none">
                  <span className="hidden sm:inline">Nguồn </span>
                  {`${currentAvailableIdx !== -1 ? currentAvailableIdx + 1 : 1}/${availableServers.length || 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchServer("next")}
                  disabled={availableServers.length <= 1}
                  title="Nguồn phát kế tiếp (Phím N hoặc PageDown)"
                  className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition ${
                    availableServers.length <= 1
                      ? "text-gray-500 cursor-not-allowed opacity-50"
                      : "text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* CỤM VOLUME TRÊN MOBILE (Chỉ hiện nút Mute nhỏ gọn) */}
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                className="w-8 h-8 sm:hidden rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:text-rose-400 transition cursor-pointer shrink-0 backdrop-blur-md"
              >
                <VolumeIcon
                  className={`w-3.5 h-3.5 ${
                    isMuted || volume === 0 ? "text-rose-400" : "text-white"
                  }`}
                />
              </button>

              {/* CỤM VOLUME TRÊN TABLET & DESKTOP (Hiện đầy đủ Slider + % text) */}
              <div className="h-9 sm:h-10 hidden sm:flex items-center gap-2 bg-black/60 px-3 rounded-full border border-white/20 backdrop-blur-md shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                  className="text-white hover:text-rose-400 transition cursor-pointer p-0.5 flex items-center justify-center"
                >
                  <VolumeIcon
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                      isMuted || volume === 0 ? "text-rose-400" : "text-white"
                    }`}
                  />
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Điều chỉnh âm lượng"
                  className="w-16 sm:w-24 h-1.5 bg-zinc-700 accent-netflix-red rounded-lg appearance-none cursor-pointer hover:accent-red-500 transition"
                />

                <span
                  onClick={toggleMute}
                  className="text-[11px] sm:text-xs font-mono font-bold text-gray-200 cursor-pointer hover:text-white select-none whitespace-nowrap min-w-[36px]"
                >
                  {isMuted ? "Tắt tiếng" : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>

            {/* CỤM PHẢI: NÚT KÊNH + PHÍM TẮT GỢI Ý + PIP + TOÀN MÀN HÌNH */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Nút Chọn Nguồn Phát của trận đang xem */}
              {servers && servers.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRail();
                  }}
                  title="Chọn nguồn phát của trận đang xem (Phím C)"
                  className={`h-8 sm:h-10 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 rounded-full border text-[10px] sm:text-xs font-semibold transition backdrop-blur-md cursor-pointer touch-manipulation shrink-0 ${
                    isRailVisible
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-md shadow-red-950/60"
                      : "bg-black/60 hover:bg-white/20 text-gray-200 hover:text-white border-white/20"
                  }`}
                >
                  <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <span>Nguồn</span>
                  {isRailVisible ? (
                    <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 shrink-0" />
                  )}
                </button>
              )}

              {/* Hướng dẫn phím tắt dạng popover overlay góc dưới phải */}
              <LiveShortcutPopover mode="football" />

              {/* Nút Picture in Picture - Chỉ hiện trên tablet/desktop */}
              <button
                type="button"
                onClick={togglePip}
                title="Xem thu nhỏ góc màn hình (PiP - Phím I)"
                className={`w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex rounded-full items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/20 shrink-0 ${
                  isPip
                    ? "bg-netflix-red text-white"
                    : "bg-black/60 hover:bg-white/20 text-white"
                }`}
              >
                <PictureInPicture2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Nút Toàn màn hình */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Thu nhỏ (F)" : "Toàn màn hình (F)"}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-netflix-red hover:bg-red-700 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md shrink-0 shadow-lg shadow-red-950/60 border border-white/20"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL BOTTOM SHEET CHO MOBILE: KHÔNG BỊ CLIPPED BỞI CONTAINER */}
      {useMobilePortal &&
        typeof document !== "undefined" &&
        createPortal(sourceDrawerMarkup, document.body)}

      {/* 3. THANH THÔNG TIN TRẬN ĐẤU & CHỌN MÁY CHỦ SẮC NÉT */}
      <div className="keep-dark-cinema rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/95 p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-400">
              {time && (
                <span className="font-bold text-gray-200 bg-white/10 px-2 py-0.5 rounded-md text-[11px] sm:text-xs">
                  ⏰ {time}
                </span>
              )}
              {group && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium text-[11px] sm:text-xs">
                  🏆 {group}
                </span>
              )}
              {blv && (
                <span
                  className="text-rose-400 font-bold flex items-center gap-1 bg-netflix-red/15 px-2 py-0.5 rounded-md border border-netflix-red/30 text-[11px] sm:text-xs max-w-[220px] sm:max-w-md truncate"
                  title={`BLV: ${blv}`}
                >
                  <span className="shrink-0">🎙️</span>
                  <span className="truncate">
                    {(() => {
                      const raw = blv.replace(/^(?:blv|bình luận viên)\s+/i, "");
                      const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
                      if (parts.length <= 2) return `BLV ${parts.join(", ")}`;
                      return `BLV ${parts.slice(0, 2).join(", ")} (+${parts.length - 2})`;
                    })()}
                  </span>
                </span>
              )}
            </div>
            {!isEvent && team1 && team2 && team1.trim().toLowerCase() !== team2.trim().toLowerCase() ? (
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 my-1 pt-0.5">
                {/* Đội Nhà */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-800/90 border border-white/15 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                    {homeLogo && !homeLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={homeLogo}
                        alt={team1}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-rose-500/25 to-red-950/50 flex items-center justify-center text-[9.5px] sm:text-[10.5px] font-black text-rose-300 font-mono">
                        {getTeamInitials(team1)}
                      </div>
                    )}
                  </div>
                  <span className="text-sm sm:text-lg font-black text-white truncate max-w-[140px] sm:max-w-xs">{team1}</span>
                </div>

                {/* VS Badge */}
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-[9px] sm:text-[10px] font-black text-netflix-red font-mono tracking-wider">
                  VS
                </span>

                {/* Đội Khách */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="text-sm sm:text-lg font-black text-white truncate max-w-[140px] sm:max-w-xs">{team2}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-800/90 border border-white/15 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                    {awayLogo && !awayLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={awayLogo}
                        alt={team2}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-sky-500/25 to-blue-950/50 flex items-center justify-center text-[9.5px] sm:text-[10.5px] font-black text-sky-300 font-mono">
                        {getTeamInitials(team2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <h2
                className="text-base sm:text-xl font-black text-white leading-snug break-words keep-white"
                style={{ color: "#ffffff" }}
              >
                {title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">

            <button
              type="button"
              onClick={handleCopyStream}
              title="Sao chép link stream trực tiếp"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition border border-white/10 cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* DANH SÁCH MÁY CHỦ PHÁT SÓNG (GỌN GÀNG, TỐI GIẢN & RESPONSIVE GRID) */}
        <div className="space-y-2.5 w-full min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-gray-300 font-bold text-xs">
                <span>📡 Nguồn phát</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                  {availableServers.length}
                </span>
              </span>
              {hasMoreServers && (
                <span className="text-[10px] text-gray-500 hidden sm:inline">
                  ({showAllServers ? `Tất cả ${availableServers.length}` : `8/${availableServers.length}`})
                </span>
              )}
            </div>

            {hasMoreServers && (
              <button
                type="button"
                onClick={() => setShowAllServers((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-bold text-netflix-red hover:text-red-400 transition cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10"
              >
                <span>
                  {showAllServers
                    ? "Thu gọn"
                    : `+${availableServers.length - INITIAL_SERVER_LIMIT} nguồn khác`}
                </span>
                {showAllServers ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 w-full min-w-0 pt-0.5 max-h-72 overflow-y-auto">
            {availableServers.length === 0 ? (
              <div className="col-span-full py-4 px-3 text-center rounded-xl bg-red-950/20 border border-red-900/30 text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>Không có nguồn phát khả dụng</span>
              </div>
            ) : (
              displayedServers.map((s, idx) => {
                const isSelected = currentServer?.url === s.url;
                const qualityBadge = getSourceQuality(s);
                const cleanName = parseServerDisplayLabel(s, idx);

                return (
                  <button
                    key={`${toCanonicalSourceUrl(s.url) || "sv"}-${idx}`}
                    type="button"
                    onClick={() => {
                      fallbackCountRef.current = 0;
                      isStoppedRef.current = false;
                      const origIdx = servers.findIndex(
                        (srv) =>
                          toCanonicalSourceUrl(srv.url) ===
                          toCanonicalSourceUrl(s.url),
                      );
                      const targetIdx = origIdx !== -1 ? origIdx : 0;
                      useProxyFallbackRef.current = false;
                      setUseProxyFallback(false);
                      lastLoadedUrlRef.current = "";
                      setHasError(false);
                      setErrorMessage("");
                      setIsLoading(true);
                      setSelectedServerIndex(targetIdx);
                      setRetryNonce((prev) => prev + 1);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer border text-left min-w-0 ${
                      isSelected
                        ? "bg-netflix-red text-white border-netflix-red shadow-md shadow-red-950/50 scale-[1.01]"
                        : "bg-black/60 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800/90"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? "bg-white animate-ping" : "bg-emerald-400"
                        }`}
                      />
                      <span className="truncate">{cleanName}</span>
                    </div>

                    {qualityBadge && (
                      <span
                        className={`shrink-0 px-1.5 py-0.5 text-[9px] font-black rounded tracking-wider border ${
                          qualityBadge === "FHD"
                            ? isSelected
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : isSelected
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {qualityBadge}
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {hasMoreServers && !showAllServers && (
              <button
                type="button"
                onClick={() => setShowAllServers(true)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-dashed border-white/20 sm:col-span-2 lg:col-span-3"
              >
                <span>+{availableServers.length - INITIAL_SERVER_LIMIT} nguồn khác</span>
                <ChevronDown className="w-3.5 h-3.5 text-netflix-red" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const LivePlayer = React.memo(LivePlayerInner);
export default LivePlayer;
