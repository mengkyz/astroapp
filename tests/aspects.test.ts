import { describe, it, expect } from 'vitest';
import { signDist, specialTarget, computeAspects, AspectBody } from '@/lib/astro/aspects';

describe('signDist', () => {
  it('returns minimum circular distance in signs', () => {
    expect(signDist(1, 1)).toBe(0);
    expect(signDist(1, 7)).toBe(6);
    expect(signDist(1, 12)).toBe(1);
    expect(signDist(2, 11)).toBe(3);
  });
});

describe('specialTarget', () => {
  it('counts positions inclusively, Vedic style', () => {
    // Mars in Aries (1): 4th = Cancer (4), 8th = Scorpio (8)
    expect(specialTarget(1, 4)).toBe(4);
    expect(specialTarget(1, 8)).toBe(8);
    // Saturn in Capricorn (10): 3rd = Pisces (12), 10th = Libra (7)
    expect(specialTarget(10, 3)).toBe(12);
    expect(specialTarget(10, 10)).toBe(7);
  });
});

describe('computeAspects', () => {
  const bodies: AspectBody[] = [
    { code: '1', rasi: 1, key: 'SUN' },
    { code: '2', rasi: 1, key: 'MOON' },
    { code: '3', rasi: 5, key: 'MARS' },     // 4 signs away from Aries → trikon
    { code: '7', rasi: 7, key: 'SATURN' },   // opposite Aries → leng
  ];

  it('classifies conjunction, trine and opposition', () => {
    const asp = computeAspects(1, 'SUN', bodies);
    expect(asp.kum).toEqual(['2']);      // Moon in the same sign
    expect(asp.trikon).toEqual(['3']);   // Mars 4 signs away
    expect(asp.leng).toEqual(['7']);     // Saturn opposite
  });

  it('excludes the body itself', () => {
    const asp = computeAspects(1, 'MOON', bodies);
    expect(asp.kum).toEqual(['1']); // only the Sun, not the Moon itself
  });

  it('detects special aspects', () => {
    // Mars in Leo (5): 4th = Scorpio (8), 8th = Pisces (12)
    const asp8 = computeAspects(8, 'X', bodies);
    expect(asp8.special).toContain('3');
    const asp12 = computeAspects(12, 'X', bodies);
    expect(asp12.special).toContain('3');
    // Saturn in Libra (7): 3rd = Sagittarius (9), 10th = Cancer (4)
    const asp9 = computeAspects(9, 'X', bodies);
    expect(asp9.special).toContain('7');
  });
});
