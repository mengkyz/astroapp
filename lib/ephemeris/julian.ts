import swisseph from 'swisseph';
import { BirthInput } from '@/app/types/astrology';

export function toJulianDay(input: BirthInput): number {
  const { year, month, day, hour, minute, second = 0, utcOffset } = input;

  // Calculate exact decimal time including seconds
  const decimalHour = hour + minute / 60.0 + second / 3600.0 - utcOffset;
  return swisseph.swe_julday(
    year,
    month,
    day,
    decimalHour,
    swisseph.SE_GREG_CAL,
  );
}
