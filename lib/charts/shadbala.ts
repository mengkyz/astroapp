/**
 * Graha Bala (Shadbala) & Bhava Bala — Jagannatha Hora / PVR Narasimha Rao method,
 * calibrated against PyJHora's strength module (tests/shadbala-parity.test.ts).
 *
 * Six sources of planetary strength, in Shashtiamsas (1 Rupa = 60):
 *   1. Sthana Bala  — uchcha, saptavargaja (compound friendship over 7 vargas),
 *                     ojayugma, kendradi, drekkana
 *   2. Dig Bala     — arc from the planet's powerless bhava madhya / 3
 *   3. Kala Bala    — nathonnatha, paksha, tribhaga, abda/masa/vara (Kali
 *                     ahargana lords), hora, ayana (kranti table), yuddha
 *   4. Chesta Bala  — true chesta kendra from Surya-Siddhanta mean longitudes
 *   5. Naisargika Bala
 *   6. Drik Bala    — continuous sputa drishti (virupa interpolation)
 *
 * Deliberate corrections vs PyJHora (their acknowledged bugs):
 *  - paksha & dig arcs are wrapped to <=180° (PyJHora can emit values >60/negative)
 *  - bhava drik bala accumulates malefics by planet, not by house index
 *
 * Sign lordship follows Parashara (Saturn owns Aquarius) per the source texts,
 * regardless of the app's Thai/Vedic display mode.
 */

// ─── INPUT / OUTPUT INTERFACES ───────────────────────────────────────────────

export interface PlanetBalasInput {
  key: string;          // SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN (others ignored)
  longitude: number;    // 0-360 sidereal
  rasi: number;         // 1-12 sign
  house: number;        // 1-12 from Lagna
  drekkana: number;     // 1-12 drekkana sign (D3)
  navamsa: number;      // 1-12 navamsa sign (D9)
  isRetrograde: boolean;
  speed?: number;
  declination?: number; // true equatorial declination (fallback for Ayana Bala)
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
  longitude?: number; // geographic
}

/** Sun events of the birth day as Julian Days (UT). */
export interface SunTimesInput {
  sunriseJd: number;
  sunsetJd: number;
  /** Sun's lower transit (local midnight) near the start of the birth day, UT. */
  midnightJd?: number | null;
}

