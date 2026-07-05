/** Normalize any longitude into [0, 360). In-range values pass through exactly. */
export function normalizeLon(longitude: number): number {
  if (longitude >= 0 && longitude < 360) return longitude;
  return ((longitude % 360) + 360) % 360;
}

export function getRasi(longitude: number): number {
  return Math.floor(normalizeLon(longitude) / 30) + 1; // Returns 1-12
}

/**
 * Snap a longitude to the exact arcsecond grid. Deriving sign, DMS, nakshatra
 * and vargas from one snapped value keeps the display self-consistent: without
 * this, 29°59'59.7" would show as sign X but round to an impossible 30°00'00".
 */
export function roundToArcsecond(longitude: number): number {
  return normalizeLon(Math.round(longitude * 3600) / 3600);
}

export function getDegreesInRasi(longitude: number) {
  const raw = normalizeLon(longitude) % 30;
  let deg = Math.floor(raw);
  let min = Math.floor((raw - deg) * 60);
  let sec = Math.round(((raw - deg) * 60 - min) * 60);
  // Carry rounding overflow (e.g. 59.9999' would otherwise show 60")
  if (sec === 60) {
    sec = 0;
    min += 1;
  }
  if (min === 60) {
    min = 0;
    deg += 1;
  }
  return { deg, min, sec };
}
