export interface NpsResult {
  npsInternal: number | null;
  insufficientData: boolean;
  pctPromoters: number;
  pctDetractors: number;
}

/**
 * NPS interno = (% rating=5) − (% rating∈{1,2}).
 * Returns null when n < threshold (default 6).
 */
export function calcNps(
  promoters: number,
  detractors: number,
  total: number,
  threshold = 6,
): NpsResult {
  const insufficientData = total < threshold;

  if (insufficientData || total === 0) {
    return {
      npsInternal: null,
      insufficientData: true,
      pctPromoters: total > 0 ? roundPct((promoters / total) * 100) : 0,
      pctDetractors: total > 0 ? roundPct((detractors / total) * 100) : 0,
    };
  }

  const pctPromoters = roundPct((promoters / total) * 100);
  const pctDetractors = roundPct((detractors / total) * 100);

  return {
    npsInternal: roundPct(pctPromoters - pctDetractors),
    insufficientData: false,
    pctPromoters,
    pctDetractors,
  };
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}