export interface BalasExtras {
  /** Lahiri ayanamsa at birth, degrees — needed for the tropical kranti (Ayana Bala). */
  ayanamsa?: number;
  /** Local-time Julian Day (jd + utcOffset/24); derived if omitted. */
  julianDayLocal?: number;
  /** Sidereal Placidus cusps (12, index 0 = 1st house) — JHora's bhava madhya.
   *  Falls back to equal cusps from the lagna when absent. */
  placidusCusps?: number[] | null;
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
  yuddha: number;
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

const P = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'] as const;

// Deep exaltation longitudes; debilitation = +180
const DEEP_EXALTATION: number[] = [10, 33, 298, 165, 95, 357, 200];

// Moolatrikona sign (1-12) — whole sign, counted in D1 only (JHora convention)
const MT_SIGN: number[] = [5, 2, 1, 6, 9, 7, 11];

// Own signs (Parashara)
const OWN_SIGNS: number[][] = [[5], [4], [1, 8], [3, 6], [9, 12], [2, 7], [10, 11]];

// Sign lords 1-12 → planet index (Parashara)
const SIGN_LORD_IDX: Record<number, number> = {
  1: 2, 2: 5, 3: 3, 4: 1, 5: 0, 6: 3, 7: 5, 8: 2, 9: 4, 10: 6, 11: 6, 12: 4,
};

// Natural relationships: 1 = friend, 0 = neutral, -1 = enemy  (row → column)
const NATURAL_REL: number[][] = [
  //          SUN MOON MARS MERC JUP VEN SAT
  /* SUN  */ [0, 1, 1, 0, 1, -1, -1],
  /* MOON */ [1, 0, 0, 1, 0, 0, 0],
  /* MARS */ [1, 1, 0, -1, 1, 0, 0],
  /* MERC */ [1, -1, 0, 0, 0, 1, 0],
  /* JUP  */ [1, 1, 1, -1, 0, -1, 0],
  /* VEN  */ [-1, -1, 0, 1, 0, 0, 1],
  /* SAT  */ [-1, -1, -1, 1, 0, 1, 0],
];

// Compound-relationship saptavargaja points (adhisatru → adhimitra)
const SAPTAVARGAJA_POINTS = [1.875, 3.75, 7.5, 15, 22.5];

// Naisargika Bala (Shashtiamsas), planet-index order
const NAISARGIKA: number[] = [60.0, 51.43, 17.14, 25.71, 34.29, 42.86, 8.57];

// Drekkana Bala: decan index → planets that gain 15
const DREKKANA_PLANETS: number[][] = [[0, 2, 4], [3, 6], [1, 5]];

// Dig Bala: powerless bhava index (0-based house from lagna) per planet
const DIG_POWERLESS_HOUSE: number[] = [3, 9, 3, 6, 6, 9, 0];

// Abda/Masa/Vara lords: ahargana weekday → planet index (day 0 = Tuesday ⇒ Mars)
const AHARGANA_WEEKDAY_LORDS: number[] = [2, 3, 4, 5, 6, 0, 1];

// Hora Bala: hora index → planet index (Saturn,Jupiter,Mars,Sun,Venus,Mercury,Moon)
const HORA_ORDER: number[] = [6, 4, 2, 0, 5, 3, 1];

// Kranti (declination) table: bhuja 0,15,…,90° → declination in degrees
const KRANTI_BHUJA = [0, 15, 30, 45, 60, 75, 90];
const KRANTI_DECL = [0, 362 / 60, 703 / 60, 1002 / 60, 1238 / 60, 1388 / 60, 1440 / 60];

// Planet disc diameters for Yuddha Bala (planet-index order; -1 = not applicable)
const DISC_DIAMETERS: number[] = [-1, -1, 9.4, 6.6, 190.4, 16.6, 158.0];

// Chesta Bala mean-longitude epoch: 1900-01-01 00:00 at Ujjain (JHora table method)
const EPOCH_JD_LOCAL = 2415020.5; // swe_julday(1900,1,1,0) as a local-time JD
const EPOCH_UJJAIN_LON = 76;
const EPOCH_YEAR = 1900;
const EPOCH_MEAN_POSITIONS = [257.4568, -1, 270.22, 164, 220.04, 328.51, 236.74];
const EPOCH_MEAN_SPEEDS = [0.9856, -1, 0.524, 4.0923, 0.0831, 1.60215, 0.033439];
// (sign, base, per-year) longitude corrections since the epoch
const EPOCH_CORRECTIONS: Array<[number, number, number]> = [
  [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 6.67, -0.00133], [-1, 3.3, 0.0067], [-1, 5, 0.0001], [1, 5, 0.001],
];

// Bhava Dig Bala: sign-nature longitude ranges → power house (0-based from lagna)
const BHAVA_NATURE_RANGES: Array<{ power: number; ranges: Array<[number, number]> }> = [
  { power: 0, ranges: [[60, 90], [150, 180], [180, 210], [240, 255], [300, 330]] },   // Nara → lagna
  { power: 3, ranges: [[90, 120], [285, 300], [330, 360]] },                          // Jalachara → 4th
  { power: 9, ranges: [[0, 30], [30, 60], [120, 150], [255, 270], [270, 285]] },      // Chatushpada → 10th
  { power: 6, ranges: [[210, 240]] },                                                 // Keeta → 7th
];

// Minimum required Shadbala (Rupas), planet-key map for UI use
export const MIN_SHADBALA: Record<string, number> = {
  SUN: 5.0, MOON: 6.0, MARS: 5.0, MERCURY: 7.0,
  JUPITER: 6.5, VENUS: 5.5, SATURN: 5.0,
};

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

const round2 = (v: number) => Math.round(v * 100) / 100;

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Wrapped arc distance, always <= 180. */
function arcDist(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

/** Lagrange interpolation through (xs, ys) evaluated at x. */
function lagrange(xs: number[], ys: number[], x: number): number {
  let total = 0;
  for (let i = 0; i < xs.length; i++) {
    let term = ys[i];
    for (let j = 0; j < xs.length; j++) {
      if (j !== i) term *= (x - xs[j]) / (xs[i] - xs[j]);
    }
    total += term;
  }
  return total;
}

// ─── DIVISIONAL SIGNS (for Saptavargaja) ─────────────────────────────────────

function rasiOf(lon: number): number {
  return Math.floor(norm360(lon) / 30) + 1;
}

/** D2 — traditional Parasara hora: Leo (5) / Cancer (4). */
function horaSign(lon: number): number {
  const odd = rasiOf(lon) % 2 === 1;
  const firstHalf = (lon % 30) < 15;
  return (odd ? firstHalf : !firstHalf) ? 5 : 4;
}

/** D3 — drekkana: 1st/5th/9th from the sign. */
function drekkanaSign(lon: number): number {
  const r = rasiOf(lon);
  const part = Math.floor((lon % 30) / 10);
  return ((r - 1 + part * 4) % 12) + 1;
}

/** D7 — saptamsa: odd from own sign, even from the 7th. */
function saptamsaSign(lon: number): number {
  const r = rasiOf(lon);
  const part = Math.min(6, Math.floor((lon % 30) / (30 / 7)));
  const start = r % 2 === 1 ? r : ((r + 5) % 12) + 1;
  return ((start - 1 + part) % 12) + 1;
}

/** D9 — navamsa (continuous). */
function navamsaSign(lon: number): number {
  return (Math.floor(norm360(lon) / (10 / 3)) % 12) + 1;
}

/** D12 — dwadasamsa: starts from own sign. */
function dwadasamsaSign(lon: number): number {
  const r = rasiOf(lon);
  const part = Math.min(11, Math.floor((lon % 30) / 2.5));
  return ((r - 1 + part) % 12) + 1;
}

/** D30 — trimshamsa: maps to the ruling planet's sign per Parashara. */
function trimshamsaSign(lon: number): number {
  const deg = lon % 30;
  if (rasiOf(lon) % 2 === 1) {
    if (deg < 5) return 1;    // Mars → Aries
    if (deg < 10) return 11;  // Saturn → Aquarius
    if (deg < 18) return 9;   // Jupiter → Sagittarius
    if (deg < 25) return 3;   // Mercury → Gemini
    return 7;                 // Venus → Libra
  }
  if (deg < 5) return 2;      // Venus → Taurus
  if (deg < 12) return 6;     // Mercury → Virgo
  if (deg < 20) return 12;    // Jupiter → Pisces
  if (deg < 25) return 10;    // Saturn → Capricorn
  return 8;                   // Mars → Scorpio
}

// ─── COMPOUND (PANCHADHA) RELATIONSHIPS ──────────────────────────────────────

/**
 * Compound relationship score index 0..4 (adhisatru..adhimitra) between each
 * pair, from natural relationship + temporal (tatkalika) placement: a planet
 * in the 2nd,3rd,4th,10th,11th or 12th sign from another is its temporal friend.
 */
function compoundRelations(rasiByPlanet: number[]): number[][] {
  const rel: number[][] = [];
  for (let p = 0; p < 7; p++) {
    rel[p] = [];
    for (let q = 0; q < 7; q++) {
      if (p === q) { rel[p][q] = -1; continue; }
      const offset = ((rasiByPlanet[q] - rasiByPlanet[p]) % 12 + 12) % 12 + 1; // 1..12 counted inclusively
      const temporalFriend = [2, 3, 4, 10, 11, 12].includes(offset);
      const natural = NATURAL_REL[p][q]; // 1 / 0 / -1
      // natural(-1..1) + temporal(±1) → -2..2 → index 0..4
      rel[p][q] = natural + (temporalFriend ? 1 : -1) + 2;
    }
  }
  return rel;
}

// ─── STHANA BALA ─────────────────────────────────────────────────────────────

function calcUchchaBala(p: number, lon: number): number {
  const debilitation = (DEEP_EXALTATION[p] + 180) % 360;
  return arcDist(lon, debilitation) / 3;
}

function calcSaptavargajaBala(p: number, lon: number, compound: number[][]): number {
  const vargaSigns = [
    { sign: rasiOf(lon), isD1: true },
    { sign: horaSign(lon), isD1: false },
    { sign: drekkanaSign(lon), isD1: false },
    { sign: saptamsaSign(lon), isD1: false },
    { sign: navamsaSign(lon), isD1: false },
    { sign: dwadasamsaSign(lon), isD1: false },
    { sign: trimshamsaSign(lon), isD1: false },
  ];
  let total = 0;
  for (const { sign, isD1 } of vargaSigns) {
    if (isD1 && sign === MT_SIGN[p]) total += 45;            // moolatrikona counts in D1 only
    else if (OWN_SIGNS[p].includes(sign)) total += 30;
    else total += SAPTAVARGAJA_POINTS[compound[p][SIGN_LORD_IDX[sign]]];
  }
  return total;
}

function calcOjayugmaBala(p: number, rasi: number, navamsa: number): number {
  const wantsEven = p === 1 || p === 5; // Moon, Venus
  let bala = 0;
  if ((rasi % 2 === 0) === wantsEven) bala += 15;
  if ((navamsa % 2 === 0) === wantsEven) bala += 15;
  return bala;
}

function calcKendradiBala(house: number): number {
  if ([1, 4, 7, 10].includes(house)) return 60;
  if ([2, 5, 8, 11].includes(house)) return 30;
  return 15;
}

function calcDrekkanaBala(p: number, lon: number): number {
  const decan = Math.floor((lon % 30) / 10);
  return DREKKANA_PLANETS[decan].includes(p) ? 15 : 0;
}

// ─── DIG BALA ─────────────────────────────────────────────────────────────────

function calcDigBala(p: number, cusps: number[], lon: number): number {
  return arcDist(lon, cusps[DIG_POWERLESS_HOUSE[p]]) / 3;
}

/**
 * Sripati bhava madhya derived from Placidus cusps: the four angles are kept
 * and each quadrant is trisected (JHora's bhava_method 2, used by Bhava Dig Bala).
 */
function sripatiCusps(placidus: number[]): number[] {
  const bm = [...placidus];
  for (const b of [3, 6, 9, 12]) {
    const i1 = (b - 3) % 12;
    const i2 = b % 12;
    const b1 = bm[i1];
    let b2 = bm[i2 % 12];
    if (b2 < b1) b2 += 360;
    const step = (b2 - b1) / 3;
    bm[(i1 + 1) % 12] = norm360(bm[i1] + step);
    bm[(i2 - 1 + 12) % 12] = norm360(b2 - step);
  }
  return bm;
}

// ─── TIME CONTEXT ────────────────────────────────────────────────────────────

interface TimeContext {
  tobh: number;        // local birth hour 0-24
  srh: number;         // sunrise local hour
  ssh: number;         // sunset local hour
  mnhl: number;        // local midnight (Sun's lower transit) hour, near 0
  civilWeekday: number;// 0=Sunday, of the local calendar day
  year: number;
  dayOfYear: number;   // ordinal day of the year, 1-based
  jdLocal: number;     // local-time Julian Day
}

function localHourOf(jdUt: number, utcOffset: number): number {
  return ((jdUt + utcOffset / 24 + 0.5) % 1) * 24;
}

function buildTimeContext(
  jd: number,
  birth: BirthBalasInput,
  sunTimes: SunTimesInput | null,
  extras?: BalasExtras,
): TimeContext {
  const tz = birth.utcOffset;
  const jdLocal = extras?.julianDayLocal ?? jd + tz / 24;
  const tobh = birth.hour + birth.minute / 60 + (birth.second ?? 0) / 3600;

  let srh = 6, ssh = 18;
  if (sunTimes) {
    srh = localHourOf(sunTimes.sunriseJd, tz);
    ssh = localHourOf(sunTimes.sunsetJd, tz);
  }
  let mnhl = 0;
  if (sunTimes?.midnightJd != null) {
    mnhl = localHourOf(sunTimes.midnightJd, tz);
    if (mnhl > 12) mnhl -= 24; // events just before 0h read as small negatives
  }

  // PyJHora's civil weekday: ceil(jd+1) % 7 — differs from floor+2 only at
  // exact-integer JDs (noon UT), replicated for parity.
  const civilWeekday = ((Math.ceil(jdLocal + 1) % 7) + 7) % 7; // 0 = Sunday

  // Ordinal day of year in local time
  const dJan1 = Date.UTC(birth.year, 0, 1);
  const dBirth = Date.UTC(birth.year, birth.month - 1, birth.day);
  const dayOfYear = Math.round((dBirth - dJan1) / 86400_000) + 1;

  return { tobh, srh, ssh, mnhl, civilWeekday, year: birth.year, dayOfYear, jdLocal };
}

// ─── KALA BALA ────────────────────────────────────────────────────────────────

function calcNathonnathaBala(ctx: TimeContext): number[] {
  const t = ctx.tobh < 12 ? (ctx.tobh - ctx.mnhl) * 5 : (24 + ctx.mnhl - ctx.tobh) * 5;
  const tDiff = Math.max(0, Math.min(60, t));
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const p of [0, 4, 5]) out[p] = tDiff;        // Sun, Jupiter, Venus
  for (const p of [1, 2, 6]) out[p] = 60 - tDiff;   // Moon, Mars, Saturn
  out[3] = 60;                                       // Mercury
  return out;
}

/** Chart-level benefics per PVR: Jup+Ven; Mercury unless outnumbered by malefics
 *  in its sign; waxing Moon. Everything else malefic. */
function chartBenefics(rasiByPlanet: number[], waxingMoon: boolean): boolean[] {
  const benefic = [false, false, false, false, false, false, false];
  benefic[4] = true; // Jupiter
  benefic[5] = true; // Venus
  benefic[1] = waxingMoon;
  const mercSign = rasiByPlanet[3];
  let malefics = 0, benefics = 0;
  for (const q of [0, 1, 2, 6]) if (rasiByPlanet[q] === mercSign) malefics += (q === 1 && waxingMoon) ? 0 : 1;
  for (const q of [4, 5]) if (rasiByPlanet[q] === mercSign) benefics += 1;
  if (rasiByPlanet[1] === mercSign && waxingMoon) benefics += 1;
  benefic[3] = malefics <= benefics;
  return benefic;
}

function calcPakshaBala(sunLon: number, moonLon: number, benefic: boolean[]): number[] {
  const elong = arcDist(moonLon, sunLon); // wrapped <= 180 (fixes PyJHora's raw |a-b|)
  const pb = elong / 3;
  const out: number[] = [];
  for (let p = 0; p < 7; p++) out[p] = benefic[p] ? pb : 60 - pb;
  out[1] *= 2; // Moon doubled
  return out;
}

function calcTribhagaBala(ctx: TimeContext): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  out[4] = 60; // Jupiter always
  const { tobh, srh, ssh } = ctx;
  const dl = ssh - srh, nl = 24 - dl;
  const dInc = dl / 3, nInc = nl / 3;
  if (tobh >= srh && tobh < srh + dInc) out[3] = 60;                                  // Mercury
  else if (tobh >= srh + dInc && tobh < srh + 2 * dInc) out[0] = 60;                  // Sun
  else if (tobh >= srh + 2 * dInc && tobh < ssh) out[6] = 60;                         // Saturn
  else if (tobh > ssh && tobh < ssh + nInc) out[1] = 60;                              // Moon
  else if ((tobh >= ssh + nInc && tobh < 24) || (tobh >= 0 && tobh < srh - nInc)) out[5] = 60; // Venus
  else if (tobh >= srh - nInc && tobh < srh) out[2] = 60;                             // Mars
  return out;
}

