import swisseph from 'swisseph';

export function getLahiriAyanamsa(julianDay: number): number {
  // Set sidereal mode to Lahiri (SE_SIDM_LAHIRI = 1)
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  const ayanamsa = swisseph.swe_get_ayanamsa_ut(julianDay);
  return ayanamsa;
}
