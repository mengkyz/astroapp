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

    // 1. Calculate Julian Day
    const jd = toJulianDay(input);

    // 2. Calculate Ayanamsa
    const ayanamsa = getLahiriAyanamsa(jd);

    // 3. Calculate Lagna (Ascendant)
    // ayanamsa is removed here because swe_houses_ex with SEFLG_SIDEREAL handles it natively
    const lagnaLon = calcLagna(jd, input.latitude, input.longitude);
    const lagnaRasi = getRasi(lagnaLon);

    // 4. Calculate All Planets from PLANET_IDS
    const planets = Object.entries(PLANET_IDS).map(([key, id]) => {
      const result = calcPlanet(id, jd);
      const longitude = result.longitude;
      const isRetrograde = result.isRetrograde;

      const rasi = getRasi(longitude);
      const { deg, min, sec } = getDegreesInRasi(longitude);
      const { index: nakshatraIdx, pada } = getNakshatra(longitude);

      // Calculate House (Relative to Lagna)
      const house = ((rasi - lagnaRasi + 12) % 12) + 1;

      return {
        key,
        longitude,
        rasi,
        rasiName: RASI_NAMES[rasi],
        degrees: deg,
        minutes: min,
        seconds: sec,
        nakshatraIndex: nakshatraIdx,
        nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
        pada,
        house,
        isRetrograde,
      };
    });

    // 5. Inject Ketu manually (always 180 degrees from Rahu)
    const rahu = planets.find((p) => p.key === 'RAHU');
    if (rahu) {
      const ketuLon = calcKetu(rahu.longitude);
      const ketuRasi = getRasi(ketuLon);
      const { deg, min, sec } = getDegreesInRasi(ketuLon);
      const { index: nakshatraIdx, pada } = getNakshatra(ketuLon);
      const house = ((ketuRasi - lagnaRasi + 12) % 12) + 1;

      planets.push({
        key: 'KETU',
        longitude: ketuLon,
        rasi: ketuRasi,
        rasiName: RASI_NAMES[ketuRasi],
        degrees: deg,
        minutes: min,
        seconds: sec,
        nakshatraIndex: nakshatraIdx,
        nakshatraName: NAKSHATRA_NAMES[nakshatraIdx],
        pada,
        house,
        isRetrograde: true, // Nodes are generally retrograde
      });
    }

    // Return the complete chart payload
    return NextResponse.json({
      julianDay: jd,
      ayanamsa,
      lagna: {
        longitude: lagnaLon,
        rasi: lagnaRasi,
        rasiName: RASI_NAMES[lagnaRasi],
        ...getDegreesInRasi(lagnaLon),
      },
      planets,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