/** Days elapsed at the start of `year` per B.V. Raman's ahargana table. */
function daysSinceBase(year: number, baseYear: number, baseDays: number): number {
  const totalYears = year - baseYear;
  let leaps = 0;
  for (let y = baseYear + 1; y <= year; y++) {
    if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) leaps++;
  }
  return baseDays + leaps * 366 + (totalYears - leaps) * 365;
}

function calcAbdaBala(ctx: TimeContext): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  const ahargana = daysSinceBase(ctx.year - 1, 1951, 174) + ctx.dayOfYear;
  const day = (Math.floor(ahargana / 360) * 3 + 1) % 7;
  out[AHARGANA_WEEKDAY_LORDS[day]] = 15;
  return out;
}

function calcMasaBala(ctx: TimeContext): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  const ahargana = daysSinceBase(ctx.year - 1, 1951, 174) + ctx.dayOfYear;
  const day = (Math.floor(ahargana / 30) * 2 + 1) % 7;
  out[AHARGANA_WEEKDAY_LORDS[day]] = 30;
  return out;
}

function calcVaraBala(ctx: TimeContext): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  let ahargana = daysSinceBase(ctx.year - 1, 1827, 244) + ctx.dayOfYear;
  if (ctx.tobh < ctx.srh) ahargana -= 1;
  const day = ((ahargana % 7) + 7) % 7;
  out[AHARGANA_WEEKDAY_LORDS[day]] = 45;
  return out;
}

