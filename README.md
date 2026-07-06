# Verdict Astrology (astroapp)

A bilingual (ไทย/English) **Thai–Vedic natal chart calculator** built with Next.js, powered by the [Swiss Ephemeris](https://www.astro.com/swisseph/) (sidereal, Lahiri ayanamsa). Calculations are calibrated to match **Jagannatha Hora (JHora)** and deva.guru.

## Features

- **Thai ↔ Vedic system mode** — a header toggle switches the whole app between two presets over one settings model. **Thai** = apparent positions, mean node, Rahu rules Aquarius, Thai wheel. **Vedic (JHora)** = true geometric positions, true node, Parashari lordship (Saturn rules Aquarius). Switching re-runs the current chart instantly. A ⚙ settings panel overrides individual conventions (node type, position type, dasha year length); choices persist in `localStorage`.
- **Planet positions** — sidereal longitudes for the Lagna, Sun–Saturn, Rahu/Ketu (mean **or** true node per mode) and Uranus (มฤตยู), with sign, degree/minute/second, drekkana (D3), navamsa (D9), nakshatra + pada, house, mode-aware house lordship, Thai aspect columns (กุม/โยค/ฉาก/ตรีโกณ/เล็ง + special aspects), Big Rerk, element and modality. The table has grouped headers and a frozen first column.
- **Panchanga at birth** — tithi (with Shukla/Krishna paksha), vaara (sunrise-adjusted weekday), nakshatra + pada, yoga and karana, shown as a strip in the results summary.
- **Vimshottari Dasha** — maha dasha / bhukti tables with ages, periods and the current period highlighted. Uses JHora's default method: exact day arithmetic with the **true sidereal year** (the Sun's actual Aries-ingress-to-ingress duration around the birth). Alternative year lengths (mean sidereal 365.256364, Gregorian 365.2425, savana 360, and the traditional Thai calendar-walk) are selectable (`lib/charts/dasha.ts`).
- **Rasi chart** — a traditional Thai ราศีจักร wheel (SVG) with navamsa, drekkana, nakshatra, navamsa-lord (mode-aware) and dasha rings, zoom/pan and tooltips.
- **Personal Rerk** — the 9 rerk groups derived from the natal Moon's nakshatra, with nakshatra lords and occupying planets.
- **Graha Bala (Shadbala) & Bhava Bala** — the full Jagannatha Hora / PVR Narasimha Rao method (`lib/charts/shadbala.ts`), calibrated component-by-component against PyJHora: compound (panchadha) friendships over 7 vargas, continuous sputa-drishti Drik Bala, true chesta kendra from epoch mean longitudes, Kala Bala incl. Yuddha (planetary war), sidereal Placidus/Sripati bhava madhya for Dig Bala. Uses Parashari lordship regardless of display mode.
- **Saved persons** — save/load/edit birth data incl. UTC offset (stored privately in `data/savedPersons.csv`, never under `public/`); searchable once more than three are stored.
- **Thailand location picker** — province/district/sub-district → GPS coordinates, plus manual decimal/DMS entry and a UTC-offset field for births outside Thailand.
- **Export** — print-optimized PDF layout and CSV export (planet positions, dasha) in either language, following the active system mode.

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
  ephemeris/                # swisseph wrappers (planets, declination, sunrise/sunset/midnight, Placidus cusps, true-sidereal-year, julian day, ayanamsa)
  charts/                   # rasi, nakshatra, dasha, shadbala, panchanga
  astro/                    # constants (orders/codes/symbols, rerk, Thai + Vedic lordship), aspect engine, settings (mode presets)
  csv/                      # CSV export builders
  utils/format.ts           # date/duration/DMS formatting
  i18n/translations.ts      # all UI strings (en/th)
calc-service/               # PyJHora FastAPI backend + fixture generator (see its README)
data/                       # private saved-persons storage (gitignored)
tests/                      # vitest suite: golden chart + PyJHora parity (positions, dasha, shadbala, panchanga)
Dockerfile, calc-service/Dockerfile, docker-compose.yml  # personal Docker deployment
```

## Accuracy notes

- **Calibrated against PyJHora** (the verified Python port of Jagannatha Hora): `tests/fixtures/pyjhora-golden.json` holds reference positions, vimshottari tables and shadbala components for 6 charts in two convention modes (`apparent_mean` = Thai preset; `true_truenode` = JHora/Vedic defaults). Parity suites: `tests/pyjhora-parity.test.ts` (positions, both modes), `tests/dasha-parity.test.ts` (dasha dates), `tests/shadbala-parity.test.ts` (84 component assertions), `tests/panchanga.test.ts`. **Regenerate fixtures with `calc-service/generate_fixtures.py` and re-run the suite after any change to the calculation chain.**
- Some PyJHora functions have known bugs (unwrapped paksha/dig arcs, an ayana hemisphere flip for tropical longitudes > 360°, a bhava-drik row/column mix-up). The TS engine computes the corrected values; the parity tests transform the fixture expectations accordingly and document each case.
- `calc-service/` is a FastAPI wrapper around PyJHora providing JHora-parity calculations (chart, vimshottari, panchanga) — both a calibration oracle and the intended backend for future features; see its README.
- The Swiss Ephemeris data files bundled with the `swisseph` npm package are loaded at startup (`swe_set_ephe_path`); without them the library silently degrades to the Moshier model. The files cover 1800–2399 CE; the API returns an `epheRange` warning outside that range.
- Remaining Shadbala approximation: Abda/Masa year/month lords use B.V. Raman's Kali-ahargana weekday table rather than the true solar Sankranti instant (matches PyJHora).
- The API always computes on raw longitudes; a separate arcsecond-rounded copy is used only for display fields, so sign and DMS never disagree. Never round longitudes before a downstream calculation — a 0.2″ shift in the Moon moves dasha dates by ~40 minutes.
- Thai births before April 1920 used Bangkok Mean Time (UTC+6:42) — set the UTC offset field accordingly.
