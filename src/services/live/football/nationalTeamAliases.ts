/**
 * Canonical National Team Aliases
 * Loaded from static dataset @/data/live/nationalTeamAliases.json (720+ multilingual aliases across 204 national teams).
 */
import nationalTeamAliasesData from "@/data/live/nationalTeamAliases.json";

export const NATIONAL_TEAM_CANONICAL_MAP: Record<string, string> =
  nationalTeamAliasesData as Record<string, string>;

export const NATIONAL_TEAM_CANONICAL_KEYS = new Set(
  Object.values(NATIONAL_TEAM_CANONICAL_MAP)
);
