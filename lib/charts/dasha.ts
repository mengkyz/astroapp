import dayjs from 'dayjs';

const DASHA_ORDER = [
  'KETU',
  'VENUS',
  'SUN',
  'MOON',
  'MARS',
  'RAHU',
  'JUPITER',
  'SATURN',
  'MERCURY',
];
const DASHA_YEARS: Record<string, number> = {
  KETU: 7,
  VENUS: 20,
  SUN: 6,
  MOON: 10,
  MARS: 7,
  RAHU: 18,
  JUPITER: 16,
  SATURN: 19,
  MERCURY: 17,
};

/**
 * Dasha year length conventions.
 *  - trueSidereal: Sun's actual Aries-ingress-to-ingress duration around the
 *                  birth (Jagannatha Hora's default; pass the measured length
 *                  via `trueSiderealYearDays`, e.g. from calcTrueSiderealYear).
 *  - sidereal:     365.256364 days — mean sidereal year.
 *  - gregorian:    365.2425 days   — mean Gregorian year.
 *  - savana:       360 days        — classical savana year.
 *  - calendarWalk: traditional Thai Y/M/D walk over the civil calendar
 *                  (pre-computer approximation, kept as a legacy option).
 */
export type DashaYearType = 'trueSidereal' | 'sidereal' | 'gregorian' | 'savana' | 'calendarWalk';

const YEAR_DAYS: Record<Exclude<DashaYearType, 'calendarWalk' | 'trueSidereal'>, number> = {
  sidereal: 365.256364,
  gregorian: 365.2425,
  savana: 360,
};

const MS_PER_DAY = 86400_000;

/**
 * The birth string is a timezone-less local timestamp. All arithmetic is done
 * on a UTC-epoch representation of those wall-clock fields so the server's own
 * timezone/DST rules can never bend a day away from exactly 24h.
 */
