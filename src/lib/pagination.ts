/**
 * Compute windowed pagination entries with ellipsis for browse & archive views.
 * Clamps invalid or out-of-range inputs so page lists never contain NaN or negative numbers.
 */
export function getPaginationPages(
  current: number,
  total: number,
): (number | string)[] {
  const safeTotal = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  const safeCurrent =
    Number.isFinite(current) && current >= 1
      ? Math.min(Math.floor(current), safeTotal)
      : 1;

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  if (safeCurrent <= 4) {
    return [1, 2, 3, 4, 5, "...", safeTotal];
  }

  if (safeCurrent >= safeTotal - 3) {
    return [
      1,
      "...",
      safeTotal - 4,
      safeTotal - 3,
      safeTotal - 2,
      safeTotal - 1,
      safeTotal,
    ];
  }

  return [
    1,
    "...",
    safeCurrent - 1,
    safeCurrent,
    safeCurrent + 1,
    "...",
    safeTotal,
  ];
}

