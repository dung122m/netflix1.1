/**
 * VIETNAM HISTORICAL MILESTONES DATASET
 * Fact-checked historical events in Vietnamese history with verified dates and sources.
 * Maintained separately from cultural holidays to preserve clean domain boundaries.
 * Canonical data source: David-LeK/vietnamese-historical-events (GitHub)
 */

import { FEATURED_HISTORICAL_EVENTS } from "./history/featuredHistory";
import allHistoryData from "./history/catalog/allHistory.json";
import { getEventImage } from "./history/images";
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
  imageUrl?: string;
  imageCaption?: string;
  imageSource?: string;
}

// Map and build canonical historical events from GitHub repo (allHistory.json) enriched with curated seed (featuredHistory.ts)
function buildHistoricalEventsDataset(): VietnamHistoricalEvent[] {
  const events: VietnamHistoricalEvent[] = [];
  const seenIds = new Set<string>();

  // 1. Process allHistoryData from GitHub repository
  if (Array.isArray(allHistoryData)) {
    for (const raw of allHistoryData as any[]) {
      if (!raw || !raw.id) continue;
      const m = raw.date?.month;
      const d = raw.date?.day;
      const year = raw.year || raw.date?.year || 0;

      // Only include events with valid dates (exact day or lunar)
      if (m && d) {
        let eventId = raw.id;
        const img = getEventImage(raw);

        // Find curated enrichment if available
        const curatedMatch = FEATURED_HISTORICAL_EVENTS.find(
          (f) =>
            f.id === raw.id ||
            (f.date?.month === m &&
              f.date?.day === d &&
              (f.year === year || Math.abs((f.year || 0) - year) <= 1) &&
              (f.title.toLowerCase().includes(raw.title.toLowerCase().slice(0, 15)) ||
                raw.title.toLowerCase().includes(f.title.toLowerCase().slice(0, 15))))
        );

        if (curatedMatch && !seenIds.has(curatedMatch.id)) {
          eventId = curatedMatch.id;
        } else if (seenIds.has(eventId)) {
          eventId = `${raw.id}-${events.length}`;
        }
        seenIds.add(eventId);

        events.push({
          id: eventId,
          solarDate: { month: m, day: d },
          lunarDate: raw.date?.lunarDate || curatedMatch?.date?.lunarDate,
          year,
          title: curatedMatch?.title || raw.title,
          summary: curatedMatch?.summary || raw.summary,
          context: curatedMatch?.context || raw.context || raw.summary,
          significance: curatedMatch?.significance || raw.significance || "Sự kiện trong dòng thời gian lịch sử Việt Nam.",
          figures: curatedMatch?.figures || raw.figures,
          location: curatedMatch?.location || raw.location,
          keyFacts: curatedMatch?.keyFacts || raw.keyFacts,
          didYouKnow: curatedMatch?.didYouKnow || raw.didYouKnow,
          visualTheme: (curatedMatch?.visualTheme || raw.visualTheme || "general-history") as HistoricalVisualTheme,
          sources: curatedMatch?.sources || raw.sources || ["David-LeK/vietnamese-historical-events (GitHub)"],
          imageUrl: img?.imageUrl || curatedMatch?.imageUrl,
          imageCaption: img?.imageCaption || curatedMatch?.imageCaption,
          imageSource: img?.imageSource || curatedMatch?.imageSource,
        });
      }
    }
  }

  // 2. Include any remaining curated featured events (e.g. lunar events or milestones)
  for (const f of FEATURED_HISTORICAL_EVENTS) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      const m = f.date?.month;
      const d = f.date?.day;
      const img = getEventImage(f);
      events.push({
        id: f.id,
        solarDate: {
          month: m || 1,
          day: d || 1,
        },
        lunarDate: f.date?.lunarDate,
        year: f.year || f.date?.year || 0,
        title: f.title,
        summary: f.summary,
        context: f.context,
        significance: f.significance,
        figures: f.figures,
        location: f.location,
        keyFacts: f.keyFacts,
        didYouKnow: f.didYouKnow,
        visualTheme: f.visualTheme,
        sources: f.sources,
        imageUrl: img?.imageUrl || f.imageUrl,
        imageCaption: img?.imageCaption || f.imageCaption,
        imageSource: img?.imageSource || f.imageSource,
      });
    }
  }

  return events;
}

export const VIETNAM_HISTORICAL_EVENTS: VietnamHistoricalEvent[] = buildHistoricalEventsDataset();

/**
 * Helper to retrieve historical events occurring on a specific solar or lunar day
 */
export function getHistoricalEventsForDate(
  month: number,
  day: number,
  lunarMonth?: number,
  lunarDay?: number
): VietnamHistoricalEvent[] {
  try {
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
  } catch {
    return [];
  }
}
