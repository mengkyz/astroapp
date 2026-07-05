import { describe, it, expect } from 'vitest';
import { computePanchanga, karanaNameIndex } from '@/lib/charts/panchanga';
import fixtures from './fixtures/pyjhora-golden.json';

describe('computePanchanga', () => {
  it('matches PyJHora for the golden chart (tithi 22, yoga 2, karana 43, nak 24/3)', () => {
    const mode = fixtures.charts[0].modes.apparent_mean;
    const p = computePanchanga(mode.planets.SUN, mode.planets.MOON, 5);
    expect(p.tithiIndex).toBe(22);        // Krishna Saptami
    expect(p.waxing).toBe(false);
    expect(p.pakshaDay).toBe(7);
    expect(p.yogaIndex).toBe(2);          // Priti
    expect(p.karanaIndex).toBe(43);
    expect(p.nakshatraIndex).toBe(23);    // Shatabhisha (0-based; PyJHora prints 24 1-based)
    expect(p.pada).toBe(3);
    expect(p.vaara).toBe(5);              // Friday
  });

  it('maps karana numbers to the correct names', () => {
    expect(karanaNameIndex(1)).toBe(10);  // Kimstughna
    expect(karanaNameIndex(2)).toBe(0);   // Bava
    expect(karanaNameIndex(8)).toBe(6);   // Vishti
    expect(karanaNameIndex(9)).toBe(0);   // Bava again (cycle)
    expect(karanaNameIndex(57)).toBe(6);  // last movable = Vishti
    expect(karanaNameIndex(58)).toBe(7);  // Shakuni
    expect(karanaNameIndex(59)).toBe(8);  // Chatushpada
    expect(karanaNameIndex(60)).toBe(9);  // Naga
  });

  it('handles new moon and full moon boundaries', () => {
    const newMoon = computePanchanga(100, 100.5, 0);
    expect(newMoon.tithiIndex).toBe(1);
    expect(newMoon.waxing).toBe(true);
    const nearAmavasya = computePanchanga(100, 99.5, 0);
    expect(nearAmavasya.tithiIndex).toBe(30);
    expect(nearAmavasya.waxing).toBe(false);
  });
});
