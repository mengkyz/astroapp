import swisseph from 'swisseph';

export function calcLagna(
  jd: number,
  latitude: number,
  longitude: number,
  ayanamsa: number,
): number {
  // Enforce sidereal mode
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  // swe_houses_ex calculates the house cusps and the Ascendant
  // "W" stands for the Whole Sign house system
  const houses = swisseph.swe_houses_ex(
    jd,
    swisseph.SEFLG_SIDEREAL,
    latitude,
    longitude,
    'W',
  ) as { ascendant: number; error?: string };

  if (houses.error) {
    throw new Error(`House calculation error: ${houses.error}`);
  }

  // The ascendant returned is tropical, we must subtract the ayanamsa to make it sidereal
  let lagna = houses.ascendant - ayanamsa;
  if (lagna < 0) lagna += 360;

  return lagna; // Returns the exact sidereal longitude of the Ascendant
}
