/**
 * Graha Bala (Shadbala) & Bhava Bala Calculations
 * Based on B.V. Raman's "Graha and Bhava Balas"
 *
 * Shadbala = Six sources of planetary strength:
 *   1. Sthana Bala  (Positional Strength)
 *   2. Dig Bala     (Directional Strength)
 *   3. Kala Bala    (Temporal Strength)
 *   4. Chesta Bala  (Motional Strength)
 *   5. Naisargika Bala (Natural Strength)
 *   6. Drik Bala    (Aspectual Strength)
 *
 * Units: Shashtiamsas (1 Rupa = 60 Shashtiamsas)
 *
 * Sign lordship here follows the Parashari convention (Saturn owns both
 * Capricorn and Aquarius), matching B.V. Raman's source text. The display
 * tables elsewhere in the app use the Thai convention (Rahu gets Aquarius);
 * that difference is intentional and documented in lib/astro/constants.ts.
 *
 * Remaining documented approximations (acceptable per Raman's own tables):
 *  - Abda (year lord) uses April 14 as Mesha Sankranti; Masa (month lord)
 *    uses the 1st of the Gregorian birth month instead of the true solar month.
 *  - Drishti strength is the discrete house-based table rather than the
 *    continuous sputa-drishti interpolation.
 */

// ─── INPUT / OUTPUT INTERFACES ───────────────────────────────────────────────

export interface PlanetBalasInput {
  key: string;          // SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN
  longitude: number;    // 0-360 sidereal
  rasi: number;         // 1-12 sign
  house: number;        // 1-12 from Lagna
  drekkana: number;     // 1-12 drekkana sign (D3)
  navamsa: number;      // 1-12 navamsa sign (D9)
  isRetrograde: boolean;
  speed?: number;       // longitude speed, deg/day (for Chesta Bala)
  declination?: number; // true equatorial declination, deg (for Ayana Bala)
}

export interface LagnaBalasInput {
  longitude: number;
  rasi: number;
}

export interface BirthBalasInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  utcOffset: number;
  latitude?: number;
  longitude?: number; // geographic, for local mean time
}

/** Sunrise/sunset of the birth day as Julian Days (UT). */
export interface SunTimesInput {
  sunriseJd: number;
  sunsetJd: number;
}

export interface SthanaBala {
  uchcha: number;
  saptavargaja: number;
  ojayugma: number;
  kendradi: number;
  drekkana: number;
  total: number;
}

export interface KalaBala {
  nathonnatha: number;
  paksha: number;
  tribhaga: number;
  vara: number;
  hora: number;
  abda: number;
  masa: number;
  ayana: number;
  total: number;
}

export interface GrahaBala {
  planet: string;
  sthana: SthanaBala;
  dig: number;
  kala: KalaBala;
  chesta: number;
  naisargika: number;
  drik: number;
  total: number;   // Shashtiamsas
  rupas: number;   // total / 60
}

export interface BhavaBala {
  house: number;
  bhavadhipati: number;
  digbala: number;
  drishtibala: number;
  total: number;
}