function localStrToMs(localStr: string): number {
  const m = localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Invalid local datetime string: ${localStr}`);
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

function msToLocalStr(ms: number): string {
  const d = new Date(Math.round(ms / 1000) * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear().toString().padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

// HELPER (calendarWalk only): decimal years → traditional Jyotish Y/M/D
// (12 months per year, 30 days per month for the fraction)
function decimalToYMD(decimalYears: number) {
  const years = Math.floor(decimalYears);
  const remainderMonths = (decimalYears - years) * 12;
  const months = Math.floor(remainderMonths);
  const days = Math.round((remainderMonths - months) * 30);

  return { years, months, days };
}

interface Bhukti {
  lord: string;
  startDate: string;
  endDate: string;
}
interface MahaDasha {
  lord: string;
  years: number;
  startDate: string;
  endDate: string;
  bhuktis: Bhukti[];
}
export interface VimshottariResult {
  firstLord: string;
  elapsedFraction: number;
  yearType: DashaYearType;
  dashas: MahaDasha[];
}

export function calculateVimshottariDasha(
  moonLongitude: number,
  birthDateLocalStr: string,
  yearType: DashaYearType = 'trueSidereal',
  trueSiderealYearDays?: number,
): VimshottariResult {
  const nakshatraSpan = 360 / 27;
  const nakIndex = Math.floor(moonLongitude / nakshatraSpan);
  const elapsedFrac = (moonLongitude % nakshatraSpan) / nakshatraSpan;

  // The Dasha sequence loops continuously
  const startLordIndex = nakIndex % 9;
  const startLord = DASHA_ORDER[startLordIndex];

  const yearDays =
    yearType === 'calendarWalk'
      ? 0 // unused
      : yearType === 'trueSidereal'
        ? (trueSiderealYearDays ?? YEAR_DAYS.sidereal)
        : YEAR_DAYS[yearType];

  const dashas =
    yearType === 'calendarWalk'
      ? calcCalendarWalk(startLordIndex, elapsedFrac, birthDateLocalStr)
      : calcExact(startLordIndex, elapsedFrac, birthDateLocalStr, yearDays);

  return {
    firstLord: startLord,
    elapsedFraction: elapsedFrac,
    yearType,
    dashas,
  };
}

/**
 * Exact method (JHora-compatible): every period is years × yearDays days to
 * the millisecond; no calendar rounding anywhere. Verified against PyJHora's
 * vimshottari tables in tests/dasha-parity.test.ts.
 */
function calcExact(
  startLordIndex: number,
  elapsedFrac: number,
  birthDateLocalStr: string,
  yearDays: number,
): MahaDasha[] {
  const birthMs = localStrToMs(birthDateLocalStr);
  const firstLordYears = DASHA_YEARS[DASHA_ORDER[startLordIndex]];

  let cursorMs = birthMs - elapsedFrac * firstLordYears * yearDays * MS_PER_DAY;

  const dashas: MahaDasha[] = [];
  for (let i = 0; i < 9; i++) {
    const mahaIndex = (startLordIndex + i) % 9;
    const mahaLord = DASHA_ORDER[mahaIndex];
    const mahaYears = DASHA_YEARS[mahaLord];
    const mahaStartMs = cursorMs;
    const mahaEndMs = mahaStartMs + mahaYears * yearDays * MS_PER_DAY;

    const bhuktis: Bhukti[] = [];
    let bhuktiStartMs = mahaStartMs;
    for (let j = 0; j < 9; j++) {
      const subIndex = (mahaIndex + j) % 9;
      const subLord = DASHA_ORDER[subIndex];
      // Proportional duration: (Maha years × Bhukti years / 120) of the cycle
      const bhuktiMs = (mahaYears * DASHA_YEARS[subLord] * yearDays * MS_PER_DAY) / 120;
      // Pin the final bhukti to the maha boundary so float residue cannot leak
      const bhuktiEndMs = j === 8 ? mahaEndMs : bhuktiStartMs + bhuktiMs;

      bhuktis.push({
        lord: subLord,
        startDate: msToLocalStr(bhuktiStartMs),
        endDate: msToLocalStr(bhuktiEndMs),
      });
      bhuktiStartMs = bhuktiEndMs;
    }

    dashas.push({
      lord: mahaLord,
      years: mahaYears,
      startDate: msToLocalStr(mahaStartMs),
      endDate: msToLocalStr(mahaEndMs),
      bhuktis,
    });
    cursorMs = mahaEndMs;
  }
  return dashas;
}

/**
 * Legacy Thai calendar-walk method: periods advance by whole calendar
 * years/months plus 30-day-month day fractions, exactly as a traditional
 * hand calculation would. Kept for continuity with older Thai ephemeris books.
 */
function calcCalendarWalk(
  startLordIndex: number,
  elapsedFrac: number,
  birthDateLocalStr: string,
): MahaDasha[] {
  const startLord = DASHA_ORDER[startLordIndex];
  const totalYears = DASHA_YEARS[startLord];

  // Calculate the exact elapsed time in Y/M/D
  const elapsedDecimalYears = elapsedFrac * totalYears;
  const elapsed = decimalToYMD(elapsedDecimalYears);

  // THE CALENDAR WALK: Subtract the exact years, months, and days from the birth date
  const birthDate = dayjs(birthDateLocalStr);
  let currentStartDate = birthDate
    .subtract(elapsed.years, 'year')
    .subtract(elapsed.months, 'month')
    .subtract(elapsed.days, 'day');

  const dashas: MahaDasha[] = [];

  for (let i = 0; i < 9; i++) {
    const mahaIndex = (startLordIndex + i) % 9;
    const mahaLord = DASHA_ORDER[mahaIndex];
    const mahaYears = DASHA_YEARS[mahaLord];

    const mahaStartDate = currentStartDate.clone();

    // Maha Dasha end date is exactly X years later
    const mahaEndDate = mahaStartDate.add(mahaYears, 'year');

    const bhuktis: Bhukti[] = [];
    let bhuktiStartDate = mahaStartDate.clone();

    for (let j = 0; j < 9; j++) {
      const subIndex = (mahaIndex + j) % 9;
      const subLord = DASHA_ORDER[subIndex];
      const subYears = DASHA_YEARS[subLord];

      // Proportional duration logic: (Maha * Bhukti / 120)
      const bhuktiDecimalYears = (mahaYears * subYears) / 120;
      const bhukti = decimalToYMD(bhuktiDecimalYears);

      // THE CALENDAR WALK: Add the exact years, months, and days to step forward.
      // The last bhukti is pinned to the maha dasha end date so that per-bhukti
      // day rounding cannot drift the sequence past the period boundary.
      const bhuktiEndDate =
        j === 8
          ? mahaEndDate
          : bhuktiStartDate
              .add(bhukti.years, 'year')
              .add(bhukti.months, 'month')
              .add(bhukti.days, 'day');

      bhuktis.push({
        lord: subLord,
        startDate: bhuktiStartDate.format('YYYY-MM-DDTHH:mm:ss'),
        endDate: bhuktiEndDate.format('YYYY-MM-DDTHH:mm:ss'),
      });

      bhuktiStartDate = bhuktiEndDate;
    }

    dashas.push({
      lord: mahaLord,
      years: mahaYears,
      startDate: mahaStartDate.format('YYYY-MM-DDTHH:mm:ss'),
      endDate: mahaEndDate.format('YYYY-MM-DDTHH:mm:ss'),
      bhuktis,
    });

    // The next Maha Dasha starts exactly when this one ends
    currentStartDate = mahaEndDate;
  }

  return dashas;
}
