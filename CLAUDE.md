# CLAUDE.md — working notes for astroapp

Guidance for AI agents working in this repo. Read alongside `README.md`.

## What this is

A bilingual (Thai/English) Thai–Vedic natal chart calculator (Next.js 16, React 19,
Tailwind v4, TypeScript). Swiss Ephemeris (`swisseph` npm, native addon), sidereal
Lahiri. **Owner's north star: every calculation must match Jagannatha Hora (JHora)
and deva.guru.** The owner lives in Thailand, uses both Thai and Vedic astrology, and
runs this for personal use (Docker on a home mini-PC — no auth, no multi-tenant).

## Architecture: two calculation engines, one source of truth

1. **TypeScript engine** (`lib/`) — powers the live app for both Thai and Vedic modes.
   This is what ships and what the UI calls via `/api/natal-chart`.
2. **PyJHora** (`calc-service/`, a FastAPI wrapper) — the verified Python port of JHora
   (~6800 tests against JHora itself). Two roles: (a) **calibration oracle** — its output
   is frozen into `tests/fixtures/pyjhora-golden.json` and asserted by the parity tests;
   (b) intended **backend** for future features too large to reimplement (divisional
   charts, other dasha systems, ashtakavarga, etc.).

The `PyJHora-main/` folder (221 MB) is **not in git** — it lives at
`PyJHora-main/PyJHora-main/src` and must be downloaded separately on any new machine.

## THE calibration workflow (most important process here)

Any change to the calculation chain (`lib/ephemeris`, `lib/charts`) must stay in parity:

1. If conventions or PyJHora usage changed, regenerate fixtures:
   `cd calc-service && .venv/Scripts/python generate_fixtures.py`
2. Run the suite: `npm test`. Parity tests are the real spec:
   - `tests/pyjhora-parity.test.ts` — positions + ascendant, both modes, <0.7″
   - `tests/dasha-parity.test.ts` — vimshottari dates vs JHora, ~2 min
   - `tests/shadbala-parity.test.ts` — 84 per-component assertions
   - `tests/panchanga.test.ts`, `tests/golden.test.ts`, plus unit tests
3. PyJHora has real bugs (documented in shadbala-parity.test.ts): unwrapped paksha/dig
   arcs, an ayana hemisphere flip when tropical longitude > 360°, a bhava-drik row/col
   mix-up. The TS engine computes the **corrected** value and the tests transform the
   fixture expectation. Don't "fix" the TS engine to match a PyJHora bug.

## The Thai/Vedic mode model

`lib/astro/settings.ts` defines `CalcSettings` with two presets:
- **thai**: `truePositions:false, trueNode:false` — apparent positions, mean node, Rahu
  rules Aquarius (`THAI_SIGN_LORDS`), Thai wheel. The app default and original behavior.
- **vedic**: `truePositions:true, trueNode:true` — JHora defaults, Parashari lordship
  (`VEDIC_SIGN_LORDS`, Saturn rules Aquarius).

Settings flow: page state → `/api/natal-chart` body `settings` → `getPlanetIds(trueNode)`
+ `calcPlanet(id, jd, truePositions)`. Mode also selects lordship in PlanetTable,
RasiChart, CSV export, PrintLayout via `getSignLords`/`getPlanetDomiciles`. Persisted in
`localStorage`; changing settings auto-re-runs the last chart.

Dasha default is the **true sidereal year** for BOTH modes (best practice — the Thai
calendar-walk is a pre-computer approximation, kept only as a legacy option).

## Gotchas (learned the hard way)

- **swisseph is thread-local.** FastAPI runs sync endpoints in a threadpool; `_apply_settings`
  re-applies `swe.set_ephe_path` + ayanamsa per request or workers silently drop to the
  Moshier model (~8″ error). Serialized by `_engine_lock`.
- **PyJHora module state is order-dependent.** Node mode needs both `const.set_node_mode`
  AND `drik.set_planet_list(...)` (the planet list is baked at import). Always regenerate
  fixtures + re-test after touching engine or PyJHora usage.
- **Never round longitudes before a calculation.** The route keeps raw longitudes for all
  math and a separate `roundToArcsecond` copy only for display fields. 0.2″ on the Moon
  ⇒ ~40 min shift in dasha dates.
- **Docker calc image needs `build-essential`** (not just gcc) — pyswisseph compiles from
  source and needs libc headers (`math.h`). `PYJHORA_SRC` env points the service at the
  copied jhora package.
- **Docker Desktop on this machine crashes intermittently** (stale AF_UNIX socket in
  `%LOCALAPPDATA%\Docker\run\dockerInference`, undeletable without a reboot). Docker is
  optional — the app runs fine with `npm run dev`. Don't rabbit-hole on Docker infra.
- Web Docker image copies `node_modules/swisseph` explicitly (standalone tracer misses
  its dynamic ephe path).

## Commands

```bash
npm run dev            # dev server, http://localhost:3000
npm test               # vitest (unit + parity); run after ANY calc change
npm run lint           # eslint (keep clean)
npx tsc --noEmit       # type-check
npm run build          # production build (output: standalone)
# calc-service (Python 3.14 venv already at calc-service/.venv):
cd calc-service && .venv/Scripts/python -m uvicorn app:app --port 8087
cd calc-service && .venv/Scripts/python generate_fixtures.py
```

## Conventions

- **Git**: feature branch → `git merge --no-ff` into `master` → push. Commit/push only when
  the owner asks. Co-author trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Preserve the bilingual UI: every user-facing string goes in `lib/i18n/translations.ts`
  under both `en` and `th`.
- Shadbala/panchanga math is planet-index ordered (`SUN..SATURN` = 0..6); the display
  layer maps to keys.

## Roadmap (open tasks)

Core accuracy + Thai/Vedic modes + Docker are DONE. Remaining feature ladder (each ≈ one
calc-service endpoint + one UI tab):
1. Divisional chart wheels (D9/D3/D7/D10/D12/D30/D60) in Thai + South/North Indian styles;
   dasha-system picker (Ashtottari, Yogini, Kalachakra…).
2. Ashtakavarga, transits/Gochara + Sade Sati, yoga/dosha detection, marriage match,
   muhurta/rerk finder, world location search + timezone auto-fill.
3. UX: dark mode, mobile card view for the 20-column planet table.
