import { normalizeLon } from './rasi';

export function getNakshatra(longitude: number) {
  const lon = normalizeLon(longitude);
  const nakshatraSpan = 360 / 27; // 13.3333°
  const padaSpan = nakshatraSpan / 4; // 3.3333°

  const index = Math.min(26, Math.floor(lon / nakshatraSpan)); // 0-26
  const pada = Math.min(4, Math.floor((lon % nakshatraSpan) / padaSpan) + 1); // 1-4

  return { index, pada };
}
