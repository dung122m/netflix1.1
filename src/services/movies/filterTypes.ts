export interface MovieFilterParams {
  category?: string;
  country?: string;
  year?: string;
  keyword?: string;
  page?: number;
  limit?: number;
  type?: string;
  slug?: string;
  sort?:
  | "latest"
  | "rating"
  | "views"
  | "year"
  | "year-asc"
  | "year-desc"
  | "oldest"
  | "time-asc"
  | "time-desc"
  | "rating-asc"
  | "rating-desc"
  | "views-asc"
  | "views-desc"
  | string;
  skipKvCache?: boolean;
  posterEnrichmentBudgetMs?: number;
}

export type NormalizedSortField = "modified.time" | "year" | "view" | "rating";
export type NormalizedSortDirection = "desc" | "asc";

export interface ParsedSortMode {
  field: NormalizedSortField;
  direction: NormalizedSortDirection;
}

export function parseSortMode(rawSort?: string): ParsedSortMode {
  const s = (rawSort || "").trim().toLowerCase();
  if (s === "year" || s === "year-desc" || s === "year_desc") {
    return { field: "year", direction: "desc" };
  }
  if (s === "year-asc" || s === "year_asc" || s === "year-oldest") {
    return { field: "year", direction: "asc" };
  }
  if (s === "oldest" || s === "time-asc" || s === "time_asc") {
    return { field: "modified.time", direction: "asc" };
  }
  if (s === "views" || s === "views-desc" || s === "views_desc") {
    return { field: "view", direction: "desc" };
  }
  if (s === "views-asc" || s === "views_asc") {
    return { field: "view", direction: "asc" };
  }
  if (s === "rating" || s === "rating-desc" || s === "rating_desc") {
    return { field: "rating", direction: "desc" };
  }
  if (s === "rating-asc" || s === "rating_asc") {
    return { field: "rating", direction: "asc" };
  }
  // Mặc định: Mới cập nhật (modified.time DESC)
  return { field: "modified.time", direction: "desc" };
}

export interface AiCandidateOptions {
  minCandidates?: number;
  skipRelevanceScoring?: boolean;
}