export interface BalasResult {
  grahaBala: GrahaBala[];
  bhavaBala: BhavaBala[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CLASSICAL_PLANETS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

// Debilitation longitude (0-360)
const DEBILITATION_DEG: Record<string, number> = {
  SUN: 190, MOON: 213, MARS: 118, MERCURY: 345,
  JUPITER: 275, VENUS: 177, SATURN: 20,
};

// Moolatrikona: rasi (1-12) and degree range [start, end]
const MT_RASI: Record<string, number> = {
  SUN: 5, MOON: 2, MARS: 1, MERCURY: 6,
  JUPITER: 9, VENUS: 7, SATURN: 11,
};
const MT_RANGE: Record<string, [number, number]> = {
  SUN: [0, 20], MOON: [4, 30], MARS: [0, 12], MERCURY: [16, 20],
  JUPITER: [0, 10], VENUS: [0, 15], SATURN: [0, 20],
};

// Own signs per planet (Parashari)
const OWN_SIGNS: Record<string, number[]> = {
  SUN: [5], MOON: [4], MARS: [1, 8], MERCURY: [3, 6],
  JUPITER: [9, 12], VENUS: [2, 7], SATURN: [10, 11],
};

// Sign lords (rasi 1-12 → planet key, Parashari)
const SIGN_LORD: Record<number, string> = {
  1: 'MARS', 2: 'VENUS', 3: 'MERCURY', 4: 'MOON',
  5: 'SUN', 6: 'MERCURY', 7: 'VENUS', 8: 'MARS',
  9: 'JUPITER', 10: 'SATURN', 11: 'SATURN', 12: 'JUPITER',
};

// Natural friends (Naisargika Mitra)
const NAT_FRIENDS: Record<string, string[]> = {
  SUN: ['MOON', 'MARS', 'JUPITER'],
  MOON: ['SUN', 'MERCURY'],
  MARS: ['SUN', 'MOON', 'JUPITER'],
  MERCURY: ['SUN', 'VENUS'],
  JUPITER: ['SUN', 'MOON', 'MARS'],
  VENUS: ['MERCURY', 'SATURN'],
  SATURN: ['MERCURY', 'VENUS'],
  RAHU: ['SATURN', 'MERCURY', 'VENUS'],
  KETU: ['MARS', 'JUPITER'],
};

// Natural enemies (Naisargika Shatru)
const NAT_ENEMIES: Record<string, string[]> = {
  SUN: ['VENUS', 'SATURN'],
  MOON: [],
  MARS: ['MERCURY'],
  MERCURY: ['MOON'],
  JUPITER: ['MERCURY', 'VENUS'],
  VENUS: ['SUN', 'MOON'],
  SATURN: ['SUN', 'MOON', 'MARS'],
  RAHU: ['SUN', 'MOON', 'MARS'],
  KETU: ['VENUS', 'SATURN'],
};

// Naisargika (Natural) Bala — fixed Shashtiamsas values
const NAISARGIKA: Record<string, number> = {
  SUN: 60.00, MOON: 51.43, VENUS: 42.86,
  JUPITER: 34.29, MERCURY: 25.71, MARS: 17.14, SATURN: 8.57,
};

// House of maximum Dig Bala strength
const DIG_MAX_HOUSE: Record<string, number> = {
  MERCURY: 1, JUPITER: 1,
  SUN: 10, MARS: 10,
  MOON: 4, VENUS: 4,
  SATURN: 7,
};

// Chaldean planetary order for Hora (Hour lord) cycle
const CHALDEAN = ['SUN', 'VENUS', 'MERCURY', 'MOON', 'SATURN', 'JUPITER', 'MARS'];

// Weekday lords (0=Sunday … 6=Saturday)
const VARA_LORDS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

// Mean geocentric daily motion, deg/day (for Chesta speed ratio)
const MEAN_DAILY_MOTION: Record<string, number> = {
  MARS: 0.5240, MERCURY: 0.9856, JUPITER: 0.0831,
  VENUS: 0.9856, SATURN: 0.0335,
};

// Minimum required Shadbala (Rupas) — B.V. Raman
export const MIN_SHADBALA: Record<string, number> = {
  SUN: 5.0, MOON: 6.0, MARS: 5.0, MERCURY: 7.0,
  JUPITER: 6.5, VENUS: 5.5, SATURN: 5.0,
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function minArcDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function forwardAngle(from: number, to: number): number {
  return ((to - from) + 360) % 360;
}

function getRelationship(planet: string, signLord: string): 'friend' | 'neutral' | 'enemy' {
  if (NAT_FRIENDS[planet]?.includes(signLord)) return 'friend';
  if (NAT_ENEMIES[planet]?.includes(signLord)) return 'enemy';
  return 'neutral';
}

/** Points in a varga based on sign position */
function vargaPoints(planet: string, vargaSign: number, isMT: boolean): number {
  if (isMT) return 45;
  if (OWN_SIGNS[planet]?.includes(vargaSign)) return 30;
  const lord = SIGN_LORD[vargaSign];
  if (!lord || lord === planet) return 30; // own
  const rel = getRelationship(planet, lord);
  if (rel === 'friend') return 15;
  if (rel === 'enemy') return 3.75;
  return 7.5; // neutral
}

// ─── DIVISIONAL CHART SIGNS ───────────────────────────────────────────────────

function getHoraSign(lon: number): number {
  const rasi = Math.floor(lon / 30) + 1;
  const deg = lon % 30;
  const isOdd = rasi % 2 === 1;
  const isFirst = deg < 15;
  // Odd sign: first half = Sun (Leo=5), second = Moon (Cancer=4)
  // Even sign: first half = Moon, second = Sun
  return (isOdd ? isFirst : !isFirst) ? 5 : 4;
}

function getSaptamsaSign(lon: number): number {
  const rasi = Math.floor(lon / 30) + 1;
  const deg = lon % 30;
  const part = Math.min(6, Math.floor(deg / (30 / 7)));
  const isOdd = rasi % 2 === 1;
  // Odd sign starts from own rasi, even sign starts from 7th sign
  const start = isOdd ? rasi : ((rasi + 5) % 12) + 1;
  return (start - 1 + part) % 12 + 1;
}

function getDwadamsaSign(lon: number): number {
  const rasi = Math.floor(lon / 30) + 1;
  const deg = lon % 30;
  const part = Math.min(11, Math.floor(deg / 2.5));
  return (rasi - 1 + part) % 12 + 1;
}

function getTrimshamsaLord(lon: number): string {
  const rasi = Math.floor(lon / 30) + 1;
  const deg = lon % 30;
  const isOdd = rasi % 2 === 1;
  if (isOdd) {
    if (deg < 5) return 'MARS';
    if (deg < 10) return 'SATURN';
    if (deg < 18) return 'JUPITER';
    if (deg < 25) return 'MERCURY';
    return 'VENUS';
  } else {
    if (deg < 5) return 'VENUS';
    if (deg < 12) return 'MERCURY';
    if (deg < 20) return 'JUPITER';
    if (deg < 25) return 'SATURN';
    return 'MARS';
  }
}

// Primary sign of a planet (for Trimshamsa varga points)
const PRIMARY_SIGN: Record<string, number> = {
  SUN: 5, MOON: 4, MARS: 1, MERCURY: 3,
  JUPITER: 9, VENUS: 2, SATURN: 10,
};

// ─── ASPECT STRENGTH (Drishti Bala) ──────────────────────────────────────────
/**
 * Returns Shashtiamsas of aspect planet Q casts on a target point.
 * angleFromQ = forward angle from Q longitude to target longitude (0-360).
 *
 * Standard partial aspects (all planets):
 *   3rd house (60-90°)  = 1/4 = 15
 *   4th house (90-120°) = 3/4 = 45
 *   5th house (120-150°)= 1/2 = 30
 *   7th house (180-210°)= Full = 60
 *
 * Special full aspects:
 *   Mars:    4th (90-120°) & 8th (210-240°) = 60
 *   Jupiter: 5th (120-150°) & 9th (240-270°) = 60
 *   Saturn:  3rd (60-90°)  & 10th (270-300°) = 60
 *   Rahu/Ketu: same special as Jupiter
 */
function aspectStrength(aspectingPlanet: string, angleFromQ: number): number {
  const a = ((angleFromQ % 360) + 360) % 360;
  const house = Math.floor(a / 30) + 1; // 1-12

  const defaults: Record<number, number> = {
    1: 0, 2: 0, 3: 15, 4: 45, 5: 30, 6: 0,
    7: 60, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };
  let strength = defaults[house] ?? 0;

  if (aspectingPlanet === 'MARS' && (house === 4 || house === 8)) strength = 60;
  if ((aspectingPlanet === 'JUPITER' || aspectingPlanet === 'RAHU' || aspectingPlanet === 'KETU') &&
      (house === 5 || house === 9)) strength = 60;
  if (aspectingPlanet === 'SATURN' && (house === 3 || house === 10)) strength = 60;

  return strength;
}

/** Whether a planet is a natural benefic (for Drik Bala sign) */
function isBenefic(planet: string, pakshaBalaPct: number): boolean {
  if (['JUPITER', 'VENUS'].includes(planet)) return true;
  if (['SUN', 'MARS', 'SATURN', 'RAHU', 'KETU'].includes(planet)) return false;
  if (planet === 'MOON') return pakshaBalaPct >= 0.5; // waxing = benefic
  if (planet === 'MERCURY') return true; // simplified: usually benefic
  return false;
}

// ─── JULIAN DAY / WEEKDAY ─────────────────────────────────────────────────────

function simpleJD(year: number, month: number, day: number, hour = 12): number {
  let y = year, m = month;
  const d = day + hour / 24;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function weekday(jd: number): number {
  // 0=Sunday, 1=Monday … 6=Saturday
  return ((Math.floor(jd + 1.5) % 7) + 7) % 7;
}

// ─── TIME CONTEXT (shared by the Kala Bala items) ────────────────────────────

interface TimeContext {
  jd: number;              // birth moment, UT
  localJd: number;         // birth moment in civil local time (jd + offset)
  lmtHour: number;         // local mean time of birth, hours 0-24 (from geographic longitude)
  sunriseJd: number;       // sunrise of the birth's Vedic day, UT
  sunsetJd: number;        // sunset of that day, UT
  nextSunriseJd: number;   // next sunrise, UT (approx.)
  varaWeekday: number;     // weekday of the Vedic day (sunrise-to-sunrise), 0=Sunday
  isDayBirth: boolean;
}

function buildTimeContext(
  jd: number,
  birth: BirthBalasInput,
  sunTimes: SunTimesInput | null,
): TimeContext {
  const geoLon = birth.longitude ?? birth.utcOffset * 15;
  const localJd = jd + birth.utcOffset / 24;
  const lmtJd = jd + geoLon / 360;
  const lmtHour = ((lmtJd + 0.5) % 1) * 24;

  // Fallback sunrise/sunset: 06:00 / 18:00 local mean time
  let sunriseJd: number;
  let sunsetJd: number;
  if (sunTimes) {
    sunriseJd = sunTimes.sunriseJd;
    sunsetJd = sunTimes.sunsetJd;
  } else {
    const lmtMidnightUt = Math.floor(lmtJd - 0.5) + 0.5 - geoLon / 360;
    sunriseJd = lmtMidnightUt + 6 / 24;
    sunsetJd = lmtMidnightUt + 18 / 24;
  }

  // The Vedic day runs sunrise to sunrise. A birth before sunrise belongs to
  // the previous day (approximate the previous events by -1 day).
  let varaWeekday = weekday(localJd);
  if (jd < sunriseJd) {
    varaWeekday = (varaWeekday + 6) % 7;
    sunriseJd -= 1;
    sunsetJd -= 1;
  }
  const nextSunriseJd = sunriseJd + 1;
  const isDayBirth = jd >= sunriseJd && jd < sunsetJd;

  return { jd, localJd, lmtHour, sunriseJd, sunsetJd, nextSunriseJd, varaWeekday, isDayBirth };
}

// ─── STHANA BALA ─────────────────────────────────────────────────────────────

function calcUcchaBala(planet: string, lon: number): number {
  const debil = DEBILITATION_DEG[planet];
  if (debil === undefined) return 0;
  const dist = minArcDist(lon, debil);
  return dist / 3; // 0-60
}

function calcSaptavargajaBala(planet: string, lon: number, existingDrekkana: number, existingNavamsa: number): number {
  // D1: Rasi
  const rasi = Math.floor(lon / 30) + 1;
  const degInSign = lon % 30;
  const d1MT = MT_RASI[planet] === rasi && degInSign >= MT_RANGE[planet][0] && degInSign < MT_RANGE[planet][1];
  const d1 = vargaPoints(planet, rasi, d1MT);

  // D2: Hora
  const horaSign = getHoraSign(lon);
  const d2MT = MT_RASI[planet] === horaSign;
  const d2 = vargaPoints(planet, horaSign, d2MT);

  // D3: Drekkana (use pre-computed)
  const d3MT = MT_RASI[planet] === existingDrekkana;
  const d3 = vargaPoints(planet, existingDrekkana, d3MT);

  // D7: Saptamsa
  const saptSign = getSaptamsaSign(lon);
  const d7MT = MT_RASI[planet] === saptSign;
  const d7 = vargaPoints(planet, saptSign, d7MT);

  // D9: Navamsa (use pre-computed)
  const d9MT = MT_RASI[planet] === existingNavamsa;
  const d9 = vargaPoints(planet, existingNavamsa, d9MT);

  // D12: Dwadasamsa
  const dwaSign = getDwadamsaSign(lon);
  const d12MT = MT_RASI[planet] === dwaSign;
  const d12 = vargaPoints(planet, dwaSign, d12MT);

  // D30: Trimshamsa — points based on lord relationship
  const trimLord = getTrimshamsaLord(lon);
  let d30: number;
  if (trimLord === planet) {
    d30 = 45; // own trimshamsa
  } else {
    const trimSign = PRIMARY_SIGN[trimLord] ?? 1;
    const d30MT = MT_RASI[planet] === trimSign;
    d30 = vargaPoints(planet, trimSign, d30MT);
  }

  return d1 + d2 + d3 + d7 + d9 + d12 + d30;
}

function calcOjayugmaBala(planet: string, rasi: number, navamsa: number): number {
  // Males (odd sign → 15, even → 0): Sun, Mars, Jupiter, Saturn
  // Females (even sign → 15, odd → 0): Moon, Venus
  // Mercury: odd Rasi + odd Navamsa
  const oddBenefits = ['SUN', 'MARS', 'JUPITER', 'SATURN'];
  const evenBenefits = ['MOON', 'VENUS'];
  let bala = 0;
  const rasiOdd = rasi % 2 === 1;
  const navOdd = navamsa % 2 === 1;
  if (oddBenefits.includes(planet)) {
    if (rasiOdd) bala += 15;
    if (navOdd) bala += 15;
  } else if (evenBenefits.includes(planet)) {
    if (!rasiOdd) bala += 15;
    if (!navOdd) bala += 15;
  } else if (planet === 'MERCURY') {
    if (rasiOdd) bala += 15;
    if (navOdd) bala += 15;
  }
  return bala;
}

function calcKendradiBala(house: number): number {
  if ([1, 4, 7, 10].includes(house)) return 60;
  if ([2, 5, 8, 11].includes(house)) return 30;
  return 15;
}

/**
 * Drekkana Bala: male planets are strong in the 1st drekkana of their sign,
 * female planets in the 2nd, neutral planets in the 3rd. The occupied
 * drekkana follows directly from the degrees within the sign.
 */
function calcDrekkanaBala(planet: string, lon: number): number {
  const part = Math.floor((lon % 30) / 10); // 0 = 1st, 1 = 2nd, 2 = 3rd drekkana
  const males = ['SUN', 'MARS', 'JUPITER'];
  const females = ['MOON', 'VENUS'];
  if (males.includes(planet) && part === 0) return 15;
  if (females.includes(planet) && part === 1) return 15;
  if (!males.includes(planet) && !females.includes(planet) && part === 2) return 15;
  return 0;
}

// ─── DIG BALA ─────────────────────────────────────────────────────────────────

function calcDigBala(planet: string, lagnaLon: number, planetLon: number): number {
  const maxHouse = DIG_MAX_HOUSE[planet];
  if (maxHouse === undefined) return 0;
  // Longitude of max-strength house cusp
  const maxLon = (lagnaLon + (maxHouse - 1) * 30) % 360;
  const dist = minArcDist(planetLon, maxLon);
  return (180 - dist) / 3; // 0-60
}

// ─── KALA BALA ────────────────────────────────────────────────────────────────

/**
 * Nathonnatha Bala: diurnal planets (Sun, Jupiter, Venus) peak at local
 * midday; nocturnal planets (Moon, Mars, Saturn) peak at local midnight.
 * Mercury is always strong (60). Linear per the classical rule, computed
 * from local mean time.
 */
function calcNathonnathaBala(planet: string, ctx: TimeContext): number {
  if (planet === 'MERCURY') return 60;
  const diurnal = ['SUN', 'JUPITER', 'VENUS'];
  const nocturnal = ['MOON', 'MARS', 'SATURN'];
  if (!diurnal.includes(planet) && !nocturnal.includes(planet)) return 30;

  const distFromMidday = Math.abs(ctx.lmtHour - 12); // 0 (noon) … 12 (midnight)
  const diurnalStrength = (12 - distFromMidday) * 5; // 60 at noon, 0 at midnight
  return diurnal.includes(planet) ? diurnalStrength : 60 - diurnalStrength;
}

/** Paksha Bala. The Moon's value is doubled per the classical rule. */
function calcPakshaBala(planet: string, sunLon: number, moonLon: number): number {
  const elongation = ((moonLon - sunLon) + 360) % 360; // 0=new, 180=full
  const benefics = ['MOON', 'MERCURY', 'JUPITER', 'VENUS'];
  const shuklaFraction = elongation <= 180 ? elongation / 180 : 1 - (elongation - 180) / 180;
  const beneficBala = shuklaFraction * 60;
  const bala = benefics.includes(planet) ? beneficBala : 60 - beneficBala;
  return planet === 'MOON' ? bala * 2 : bala;
}

/**
 * Tribhaga Bala: the day (sunrise→sunset) and the night (sunset→sunrise)
 * are each split into three equal parts with fixed lords. Jupiter always
 * receives 60.
 */
function calcTribhagaBala(planet: string, ctx: TimeContext): number {
  if (planet === 'JUPITER') return 60;

  const dayLords = ['MERCURY', 'SUN', 'SATURN'];
  const nightLords = ['MOON', 'VENUS', 'MARS'];

  let lord: string;
  if (ctx.isDayBirth) {
    const dayLen = ctx.sunsetJd - ctx.sunriseJd;
    const part = Math.min(2, Math.floor(((ctx.jd - ctx.sunriseJd) / dayLen) * 3));
    lord = dayLords[part];
  } else {
    const nightLen = ctx.nextSunriseJd - ctx.sunsetJd;
    const part = Math.min(2, Math.floor(((ctx.jd - ctx.sunsetJd) / nightLen) * 3));
    lord = nightLords[part];
  }
  return planet === lord ? 60 : 0;
}

/** Vara Bala: lord of the Vedic weekday (sunrise-to-sunrise). */
function calcVaraBala(planet: string, ctx: TimeContext): number {
  return VARA_LORDS[ctx.varaWeekday] === planet ? 45 : 0;
}

/**
 * Hora Bala: planetary hours from sunrise, cycling in Chaldean order
 * starting from the lord of the Vedic weekday.
 */
function calcHoraBala(planet: string, ctx: TimeContext): number {
  const hoursSinceSunrise = (ctx.jd - ctx.sunriseJd) * 24;
  const horaNum = Math.max(0, Math.min(23, Math.floor(hoursSinceSunrise)));
  const startIdx = CHALDEAN.indexOf(VARA_LORDS[ctx.varaWeekday]);
  const horaLord = CHALDEAN[(startIdx + horaNum) % 7];
  return horaLord === planet ? 60 : 0;
}

function calcAbdaBala(planet: string, year: number): number {
  // Year lord = weekday lord of April 14 (Mesha Sankranti approximation)
  const jdSankranti = simpleJD(year, 4, 14);
  const wd = weekday(jdSankranti);
  return VARA_LORDS[wd] === planet ? 15 : 0;
}

function calcMasaBala(planet: string, year: number, month: number): number {
  // Month lord = weekday lord of 1st of birth month (Gregorian approximation)
  const jdMonth = simpleJD(year, month, 1);
  const wd = weekday(jdMonth);
  return VARA_LORDS[wd] === planet ? 30 : 0;
}

/**
 * Ayana Bala from true declination when available (falls back to the
 * ecliptic approximation). Sun, Mars, Jupiter, Venus are strong in
 * northern declination; Moon and Saturn in southern; Mercury in both.
 * The Sun's Ayana Bala is doubled per the classical rule.
 */
function calcAyanaBala(planet: string, lon: number, declination?: number): number {
  const OBLIQUITY = 23.45;
  const decl = declination !== undefined
    ? declination
    : Math.sin((lon * Math.PI) / 180) * OBLIQUITY;

  const northStrong = ['SUN', 'MARS', 'JUPITER', 'VENUS'];
  const southStrong = ['MOON', 'SATURN'];

  let effective: number;
  if (northStrong.includes(planet)) effective = decl;
  else if (southStrong.includes(planet)) effective = -decl;
  else effective = Math.abs(decl); // Mercury: strong in both

  const bala = ((OBLIQUITY + effective) / (2 * OBLIQUITY)) * 60; // 0-60
  return planet === 'SUN' ? bala * 2 : bala;
}

// ─── CHESTA BALA ─────────────────────────────────────────────────────────────

/**
 * Chesta Bala. Sun: uses Ayana Bala (per Raman). Moon: from Paksha.
 * Others: classified by actual speed relative to mean daily motion —
 * an approximation of Parashara's eight motion categories:
 *   retrograde (Vakra) 60, stationary (Vikala) 15, very slow (Mandatara) 15,
 *   slow (Manda) 30, average (Sama) 30, fast (Chara) 45, very fast (Atichara) 30.
 */
function calcChestaBala(
  planet: string,
  isRetrograde: boolean,
  sunLon: number,
  moonLon: number,
  lon: number,
  speed?: number,
  declination?: number,
): number {
  if (planet === 'SUN') return calcAyanaBala('SUN', lon, declination);
  if (planet === 'MOON') {
    const elongation = ((moonLon - sunLon) + 360) % 360;
    return elongation <= 180 ? elongation / 3 : (360 - elongation) / 3;
  }

  if (speed === undefined) return isRetrograde ? 60 : 30;

  if (speed < 0) return 60; // Vakra
  const mean = MEAN_DAILY_MOTION[planet];
  if (!mean) return 30;
  const r = speed / mean;
  if (r < 0.05) return 15;  // Vikala (stationary)
  if (r < 0.5) return 15;   // Mandatara
  if (r < 0.9) return 30;   // Manda
  if (r <= 1.1) return 30;  // Sama
  if (r <= 1.5) return 45;  // Chara
  return 30;                // Atichara
}

// ─── DRIK BALA ───────────────────────────────────────────────────────────────

/**
 * Drik Bala: net benefic minus malefic drishti on the planet, divided by 4
 * per the classical rule.
 */
function calcDrikBala(
  planet: string,
  planetLon: number,
  allPlanets: PlanetBalasInput[],
  sunLon: number,
  moonLon: number,
): number {
  const moonElong = ((moonLon - sunLon) + 360) % 360;
  const pakshaFraction = moonElong <= 180 ? moonElong / 180 : (360 - moonElong) / 180;

  let drishti = 0;
  for (const other of allPlanets) {
    if (other.key === planet) continue;
    if (!CLASSICAL_PLANETS.includes(other.key)) continue;
    const angle = forwardAngle(other.longitude, planetLon);
    const strength = aspectStrength(other.key, angle);
    if (strength === 0) continue;
    const benefic = isBenefic(other.key, pakshaFraction);
    drishti += benefic ? strength : -strength;
  }
  return drishti / 4;
}

// ─── MAIN CALCULATION ─────────────────────────────────────────────────────────

export function calculateBalas(
  planetsInput: PlanetBalasInput[],
  lagna: LagnaBalasInput,
  birth: BirthBalasInput,
  jd: number,
  sunTimes: SunTimesInput | null = null,
): BalasResult {
  // Filter to classical 7 planets
  const classicalPlanets = planetsInput.filter((p) => CLASSICAL_PLANETS.includes(p.key));

  const sun = planetsInput.find((p) => p.key === 'SUN');
  const moon = planetsInput.find((p) => p.key === 'MOON');
  const sunLon = sun?.longitude ?? 0;
  const moonLon = moon?.longitude ?? 0;

  const ctx = buildTimeContext(jd, birth, sunTimes);

  // ── Graha Bala ──────────────────────────────────────────────────────────────
  const grahaBala: GrahaBala[] = [];

  for (const planet of classicalPlanets) {
    // 1. Sthana Bala
    const uchcha = calcUcchaBala(planet.key, planet.longitude);
    const saptavargaja = calcSaptavargajaBala(planet.key, planet.longitude, planet.drekkana, planet.navamsa);
    const ojayugma = calcOjayugmaBala(planet.key, planet.rasi, planet.navamsa);
    const kendradi = calcKendradiBala(planet.house);
    const drekkanaBala = calcDrekkanaBala(planet.key, planet.longitude);

    const sthanaTotal = uchcha + saptavargaja + ojayugma + kendradi + drekkanaBala;

    // 2. Dig Bala
    const dig = calcDigBala(planet.key, lagna.longitude, planet.longitude);

    // 3. Kala Bala
    const nathonnatha = calcNathonnathaBala(planet.key, ctx);
    const paksha = calcPakshaBala(planet.key, sunLon, moonLon);
    const tribhaga = calcTribhagaBala(planet.key, ctx);
    const vara = calcVaraBala(planet.key, ctx);
    const hora = calcHoraBala(planet.key, ctx);
    const abda = calcAbdaBala(planet.key, birth.year);
    const masa = calcMasaBala(planet.key, birth.year, birth.month);
    const ayana = calcAyanaBala(planet.key, planet.longitude, planet.declination);
    const kalaTotal = nathonnatha + paksha + tribhaga + vara + hora + abda + masa + ayana;

    // 4. Chesta Bala
    const chesta = calcChestaBala(
      planet.key, planet.isRetrograde, sunLon, moonLon,
      planet.longitude, planet.speed, planet.declination,
    );

    // 5. Naisargika Bala
    const naisargika = NAISARGIKA[planet.key] ?? 0;

    // 6. Drik Bala
    const drik = calcDrikBala(planet.key, planet.longitude, planetsInput, sunLon, moonLon);

    const total = sthanaTotal + dig + kalaTotal + chesta + naisargika + drik;

    grahaBala.push({
      planet: planet.key,
      sthana: {
        uchcha: Math.round(uchcha * 100) / 100,
        saptavargaja: Math.round(saptavargaja * 100) / 100,
        ojayugma: Math.round(ojayugma * 100) / 100,
        kendradi,
        drekkana: drekkanaBala,
        total: Math.round(sthanaTotal * 100) / 100,
      },
      dig: Math.round(dig * 100) / 100,
      kala: {
        nathonnatha: Math.round(nathonnatha * 100) / 100,
        paksha: Math.round(paksha * 100) / 100,
        tribhaga,
        vara,
        hora,
        abda,
        masa,
        ayana: Math.round(ayana * 100) / 100,
        total: Math.round(kalaTotal * 100) / 100,
      },
      chesta: Math.round(chesta * 100) / 100,
      naisargika: Math.round(naisargika * 100) / 100,
      drik: Math.round(drik * 100) / 100,
      total: Math.round(total * 100) / 100,
      rupas: Math.round((total / 60) * 100) / 100,
    });
  }

  // ── Bhava Bala ──────────────────────────────────────────────────────────────
  const bhavaBala: BhavaBala[] = [];

  // Build a quick lookup: planet key → total Shadbala
  const grahaStrengthMap: Record<string, number> = {};
  for (const g of grahaBala) grahaStrengthMap[g.planet] = g.total;

  const moonElong = ((moonLon - sunLon) + 360) % 360;
  const pakshaFraction = moonElong <= 180 ? moonElong / 180 : (360 - moonElong) / 180;

  for (let h = 1; h <= 12; h++) {
    // Lord of house h: sign = (lagnaRasi + h - 2) % 12 + 1
    const houseSign = ((lagna.rasi - 1 + h - 1) % 12) + 1;
    const lordKey = SIGN_LORD[houseSign];
    const bhavadhipati = grahaStrengthMap[lordKey] ?? 0;

    // Bhava Digbala: Kendra=60, Panapara=30, Apoklima=15
    let digbala: number;
    if ([1, 4, 7, 10].includes(h)) digbala = 60;
    else if ([2, 5, 8, 11].includes(h)) digbala = 30;
    else digbala = 15;

    // Bhava Drishti Bala: net aspects onto the house cusp, divided by 4
    const cuspLon = (lagna.longitude + (h - 1) * 30) % 360;
    let drishtibala = 0;
    for (const other of classicalPlanets) {
      const angle = forwardAngle(other.longitude, cuspLon);
      const strength = aspectStrength(other.key, angle);
      if (strength === 0) continue;
      const benefic = isBenefic(other.key, pakshaFraction);
      drishtibala += benefic ? strength : -strength;
    }
    drishtibala = Math.round((drishtibala / 4) * 100) / 100;

    const total = Math.round((bhavadhipati + digbala + drishtibala) * 100) / 100;

    bhavaBala.push({ house: h, bhavadhipati: Math.round(bhavadhipati * 100) / 100, digbala, drishtibala, total });
  }

  return { grahaBala, bhavaBala };
}
