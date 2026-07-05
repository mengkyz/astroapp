import { NextRequest, NextResponse } from 'next/server';
import { toJulianDay } from '@/lib/ephemeris/julian';
import {
  calcPlanet,
  calcKetu,
  calcDeclination,
  calcSunriseSunset,
  calcTrueSiderealYear,
  getPlanetIds,
} from '@/lib/ephemeris/swisseph';
import { ApiCalcSettings, isDashaYearType } from '@/lib/astro/settings';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcLagna } from '@/lib/charts/lagna';
import { getRasi, getDegreesInRasi, roundToArcsecond } from '@/lib/charts/rasi';
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

  const s = (input as { settings?: Record<string, unknown> }).settings;
  if (s !== undefined) {
    if (typeof s !== 'object' || s === null) {
      errors.push({ field: 'settings', message: 'settings must be an object.' });
    } else {
      if (s.truePositions !== undefined && typeof s.truePositions !== 'boolean') {
        errors.push({ field: 'settings.truePositions', message: 'truePositions must be a boolean.' });
      }
      if (s.trueNode !== undefined && typeof s.trueNode !== 'boolean') {
        errors.push({ field: 'settings.trueNode', message: 'trueNode must be a boolean.' });
      }
      if (s.dashaYearType !== undefined && !isDashaYearType(s.dashaYearType)) {
        errors.push({ field: 'settings.dashaYearType', message: 'Unknown dashaYearType.' });
      }
    }
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

  // Calculation conventions (defaults = Thai preset, the app's original behavior)
  const settings: Required<ApiCalcSettings> = {
    truePositions: input.settings?.truePositions ?? false,
    trueNode: input.settings?.trueNode ?? false,
    dashaYearType: input.settings?.dashaYearType ?? 'trueSidereal',
  };

  try {
    const jd = toJulianDay(input);
    const ayanamsa = getLahiriAyanamsa(jd);
    const planetIds = getPlanetIds(settings.trueNode);

    // The bundled Swiss Ephemeris files cover 1800-2399; outside that range
    // swisseph silently degrades to the lower-precision Moshier model.
    const warnings: string[] = [];
    if (input.year < 1800 || input.year > 2399) {
      warnings.push('epheRange');
    }

    // Raw longitudes feed every calculation (dasha, balas, aspects); the
    // arcsecond-rounded value is used only to derive the display fields so
    // sign + DMS never disagree (e.g. 29°59'59.7" showing as 30°00'00").
    const lagnaLon = calcLagna(jd, input.latitude, input.longitude);
    const lagnaDisplayLon = roundToArcsecond(lagnaLon);
    const lagnaRasi = getRasi(lagnaDisplayLon);

    const lagnaDrekkanaPart = Math.floor((lagnaDisplayLon % 30) / 10);
    const lagnaDrekkana = ((lagnaRasi - 1 + lagnaDrekkanaPart * 4) % 12) + 1;
    const lagnaNavamsa = (Math.floor(lagnaDisplayLon / (10 / 3)) % 12) + 1;
    const { index: lagnaNakshatraIdx, pada: lagnaPada } =
      getNakshatra(lagnaDisplayLon);

    const planets = Object.entries(planetIds).map(([key, id]) => {
      const result = calcPlanet(id, jd, settings.truePositions);
      const longitude = result.longitude;
      const displayLon = roundToArcsecond(longitude);
      const isRetrograde = result.isRetrograde;
      const declination = calcDeclination(id, jd) ?? undefined;

      const rasi = getRasi(displayLon);
      const { deg, min, sec } = getDegreesInRasi(displayLon);
      const { index: nakshatraIdx, pada } = getNakshatra(displayLon);
      const house = ((rasi - lagnaRasi + 12) % 12) + 1;

      const drekkanaPart = Math.floor((displayLon % 30) / 10);
      const drekkanaRasi = ((rasi - 1 + drekkanaPart * 4) % 12) + 1;
      const navamsaRasi = (Math.floor(displayLon / (10 / 3)) % 12) + 1;

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
      const ketuDisplayLon = roundToArcsecond(ketuLon);
      const ketuRasi = getRasi(ketuDisplayLon);
      const { deg, min, sec } = getDegreesInRasi(ketuDisplayLon);
      const { index: nakshatraIdx, pada } = getNakshatra(ketuDisplayLon);
      const house = ((ketuRasi - lagnaRasi + 12) % 12) + 1;

      const drekkanaPart = Math.floor((ketuDisplayLon % 30) / 10);
      const drekkanaRasi = ((ketuRasi - 1 + drekkanaPart * 4) % 12) + 1;
      const navamsaRasi = (Math.floor(ketuDisplayLon / (10 / 3)) % 12) + 1;

      planets.push({
        key: 'KETU',
        longitude: ketuLon,
        speed: rahu.speed,
        // A node lies on the ecliptic, so the opposite point's declination is the exact negation
        declination: rahu.declination === undefined ? undefined : -rahu.declination,
        isRetrograde: rahu.isRetrograde,
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
      // JHora's default year length: the Sun's true Aries-ingress-to-ingress
      // duration around the birth moment.
      dashaData = calculateVimshottariDasha(
        moon.longitude,
        birthDateLocalStr,
        settings.dashaYearType,
        settings.dashaYearType === 'trueSidereal'
          ? calcTrueSiderealYear(jd, settings.truePositions)
          : undefined,
      );
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
      settings, // conventions actually used (echoed for the UI / exports)
      warnings,
      birthDateLocalStr, // Needed by frontend for age calculation
      lagna: {
        longitude: lagnaLon,
        rasi: lagnaRasi,
        rasiName: RASI_NAMES[lagnaRasi],
        ...getDegreesInRasi(lagnaDisplayLon),
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
