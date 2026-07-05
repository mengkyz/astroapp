import { describe, it, expect } from 'vitest';
import { calculateBalas, PlanetBalasInput } from '@/lib/charts/shadbala';
import { toJulianDay } from '@/lib/ephemeris/julian';
import { getLahiriAyanamsa } from '@/lib/ephemeris/ayanamsa';
import { calcSunriseSunset, calcPlacidusCusps } from '@/lib/ephemeris/swisseph';
import fixtures from './fixtures/pyjhora-golden.json';

/**
 * Shadbala parity against PyJHora's strength module (JHora / PVR method).
 *
 * Where PyJHora has acknowledged bugs, the expectation is transformed to the
 * corrected value rather than ported:
 *  - paksha / dig use raw unwrapped arcs there (values >60 or negative);
 *    wrapped equivalents: arc' = 120 - arc (for arc/3 form).
 *  - nathonnatha depends on their `drik.midnight`; we use the Sun's true
 *    lower transit, so a generous tolerance applies.
 *  - yuddha inherits their unwrapped paksha via the partial totals.
 *  - bhava drik bala: PyJHora accumulates malefics by house index instead of
 *    by planet (a plain bug), so only a sanity bound is asserted.
 */

const PLANET_KEYS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

function rasiOf(lon: number): number {
  return Math.floor(((lon % 360) + 360) % 360 / 30) + 1;
}

function buildInputs(chart: (typeof fixtures)['charts'][number]) {
  const mode = chart.modes.apparent_mean;
  const jd = toJulianDay(chart.input);
  const lagnaLon = mode.ascendant;
  const lagnaRasi = rasiOf(lagnaLon);

  const planets: PlanetBalasInput[] = PLANET_KEYS.map((key) => {
    const lon = mode.planets[key as keyof typeof mode.planets];
    const rasi = rasiOf(lon);
    return {
      key,
      longitude: lon,
      rasi,
      house: ((rasi - lagnaRasi + 12) % 12) + 1,
      drekkana: 1, // unused by the new engine
      navamsa: 1,  // unused by the new engine
      isRetrograde: false,
    };
  });

  const sunTimes = calcSunriseSunset(jd, chart.input.latitude, chart.input.longitude, chart.input.utcOffset);
  const ayanamsa = getLahiriAyanamsa(jd);
  const result = calculateBalas(
    planets,
    { longitude: lagnaLon, rasi: lagnaRasi },
    { ...chart.input },
    jd,
    sunTimes,
    {
      ayanamsa,
      julianDayLocal: jd + chart.input.utcOffset / 24,
      placidusCusps: calcPlacidusCusps(jd, chart.input.latitude, chart.input.longitude),
    },
  );
  return { result, shadbala: mode.shadbala!, ayanamsa, mode };
}

/** Wrap PyJHora's unwrapped arc/3 value back into the <=180° domain. */
const wrapArcBala = (v: number) => (v > 60 ? 120 - v : v);