function calcHoraBala(ctx: TimeContext): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  let day = ctx.civilWeekday;
  let tobh = ctx.tobh;
  if (tobh < ctx.srh) {
    day = (day + 6) % 7;
    tobh += 24;
  }
  const hora = ((Math.floor(tobh - ctx.srh) + day + 1) % 7 + 7) % 7;
  out[HORA_ORDER[hora]] = 60;
  return out;
}

/**
 * Ayana Bala via the traditional kranti table on tropical longitudes.
 * Effective declination is positive when the planet is on its strong side
 * (north: Sun/Mars/Jup/Ven; south: Moon/Saturn; Mercury both).
 */
function calcAyanaBala(siderealLons: number[], ayanamsa: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < 7; p++) {
    const tropical = norm360(siderealLons[p] + ayanamsa);
    let bhuja = tropical;
    if (tropical > 90 && tropical < 180) bhuja = 180 - tropical;
    else if (tropical > 180 && tropical < 270) bhuja = tropical - 180;
    else if (tropical > 270) bhuja = 360 - tropical;
    const north = tropical < 180;
    let sign: number;
    if (p === 3) sign = 1;
    else if (p === 1 || p === 6) sign = north ? -1 : 1;
    else sign = north ? 1 : -1;
    const decl = sign * lagrange(KRANTI_BHUJA, KRANTI_DECL, bhuja);
    let bala = (24 + decl) * 1.25;
    if (p === 0) bala *= 2;
    out[p] = bala;
  }
  return out;
}

