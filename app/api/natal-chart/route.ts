import { NextRequest, NextResponse } from 'next/server';
import { toJulianDay } from '@/lib/ephemeris/julian';
import { calcPlanet, calcKetu, PLANET_IDS } from '@/lib/ephemeris/swisseph';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcLagna } from '@/lib/charts/lagna';
import { getRasi, getDegreesInRasi } from '@/lib/charts/rasi';
import { getNakshatra } from '@/lib/charts/nakshatra';
import { BirthInput } from '@/app/types/astrology';
import { RASI_NAMES } from '@/lib/data/signs';
import { NAKSHATRA_NAMES } from '@/lib/data/nakshatras';

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as BirthInput;

    const jd = toJulianDay(input);
    const ayanamsa = getLahiriAyanamsa(jd);

    const lagnaLon = calcLagna(jd, input.latitude, input.longitude);
    const lagnaRasi = getRasi(lagnaLon);

    // Calculate Lagna Harmonics & Nakshatra
    const lagnaDrekkanaPart = Math.floor((lagnaLon % 30) / 10);
    const lagnaDrekkana = ((lagnaRasi - 1 + lagnaDrekkanaPart * 4) % 12) + 1;
    const lagnaNavamsa = (Math.floor(lagnaLon / (10 / 3)) % 12) + 1;
    const { index: lagnaNakshatraIdx, pada: lagnaPada } =
      getNakshatra(lagnaLon);

    const planets = Object.entries(PLANET_IDS).map(([key, id]) => {
      const result = calcPlanet(id, jd);
      const longitude = result.longitude;
      const isRetrograde = result.isRetrograde;

      const rasi = getRasi(longitude);
      const { deg, min, sec } = getDegreesInRasi(longitude);
      const { index: nakshatraIdx, pada } = getNakshatra(longitude);
      const house = ((rasi - lagnaRasi + 12) % 12) + 1;

      // 1/3rd Division (ตรียางค์)
      const drekkanaPart = Math.floor((longitude % 30) / 10);
      const drekkanaRasi = ((rasi - 1 + drekkanaPart * 4) % 12) + 1;

      // 1/9th Division (นวางค์)
      const navamsaRasi = (Math.floor(longitude / (10 / 3)) % 12) + 1;

      return {
        key,
        longitude,
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

    // Inject Ketu manually
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

    return NextResponse.json({
      julianDay: jd,
      ayanamsa,
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
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
