import { describe, it, expect } from 'vitest';
import { calculateBalas, PlanetBalasInput } from '@/lib/charts/shadbala';

// Synthetic but internally consistent chart: Aries lagna at 15°.
const LAGNA = { longitude: 15, rasi: 1 };

function planet(key: string, longitude: number, opts: Partial<PlanetBalasInput> = {}): PlanetBalasInput {
  const rasi = Math.floor(longitude / 30) + 1;
  const house = ((rasi - LAGNA.rasi + 12) % 12) + 1;
  const drekkanaPart = Math.floor((longitude % 30) / 10);
  return {
    key,
    longitude,
    rasi,
    house,
    drekkana: ((rasi - 1 + drekkanaPart * 4) % 12) + 1,
    navamsa: (Math.floor(longitude / (10 / 3)) % 12) + 1,
    isRetrograde: false,
    ...opts,
  };
}

const PLANETS: PlanetBalasInput[] = [
  planet('SUN', 40, { declination: 15, speed: 0.98 }),
  planet('MOON', 220, { declination: -10, speed: 13.2 }),
  planet('MARS', 100, { declination: 20, speed: 0.52 }),
  planet('MERCURY', 55, { declination: 12, speed: 1.2 }),
  planet('JUPITER', 275, { declination: -22, speed: 0.08 }),
  planet('VENUS', 20, { declination: 5, speed: 1.1 }),
  planet('SATURN', 200, { declination: -8, speed: 0.03 }),
];

const BIRTH = {
  year: 1990, month: 6, day: 15,
  hour: 8, minute: 30, second: 0,
  utcOffset: 7, latitude: 13.75, longitude: 100.5,
};
const JD = 2448057.5625; // ≈ 1990-06-15 01:30 UT

describe('calculateBalas', () => {
  const result = calculateBalas(PLANETS, LAGNA, BIRTH, JD);

  it('returns all 7 classical planets and 12 houses', () => {
    expect(result.grahaBala).toHaveLength(7);
    expect(result.bhavaBala).toHaveLength(12);
  });

  it('uses the fixed Naisargika values', () => {
    const get = (k: string) => result.grahaBala.find((g) => g.planet === k)!;
    expect(get('SUN').naisargika).toBeCloseTo(60, 1);
    expect(get('MOON').naisargika).toBeCloseTo(51.43, 1);
    expect(get('SATURN').naisargika).toBeCloseTo(8.57, 1);
  });

  it('gives Mercury full Nathonnatha Bala (always strong)', () => {
    const mercury = result.grahaBala.find((g) => g.planet === 'MERCURY')!;
    expect(mercury.kala.nathonnatha).toBe(60);
  });

  it('doubles the Sun Ayana Bala (0-120 range)', () => {
    const sun = result.grahaBala.find((g) => g.planet === 'SUN')!;
    expect(sun.kala.ayana).toBeGreaterThan(60); // decl +15° north → strong, doubled
    expect(sun.kala.ayana).toBeLessThanOrEqual(120);
  });

  it('doubles the Moon Paksha Bala (0-120 range)', () => {
    const moon = result.grahaBala.find((g) => g.planet === 'MOON')!;
    expect(moon.kala.paksha).toBeGreaterThanOrEqual(0);
    expect(moon.kala.paksha).toBeLessThanOrEqual(120);
  });

  it('keeps Uchcha Bala within 0-60', () => {
    for (const g of result.grahaBala) {
      expect(g.sthana.uchcha).toBeGreaterThanOrEqual(0);
      expect(g.sthana.uchcha).toBeLessThanOrEqual(60);
    }
  });

  it('gives kendra houses 60 Kendradi Bala', () => {
    // Venus at 20° Aries = house 1 (kendra)
    const venus = result.grahaBala.find((g) => g.planet === 'VENUS')!;
    expect(venus.sthana.kendradi).toBe(60);
  });

  it('produces finite totals and rupas = total/60', () => {
    for (const g of result.grahaBala) {
      expect(Number.isFinite(g.total)).toBe(true);
      expect(g.rupas).toBeCloseTo(g.total / 60, 1);
    }
  });

  it('marks retrograde planets with maximum Chesta Bala', () => {
    const withRetro = calculateBalas(
      [...PLANETS.filter((p) => p.key !== 'SATURN'), planet('SATURN', 200, { isRetrograde: true, speed: -0.05 })],
      LAGNA, BIRTH, JD,
    );
    const saturn = withRetro.grahaBala.find((g) => g.planet === 'SATURN')!;
    expect(saturn.chesta).toBe(60);
  });

  it('accepts explicit sunrise/sunset times', () => {
    const sunTimes = { sunriseJd: JD - 0.08, sunsetJd: JD + 0.42 };
    const withSun = calculateBalas(PLANETS, LAGNA, BIRTH, JD, sunTimes);
    expect(withSun.grahaBala).toHaveLength(7);
    for (const g of withSun.grahaBala) {
      expect(Number.isFinite(g.kala.total)).toBe(true);
    }
  });
});
