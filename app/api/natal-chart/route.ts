import { NextRequest, NextResponse } from 'next/server';
import { toJulianDay } from '@/lib/ephemeris/julian';
import { calcPlanet, calcKetu, PLANET_IDS } from '@/lib/ephemeris/swisseph';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcLagna } from '@/lib/charts/lagna';
import { getRasi, getDegreesInRasi } from '@/lib/charts/rasi';
import { getNakshatra } from '@/lib/charts/nakshatra';
import { BirthInput } from '@/app/types/astrology';

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as BirthInput;

    // 1. Calculate Julian Day
    const jd = toJulianDay(input);

    // 2. Calculate Ayanamsa
    const ayanamsa = getLahiriAyanamsa(jd);

    // 3. Calculate Lagna (Ascendant)
    const lagnaLon = calcLagna(jd, input.latitude, input.longitude, ayanamsa);
    const lagnaRasi = getRasi(lagnaLon);

    // 4. Calculate All Planets
    // We will map over our defined PLANET_IDS to calculate each one
    const planets = Object.entries(PLANET_IDS).map(([key, id]) => {
      let longitude = 0;
      let isRetrograde = false;

      // Handle Ketu separately (always 180 deg from Rahu)
      if (key === 'KETU') {
        const rahu = calcPlanet(PLANET_IDS.RAHU, jd);
        longitude = calcKetu(rahu.longitude);
        isRetrograde = true; // Nodes are generally retrograde
      } else {
        const result = calcPlanet(id, jd);
        longitude = result.longitude;
        isRetrograde = result.isRetrograde;
      }

      const rasi = getRasi(longitude);
      const { deg, min, sec } = getDegreesInRasi(longitude);
      const { index: nakshatraIdx, pada } = getNakshatra(longitude);

      // Calculate House (Relative to Lagna)
      const house = ((rasi - lagnaRasi + 12) % 12) + 1;

      return {
        key,
        longitude,
        rasi,
        degrees: deg,
        minutes: min,
        seconds: sec,
        nakshatraIndex: nakshatraIdx,
        pada,
        house,
        isRetrograde,
      };
    });

    // Return the complete chart payload
    return NextResponse.json({
      julianDay: jd,
      ayanamsa,
      lagna: {
        longitude: lagnaLon,
        rasi: lagnaRasi,
        ...getDegreesInRasi(lagnaLon),
      },
      planets,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