describe('Shadbala parity with PyJHora', () => {
  for (const chart of fixtures.charts) {
    describe(chart.id, () => {
      const { result, shadbala, ayanamsa, mode } = buildInputs(chart);
      const c = shadbala.components;
      const g = (p: number) => result.grahaBala[p];

      it('uchcha bala', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).sthana.uchcha - c.uchcha[p]), PLANET_KEYS[p]).toBeLessThan(0.03);
        }
      });

      it('saptavargaja bala (compound friendship over 7 vargas)', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).sthana.saptavargaja - c.saptavargaja[p]), PLANET_KEYS[p]).toBeLessThan(0.03);
        }
      });

      it('ojayugma / kendra / drekkana bala', () => {
        for (let p = 0; p < 7; p++) {
          expect(g(p).sthana.ojayugma, `oja ${PLANET_KEYS[p]}`).toBe(c.ojayugma[p]);
          expect(g(p).sthana.kendradi, `kendra ${PLANET_KEYS[p]}`).toBe(c.kendra[p]);
          expect(g(p).sthana.drekkana, `drekkana ${PLANET_KEYS[p]}`).toBe(c.drekkana[p]);
        }
      });

      it('dig bala (wrap-corrected)', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).dig - wrapArcBala(c.dig[p])), PLANET_KEYS[p]).toBeLessThan(0.1);
        }
      });

      it('nathonnatha bala (true lower transit vs PyJHora midnight)', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).kala.nathonnatha - c.nathonnatha[p]), PLANET_KEYS[p]).toBeLessThan(2.5);
        }
      });

      it('paksha bala (wrap-corrected, chart benefics)', () => {
        // Jupiter is always a benefic: recover their raw pb and wrap it.
        const pbTheirs = c.paksha[4];
        const pbCorrect = wrapArcBala(pbTheirs);
        for (let p = 0; p < 7; p++) {
          const theirValue = p === 1 ? c.paksha[p] / 2 : c.paksha[p];
          const wasBenefic = Math.abs(theirValue - pbTheirs) < 0.02;
          let expected = wasBenefic ? pbCorrect : 60 - pbCorrect;
          if (p === 1) expected *= 2;
          expect(Math.abs(g(p).kala.paksha - expected), PLANET_KEYS[p]).toBeLessThan(0.05);
        }
      });

      it('tribhaga / abda / masa / vara / hora lords', () => {
        for (let p = 0; p < 7; p++) {
          expect(g(p).kala.tribhaga, `tribhaga ${PLANET_KEYS[p]}`).toBe(c.tribhaga[p]);
          expect(g(p).kala.abda, `abda ${PLANET_KEYS[p]}`).toBe(c.abda[p]);
          expect(g(p).kala.masa, `masa ${PLANET_KEYS[p]}`).toBe(c.masa[p]);
          expect(g(p).kala.vara, `vara ${PLANET_KEYS[p]}`).toBe(c.vara[p]);
          expect(g(p).kala.hora, `hora ${PLANET_KEYS[p]}`).toBe(c.hora[p]);
        }
      });

      it('ayana bala (kranti table, hemisphere-corrected)', () => {
        for (let p = 0; p < 7; p++) {
          // PyJHora leaves sidereal+ayanamsa unnormalized; when it exceeds 360°
          // their hemisphere test flips, negating the effective declination:
          // theirs + ours = 60 (120 for the doubled Sun) in that case.
          const tropicalRaw = mode.planets[PLANET_KEYS[p] as keyof typeof mode.planets] + ayanamsa;
          const expected = tropicalRaw > 360 && p !== 3
            ? (p === 0 ? 120 : 60) - c.ayana[p]
            : c.ayana[p];
          expect(Math.abs(g(p).kala.ayana - expected), PLANET_KEYS[p]).toBeLessThan(0.3);
        }
      });

      it('yuddha bala (same war pair, magnitude within tolerance)', () => {
        for (let p = 0; p < 7; p++) {
          const ours = g(p).kala.yuddha;
          const theirs = c.yuddha[p];
          expect(Math.sign(ours), `sign ${PLANET_KEYS[p]}`).toBe(Math.sign(theirs));
          // Their partial totals inherit the unwrapped-paksha bug, so magnitudes drift
          expect(Math.abs(ours - theirs), PLANET_KEYS[p]).toBeLessThan(10);
        }
      });

      it('chesta bala (Surya-Siddhanta mean longitudes)', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).chesta - c.cheshtaSS[p]), PLANET_KEYS[p]).toBeLessThan(0.5);
        }
      });

      it('naisargika bala', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).naisargika - c.naisargika[p]), PLANET_KEYS[p]).toBeLessThan(0.01);
        }
      });

      it('drik bala (sputa drishti)', () => {
        for (let p = 0; p < 7; p++) {
          expect(Math.abs(g(p).drik - c.drik[p]), PLANET_KEYS[p]).toBeLessThan(0.1);
        }
      });

      it('bhava dig bala (sign-nature)', () => {
        for (let h = 0; h < 12; h++) {
          expect(result.bhavaBala[h].digbala, `house ${h + 1}`).toBe(shadbala.bhavaDig[h]);
        }
      });

      it('bhava drik bala stays in a sane band (PyJHora side has an accumulation bug)', () => {
        for (let h = 0; h < 12; h++) {
          expect(Math.abs(result.bhavaBala[h].drishtibala - shadbala.bhavaDrik[h]), `house ${h + 1}`).toBeLessThan(30);
        }
      });
    });
  }
});
