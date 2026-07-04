import dayjs from 'dayjs';
import { translations, Language } from '@/lib/i18n/translations';

export const pad2 = (n: number) => n.toString().padStart(2, '0');

const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** Localized date (Thai Buddhist Era +543 for th). */
export function formatLocalDate(isoStr: string, lang: Language): string {
  const d = dayjs(isoStr);
  if (lang === 'th') {
    return `${d.date()} ${TH_MONTHS_SHORT[d.month()]} ${d.year() + 543}`;
  }
  return d.format('MMM DD, YYYY');
}

/** Calendar-walk duration between two dates as "XyYmZd" with localized unit labels. */
export function formatDuration(
  startISO: string,
  endISO: string,
  tStr: typeof translations.en.dashaTable,
): string {
  const start = dayjs(startISO);
  const end = dayjs(endISO);
  const years = end.diff(start, 'year');
  let temp = start.add(years, 'year');
  const months = end.diff(temp, 'month');
  temp = temp.add(months, 'month');
  const days = end.diff(temp, 'day');
  return `${years}${tStr.y}${months}${tStr.m}${days}${tStr.d}`;
}

export interface DMS {
  d: number;
  m: number;
  s: number;
  dir: string;
}

/** Decimal degrees → degrees/minutes/seconds with hemisphere letter. */
export function decimalToDMS(decimal: number, isLat: boolean): DMS {
  const dir = decimal >= 0 ? (isLat ? 'N' : 'E') : isLat ? 'S' : 'W';
  const abs = Math.abs(decimal || 0);
  let d = Math.floor(abs);
  const mDec = (abs - d) * 60;
  let m = Math.floor(mDec);
  let s = Math.round((mDec - m) * 60);

  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }

  return { d, m, s, dir };
}

/** Degrees/minutes/seconds + hemisphere → signed decimal degrees. */
export function dmsToDecimal(d: number, m: number, s: number, dir: string): number {
  let dec = d + m / 60 + s / 3600;
  if (dir === 'S' || dir === 'W') dec = -dec;
  return dec;
}
