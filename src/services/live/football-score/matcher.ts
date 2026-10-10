import {
  getTeamAsset,
  normalizeTeamKey,
  normalizeTeamTokens,
} from "@/data/live/teamAssets";
import { LiveMatchScore, LiveScoreboardEvent } from "./types";

/**
 * Làm sạch tên đội bóng thô:
 * - Loại bỏ dấu ba chấm cắt cụt ("...", "…")
 * - Loại bỏ khoảng trắng thừa và ký tự bao quanh
 */
export function cleanRawTeamString(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[.…]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kiểm tra xem hai tên đội bóng có đại diện cho cùng một đội hay không:
 * 1. Tra cứu qua từ điển tài sản đội bóng đã xác minh (teamAssets - ESPN canonical name)
 * 2. So khớp khóa chuẩn hóa (không dấu, viết thường, bỏ tiền tố CLB/FC)
 * 3. Chống hoàn toàn việc nhận nhầm các đội cùng thành phố/tên gần giống (vd: Man Utd vs Man City, Real Madrid vs Real Sociedad)
 */
export function isSameTeam(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = cleanRawTeamString(nameA);
  const cleanB = cleanRawTeamString(nameB);
  if (!cleanA || !cleanB) return false;

  // 1. So khớp qua Canonical Asset trong teamAssets
  const assetA = getTeamAsset(cleanA) || getTeamAsset(nameA);
  const assetB = getTeamAsset(cleanB) || getTeamAsset(nameB);

  if (assetA && assetB && assetA.name.toLowerCase() === assetB.name.toLowerCase()) {
    return true;
  }

  // 2. So khớp theo Key chuẩn hóa (đã lọc tiền tố fc, ac, clb...)
  const keyA = normalizeTeamKey(cleanA);
  const keyB = normalizeTeamKey(cleanB);
  if (keyA && keyB && keyA === keyB) {
    return true;
  }

  // 3. Đối chiếu chéo giữa Canonical Asset và Key chuẩn hóa
  if (assetA && keyB) {
    const assetCanonicalKey = normalizeTeamKey(assetA.name);
    if (assetCanonicalKey === keyB) return true;
  }
  if (assetB && keyA) {
    const assetCanonicalKey = normalizeTeamKey(assetB.name);
    if (assetCanonicalKey === keyA) return true;
  }

  // 4. Nếu một bên là tên bị cắt ngắn (ít nhất 6 ký tự) nhưng khớp trọn vẹn phần đầu của bên kia
  // Ví dụ: "bournemout" vs "bournemouth", "wolverhampt" vs "wolverhampton"
  if (keyA && keyB) {
    const minLen = Math.min(keyA.length, keyB.length);
    if (minLen >= 8 && (keyA.startsWith(keyB) || keyB.startsWith(keyA))) {
      // Đảm bảo không nhầm Manchester (City vs United)
      const isDangerousCityPrefix =
        keyA.startsWith("manchester") ||
        keyB.startsWith("manchester") ||
        keyA.startsWith("real") ||
        keyB.startsWith("real") ||
        keyA.startsWith("atletico") ||
        keyB.startsWith("atletico") ||
        keyA.startsWith("inter") ||
        keyB.startsWith("inter") ||
        keyA.startsWith("milan") ||
        keyB.startsWith("milan");

      if (!isDangerousCityPrefix) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Ghép trận đấu từ nguồn M3U với sự kiện tương ứng từ livescore API
 */
export function matchFixtureToScore(
  fixture: {
    team1: string;
    team2: string;
    sport?: string;
    timestamp?: number;
  },
  events: LiveScoreboardEvent[],
): LiveMatchScore | null {
  if (!fixture.team1 || !fixture.team2 || !events || events.length === 0) {
    return null;
  }

  // Chỉ ghép tỷ số cho môn bóng đá
  if (fixture.sport && fixture.sport !== "football") {
    return null;
  }

  interface Candidate {
    event: LiveScoreboardEvent;
    isReversed: boolean;
    timeDiffMs: number;
  }

  const candidates: Candidate[] = [];

  for (const ev of events) {
    const homeName = ev.homeTeam.name || ev.homeTeam.displayName;
    const awayName = ev.awayTeam.name || ev.awayTeam.displayName;

    // 1. Kiểm tra thứ tự trực tiếp (team1 là home, team2 là away)
    const directMatch =
      isSameTeam(fixture.team1, homeName) &&
      isSameTeam(fixture.team2, awayName);

    // 2. Kiểm tra thứ tự đảo chiều (team1 là away, team2 là home)
    const reversedMatch =
      !directMatch &&
      isSameTeam(fixture.team1, awayName) &&
      isSameTeam(fixture.team2, homeName);

    if (directMatch || reversedMatch) {
      let timeDiffMs = 0;
      if (fixture.timestamp && fixture.timestamp > 0 && ev.date) {
        const evTime = Date.parse(ev.date);
        if (!isNaN(evTime)) {
          timeDiffMs = Math.abs(fixture.timestamp - evTime);
        }
      }

      candidates.push({
        event: ev,
        isReversed: reversedMatch,
        timeDiffMs,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Nếu có nhiều hơn 1 ứng viên, chọn trận có thời gian thi đấu gần nhất (dưới 36h)
  let chosenCandidate: Candidate;
  if (candidates.length === 1) {
    chosenCandidate = candidates[0];
  } else {
    // Sắp xếp theo độ lệch thời gian
    candidates.sort((a, b) => a.timeDiffMs - b.timeDiffMs);
    // Nếu độ lệch thời gian của ứng viên gần nhất quá lớn (> 36h) hoặc 2 ứng viên có cùng thời gian -> không đủ tin cậy
    if (candidates[0].timeDiffMs > 36 * 60 * 60 * 1000) {
      return null;
    }
    chosenCandidate = candidates[0];
  }

  const { event: ev, isReversed } = chosenCandidate;

  const team1Score = isReversed ? ev.awayScore : ev.homeScore;
  const team2Score = isReversed ? ev.homeScore : ev.awayScore;

  return {
    eventId: ev.id,
    leagueSlug: ev.leagueSlug,
    team1Score,
    team2Score,
    homeScore: ev.homeScore,
    awayScore: ev.awayScore,
    isReversed,
    status: ev.status,
    statusDetail: ev.statusDetail,
    displayClock: ev.displayClock,
    period: ev.period,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Xây dựng map { [matchId]: LiveMatchScore } cho toàn bộ danh sách trận đấu
 */
export function buildScoresMap(
  matches: Array<{
    id: string;
    team1: string;
    team2: string;
    sport?: string;
    timestamp?: number;
  }>,
  events: LiveScoreboardEvent[],
): Record<string, LiveMatchScore> {
  const map: Record<string, LiveMatchScore> = {};
  if (!matches || matches.length === 0 || !events || events.length === 0) {
    return map;
  }

  for (const m of matches) {
    const score = matchFixtureToScore(m, events);
    if (score) {
      map[m.id] = score;
    }
  }

  return map;
}
