export function getNakshatra(longitude: number) {
  const nakshatraSpan = 360 / 27; // 13.3333°
  const padaSpan = nakshatraSpan / 4; // 3.3333°

  const index = Math.floor(longitude / nakshatraSpan); // 0-26
  const pada = Math.floor((longitude % nakshatraSpan) / padaSpan) + 1; // 1-4

  return { index, pada };
}
