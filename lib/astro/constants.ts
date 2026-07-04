/**
 * Shared astrological constants used across the UI, CSV export and print
 * layout. Single source of truth — do not redeclare these in components.
 *
 * Sign lordship conventions:
 *  - THAI_SIGN_LORDS gives Aquarius (11) to RAHU, per the Thai tradition used
 *    by all display tables and the Rasi wheel.
 *  - The Shadbala module (lib/charts/shadbala.ts) intentionally uses the
 *    Parashari convention (Saturn owns Aquarius), matching B.V. Raman's text
 *    on which those calculations are based.
 */

/** Display order of bodies in tables and the chart. */
export const PLANET_ORDER = [
  'SUN',
  'MOON',
  'MARS',
  'MERCURY',
  'JUPITER',
  'VENUS',
  'SATURN',
  'RAHU',
  'KETU',
  'URANUS',
] as const;

/** Thai traditional numeric codes used in the aspect columns. */
export const PLANET_CODE: Record<string, string> = {
  SUN: '1', MOON: '2', MARS: '3', MERCURY: '4', JUPITER: '5',
  VENUS: '6', SATURN: '7', RAHU: '8', KETU: '9', URANUS: '0',
};

/** Thai numeral symbols for the Rasi wheel. */
export const THAI_SYMBOLS: Record<string, string> = {
  SUN: '๑', MOON: '๒', MARS: '๓', MERCURY: '๔', JUPITER: '๕',
  VENUS: '๖', SATURN: '๗', RAHU: '๘', KETU: '๙', URANUS: '๐',
};

/** Western astronomical symbols. */
export const EN_SYMBOLS: Record<string, string> = {
  SUN: '☉', MOON: '☽', MARS: '♂', MERCURY: '☿', JUPITER: '♃',
  VENUS: '♀', SATURN: '♄', RAHU: '☊', KETU: '☋', URANUS: '♅',
};

/**
 * Big Rerk (ฤกษ์) groups by absolute nakshatra index: RERKS_ORDER[nakIdx % 9].
 */
export const RERKS_ORDER = [
  { th: 'ทลิทโท', en: 'Talittho' },
  { th: 'มหัทธโน', en: 'Mahatthano' },
  { th: 'โจโร', en: 'Choro' },
  { th: 'ภูมิปาโล', en: 'Bhumipalo' },
  { th: 'เทศาตรี', en: 'Tesatri' },
  { th: 'เทวี', en: 'Taewee' },
  { th: 'เพชฌฆาต', en: 'Petchakat' },
  { th: 'ราชา', en: 'Racha' },
  { th: 'สมโณ', en: 'Samano' },
] as const;

/**
 * Domicile signs per planet, Thai convention (Rahu rules Aquarius, so Saturn
 * keeps only Capricorn; Ketu and Uranus rule no sign).
 */
export const PLANET_DOMICILES: Partial<Record<string, number[]>> = {
  SUN: [5],
  MOON: [4],
  MARS: [1, 8],
  MERCURY: [3, 6],
  JUPITER: [9, 12],
  VENUS: [2, 7],
  SATURN: [10],
  RAHU: [11],
};

/** Sign lords, Thai convention (index 1-12). */
export const THAI_SIGN_LORDS: Record<number, string> = {
  1: 'MARS', 2: 'VENUS', 3: 'MERCURY', 4: 'MOON',
  5: 'SUN', 6: 'MERCURY', 7: 'VENUS', 8: 'MARS',
  9: 'JUPITER', 10: 'SATURN', 11: 'RAHU', 12: 'JUPITER',
};

/** Element translation key by sign (index 1-12; index 0 unused). */
export const SIGN_ELEMENT_KEY = [
  '', 'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
] as const;

/** Modality translation key by sign (index 1-12; index 0 unused). */
export const SIGN_MODALITY_KEY = [
  '', 'cardinal', 'fixed', 'mutable', 'cardinal',
  'fixed', 'mutable', 'cardinal', 'fixed', 'mutable',
  'cardinal', 'fixed', 'mutable',
] as const;

/** Vimshottari dasha lord sequence (nakshatra index % 9 → lord). */
export const VIMSHOTTARI_LORDS = [
  'KETU', 'VENUS', 'SUN', 'MOON', 'MARS', 'RAHU', 'JUPITER', 'SATURN', 'MERCURY',
] as const;

/** Vimshottari dasha years per lord, same order as VIMSHOTTARI_LORDS. */
export const VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17] as const;