/**
 * Yuddha Bala (planetary war). The closest pair of the seven (excluding pairs
 * containing Sun or Moon) exchanges bala proportional to their partial-strength
 * difference over their disc-diameter difference.
 */
function calcYuddhaBala(
  lons: number[],
  partialTotals: number[],
): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  let best: [number, number] | null = null;
  let bestDiff = Infinity;
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const d = Math.abs(lons[i] - lons[j]);
      if (d < bestDiff) { bestDiff = d; best = [i, j]; }
    }
  }
  if (!best) return out;
  let [a, b] = best;
  if (a === 0 || a === 1 || b === 0 || b === 1) return out; // Sun/Moon do not war
  if (lons[a] > lons[b]) [a, b] = [b, a]; // lower longitude first (PyJHora convention)
  const bDiff = Math.abs(partialTotals[a] - partialTotals[b]);
  const diaDiff = Math.abs(DISC_DIAMETERS[a] - DISC_DIAMETERS[b]);
  if (diaDiff === 0) return out;
  const y = bDiff / diaDiff;
  out[a] = y;
  out[b] = -y;
  return out;
}

// ─── CHESTA BALA (1900 Ujjain epoch mean longitudes, JHora method) ───────────

function meanLongitudeEpoch(p: number, jdLocal: number, geoLongitude: number, year: number): number {
  const daysFromEpoch = jdLocal - EPOCH_JD_LOCAL + (EPOCH_UJJAIN_LON - geoLongitude) / 15 / 24;
  const [sign, base, perYear] = EPOCH_CORRECTIONS[p];
  const correction = sign * (base + perYear * (year - EPOCH_YEAR));
  return norm360(EPOCH_MEAN_POSITIONS[p] + daysFromEpoch * EPOCH_MEAN_SPEEDS[p] + correction);
}

