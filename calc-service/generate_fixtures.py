"""Generate golden calibration fixtures from PyJHora for the TS engine.

For each reference chart, positions + vimshottari are computed under two
convention modes:
  - apparent_mean : apparent positions + mean node  (current TS engine / Thai preset)
  - true_truenode : true geometric positions + true node (JHora parity / Vedic preset)

Output: ../tests/fixtures/pyjhora-golden.json (consumed by vitest parity tests).

Run:  .venv/Scripts/python generate_fixtures.py
"""
import sys, os, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'PyJHora-main', 'PyJHora-main', 'src'))

from jhora.panchanga import drik
from jhora import utils, const
from jhora.horoscope.dhasa.graha import vimsottari

PLANET_KEYS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU']

CHARTS = [
    {'id': 'golden-1990-bangkok',   'year': 1990, 'month': 6,  'day': 15, 'hour': 8,  'minute': 30, 'second': 0,
     'latitude': 13.7563, 'longitude': 100.5018, 'utcOffset': 7.0},
    {'id': 'y2000-bangkok-noon',    'year': 2000, 'month': 1,  'day': 1,  'hour': 12, 'minute': 0,  'second': 0,
     'latitude': 13.7563, 'longitude': 100.5018, 'utcOffset': 7.0},
    {'id': 'chiangmai-1985-night',  'year': 1985, 'month': 11, 'day': 3,  'hour': 23, 'minute': 45, 'second': 10,
     'latitude': 18.7883, 'longitude': 98.9853,  'utcOffset': 7.0},
    {'id': 'london-1975-bst',       'year': 1975, 'month': 4,  'day': 14, 'hour': 6,  'minute': 5,  'second': 0,
     'latitude': 51.5074, 'longitude': -0.1278,  'utcOffset': 1.0},
    {'id': 'khonkaen-2010-evening', 'year': 2010, 'month': 12, 'day': 25, 'hour': 18, 'minute': 30, 'second': 0,
     'latitude': 16.4322, 'longitude': 102.8236, 'utcOffset': 7.0},
    {'id': 'songkhla-1962-predawn', 'year': 1962, 'month': 8,  'day': 17, 'hour': 3,  'minute': 10, 'second': 0,
     'latitude': 7.1988,  'longitude': 100.5951, 'utcOffset': 7.0},
]

MODES = {
    'apparent_mean': {'true_positions': False, 'true_node': False},
    'true_truenode': {'true_positions': True,  'true_node': True},
}


def set_mode(true_positions: bool, true_node: bool) -> None:
    const.set_planet_positions_true(true_positions)
    # Aberration only applies when apparent; keep SE default (on) for apparent mode.
    const.set_planet_positions_use_aberration(True)
    const.set_node_mode(true_node)
    # drik.planet_list is baked at import time; rebuild it for the node choice
    drik.set_planet_list(set_rahu_ketu_as_true_nodes=true_node, include_western_planets=False)
    drik.refresh_planet_flags()
    drik.set_ayanamsa_mode('LAHIRI')


def frac_hour_to_hms(fh: float):
    total = round(fh * 3600)
    return total // 3600, (total % 3600) // 60, total % 60


def compute_chart(c):
    place = drik.Place(c['id'], c['latitude'], c['longitude'], c['utcOffset'])
    dob = drik.Date(c['year'], c['month'], c['day'])
    tob = (c['hour'], c['minute'], c['second'])
    jd = utils.julian_day_number(dob, tob)

    result = {}
    for mode_name, mode in MODES.items():
        set_mode(mode['true_positions'], mode['true_node'])

        positions = drik.dhasavarga(jd, place, divisional_chart_factor=1)
        planets = {}
        for idx, (sign, deg_in_sign) in positions:
            planets[PLANET_KEYS[idx]] = sign * 30 + deg_in_sign

        asc = drik.ascendant(jd, place)
        ascendant = asc[0] * 30 + asc[1]

        balance, rows = vimsottari.get_vimsottari_dhasa_bhukthi(jd, place)
        dasha = []
        for (lords, (y, m, d, fh), dur) in rows:
            hh, mm, ss = frac_hour_to_hms(fh)
            dasha.append({
                'maha': PLANET_KEYS[lords[0]],
                'bhukti': PLANET_KEYS[lords[1]],
                'start': f'{y:04d}-{m:02d}-{d:02d}T{hh:02d}:{mm:02d}:{ss:02d}',
                'durationYears': dur,
            })

        result[mode_name] = {
            'ascendant': ascendant,
            'planets': planets,
            # PyJHora's own year measurement (sunrise-anchored Lagrange search,
            # ±1 min noise) — used to test the TS dasha arithmetic in isolation.
            'trueSiderealYearDays': drik.true_sidereal_year(jd, place),
            'vimshottariBalanceYMD': list(balance),
            'vimshottari': dasha,
        }
    return result


def main():
    out = {
        'generator': 'PyJHora (JHora 4.8.x port), ayanamsa LAHIRI, sidereal year 365.256364',
        'charts': [],
    }
    for c in CHARTS:
        print('computing', c['id'])
        out['charts'].append({
            'id': c['id'],
            'input': {k: c[k] for k in ('year', 'month', 'day', 'hour', 'minute', 'second',
                                        'latitude', 'longitude', 'utcOffset')},
            'modes': compute_chart(c),
        })

    dest = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures', 'pyjhora-golden.json')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1)
    print('wrote', os.path.abspath(dest))


if __name__ == '__main__':
    main()
