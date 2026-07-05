/**
 * Panchanga at birth — the five limbs of the Vedic day, all pure functions of
 * the Sun/Moon longitudes plus the sunrise-adjusted weekday.
 *
 * Verified against PyJHora's drik module for the golden chart
 * (1990-06-15 08:30 +07 Bangkok): tithi 22, yoga 2, karana 43, vaara 5.
 */

export interface PanchangaResult {
  /** 1–30; 1–15 Shukla (waxing), 16–30 Krishna (waning) */
  tithiIndex: number;
  /** true while the Moon is waxing (Shukla paksha) */
  waxing: boolean;
  /** Day within the paksha, 1–15 (Thai ขึ้น/แรม X ค่ำ) */
  pakshaDay: number;
  /** 1–27 (Vishkambha … Vaidhriti) */
  yogaIndex: number;
  /** 1–60 → name via karanaNameIndex */
  karanaIndex: number;
  /** 0-based index into the 11 karana names */
  karanaNameIndex: number;
  /** Sunrise-to-sunrise weekday, 0 = Sunday */
  vaara: number;
  /** Moon's nakshatra, 0-based 0–26 */
  nakshatraIndex: number;
  /** Moon's pada 1–4 */
  pada: number;
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** 0-based index into the karana name list for a 1-based karana number (1–60). */
export function karanaNameIndex(karana: number): number {
  if (karana === 1) return 10;              // Kimstughna
  if (karana >= 58) return karana - 58 + 7; // Shakuni, Chatushpada, Naga
  return (karana - 2) % 7;                  // 7 movable karanas cycling
}

export function computePanchanga(
  sunLon: number,
  moonLon: number,
  vaara: number,
): PanchangaResult {
  const elongation = norm360(moonLon - sunLon);
  const tithiIndex = Math.min(30, Math.floor(elongation / 12) + 1);
  const waxing = tithiIndex <= 15;
  const pakshaDay = waxing ? tithiIndex : tithiIndex - 15;

  const yogaIndex = Math.min(27, Math.floor(norm360(sunLon + moonLon) / (360 / 27)) + 1);

  const karanaIndex = Math.min(60, Math.floor(elongation / 6) + 1);

  const nakSpan = 360 / 27;
  const moonNorm = norm360(moonLon);
  const nakshatraIndex = Math.min(26, Math.floor(moonNorm / nakSpan));
  const pada = Math.min(4, Math.floor((moonNorm % nakSpan) / (nakSpan / 4)) + 1);

  return {
    tithiIndex,
    waxing,
    pakshaDay,
    yogaIndex,
    karanaIndex,
    karanaNameIndex: karanaNameIndex(karanaIndex),
    vaara,
    nakshatraIndex,
    pada,
  };
}
