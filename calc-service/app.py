"""FastAPI calculation service wrapping PyJHora (JHora-parity engine).

Endpoints (all POST bodies share the BirthInput shape used by the Next.js app):
  GET  /health       — liveness + engine info
  POST /chart        — sidereal positions + ascendant under chosen conventions
  POST /vimshottari  — vimshottari dasha/bhukti (JHora method, sidereal year)
  POST /panchanga    — tithi / vara / nakshatra / yoga / karana at birth

Run (dev):  .venv/Scripts/python -m uvicorn app:app --port 8087
"""
import os
import sys
import threading

# PyJHora source location: env override for Docker, dev-tree default otherwise
_PYJHORA_SRC = os.environ.get(
    'PYJHORA_SRC',
    os.path.join(os.path.dirname(__file__), '..', 'PyJHora-main', 'PyJHora-main', 'src'),
)
sys.path.insert(0, _PYJHORA_SRC)

from fastapi import FastAPI
from pydantic import BaseModel, Field

import swisseph as swe
from jhora.panchanga import drik
from jhora import utils, const
from jhora.horoscope.dhasa.graha import vimsottari

PLANET_KEYS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU']

_EPHE_DIR = os.path.join(os.path.dirname(drik.__file__), '..', 'data', 'ephe')

# jhora mutates module-level state (flags, planet list, ayanamsa mode),
# so calculations must not interleave.
_engine_lock = threading.Lock()

app = FastAPI(title='astroapp calc-service', version='0.1.0')


class Settings(BaseModel):
    ayanamsa: str = 'LAHIRI'
    truePositions: bool = True   # JHora default: true geometric positions
    trueNode: bool = True        # JHora default: true node


class BirthInput(BaseModel):
    year: int
    month: int = Field(ge=1, le=12)
    day: int = Field(ge=1, le=31)
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)
    second: int = Field(default=0, ge=0, le=59)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    utcOffset: float = Field(ge=-14, le=14)
    settings: Settings = Settings()


def _apply_settings(s: Settings) -> None:
    # pyswisseph state (ephe path, sid mode) is thread-local; FastAPI runs sync
    # endpoints in a threadpool, so it must be set per request or the library
    # silently degrades to the Moshier model in worker threads.
    swe.set_ephe_path(_EPHE_DIR)
    const.set_planet_positions_true(s.truePositions)
    const.set_planet_positions_use_aberration(True)
    const.set_node_mode(s.trueNode)
    drik.set_planet_list(set_rahu_ketu_as_true_nodes=s.trueNode, include_western_planets=False)
    drik.refresh_planet_flags()
    drik.set_ayanamsa_mode(s.ayanamsa)


def _jd_and_place(inp: BirthInput):
    place = drik.Place('api', inp.latitude, inp.longitude, inp.utcOffset)
    jd = utils.julian_day_number(drik.Date(inp.year, inp.month, inp.day),
                                 (inp.hour, inp.minute, inp.second))
    return jd, place


def _frac_hour_to_hms(fh: float):
    total = round(fh * 3600)
    return total // 3600, (total % 3600) // 60, total % 60


@app.get('/health')
def health():
    return {'ok': True, 'engine': 'PyJHora', 'sidereal_year': const.sidereal_year}


@app.post('/chart')
def chart(inp: BirthInput):
    with _engine_lock:
        _apply_settings(inp.settings)
        jd, place = _jd_and_place(inp)
        positions = drik.dhasavarga(jd, place, divisional_chart_factor=1)
        planets = {PLANET_KEYS[idx]: sign * 30 + deg for idx, (sign, deg) in positions}
        asc = drik.ascendant(jd, place)
        return {
            'julianDayLocal': jd,
            'ayanamsa': drik.get_ayanamsa_value(jd - inp.utcOffset / 24.0),
            'ascendant': asc[0] * 30 + asc[1],
            'planets': planets,
        }


@app.post('/vimshottari')
def vimshottari_dasha(inp: BirthInput, levels: int = 2):
    with _engine_lock:
        _apply_settings(inp.settings)
        jd, place = _jd_and_place(inp)
        balance, rows = vimsottari.get_vimsottari_dhasa_bhukthi(
            jd, place, dhasa_level_index=levels)
        out = []
        for lords, (y, m, d, fh), dur in rows:
            hh, mm, ss = _frac_hour_to_hms(fh)
            out.append({
                'lords': [PLANET_KEYS[i] for i in lords],
                'start': f'{y:04d}-{m:02d}-{d:02d}T{hh:02d}:{mm:02d}:{ss:02d}',
                'durationYears': dur,
            })
        return {'balanceYMD': list(balance), 'periods': out}


@app.post('/panchanga')
def panchanga(inp: BirthInput):
    with _engine_lock:
        _apply_settings(inp.settings)
        jd, place = _jd_and_place(inp)
        return {
            'tithi': drik.tithi(jd, place),
            'vaara': drik.vaara(jd, place),
            'nakshatra': drik.nakshatra(jd, place),
            'yogam': drik.yogam(jd, place),
            'karana': drik.karana(jd, place),
        }
