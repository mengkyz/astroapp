import swisseph from 'swisseph';

export const PLANET_IDS = {
  SUN: swisseph.SE_SUN, // 0
  MOON: swisseph.SE_MOON, // 1
  MERCURY: swisseph.SE_MERCURY, // 2
  VENUS: swisseph.SE_VENUS, // 3
  MARS: swisseph.SE_MARS, // 4
  JUPITER: swisseph.SE_JUPITER, // 5
  SATURN: swisseph.SE_SATURN, // 6
  URANUS: swisseph.SE_URANUS, // 7  (มฤตยู)
  NEPTUNE: swisseph.SE_NEPTUNE, // 8  (เนปจูน)
  PLUTO: swisseph.SE_PLUTO, // 9  (พลูโต)
  RAHU: swisseph.SE_MEAN_NODE, // 11 (ราหู)
};

export function calcPlanet(planetId: number, jd: number) {
  // Enforce sidereal mode before calculating
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  // Flags: We want Sidereal positions + Speed (to check if retrograde)
  const flags = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
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

// Ketu (๙) is always exactly 180 degrees opposite Rahu (๘)
export function calcKetu(rahuLon: number): number {
  return (rahuLon + 180) % 360;
}