function calcChestaBala(
  trueLons: number[],
  ctx: TimeContext,
  geoLongitude: number,
): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]; // Sun & Moon have no chesta in this method
  const sunMean = meanLongitudeEpoch(0, ctx.jdLocal, geoLongitude, ctx.year);
  for (const p of [2, 3, 4, 5, 6]) {
    const planetMean = meanLongitudeEpoch(p, ctx.jdLocal, geoLongitude, ctx.year);
    let seeghrochcha = sunMean;
    let mean = planetMean;
    if (p === 3 || p === 5) { // Mercury, Venus: swap
      seeghrochcha = planetMean;
      mean = sunMean;
    }
    const avg = 0.5 * (trueLons[p] + mean);
    // JHora keeps the raw (unwrapped) kendra here — values above 60 are
    // possible and match its output, so no arc wrapping.
    const kendra = Math.abs(seeghrochcha - avg);
    out[p] = kendra / 3;
  }
  return out;
}

// ─── DRIK BALA (sputa drishti) ───────────────────────────────────────────────

/** Continuous virupa drishti of aspecting planet `p` at forward angle `angle`. */
export function sputaDrishti(p: number, angle: number): number {
  const a = norm360(angle);
  let v = 0;
  if (a >= 30 && a < 60) v = 0.5 * (a - 30);
  else if (a >= 60 && a < 90) {
    v = (a - 60) + 15;
    if (p === 6) v += 45; // Saturn's 3rd
  } else if (a >= 90 && a < 120) {
    v = 0.5 * (120 - a) + 30;
    if (p === 2) v += 15; // Mars' 4th
  } else if (a >= 120 && a < 150) {
    v = 150 - a;
    if (p === 4) v += 30; // Jupiter's 5th
  } else if (a >= 150 && a < 180) {
    v = 2 * (a - 150);
  } else if (a >= 180 && a < 300) {
    v = 0.5 * (300 - a);
    if (p === 2 && a >= 210 && a < 240) v += 15; // Mars' 8th
    if (p === 4 && a >= 240 && a < 270) v += 30; // Jupiter's 9th
    if (p === 6 && a >= 270 && a < 300) v += 45; // Saturn's 10th
  }
  return v;
}

