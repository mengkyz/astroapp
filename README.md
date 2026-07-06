# Verdict Astrology (astroapp)

A bilingual (ไทย/English) **Thai–Vedic natal chart calculator** built with Next.js, powered by the [Swiss Ephemeris](https://www.astro.com/swisseph/) (sidereal, Lahiri ayanamsa).

## Features

- **Planet positions** — sidereal longitudes for the Lagna, Sun–Saturn, Rahu/Ketu (mean node) and Uranus (มฤตยู), with sign, degree/minute/second, drekkana (D3), navamsa (D9), nakshatra + pada, house, house lordship (Thai convention: Rahu rules Aquarius), Thai aspect columns (กุม/โยค/ฉาก/ตรีโกณ/เล็ง + special aspects), Big Rerk, element and modality.
- **Vimshottari Dasha** — maha dasha / bhukti tables with ages, periods and the current period highlighted. Uses Jagannatha Hora's default method: exact day arithmetic with the **true sidereal year** (the Sun's actual Aries-ingress-to-ingress duration around the birth). Alternative year lengths (mean sidereal 365.256364, Gregorian 365.2425, savana 360, and the traditional Thai calendar-walk) are supported by the engine (`lib/charts/dasha.ts`).
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

## Deployment (Docker, personal mini-PC)

```bash
# One-time: place the PyJHora-main folder in the repo root (not in git)
docker compose up -d --build
# Web UI:       http://<host>:3000
# Calc service: http://<host>:8087 (PyJHora JHora-parity API)
```

Saved persons persist in `./data` on the host (mounted into the web container).
To update: `git pull && docker compose up -d --build`.

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

- **Calibrated against PyJHora** (the verified Python port of Jagannatha Hora): `tests/fixtures/pyjhora-golden.json` holds reference positions and vimshottari tables for 6 charts in two convention modes (apparent+mean node = this engine / Thai preset; true positions+true node = JHora defaults). `tests/pyjhora-parity.test.ts` and `tests/dasha-parity.test.ts` assert parity. Regenerate fixtures with `calc-service/generate_fixtures.py`.
- `calc-service/` is a FastAPI wrapper around PyJHora providing JHora-parity calculations (chart, vimshottari, panchanga) for upcoming features; see its README.
- The Swiss Ephemeris data files bundled with the `swisseph` npm package are loaded at startup (`swe_set_ephe_path`); without them the library silently degrades to the Moshier model. The files cover 1800–2399 CE; the API returns an `epheRange` warning outside that range.
- Documented approximations in Shadbala: Abda/Masa lords use Gregorian anchor dates rather than true Sankranti, and drishti strength uses the discrete house table rather than continuous sputa-drishti.
- Thai births before April 1920 used Bangkok Mean Time (UTC+6:42) — set the UTC offset field accordingly.
