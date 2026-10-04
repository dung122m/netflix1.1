/**
 * VIETNAM HISTORICAL MILESTONES DATASET
 * Fact-checked historical events in Vietnamese history with verified dates and sources.
 * Maintained separately from cultural holidays to preserve clean domain boundaries.
 * Backed by the foundation in src/data/history/featuredHistory.ts
 */

import { FEATURED_HISTORICAL_EVENTS } from "./history/featuredHistory";
import { HistoricalVisualTheme } from "./history/types";

export type { HistoricalVisualTheme };

export interface VietnamHistoricalEvent {
  id: string;
  solarDate: { month: number; day: number };
  lunarDate?: { lunarMonth: number; lunarDay: number };
  year: number;
  title: string;
  summary: string;
  context?: string;
  significance: string;
  figures?: string[];
  location?: string;
  keyFacts?: string[];
  didYouKnow?: string;
  visualTheme: HistoricalVisualTheme;
  sources: string[];
}

export const VIETNAM_HISTORICAL_EVENTS: VietnamHistoricalEvent[] = FEATURED_HISTORICAL_EVENTS.map((fe) => ({
  id: fe.id,
  solarDate: {
    month: fe.date.month || 1,
    day: fe.date.day || 1,
  },
  lunarDate: fe.date.lunarDate,
  year: fe.year || 0,
  title: fe.title,
  summary: fe.summary,
  context: fe.context,
  significance: fe.significance,
  figures: fe.figures,
  location: fe.location,
  keyFacts: fe.keyFacts,
  didYouKnow: fe.didYouKnow,
  visualTheme: fe.visualTheme,
  sources: fe.sources,
}));

/**
 * Helper to retrieve historical events occurring on a specific solar or lunar day
 */
export function getHistoricalEventsForDate(
  month: number,
  day: number,
  lunarMonth?: number,
  lunarDay?: number
): VietnamHistoricalEvent[] {
  return VIETNAM_HISTORICAL_EVENTS.filter((ev) => {
    // 1. Solar match
    if (ev.solarDate.month === month && ev.solarDate.day === day) {
      return true;
    }
    // 2. Lunar match (if applicable)
    if (
      ev.lunarDate &&
      lunarMonth !== undefined &&
      lunarDay !== undefined &&
      ev.lunarDate.lunarMonth === lunarMonth &&
      ev.lunarDate.lunarDay === lunarDay
    ) {
      return true;
    }
    return false;
  });
}
