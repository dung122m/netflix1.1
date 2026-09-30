import { VIETNAM_EVENTS } from "../src/data/events/index";

console.log("Total events:", VIETNAM_EVENTS.length);

const stats = {
  total: VIETNAM_EVENTS.length,
  missingOrigin: 0,
  missingSignificance: 0,
  missingDidYouKnow: 0,
  missingMilestones: 0,
  hasActivities: 0,
  hasWhyItMatters: 0,
  hasMessage: 0,
  hasInterestingFacts: 0,
  categories: {} as Record<string, number>,
  natures: {} as Record<string, number>,
};

let totalBannerWords = 0;
let minBannerWords = 999;
let maxBannerWords = 0;

for (const ev of VIETNAM_EVENTS) {
  if (!ev.origin || ev.origin.trim().length === 0) stats.missingOrigin++;
  if (!ev.significance || ev.significance.trim().length === 0) stats.missingSignificance++;
  if (!ev.didYouKnow || ev.didYouKnow.trim().length === 0) stats.missingDidYouKnow++;
  if (!ev.milestones || ev.milestones.length === 0) stats.missingMilestones++;
  if (ev.activities && ev.activities.length > 0) stats.hasActivities++;
  if (ev.whyItMatters && ev.whyItMatters.trim().length > 0) stats.hasWhyItMatters++;
  if (ev.message && ev.message.trim().length > 0) stats.hasMessage++;
  if (ev.interestingFacts && ev.interestingFacts.length > 0) stats.hasInterestingFacts++;

  if (ev.bannerDescription && ev.bannerDescription.trim().length > 0) {
    const wc = ev.bannerDescription.trim().split(/\s+/).length;
    totalBannerWords += wc;
    if (wc < minBannerWords) minBannerWords = wc;
    if (wc > maxBannerWords) maxBannerWords = wc;
  }

  stats.categories[ev.category] = (stats.categories[ev.category] || 0) + 1;
  stats.natures[ev.nature] = (stats.natures[ev.nature] || 0) + 1;
}

const avgWords = Math.round(totalBannerWords / VIETNAM_EVENTS.length);

console.log("Audit Stats:", JSON.stringify({
  ...stats,
  bannerStats: {
    totalEventsWithBannerDesc: VIETNAM_EVENTS.filter(e => Boolean(e.bannerDescription)).length,
    avgWords,
    minBannerWords,
    maxBannerWords
  }
}, null, 2));
