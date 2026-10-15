import type { VietnamTodayInfo } from "@/lib/vietnamCalendarCore";

let cachedTodayInfo: { dateKey: string; info: VietnamTodayInfo } | null = null;

/**
 * On-demand loader for the Vietnam Today Modal.
 * Loads the full historical chronicles (allHistory.json, featuredHistory, images) and actors catalog
 * ONLY when the user opens the modal, preventing ~4.46MB of static data from entering the initial bundle.
 */
export async function loadVietnamTodayModalData(targetEventId?: string): Promise<VietnamTodayInfo> {
  const [{ getVietnamTodayEvent }, { VIETNAM_EVENTS }] = await Promise.all([
    import("@/lib/vietnamCalendar"),
    import("@/data/vietnamEvents"),
  ]);

  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  let currentInfo: VietnamTodayInfo;
  if (cachedTodayInfo && cachedTodayInfo.dateKey === dateKey) {
    currentInfo = {
      ...cachedTodayInfo.info,
      allEventsToday: cachedTodayInfo.info.allEventsToday ? [...cachedTodayInfo.info.allEventsToday] : undefined,
      historicalEventsToday: cachedTodayInfo.info.historicalEventsToday ? [...cachedTodayInfo.info.historicalEventsToday] : undefined,
    };
  } else {
    currentInfo = getVietnamTodayEvent();
    cachedTodayInfo = { dateKey, info: currentInfo };
  }

  if (targetEventId) {
    const foundInToday = currentInfo.allEventsToday?.find((x) => x.id === targetEventId);
    if (foundInToday) {
      currentInfo.event = foundInToday;
    } else if (currentInfo.event?.id === targetEventId) {
      // already currentInfo.event
    } else {
      const fromCatalog = VIETNAM_EVENTS.find((x) => x.id === targetEventId);
      if (fromCatalog) {
        currentInfo.event = fromCatalog;
        currentInfo.allEventsToday = [fromCatalog, ...(currentInfo.allEventsToday || [])];
      }
    }
  }

  return currentInfo;
}
