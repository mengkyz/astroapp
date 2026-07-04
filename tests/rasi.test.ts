import { describe, it, expect } from 'vitest';
import { getRasi, getDegreesInRasi, normalizeLon } from '@/lib/charts/rasi';

describe('normalizeLon', () => {
  it('keeps values in [0, 360)', () => {
    expect(normalizeLon(0)).toBe(0);
    expect(normalizeLon(360)).toBe(0);
    expect(normalizeLon(725)).toBe(5);
    expect(normalizeLon(-30)).toBe(330);
  });
});

describe('getRasi', () => {
  it('maps sign boundaries correctly', () => {
    expect(getRasi(0)).toBe(1); // 0° Aries
    expect(getRasi(29.9999)).toBe(1);
    expect(getRasi(30)).toBe(2); // 0° Taurus
    expect(getRasi(359.9999)).toBe(12);
    expect(getRasi(360)).toBe(1); // wraps
  });
});

describe('getDegreesInRasi', () => {
  it('converts a longitude to D/M/S within the sign', () => {
    const r = getDegreesInRasi(45.5); // 15°30' Taurus
    expect(r).toEqual({ deg: 15, min: 30, sec: 0 });
  });

  it('carries second rounding overflow instead of showing 60"', () => {
    // 29°59'59.9" → rounds to 30°00'00" ... carried up, never sec === 60
    const r = getDegreesInRasi(29 + 59 / 60 + 59.9 / 3600);
    expect(r.sec).toBeLessThan(60);
    expect(r.min).toBeLessThan(60);
    expect(r).toEqual({ deg: 30, min: 0, sec: 0 });
  });
});
