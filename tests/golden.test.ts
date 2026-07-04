import { describe, it, expect } from 'vitest';
import { toJulianDay } from '@/lib/ephemeris/julian';
import { calcPlanet, calcKetu, calcSunriseSunset, PLANET_IDS } from '@/lib/ephemeris/swisseph';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcLagna } from '@/lib/charts/lagna';
import { getRasi } from '@/lib/charts/rasi';
import { getNakshatra } from '@/lib/charts/nakshatra';

/**
 * Golden regression chart: 1990-06-15 08:30:00 UTC+7, Bangkok
 * (13.7563 N, 100.5018 E), Lahiri ayanamsa, Swiss Ephemeris data files.
 *
 * Reference longitudes were generated from this codebase with the bundled
 * Swiss Ephemeris files loaded, and sanity-checked against known positions
 * (sidereal Sun at the very end of Taurus, retrograde Saturn early Capricorn,
 * mean Rahu mid-Capricorn). Any change that shifts these values by more than
 * ~0.4 arcminutes indicates an unintended change to the calculation chain.
 */
const INPUT = {
  year: 1990, month: 6, day: 15,
  hour: 8, minute: 30, second: 0,
  latitude: 13.7563, longitude: 100.5018,
  utcOffset: 7,
};

const EXPECTED_LON: Record<string, number> = {
  SUN: 59.984401,
  MOON: 315.818552,
  MERCURY: 41.217082,
  VENUS: 24.535905,
  MARS: 346.999377,
  JUPITER: 82.067473,
  SATURN: 270.330203,
  URANUS: 254.454932,
  RAHU: 285.993770,
};

const EXPECTED_RETRO: Record<string, boolean> = {
  SUN: false, MOON: false, MERCURY: false, VENUS: false, MARS: false,
  JUPITER: false, SATURN: true, URANUS: true, RAHU: true,
};

describe('golden chart (1990-06-15 08:30 +07, Bangkok)', () => {
  const jd = toJulianDay(INPUT);

  it('computes the Julian Day', () => {
    expect(jd).toBeCloseTo(2448057.5625, 6);
  });

  it('computes the Lahiri ayanamsa', () => {
    expect(getLahiriAyanamsa(jd)).toBeCloseTo(23.723719, 4);
  });

  it('computes the lagna (Cancer, ~5°25\')', () => {
    const lagna = calcLagna(jd, INPUT.latitude, INPUT.longitude);
    expect(lagna).toBeCloseTo(95.414153, 3);
    expect(getRasi(lagna)).toBe(4); // 95.41° = Cancer
  });

  it('computes all sidereal planet longitudes', () => {
    for (const [key, id] of Object.entries(PLANET_IDS)) {
      const p = calcPlanet(id, jd);
      expect(p.longitude, key).toBeCloseTo(EXPECTED_LON[key], 3);
      expect(p.isRetrograde, key).toBe(EXPECTED_RETRO[key]);
    }
  });

  it('places Ketu exactly opposite Rahu', () => {
    const ketu = calcKetu(EXPECTED_LON.RAHU);
    expect(ketu).toBeCloseTo(105.993770, 3);
  });

  it('derives sign and nakshatra for the Moon', () => {
    // Moon 315.82° = Aquarius (sign 11), Shatabhisha (index 23)
    expect(getRasi(EXPECTED_LON.MOON)).toBe(11);
    const nak = getNakshatra(EXPECTED_LON.MOON);
    expect(nak.index).toBe(23);
  });

  it('computes Bangkok sunrise/sunset of the birth day', () => {
    const sunTimes = calcSunriseSunset(jd, INPUT.latitude, INPUT.longitude, INPUT.utcOffset);
    expect(sunTimes).not.toBeNull();
    // ~05:50 and ~18:46 local time
    expect(sunTimes!.sunriseJd).toBeCloseTo(2448057.4514733, 4);
    expect(sunTimes!.sunsetJd).toBeCloseTo(2448057.9906435, 4);
  });
});
