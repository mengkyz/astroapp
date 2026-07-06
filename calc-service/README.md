# calc-service — PyJHora calculation backend

FastAPI wrapper around the [PyJHora](https://github.com/naturalstupid/PyJHora) library
(the verified Python port of Jagannatha Hora). Provides JHora-parity calculations to
the Next.js app and generates the calibration fixtures used by the vitest suite.

The PyJHora source is expected at `../PyJHora-main/PyJHora-main/src` (kept out of git),
or wherever the `PYJHORA_SRC` env var points (used by the Docker image).

## Setup

```bash
py -3.14 -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

## Run (dev)

```bash
.venv/Scripts/python -m uvicorn app:app --port 8087
```

## Endpoints

- `GET /health` — liveness + engine info
- `POST /chart` — sidereal positions + ascendant
- `POST /vimshottari?levels=2` — vimshottari dasha (levels 1–6, sidereal year 365.256364)
- `POST /panchanga` — tithi / vaara / nakshatra / yogam / karana (raw jhora tuples)

All POST bodies use the app's `BirthInput` shape plus optional `settings`:

```json
{
  "year": 1990, "month": 6, "day": 15, "hour": 8, "minute": 30, "second": 0,
  "latitude": 13.7563, "longitude": 100.5018, "utcOffset": 7,
  "settings": { "ayanamsa": "LAHIRI", "truePositions": true, "trueNode": true }
}
```

`truePositions: true, trueNode: true` are JHora's defaults (Vedic preset).
`false/false` matches the app's original TS engine (Thai preset).

## Fixtures

```bash
.venv/Scripts/python generate_fixtures.py   # writes ../tests/fixtures/pyjhora-golden.json
```

## Docker

Built from the repo root by `docker-compose.yml` (`calc-service/Dockerfile`). Needs
`build-essential` in the image because pyswisseph compiles from source and requires the
libc headers (`math.h`) — gcc alone fails. The jhora package is copied to `/srv/pyjhora`
and `PYJHORA_SRC` points there.

## Gotcha: thread-local Swiss Ephemeris state

pyswisseph keeps ephe path / sidereal mode in thread-local storage. FastAPI runs sync
endpoints in a threadpool, so `_apply_settings` re-applies `swe.set_ephe_path` and the
ayanamsa mode on every request (serialized by `_engine_lock`). Without this the worker
threads silently fall back to the Moshier model (~8″ error on the true node).

Also: switching node mode requires both `const.set_node_mode(...)` **and**
`drik.set_planet_list(...)` — the planet list is baked at import time.
