import { describe, it, expect } from 'vitest';
import { calculateVimshottariDasha } from '@/lib/charts/dasha';

const BIRTH = '1990-06-15T08:30:00';

describe('calculateVimshottariDasha', () => {
  it('starts with the lord of the Moon nakshatra', () => {
    // Moon at 0° → Ashwini → Ketu
    expect(calculateVimshottariDasha(0, BIRTH).firstLord).toBe('KETU');
    // Moon at 20° → Bharani (13.33–26.66) → Venus
    expect(calculateVimshottariDasha(20, BIRTH).firstLord).toBe('VENUS');
    // Moon at 30° → Krittika → Sun
    expect(calculateVimshottariDasha(30, BIRTH).firstLord).toBe('SUN');
  });

  it('produces 9 maha dashas of 9 bhuktis each', () => {
    const result = calculateVimshottariDasha(123.456, BIRTH);
    expect(result.dashas).toHaveLength(9);
    for (const dasha of result.dashas) {
      expect(dasha.bhuktis).toHaveLength(9);
    }
  });

  it('keeps maha dashas contiguous', () => {
    const result = calculateVimshottariDasha(200, BIRTH);
    for (let i = 1; i < result.dashas.length; i++) {
      expect(result.dashas[i].startDate).toBe(result.dashas[i - 1].endDate);
    }
  });

  it('keeps bhuktis contiguous and pins the last bhukti to the maha end', () => {
    const result = calculateVimshottariDasha(77.7, BIRTH);
    for (const dasha of result.dashas) {
      for (let j = 1; j < dasha.bhuktis.length; j++) {
        expect(dasha.bhuktis[j].startDate).toBe(dasha.bhuktis[j - 1].endDate);
      }
      // Rounding drift must not push the sequence past the period boundary
      expect(dasha.bhuktis[8].endDate).toBe(dasha.endDate);
    }
  });

  it('covers the full 120-year cycle', () => {
    const result = calculateVimshottariDasha(0, BIRTH);
    const first = new Date(result.dashas[0].startDate).getFullYear();
    const last = new Date(result.dashas[8].endDate).getFullYear();
    expect(last - first).toBe(120);
  });

  it('elapsed fraction stays in [0, 1)', () => {
    for (const lon of [0, 5, 100, 250.5, 359.9]) {
      const f = calculateVimshottariDasha(lon, BIRTH).elapsedFraction;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});
