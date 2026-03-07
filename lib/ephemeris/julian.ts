import swisseph from 'swisseph';
import { BirthInput } from '@/app/types/astrology';

export function toJulianDay(input: BirthInput): number {
  // Convert local time to UTC
  const utcHour = input.hour + input.minute / 60 - input.utcOffset;

  // swisseph.swe_julday: year, month, day, hour(decimal UTC), calendar(1=Gregorian)
  const julday = swisseph.swe_julday(
    input.year,
    input.month,
    input.day,
    utcHour,
    swisseph.SE_GREG_CAL,
  );

  return julday;
}
