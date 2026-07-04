# Verdict Astrology (astroapp)

A bilingual (ไทย/English) **Thai–Vedic natal chart calculator** built with Next.js, powered by the [Swiss Ephemeris](https://www.astro.com/swisseph/) (sidereal, Lahiri ayanamsa).

## Features

- **Planet positions** — sidereal longitudes for the Lagna, Sun–Saturn, Rahu/Ketu (mean node) and Uranus (มฤตยู), with sign, degree/minute/second, drekkana (D3), navamsa (D9), nakshatra + pada, house, house lordship (Thai convention: Rahu rules Aquarius), Thai aspect columns (กุม/โยค/ฉาก/ตรีโกณ/เล็ง + special aspects), Big Rerk, element and modality.
- **Vimshottari Dasha** — maha dasha / bhukti tables with ages, periods and the current period highlighted. Uses the traditional calendar-walk (Y/M/D) method; the final bhukti is pinned to the maha dasha boundary.
- **Rasi chart** — a traditional Thai ราศีจักร wheel (SVG) with navamsa, drekkana, nakshatra, navamsa-lord and dasha rings, zoom/pan and tooltips.
- **Personal Rerk** — the 9 rerk groups derived from the natal Moon's nakshatra, with nakshatra lords and occupying planets.
- **Graha Bala (Shadbala) & Bhava Bala** — per B.V. Raman's *Graha and Bhava Balas*, computed with true sunrise/sunset (`swe_rise_trans`), true declinations and speed-based Chesta Bala. (Shadbala follows Raman's Parashari lordship: Saturn owns Aquarius.)
- **Saved persons** — save/load/edit birth data (stored privately in `data/savedPersons.csv`, never under `public/`).
- **Thailand location picker** — province/district/sub-district → GPS coordinates, plus manual decimal/DMS entry and a UTC-offset field for births outside Thailand.
- **Export** — print-optimized PDF layout and CSV export (planet positions, dasha) in either language.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm test           # run the vitest suite (unit + golden-chart regression tests)
npm run lint       # eslint
```

## Project layout

```
app/
  page.tsx                  # main form + tabs
  api/natal-chart/route.ts  # chart calculation endpoint (validated input)
  api/saved-persons/route.ts# private CSV persistence
  components/               # PlanetTable, DashaTable, RasiChart, RerkResult, BalasTable, PrintLayout, ThaiLocationSelect
lib/
  ephemeris/                # swisseph wrappers (ephe path, planets, declination, sunrise/sunset, julian day, ayanamsa)
  charts/                   # rasi, nakshatra, vimshottari dasha, shadbala
  astro/                    # shared constants (planet orders/codes/symbols, rerk, lordship) + aspect engine
  csv/                      # CSV export builders
  utils/format.ts           # date/duration/DMS formatting
  i18n/translations.ts      # all UI strings (en/th)
data/                       # private saved-persons storage (gitignored)
tests/                      # vitest suite incl. golden ephemeris chart
```

## Accuracy notes

- The Swiss Ephemeris data files bundled with the `swisseph` npm package are loaded at startup (`swe_set_ephe_path`); without them the library silently degrades to the Moshier model.
- Documented approximations in Shadbala: Abda/Masa lords use Gregorian anchor dates rather than true Sankranti, and drishti strength uses the discrete house table rather than continuous sputa-drishti.
- Thai births before April 1920 used Bangkok Mean Time (UTC+6:42) — set the UTC offset field accordingly.
