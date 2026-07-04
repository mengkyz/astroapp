import { NextRequest, NextResponse } from 'next/server';
import { toJulianDay } from '@/lib/ephemeris/julian';
import {
  calcPlanet,
  calcKetu,
  calcDeclination,
  calcSunriseSunset,
  PLANET_IDS,
} from '@/lib/ephemeris/swisseph';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcLagna } from '@/lib/charts/lagna';
import { getRasi, getDegreesInRasi } from '@/lib/charts/rasi';
import { getNakshatra } from '@/lib/charts/nakshatra';
import { calculateVimshottariDasha } from '@/lib/charts/dasha';
import { BirthInput } from '@/app/types/astrology';
import { RASI_NAMES } from '@/lib/data/signs';
import { NAKSHATRA_NAMES } from '@/lib/data/nakshatras';
import { calculateBalas } from '@/lib/charts/shadbala';

interface ValidationError {
  field: string;
  message: string;
}

function validateInput(input: Partial<BirthInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  if (!num(input.year) || input.year < 1 || input.year > 3000) {
    errors.push({ field: 'year', message: 'Year must be between 1 and 3000 (CE).' });
  }
  if (!num(input.month) || input.month < 1 || input.month > 12) {
    errors.push({ field: 'month', message: 'Month must be 1-12.' });
  }
  if (!num(input.day) || input.day < 1 || input.day > 31) {
    errors.push({ field: 'day', message: 'Day must be 1-31.' });
  }
  if (!num(input.hour) || input.hour < 0 || input.hour > 23) {
    errors.push({ field: 'hour', message: 'Hour must be 0-23.' });
  }
  if (!num(input.minute) || input.minute < 0 || input.minute > 59) {
    errors.push({ field: 'minute', message: 'Minute must be 0-59.' });
  }
  if (input.second !== undefined && (!num(input.second) || input.second < 0 || input.second > 59)) {
    errors.push({ field: 'second', message: 'Second must be 0-59.' });
  }
  if (!num(input.latitude) || Math.abs(input.latitude) > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90.' });
  }
  if (!num(input.longitude) || Math.abs(input.longitude) > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180.' });
  }
  if (!num(input.utcOffset) || Math.abs(input.utcOffset) > 14) {
    errors.push({ field: 'utcOffset', message: 'UTC offset must be between -14 and +14 hours.' });
  }

  // Reject impossible calendar dates (e.g. Feb 31) — swe_julday would
  // silently roll them into the next month.
  if (errors.length === 0) {
    const { year, month, day } = input as BirthInput;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      errors.push({
        field: 'day',
        message: `Invalid date: ${year}-${month} has only ${daysInMonth} days.`,
      });
    }
  }

  return errors;
}

