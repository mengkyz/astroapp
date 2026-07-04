/**
 * Thai-style sign-based aspect engine, shared by the planet table and the
 * CSV export. Aspect groups (by minimum sign distance):
 *   kum (กุม) = 0, yok (โยค) = 2, chak (จักร) = 3, trikon (ตรีโกณ) = 4,
 *   leng (เล็ง) = 6, plus the special Vedic aspects of Mars (4th/8th),
 *   Jupiter (5th/9th) and Saturn (3rd/10th) counted inclusively.
 */

export interface AspectBody {
  code: string; // planet code ('1'-'9', '0')
  rasi: number;
  key: string;  // planet key, or 'LAGNA'
}

export interface AspectResult {
  kum: string[];
  yok: string[];
  chak: string[];
  trikon: string[];
  leng: string[];
  special: string[];
}

/** Minimum sign distance (0–6) between two signs. */
export function signDist(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 6 ? 12 - diff : diff;
}

/**
 * Target sign of a special aspect cast by a planet in `planetSign`
 * at the N-th position (counted inclusively, Vedic style).
 * Formula: ((planetSign + N - 2) % 12) + 1
 */
export function specialTarget(planetSign: number, n: number): number {
  return ((planetSign + n - 2) % 12) + 1;
}

const SPECIAL_PLANETS = [
  { key: 'MARS', code: '3', positions: [4, 8] },
  { key: 'JUPITER', code: '5', positions: [5, 9] },
  { key: 'SATURN', code: '7', positions: [3, 10] },
] as const;

export function computeAspects(
  targetRasi: number,
  selfKey: string,
  allBodies: AspectBody[],
): AspectResult {
  const result: AspectResult = { kum: [], yok: [], chak: [], trikon: [], leng: [], special: [] };

  allBodies.forEach((body) => {
    if (body.key === selfKey) return;
    const d = signDist(targetRasi, body.rasi);
    if (d === 0) result.kum.push(body.code);
    else if (d === 2) result.yok.push(body.code);
    else if (d === 3) result.chak.push(body.code);
    else if (d === 4) result.trikon.push(body.code);
    else if (d === 6) result.leng.push(body.code);
  });

  SPECIAL_PLANETS.forEach(({ key, code, positions }) => {
    const body = allBodies.find((b) => b.key === key);
    if (!body) return;
    positions.forEach((n) => {
      if (specialTarget(body.rasi, n) === targetRasi) {
        result.special.push(code);
      }
    });
  });

  return result;
}
