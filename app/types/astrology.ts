import { ApiCalcSettings } from '@/lib/astro/settings';

export interface BirthInput {
  name?: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  latitude: number;
  longitude: number;
  utcOffset: number;
  /** Optional calculation conventions; omitted fields fall back to the Thai preset. */
  settings?: ApiCalcSettings;
}
