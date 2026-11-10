import { MatchKeyEvent } from "./types";

export interface GroupedGoalScorer {
  playerName: string;
  times: string[];
}

/**
 * Phân tích và nhóm các bàn thắng theo cầu thủ:
 * - Lọc đúng đội nhà / đội khách (home / away).
 * - Bỏ qua các bàn thắng bị hủy (VAR disallowed) hoặc sút hỏng penalty.
 * - Nhóm các bàn thắng của cùng một cầu thủ (ví dụ: E. Haaland 12', 34' (P)).
 * - Định dạng thời gian chuẩn xác, có ghi chú phạt đền (P) hoặc phản lưới nhà (OG).
 */
export function parseGoalScorers(
  events: MatchKeyEvent[] | undefined,
  side: "home" | "away",
  teamName?: string,
  teamDisplayName?: string,
  oppositeTeamName?: string,
  oppositeTeamDisplayName?: string,
): GroupedGoalScorer[] {
  if (!events || !Array.isArray(events)) return [];

  const goalEvents = events.filter((ev) => {
    if (ev.type !== "goal") return false;

    // Bỏ qua các bàn thắng bị hủy hoặc sút hỏng penalty
    const textLower = (ev.text || "").toLowerCase();
    if (
      textLower.includes("disallowed") ||
      textLower.includes("overturned") ||
      textLower.includes("missed penalty") ||
      textLower.includes("penalty missed") ||
      textLower.includes("penalty saved")
    ) {
      return false;
    }

    if (ev.homeAway === side) return true;

    // Fallback nếu sự kiện chưa gán rõ homeAway
    if (!ev.homeAway) {
      const name = (teamName || "").toLowerCase().trim();
      const dispName = (teamDisplayName || "").toLowerCase().trim();
      const oppName = (oppositeTeamName || "").toLowerCase().trim();
      const oppDispName = (oppositeTeamDisplayName || "").toLowerCase().trim();

      // 1. Kiểm tra tên đội trong ngoặc đơn sau tên cầu thủ: ví dụ "Erling Haaland (Manchester City)"
      const inParensCurrent =
        (name && textLower.includes(`(${name})`)) ||
        (dispName && textLower.includes(`(${dispName})`));
      const inParensOpposite =
        (oppName && textLower.includes(`(${oppName})`)) ||
        (oppDispName && textLower.includes(`(${oppDispName})`));

      if (inParensCurrent && !inParensOpposite) return true;
      if (inParensOpposite && !inParensCurrent) return false;

      // 2. Kiểm tra cú pháp "Goal! TeamName" hoặc "Goal - TeamName"
      const goalForCurrent =
        (name && (textLower.includes(`goal! ${name}`) || textLower.includes(`goal - ${name}`))) ||
        (dispName && (textLower.includes(`goal! ${dispName}`) || textLower.includes(`goal - ${dispName}`)));
      const goalForOpposite =
        (oppName && (textLower.includes(`goal! ${oppName}`) || textLower.includes(`goal - ${oppName}`))) ||
        (oppDispName && (textLower.includes(`goal! ${oppDispName}`) || textLower.includes(`goal - ${oppDispName}`)));

      if (goalForCurrent && !goalForOpposite) return true;
      if (goalForOpposite && !goalForCurrent) return false;

      // 3. Fallback nếu chỉ một đội được nhắc đến trong văn bản
      const mentionsCurrent =
        (name && textLower.includes(name)) ||
        (dispName && textLower.includes(dispName));
      const mentionsOpposite =
        (oppName && textLower.includes(oppName)) ||
        (oppDispName && textLower.includes(oppDispName));

      if (mentionsCurrent && !mentionsOpposite) return true;
      if (mentionsOpposite && !mentionsCurrent) return false;
    }

    return false;
  });

  // Sắp xếp bàn thắng theo thứ tự thời gian tăng dần
  const sortedGoals = [...goalEvents].sort(
    (a, b) => (a.minute || 0) - (b.minute || 0),
  );

  // Gom nhóm các bàn thắng theo cầu thủ
  const playerMap = new Map<string, string[]>();

  for (const ev of sortedGoals) {
    let name = (ev.playerName || "").trim();
    if (!name) {
      // Trích xuất tên từ mô tả text nếu thiếu playerName
      const match = ev.text?.match(
        /(?:Goal!|Goal\s*-)\s*.*?[0-9]+\s*,\s*.*?[0-9]+\.\s*([^(]+)/i,
      );
      if (match && match[1]) {
        name = match[1].trim();
      } else {
        name = ev.text?.trim() || "Bàn thắng";
      }
    }

    let clock = (ev.clock || (ev.minute ? `${ev.minute}` : "")).trim();
    if (clock && !clock.endsWith("'")) {
      clock = `${clock}'`;
    }
    if (!clock && ev.minute) {
      clock = `${ev.minute}'`;
    }

    if (ev.isPenalty) {
      clock = clock ? `${clock} (P)` : "(P)";
    } else if (ev.isOwnGoal) {
      clock = clock ? `${clock} (OG)` : "(OG)";
    }

    if (!playerMap.has(name)) {
      playerMap.set(name, []);
    }
    const times = playerMap.get(name)!;
    if (clock && !times.includes(clock)) {
      times.push(clock);
    }
  }

  const result: GroupedGoalScorer[] = [];
  for (const [playerName, times] of playerMap.entries()) {
    result.push({ playerName, times });
  }
  return result;
}
