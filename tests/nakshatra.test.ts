import { describe, it, expect } from 'vitest';
import { getNakshatra } from '@/lib/charts/nakshatra';

const SPAN = 360 / 27;

describe('getNakshatra', () => {
  it('maps the start of the zodiac to Ashwini pada 1', () => {
    expect(getNakshatra(0)).toEqual({ index: 0, pada: 1 });
  });

  it('maps nakshatra boundaries', () => {
    expect(getNakshatra(SPAN - 0.0001).index).toBe(0);
    expect(getNakshatra(SPAN).index).toBe(1);
    expect(getNakshatra(359.9999).index).toBe(26);
  });

  it('maps pada boundaries within a nakshatra', () => {
    expect(getNakshatra(SPAN / 4 - 0.0001).pada).toBe(1);
    expect(getNakshatra(SPAN / 4).pada).toBe(2);
    expect(getNakshatra(SPAN * 0.75).pada).toBe(4);
  });

  it('never exceeds valid ranges even at 360', () => {
    const r = getNakshatra(360);
    expect(r.index).toBeGreaterThanOrEqual(0);
    expect(r.index).toBeLessThanOrEqual(26);
    expect(r.pada).toBeGreaterThanOrEqual(1);
    expect(r.pada).toBeLessThanOrEqual(4);
  });
});
