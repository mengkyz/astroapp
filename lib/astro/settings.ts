import { DashaYearType } from '@/lib/charts/dasha';

/**
 * System mode: two presets over one calculation-settings model.
 *
 *  - thai  : the app's original conventions — apparent positions, mean node,
 *            Rahu rules Aquarius in display tables, Thai wheel.
 *  - vedic : Jagannatha Hora parity — true geometric positions, true node,
 *            Parashari lordship (Saturn rules Aquarius).
 *
 * Both modes share the Lahiri ayanamsa, the Swiss Ephemeris and the exact
 * (true-sidereal-year) Vimshottari method; every field can be individually
 * overridden in the settings panel.
 */
export type SystemMode = 'thai' | 'vedic';

export interface CalcSettings {
  mode: SystemMode;
  /** true geometric positions (JHora) vs apparent positions */
  truePositions: boolean;
  /** true node vs mean node for Rahu/Ketu */
  trueNode: boolean;
  dashaYearType: DashaYearType;
}

export const MODE_PRESETS: Record<SystemMode, CalcSettings> = {
  thai: { mode: 'thai', truePositions: false, trueNode: false, dashaYearType: 'trueSidereal' },
  vedic: { mode: 'vedic', truePositions: true, trueNode: true, dashaYearType: 'trueSidereal' },
};

export const DEFAULT_SETTINGS: CalcSettings = MODE_PRESETS.thai;

export const DASHA_YEAR_TYPES: DashaYearType[] = [
  'trueSidereal',
  'sidereal',
  'gregorian',
  'savana',
  'calendarWalk',
];

/** Settings as sent to /api/natal-chart (mode itself is display-only). */
export interface ApiCalcSettings {
  truePositions?: boolean;
  trueNode?: boolean;
  dashaYearType?: DashaYearType;
}

export function isDashaYearType(v: unknown): v is DashaYearType {
  return typeof v === 'string' && (DASHA_YEAR_TYPES as string[]).includes(v);
}