export async function POST(req: NextRequest) {
  let input: BirthInput;
  try {
    input = (await req.json()) as BirthInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: 'Invalid birth data.', details: validationErrors },
      { status: 400 },
    );
  }

  try {
    const jd = toJulianDay(input);
    const ayanamsa = getLahiriAyanamsa(jd);

    const lagnaLon = calcLagna(jd, input.latitude, input.longitude);
    const lagnaRasi = getRasi(lagnaLon);

    const lagnaDrekkanaPart = Math.floor((lagnaLon % 30) / 10);
    const lagnaDrekkana = ((lagnaRasi - 1 + lagnaDrekkanaPart * 4) % 12) + 1;
    const lagnaNavamsa = (Math.floor(lagnaLon / (10 / 3)) % 12) + 1;
    const { index: lagnaNakshatraIdx, pada: lagnaPada } =
      getNakshatra(lagnaLon);

    const planets = Object.entries(PLANET_IDS).map(([key, id]) => {
      const result = calcPlanet(id, jd);
      const longitude = result.longitude;
      const isRetrograde = result.isRetrograde;
      const declination = calcDeclination(id, jd);

      const rasi = getRasi(longitude);
      const { deg, min, sec } = getDegreesInRasi(longitude);
      const { index: nakshatraIdx, pada } = getNakshatra(longitude);
      const house = ((rasi - lagnaRasi + 12) % 12) + 1;

      const drekkanaPart = Math.floor((longitude % 30) / 10);
      const drekkanaRasi = ((rasi - 1 + drekkanaPart * 4) % 12) + 1;
      const navamsaRasi = (Math.floor(longitude / (10 / 3)) % 12) + 1;

      return {
        key,
        longitude,
        speed: result.speed,
        declination,
        rasi,
        rasiName: RASI_NAMES[rasi],
        degrees: deg,
        minutes: min,
        seconds: sec,
        drekkana: drekkanaRasi,
        drekkanaName: RASI_NAMES[drekkanaRasi],
        navamsa: navamsaRasi,
        navamsaName: RASI_NAMES[navamsaRasi],
        nakshatraIndex: nakshatraIdx,
        nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
        pada,
        house,
        isRetrograde,
      };
    });

    const rahu = planets.find((p) => p.key === 'RAHU');
    if (rahu) {
      const ketuLon = calcKetu(rahu.longitude);
      const ketuRasi = getRasi(ketuLon);
      const { deg, min, sec } = getDegreesInRasi(ketuLon);
      const { index: nakshatraIdx, pada } = getNakshatra(ketuLon);
      const house = ((ketuRasi - lagnaRasi + 12) % 12) + 1;

      const drekkanaPart = Math.floor((ketuLon % 30) / 10);
      const drekkanaRasi = ((ketuRasi - 1 + drekkanaPart * 4) % 12) + 1;
      const navamsaRasi = (Math.floor(ketuLon / (10 / 3)) % 12) + 1;

      planets.push({
        key: 'KETU',
        longitude: ketuLon,
        speed: rahu.speed,
        declination: -rahu.declination,
        rasi: ketuRasi,
        rasiName: RASI_NAMES[ketuRasi],
        degrees: deg,
        minutes: min,
        seconds: sec,
        drekkana: drekkanaRasi,
        drekkanaName: RASI_NAMES[drekkanaRasi],
        navamsa: navamsaRasi,
        navamsaName: RASI_NAMES[navamsaRasi],
        nakshatraIndex: nakshatraIdx,
        nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
        pada,
        house,
        isRetrograde: true,
      });
    }

    // Vimshottari Dasha (anchored to the exact birth moment incl. seconds)
    const moon = planets.find((p) => p.key === 'MOON');
    let dashaData = null;
    let birthDateLocalStr = '';

    if (moon) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      // Create a "timezone-less" local date string so UI formatting remains perfectly stable
      birthDateLocalStr = `${input.year}-${pad(input.month)}-${pad(input.day)}T${pad(input.hour)}:${pad(input.minute)}:${pad(input.second ?? 0)}`;
      dashaData = calculateVimshottariDasha(moon.longitude, birthDateLocalStr);
    }

    // Sunrise/sunset of the birth day for the Kala Bala items
    const sunTimes = calcSunriseSunset(jd, input.latitude, input.longitude, input.utcOffset);

    // Calculate Shadbala (Graha Bala) and Bhava Bala
    const balas = calculateBalas(
      planets.map((p) => ({
        key: p.key,
        longitude: p.longitude,
        rasi: p.rasi,
        house: p.house,
        drekkana: p.drekkana,
        navamsa: p.navamsa,
        isRetrograde: p.isRetrograde,
        speed: p.speed,
        declination: p.declination,
      })),
      { longitude: lagnaLon, rasi: lagnaRasi },
      {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
        second: input.second,
        utcOffset: input.utcOffset,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      jd,
      sunTimes,
    );

    return NextResponse.json({
      julianDay: jd,
      ayanamsa,
      birthDateLocalStr, // Needed by frontend for age calculation
      lagna: {
        longitude: lagnaLon,
        rasi: lagnaRasi,
        rasiName: RASI_NAMES[lagnaRasi],
        ...getDegreesInRasi(lagnaLon),
        drekkana: lagnaDrekkana,
        drekkanaName: RASI_NAMES[lagnaDrekkana],
        navamsa: lagnaNavamsa,
        navamsaName: RASI_NAMES[lagnaNavamsa],
        nakshatraIndex: lagnaNakshatraIdx,
        nakshatraName: NAKSHATRA_NAMES[lagnaNakshatraIdx],
        pada: lagnaPada,
      },
      planets,
      dasha: dashaData,
      balas, // Graha Bala (Shadbala) + Bhava Bala
    });
  } catch (error) {
    console.error('natal-chart calculation failed:', error);
    return NextResponse.json(
      { error: 'Chart calculation failed. Please check the birth data and try again.' },
      { status: 500 },
    );
  }
}
