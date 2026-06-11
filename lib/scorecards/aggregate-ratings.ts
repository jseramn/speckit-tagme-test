import { calcNps } from "@/lib/scorecards/calc-nps";

export interface AggregatedRatings {
  feedbackCount: number;
  avgRating: number | null;
  promoters: number;
  detractors: number;
  npsInternal: number | null;
  insufficientData: boolean;
  pctPromoters: number;
  pctDetractors: number;
}

export function aggregateRatings(
  ratings: number[],
  threshold = 6,
): AggregatedRatings {
  const feedbackCount = ratings.length;

  if (feedbackCount === 0) {
    return {
      feedbackCount: 0,
      avgRating: null,
      promoters: 0,
      detractors: 0,
      npsInternal: null,
      insufficientData: true,
      pctPromoters: 0,
      pctDetractors: 0,
    };
  }

  const promoters = ratings.filter((r) => r === 5).length;
  const detractors = ratings.filter((r) => r === 1 || r === 2).length;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const avgRating = Math.round((sum / feedbackCount) * 100) / 100;
  const nps = calcNps(promoters, detractors, feedbackCount, threshold);

  return {
    feedbackCount,
    avgRating,
    promoters,
    detractors,
    npsInternal: nps.npsInternal,
    insufficientData: nps.insufficientData,
    pctPromoters: nps.pctPromoters,
    pctDetractors: nps.pctDetractors,
  };
}