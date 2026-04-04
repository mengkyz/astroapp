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

// Exaltation longitude (0-360)
const EXALTATION_DEG: Record<string, number> = {
  SUN: 10, MOON: 33, MARS: 298, MERCURY: 165,
  JUPITER: 95, VENUS: 357, SATURN: 200,
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

// Own signs per planet
const OWN_SIGNS: Record<string, number[]> = {
  SUN: [5], MOON: [4], MARS: [1, 8], MERCURY: [3, 6],
  JUPITER: [9, 12], VENUS: [2, 7], SATURN: [10, 11],
};

// Sign lords (rasi 1-12 → planet key)
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
  return Math.floor((jd + 1.5) % 7);
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

function calcDrekkanaBala(planet: string, drekkana: number): number {
  const rasi = Math.floor(drekkana - 1); // 0-indexed
  // Male planets: strong in 1st drekkana of sign (part = 0)
  // Female: 2nd drekkana; Neutral: 3rd drekkana
  // We check which "drekkana number" (0,1,2) the planet's drekkana corresponds to
  // by looking at the drekkana sign's triplicity membership
  // Simplified: use the drekkana portion from the planet's own longitude
  const males = ['SUN', 'MARS', 'JUPITER'];
  const females = ['MOON', 'VENUS'];
  // The drekkana portion is implicitly the part within the sign the planet occupies
  // We deduce it back from the drekkana sign itself (not ideal but workable)
  // males → 1st drekkana (signs 1,5,9 of fire; 2,6,10 earth; 3,7,11 air; 4,8,12 water)
  // For simplicity, assign based on drekkana sign position mod 4:
  const drekNum = rasi % 4; // crude approximation for 1st(0), 2nd(1-2), 3rd(3)
  if (males.includes(planet) && drekNum === 0) return 15;
  if (females.includes(planet) && (drekNum === 1 || drekNum === 2)) return 15;
  if (!males.includes(planet) && !females.includes(planet) && drekNum === 3) return 15;
  return 0;
}

// ─── DIG BALA ─────────────────────────────────────────────────────────────────

function calcDigBala(planet: string, house: number, lagnaLon: number, planetLon: number): number {
  const maxHouse = DIG_MAX_HOUSE[planet];
  if (maxHouse === undefined) return 0;
  // Longitude of max-strength house cusp
  const maxLon = (lagnaLon + (maxHouse - 1) * 30) % 360;
  const dist = minArcDist(planetLon, maxLon);
  return (180 - dist) / 3; // 0-60
}

// ─── KALA BALA ────────────────────────────────────────────────────────────────

function calcNathonnathaBala(planet: string, hour: number): number {
  // Approximate sunrise=6, sunset=18
  // diurnal: Sun, Jupiter, Venus — strong during day
  // nocturnal: Moon, Mars, Saturn — strong at night
  const diurnal = ['SUN', 'JUPITER', 'VENUS'];
  const nocturnal = ['MOON', 'MARS', 'SATURN'];
  if (!diurnal.includes(planet) && !nocturnal.includes(planet)) return 30; // Mercury

  // hoursFromSunrise: 0 at 6am, 6 at noon, 12 at 6pm, 18 at midnight
  const hfs = ((hour - 6) + 24) % 24;
  // Diurnal strength peaks at noon
  const diurnalStrength = Math.max(0, Math.cos(((hfs - 6) / 12) * Math.PI) * 30 + 30);
  return diurnal.includes(planet) ? diurnalStrength : 60 - diurnalStrength;
}

function calcPakshaBala(planet: string, sunLon: number, moonLon: number): number {
  const elongation = ((moonLon - sunLon) + 360) % 360; // 0=new, 180=full
  const benefics = ['MOON', 'MERCURY', 'JUPITER', 'VENUS'];
  const phase = elongation <= 180 ? elongation / 180 : (360 - elongation) / 180; // 0=new/full, 1=full/new
  const shuklaFraction = elongation <= 180 ? elongation / 180 : 1 - (elongation - 180) / 180;
  const beneficBala = shuklaFraction * 60;
  return benefics.includes(planet) ? beneficBala : 60 - beneficBala;
}

function calcTribhagaBala(planet: string, hour: number): number {
  // Day (6am-6pm) in 3 parts: Mercury, Sun, Saturn
  // Night (6pm-6am) in 3 parts: Moon, Venus, Mars
  // Jupiter always gets Tribhaga Bala
  if (planet === 'JUPITER') return 60;

  const hfs = ((hour - 6) + 24) % 24; // 0=6am, 12=6pm, 18=midnight
  const isDay = hfs < 12;
  const periodLen = 4; // 12 hours / 3 parts
  const period = Math.floor(hfs < 12 ? hfs / periodLen : (hfs - 12) / periodLen);

  const dayLords = ['MERCURY', 'SUN', 'SATURN'];
  const nightLords = ['MOON', 'VENUS', 'MARS'];
  const lord = isDay ? dayLords[Math.min(period, 2)] : nightLords[Math.min(period, 2)];
  return planet === lord ? 60 : 0;
}

function calcVaraBala(planet: string, jd: number): number {
  const wd = weekday(jd);
  return VARA_LORDS[wd] === planet ? 45 : 0;
}

function calcHoraBala(planet: string, jd: number, hour: number, utcOffset: number): number {
  // Find the day-of-week for local time
  const localJd = jd - utcOffset / 24; // approximate local time JD
  const wd = weekday(localJd + utcOffset / 24);
  // Starting Chaldean index for this weekday
  const startIdx = (wd * 3) % 7;
  // Which hora number? Approximate: sunrise at 6am, each hora = 1 hour
  const horaNum = Math.floor(((hour - 6) + 24) % 24);
  const horaIdx = (startIdx + horaNum) % 7;
  const horaLord = CHALDEAN[horaIdx];
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

function calcAyanaBala(planet: string, lon: number): number {
  // Based on approximate declination via ecliptic longitude
  // Max north decl at Cancer 0° (lon=90°), max south at Capricorn 0° (lon=270°)
  const declApprox = Math.sin((lon * Math.PI) / 180) * 23.5; // degrees
  const diurnal = ['SUN', 'MARS', 'JUPITER', 'VENUS'];
  const nocturnal = ['MOON', 'SATURN'];
  const normalised = declApprox / 23.5; // -1 to +1
  if (diurnal.includes(planet)) return 30 + normalised * 30; // 0-60
  if (nocturnal.includes(planet)) return 30 - normalised * 30;
  return 30; // Mercury
}

// ─── CHESTA BALA ─────────────────────────────────────────────────────────────

function calcChestaBala(planet: string, isRetrograde: boolean, sunLon: number, moonLon: number, lon: number): number {
  // Sun & Moon: Chesta Bala = Ayana Bala (per Raman)
  if (planet === 'SUN') return calcAyanaBala('SUN', lon);
  if (planet === 'MOON') {
    // Moon's Chesta Bala = Paksha Bala fraction
    const elongation = ((moonLon - sunLon) + 360) % 360;
    return elongation <= 180 ? elongation / 3 : (360 - elongation) / 3;
  }
  // Other planets: retrograde motion = maximum effort = 60
  // Direct but slow/stationary = moderate; fast = less
  return isRetrograde ? 60 : 30;
}

// ─── DRIK BALA ───────────────────────────────────────────────────────────────

function calcDrikBala(
  planet: string,
  planetLon: number,
  allPlanets: PlanetBalasInput[],
  sunLon: number,
  moonLon: number,
): number {
  const moonElong = ((moonLon - sunLon) + 360) % 360;
  const pakshaFraction = moonElong <= 180 ? moonElong / 180 : (360 - moonElong) / 180;

  let drikBala = 0;
  for (const other of allPlanets) {
    if (other.key === planet) continue;
    if (!CLASSICAL_PLANETS.includes(other.key)) continue;
    const angle = forwardAngle(other.longitude, planetLon);
    const strength = aspectStrength(other.key, angle);
    if (strength === 0) continue;
    const benefic = isBenefic(other.key, pakshaFraction);
    drikBala += benefic ? strength : -strength;
  }
  return drikBala;
}

// ─── MAIN CALCULATION ─────────────────────────────────────────────────────────

export function calculateBalas(
  planetsInput: PlanetBalasInput[],
  lagna: LagnaBalasInput,
  birth: BirthBalasInput,
  jd: number,
): BalasResult {
  // Filter to classical 7 planets
  const classicalPlanets = planetsInput.filter((p) => CLASSICAL_PLANETS.includes(p.key));

  const sun = planetsInput.find((p) => p.key === 'SUN');
  const moon = planetsInput.find((p) => p.key === 'MOON');
  const sunLon = sun?.longitude ?? 0;
  const moonLon = moon?.longitude ?? 0;

  // ── Graha Bala ──────────────────────────────────────────────────────────────
  const grahaBala: GrahaBala[] = [];

  for (const planet of classicalPlanets) {
    // 1. Sthana Bala
    const uchcha = calcUcchaBala(planet.key, planet.longitude);
    const saptavargaja = calcSaptavargajaBala(planet.key, planet.longitude, planet.drekkana, planet.navamsa);
    const ojayugma = calcOjayugmaBala(planet.key, planet.rasi, planet.navamsa);
    const kendradi = calcKendradiBala(planet.house);
    const drekkanaBala = calcDrekkanaBala(planet.key, planet.drekkana);

    const sthanaTotal = uchcha + saptavargaja + ojayugma + kendradi + drekkanaBala;

    // 2. Dig Bala
    const dig = calcDigBala(planet.key, planet.house, lagna.longitude, planet.longitude);

    // 3. Kala Bala
    const nathonnatha = calcNathonnathaBala(planet.key, birth.hour);
    const paksha = calcPakshaBala(planet.key, sunLon, moonLon);
    const tribhaga = calcTribhagaBala(planet.key, birth.hour);
    const vara = calcVaraBala(planet.key, jd);
    const hora = calcHoraBala(planet.key, jd, birth.hour, birth.utcOffset);
    const abda = calcAbdaBala(planet.key, birth.year);
    const masa = calcMasaBala(planet.key, birth.year, birth.month);
    const ayana = calcAyanaBala(planet.key, planet.longitude);
    const kalaTotal = nathonnatha + paksha + tribhaga + vara + hora + abda + masa + ayana;

    // 4. Chesta Bala
    const chesta = calcChestaBala(planet.key, planet.isRetrograde, sunLon, moonLon, planet.longitude);

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

    // Bhava Drishti Bala: aspects from planets onto house cusp
    const cuspLon = (lagna.longitude + (h - 1) * 30) % 360;
    let drishtibala = 0;
    for (const other of classicalPlanets) {
      const angle = forwardAngle(other.longitude, cuspLon);
      const strength = aspectStrength(other.key, angle);
      if (strength === 0) continue;
      const benefic = isBenefic(other.key, pakshaFraction);
      drishtibala += benefic ? strength : -strength;
    }
    drishtibala = Math.round(drishtibala * 100) / 100;

    const total = Math.round((bhavadhipati + digbala + drishtibala) * 100) / 100;

    bhavaBala.push({ house: h, bhavadhipati: Math.round(bhavadhipati * 100) / 100, digbala, drishtibala, total });
  }

  return { grahaBala, bhavaBala };
}