function calcDrikBala(lons: number[], benefic: boolean[]): number[] {
  const out: number[] = [];
  for (let target = 0; target < 7; target++) {
    let net = 0;
    for (let asp = 0; asp < 7; asp++) {
      if (asp === target) continue;
      const angle = norm360(lons[target] - lons[asp]);
      const v = sputaDrishti(asp, angle);
      net += benefic[asp] ? v : -v;
    }
    out[target] = net / 4;
  }
  return out;
}

// ─── BHAVA BALA ──────────────────────────────────────────────────────────────

function bhavaDigBala(madhyas: number[]): number[] {
  const out: number[] = [];
  for (let h = 0; h < 12; h++) {
    const madhya = madhyas[h];
    let power = 9; // default chatushpada if no range matches (shouldn't happen)
    for (const cls of BHAVA_NATURE_RANGES) {
      if (cls.ranges.some(([l1, l2]) => madhya >= l1 && madhya <= l2)) {
        power = cls.power;
        break;
      }
    }
    const dist = Math.min(((h - power) % 12 + 12) % 12, ((power - h) % 12 + 12) % 12);
    out[h] = Math.abs(60 - 10 * dist);
  }
  return out;
}

/** Whole-sign houses (1-12 offsets, inclusive) aspected by planet p via graha drishti. */
function grahaDrishtiHouses(p: number): number[] {
  const houses = [7];
  if (p === 2) houses.push(4, 8);
  if (p === 4) houses.push(5, 9);
  if (p === 6) houses.push(3, 10);
  return houses;
}

/** Jaimini rasi drishti: sign offsets (inclusive) aspected from a sign. */
function rasiDrishtiOffsets(sign: number): number[] {
  const type = (sign - 1) % 3; // 0 movable, 1 fixed, 2 dual
  if (type === 0) return [6, 9, 12].map((s) => ((s - 1) % 12) + 1); // fixed signs except adjacent → 6th, 9th, 12th
  if (type === 1) return [2, 5, 8];   // movable except adjacent
  return [4, 7, 10];                  // other dual signs
}

function bhavaDrikBala(
  madhyas: number[],
  lagnaRasi: number,
  rasiByPlanet: number[],
  lons: number[],
): number[] {
  const out: number[] = [];
  // Fixed benefic/malefic split per the source (not chart-derived here)
  const benefic = [false, true, false, true, true, true, false];
  for (let h = 0; h < 12; h++) {
    const madhya = madhyas[h];
    const houseSign = ((lagnaRasi - 1 + h) % 12) + 1;
    let net = 0;
    for (let p = 0; p < 7; p++) {
      const offsetFromPlanet = ((houseSign - rasiByPlanet[p]) % 12 + 12) % 12 + 1; // 1..12 inclusive
      const aspectsHouse =
        grahaDrishtiHouses(p).includes(offsetFromPlanet) ||
        rasiDrishtiOffsets(rasiByPlanet[p]).includes(offsetFromPlanet);
      if (!aspectsHouse) continue;
      let v = sputaDrishti(p, norm360(madhya - lons[p]));
      if (p !== 3 && p !== 4) v *= 0.25; // only Mercury & Jupiter aspect bhavas fully
      net += benefic[p] ? v : -v;
    }
    out[h] = net / 4;
  }
  return out;
}

// ─── MAIN CALCULATION ─────────────────────────────────────────────────────────

