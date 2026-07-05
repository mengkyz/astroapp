import swisseph from 'swisseph';
import path from 'path';
import fs from 'fs';

// Load the Swiss Ephemeris data files bundled with the npm package.
// Without this, swisseph silently falls back to the lower-precision
// Moshier ephemeris. Runs once at module load.
const EPHE_DIR = path.join(process.cwd(), 'node_modules', 'swisseph', 'ephe');
if (fs.existsSync(EPHE_DIR)) {
  swisseph.swe_set_ephe_path(EPHE_DIR);
}

export const PLANET_IDS = {
  SUN: swisseph.SE_SUN, // 0
  MOON: swisseph.SE_MOON, // 1
  MERCURY: swisseph.SE_MERCURY, // 2
  VENUS: swisseph.SE_VENUS, // 3
  MARS: swisseph.SE_MARS, // 4
  JUPITER: swisseph.SE_JUPITER, // 5
  SATURN: swisseph.SE_SATURN, // 6
  URANUS: swisseph.SE_URANUS, // 7  (มฤตยู)
  RAHU: swisseph.SE_MEAN_NODE, // 11 (ราหู)
};

export const MEAN_NODE_ID: number = swisseph.SE_MEAN_NODE;
export const TRUE_NODE_ID: number = swisseph.SE_TRUE_NODE;

/** Planet-id map honouring the node-type setting (true node = JHora default). */
export function getPlanetIds(trueNode: boolean): typeof PLANET_IDS {
  return { ...PLANET_IDS, RAHU: trueNode ? TRUE_NODE_ID : MEAN_NODE_ID };
}

export function calcPlanet(planetId: number, jd: number, truePositions = false) {
  // Enforce sidereal mode before calculating
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  // Sidereal + speed (for retrograde); SEFLG_TRUEPOS gives true geometric
  // positions without light-time/aberration — Jagannatha Hora's convention.
  let flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
  if (truePositions) flags |= swisseph.SEFLG_TRUEPOS;
  const result = swisseph.swe_calc_ut(jd, planetId, flags) as { error?: string; longitude: number; longitudeSpeed: number };

  if (result.error) {
    throw new Error(`Ephemeris error: ${result.error}`);
  }

  return {
    longitude: result.longitude, // 0 to 360 degrees
    speed: result.longitudeSpeed, // negative means it is moving backwards
    isRetrograde: result.longitudeSpeed < 0,
  };
}

/**
 * True equatorial declination of a planet, in degrees (north positive).
 * Returns null when unavailable so callers can apply their own fallback —
 * a silent 0 here would quietly corrupt Ayana Bala.
 */
export function calcDeclination(planetId: number, jd: number): number | null {
  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_EQUATORIAL;
  const result = swisseph.swe_calc_ut(jd, planetId, flags) as {
    error?: string;
    declination?: number;
  };
  if (result.error || result.declination === undefined) {
    return null;
  }
  return result.declination;
}

/**
 * Sunrise and sunset (Julian Day, UT) surrounding the given birth moment.
 * Searches from local midnight so the returned events belong to the birth's
 * local calendar day. Returns null when unavailable (e.g. polar regions).
 */
export function calcSunriseSunset(
  jd: number,
  latitude: number,
  longitude: number,
  utcOffset: number,
): { sunriseJd: number; sunsetJd: number } | null {
  // Local midnight of the birth day, expressed in UT
  const localJd = jd + utcOffset / 24;
  const localMidnightUt = Math.floor(localJd - 0.5) + 0.5 - utcOffset / 24;

  const search = (rsmi: number): number | null => {
    const result = swisseph.swe_rise_trans(
      localMidnightUt,
      swisseph.SE_SUN,
      '',
      swisseph.SEFLG_SWIEPH,
      rsmi,
      longitude,
      latitude,
      0,
      0,
      0,
    ) as { transitTime?: number; error?: string };
    if (result.error || result.transitTime === undefined) return null;
    return result.transitTime;
  };

  const sunriseJd = search(swisseph.SE_CALC_RISE);
  const sunsetJd = search(swisseph.SE_CALC_SET);
  if (sunriseJd === null || sunsetJd === null) return null;
  return { sunriseJd, sunsetJd };
}

// Ketu (๙) is always exactly 180 degrees opposite Rahu (๘)
export function calcKetu(rahuLon: number): number {
  return (rahuLon + 180) % 360;
}

/**
 * True sidereal year around the given moment: the number of days between the
 * Sun's previous and next entry into sidereal 0° Aries. This is Jagannatha
 * Hora's default year length for dashas (varies slightly chart to chart,
 * ≈365.25–365.26 days) rather than the mean constant 365.256364.
 */
export function calcTrueSiderealYear(jd: number, truePositions = false): number {
  const sunLon = (t: number) => calcPlanet(PLANET_IDS.SUN, t, truePositions).longitude;
  // Deviation from 0° Aries mapped into [-180, 180)
  const wrap = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
  const MEAN_SPEED = 360 / 365.2564; // deg/day, good enough for Newton steps

  const refineIngress = (t: number): number => {
    for (let i = 0; i < 10; i++) {
      const err = wrap(sunLon(t));
      if (Math.abs(err) < 1e-9) break;
      t -= err / MEAN_SPEED;
    }
    return t;
  };

  const prevIngress = refineIngress(jd - sunLon(jd) / MEAN_SPEED);
  const nextIngress = refineIngress(prevIngress + 365.2564);
  return nextIngress - prevIngress;
}
