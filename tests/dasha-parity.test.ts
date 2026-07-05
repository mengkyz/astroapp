import { describe, it, expect } from 'vitest';
import { calculateVimshottariDasha } from '@/lib/charts/dasha';
import { toJulianDay } from '@/lib/ephemeris/julian';
import { calcTrueSiderealYear } from '@/lib/ephemeris/swisseph';
import fixtures from './fixtures/pyjhora-golden.json';

/**
 * Vimshottari parity against PyJHora (JHora default method: TRUE sidereal
 * year — the Sun's Aries-ingress-to-ingress duration around the birth).
 *
 * The TS engine takes the Moon longitude from the fixture's apparent_mean mode
 * (proven identical to our ephemeris pipeline in pyjhora-parity.test.ts), so
 * any date difference here is purely the dasha arithmetic.
 */

const TOLERANCE_MS = 120_000; // 2 minutes — float rounding across two engines

const pad = (n: number) => n.toString().padStart(2, '0');

function localStrOf(input: {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
}): string {
  return `${input.year}-${pad(input.month)}-${pad(input.day)}T${pad(input.hour)}:${pad(input.minute)}:${pad(input.second)}`;
}

function asUtcMs(localStr: string): number {
  const [, y, mo, d, h, mi, s] = localStr
    .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)!
    .map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

describe('Vimshottari dasha parity with PyJHora (true sidereal year)', () => {
  for (const chart of fixtures.charts) {
    it(chart.id, () => {
      const mode = chart.modes.apparent_mean;
      // Use PyJHora's own year measurement so this test isolates the dasha
      // arithmetic; the year measurement itself is tested separately below.
      const result = calculateVimshottariDasha(
        mode.planets.MOON,
        localStrOf(chart.input),
        'trueSidereal',
        mode.trueSiderealYearDays,
      );

      // Flatten our bhuktis in order to line up with PyJHora's 81 rows
      const ours = result.dashas.flatMap((maha) =>
        maha.bhuktis.map((b) => ({ maha: maha.lord, bhukti: b.lord, start: b.startDate })),
      );
      const theirs = mode.vimshottari;
      expect(ours).toHaveLength(theirs.length);

      for (let i = 0; i < theirs.length; i++) {
        expect(ours[i].maha, `row ${i} maha lord`).toBe(theirs[i].maha);
        expect(ours[i].bhukti, `row ${i} bhukti lord`).toBe(theirs[i].bhukti);
        const diff = Math.abs(asUtcMs(ours[i].start) - asUtcMs(theirs[i].start));
        expect(
          diff,
          `row ${i} ${theirs[i].maha}/${theirs[i].bhukti}: ours=${ours[i].start} theirs=${theirs[i].start}`,
        ).toBeLessThan(TOLERANCE_MS);
      }
    });
  }
});

describe('true sidereal year measurement vs PyJHora', () => {
  // Our Newton-refined ingress search is exact to <1 ms; PyJHora's is a
  // sunrise-anchored daily Lagrange interpolation with up to ~1 minute of
  // noise, so the comparison tolerance reflects THEIR precision, not ours.
  const YEAR_TOLERANCE_DAYS = 0.0012; // ≈ 104 seconds

  for (const chart of fixtures.charts) {
    it(chart.id, () => {
      const jd = toJulianDay(chart.input);
      const ours = calcTrueSiderealYear(jd);
      const theirs = chart.modes.apparent_mean.trueSiderealYearDays;
      expect(Math.abs(ours - theirs), `ours=${ours} theirs=${theirs}`).toBeLessThan(
        YEAR_TOLERANCE_DAYS,
      );
      // And it must stay within the physically possible range
      expect(ours).toBeGreaterThan(365.24);
      expect(ours).toBeLessThan(365.27);
    });
  }
});
