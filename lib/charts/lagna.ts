import swisseph from 'swisseph';

export function calcLagna(
  jd: number,
  latitude: number,
  longitude: number,
  // ayanamsa is no longer needed here since SEFLG_SIDEREAL handles it
): number {
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

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

  // Because we used SEFLG_SIDEREAL, the ascendant is already correct!
  let lagna = houses.ascendant;
  if (lagna < 0) lagna += 360;

  return lagna;
}