export function calculateBalas(
  planetsInput: PlanetBalasInput[],
  lagna: LagnaBalasInput,
  birth: BirthBalasInput,
  jd: number,
  sunTimes: SunTimesInput | null = null,
  extras: BalasExtras = {},
): BalasResult {
  // Planet-index-ordered arrays for the classical seven
  const byKey = new Map(planetsInput.map((pl) => [pl.key, pl]));
  const lons: number[] = [];
  const rasiByPlanet: number[] = [];
  const houses: number[] = [];
  for (let p = 0; p < 7; p++) {
    const pl = byKey.get(P[p]);
    lons[p] = pl?.longitude ?? 0;
    rasiByPlanet[p] = pl?.rasi ?? rasiOf(lons[p]);
    houses[p] = pl?.house ?? 1;
  }

  const ctx = buildTimeContext(jd, birth, sunTimes, extras);
  const ayanamsa = extras.ayanamsa ?? 24; // sane fallback; route always passes it
  const geoLon = birth.longitude ?? birth.utcOffset * 15;

  const elongRaw = norm360(lons[1] - lons[0]);
  const waxingMoon = elongRaw < 180;
  const benefic = chartBenefics(rasiByPlanet, waxingMoon);
  const compound = compoundRelations(rasiByPlanet);

  // Sthana
  const uchcha = P.map((_, p) => calcUchchaBala(p, lons[p]));
  const saptavargaja = P.map((_, p) => calcSaptavargajaBala(p, lons[p], compound));
  const ojayugma = P.map((_, p) => calcOjayugmaBala(p, rasiByPlanet[p], navamsaSign(lons[p])));
  const kendradi = P.map((_, p) => calcKendradiBala(houses[p]));
  const drekkana = P.map((_, p) => calcDrekkanaBala(p, lons[p]));

  // Bhava madhya: Placidus when available (JHora), equal-cusp fallback
  const equalCusps = Array.from({ length: 12 }, (_, i) => norm360(lagna.longitude + i * 30));
  const placidus = extras.placidusCusps && extras.placidusCusps.length === 12
    ? extras.placidusCusps
    : equalCusps;

  // Dig
  const dig = P.map((_, p) => calcDigBala(p, placidus, lons[p]));

  // Kala
  const nathonnatha = calcNathonnathaBala(ctx);
  const paksha = calcPakshaBala(lons[0], lons[1], benefic);
  const tribhaga = calcTribhagaBala(ctx);
  const abda = calcAbdaBala(ctx);
  const masa = calcMasaBala(ctx);
  const vara = calcVaraBala(ctx);
  const hora = calcHoraBala(ctx);
  const ayana = calcAyanaBala(lons, ayanamsa);

  // Yuddha needs the partial totals (sthana + dig + nathonnatha + paksha + tribhaga + hora)
  const partials = P.map((_, p) =>
    uchcha[p] + saptavargaja[p] + ojayugma[p] + kendradi[p] + drekkana[p] +
    dig[p] + nathonnatha[p] + paksha[p] + tribhaga[p] + hora[p]);
  const yuddha = calcYuddhaBala(lons, partials);

  // Chesta / Drik
  const chesta = calcChestaBala(lons, ctx, geoLon);
  const drik = calcDrikBala(lons, benefic);

  const grahaBala: GrahaBala[] = P.map((key, p) => {
    const sthanaTotal = uchcha[p] + saptavargaja[p] + ojayugma[p] + kendradi[p] + drekkana[p];
    const kalaTotal = nathonnatha[p] + paksha[p] + tribhaga[p] + abda[p] + masa[p] +
      vara[p] + hora[p] + ayana[p] + yuddha[p];
    const total = sthanaTotal + dig[p] + kalaTotal + chesta[p] + NAISARGIKA[p] + drik[p];
    return {
      planet: key,
      sthana: {
        uchcha: round2(uchcha[p]),
        saptavargaja: round2(saptavargaja[p]),
        ojayugma: round2(ojayugma[p]),
        kendradi: kendradi[p],
        drekkana: drekkana[p],
        total: round2(sthanaTotal),
      },
      dig: round2(dig[p]),
      kala: {
        nathonnatha: round2(nathonnatha[p]),
        paksha: round2(paksha[p]),
        tribhaga: tribhaga[p],
        vara: vara[p],
        hora: hora[p],
        abda: abda[p],
        masa: masa[p],
        ayana: round2(ayana[p]),
        yuddha: round2(yuddha[p]),
        total: round2(kalaTotal),
      },
      chesta: round2(chesta[p]),
      naisargika: round2(NAISARGIKA[p]),
      drik: round2(drik[p]),
      total: round2(total),
      rupas: round2(total / 60),
    };
  });

  // ── Bhava Bala ──────────────────────────────────────────────────────────────
  const totalsByPlanet = grahaBala.map((g) => g.total);
  const bhavaDig = bhavaDigBala(sripatiCusps(placidus));
  const bhavaDrik = bhavaDrikBala(placidus, lagna.rasi, rasiByPlanet, lons);

  const bhavaBala: BhavaBala[] = [];
  for (let h = 1; h <= 12; h++) {
    const houseSign = ((lagna.rasi - 1 + h - 1) % 12) + 1;
    const bhavadhipati = totalsByPlanet[SIGN_LORD_IDX[houseSign]] ?? 0;
    const digbala = round2(bhavaDig[h - 1]);
    const drishtibala = round2(bhavaDrik[h - 1]);
    bhavaBala.push({
      house: h,
      bhavadhipati: round2(bhavadhipati),
      digbala,
      drishtibala,
      total: round2(bhavadhipati + digbala + drishtibala),
    });
  }

  return { grahaBala, bhavaBala };
}
