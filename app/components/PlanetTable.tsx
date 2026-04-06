import React from 'react';
import { translations, Language } from '@/lib/i18n/translations';

const PLANET_ORDER = [
  'SUN',
  'MOON',
  'MARS',
  'MERCURY',
  'JUPITER',
  'VENUS',
  'SATURN',
  'RAHU',
  'KETU',
  'URANUS',
];

// Absolute rerk group by nakshatra index (0-based): nakshatraIndex % 9
const RERKS_ORDER = [
  { th: 'ทลิทโท',  en: 'Talittho'   },
  { th: 'มหัทธโน', en: 'Mahatthano' },
  { th: 'โจโร',    en: 'Choro'      },
  { th: 'ภูมิปาโล',en: 'Bhumipalo'  },
  { th: 'เทศาตรี', en: 'Tesatri'    },
  { th: 'เทวี',    en: 'Taewee'     },
  { th: 'เพชฌฆาต', en: 'Petchakat'  },
  { th: 'ราชา',    en: 'Racha'      },
  { th: 'สมโณ',    en: 'Samano'     },
];

const PLANET_DOMICILES: Partial<Record<string, number[]>> = {
  SUN: [5],
  MOON: [4],
  MARS: [1, 8],
  MERCURY: [3, 6],
  JUPITER: [9, 12],
  VENUS: [2, 7],
  SATURN: [10],
  RAHU: [11],
};

// Planet codes used in aspect columns (Thai traditional numbering)
const PLANET_CODE: Record<string, string> = {
  SUN: '1', MOON: '2', MARS: '3', MERCURY: '4', JUPITER: '5',
  VENUS: '6', SATURN: '7', RAHU: '8', KETU: '9', URANUS: '0',
};

// Sign element: index 1-12
const SIGN_ELEMENT_KEY = [
  '', 'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
] as const;

// Sign modality: index 1-12
const SIGN_MODALITY_KEY = [
  '', 'cardinal', 'fixed', 'mutable', 'cardinal',
  'fixed', 'mutable', 'cardinal', 'fixed', 'mutable',
  'cardinal', 'fixed', 'mutable',
] as const;

/** Minimum sign distance (0–6) between two signs. */
function signDist(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 6 ? 12 - diff : diff;
}

/**
 * Target sign of a special aspect cast by a planet in `planetSign`
 * at the N-th position (counted inclusively, Vedic style).
 * Formula: ((planetSign + N - 2) % 12) + 1
 */
function specialTarget(planetSign: number, n: number): number {
  return ((planetSign + n - 2) % 12) + 1;
}

interface Body {
  code: string; // planet code ('1'-'9', '0', or lagnaCode)
  rasi: number;
  key: string;  // 'LAGNA' | planet key
}

interface AspectResult {
  kum: string[];
  yok: string[];
  chak: string[];
  trikon: string[];
  leng: string[];
  special: string[];
}

function computeAspects(targetRasi: number, selfKey: string, allBodies: Body[]): AspectResult {
  const result: AspectResult = { kum: [], yok: [], chak: [], trikon: [], leng: [], special: [] };

  allBodies.forEach((body) => {
    if (body.key === selfKey) return;
    const d = signDist(targetRasi, body.rasi);
    if (d === 0) result.kum.push(body.code);
    else if (d === 2) result.yok.push(body.code);
    else if (d === 3) result.chak.push(body.code);
    else if (d === 4) result.trikon.push(body.code);
    else if (d === 6) result.leng.push(body.code);
  });

  // Special Vedic aspects: Mars (4th, 8th), Jupiter (5th, 9th), Saturn (3rd, 10th)
  const SPECIAL_PLANETS = [
    { key: 'MARS',    code: '3', positions: [4, 8]  },
    { key: 'JUPITER', code: '5', positions: [5, 9]  },
    { key: 'SATURN',  code: '7', positions: [3, 10] },
  ];

  SPECIAL_PLANETS.forEach(({ key, code, positions }) => {
    const body = allBodies.find((b) => b.key === key);
    if (!body) return;
    positions.forEach((n) => {
      if (specialTarget(body.rasi, n) === targetRasi) {
        result.special.push(code);
      }
    });
  });

  return result;
}

interface PlanetData {
  key: keyof typeof translations.en.planets;
  longitude: number;
  rasi: number;
  degrees: number;
  minutes: number;
  seconds: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
  house: number;
  isRetrograde?: boolean;
}

interface LagnaData {
  longitude: number;
  rasi: number;
  deg: number;
  min: number;
  sec: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
}

interface PlanetTableProps {
  data: { lagna: LagnaData; planets: PlanetData[] };
  lang: Language;
}

export default function PlanetTable({ data, lang }: PlanetTableProps) {
  if (!data || !data.planets) return null;

  const t = translations[lang];
  const tTable = t.planetTable;
  const pad = (num: number) => num.toString().padStart(2, '0');

  const visiblePlanets = data.planets
    .filter((p) => PLANET_ORDER.includes(p.key))
    .sort((a, b) => PLANET_ORDER.indexOf(a.key) - PLANET_ORDER.indexOf(b.key));

  const getRuledHouses = (planetKey: string, lagnaRasi: number) => {
    const domiciles = PLANET_DOMICILES[planetKey];
    if (!domiciles) return '-';
    return domiciles
      .map((sign) => {
        let houseNum = sign - lagnaRasi + 1;
        if (houseNum <= 0) houseNum += 12;
        return `${t.houses[houseNum]} (${houseNum})`;
      })
      .join(', ');
  };

  // Build all bodies for aspect calculation (Lagna excluded — planets only)
  const allBodies: Body[] = visiblePlanets.map((p) => ({
    code: PLANET_CODE[p.key] ?? p.key,
    rasi: p.rasi,
    key: p.key as string,
  }));

  const getElement = (rasi: number) => {
    const key = SIGN_ELEMENT_KEY[rasi] as keyof typeof tTable;
    return (tTable[key] as string) ?? '';
  };

  const getModality = (rasi: number) => {
    const key = SIGN_MODALITY_KEY[rasi] as keyof typeof tTable;
    return (tTable[key] as string) ?? '';
  };

  const thCenter = 'px-3 py-3 font-semibold text-center';
  const thLeft = 'px-3 py-3 font-semibold';

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-300 whitespace-nowrap">
          <tr>
            <th className={thLeft}>{tTable.planet}</th>
            <th className={thCenter}>{tTable.rasi}</th>
            <th className={thCenter}>{tTable.degree}</th>
            <th className={thCenter}>{tTable.min}</th>
            <th className={thCenter}>{tTable.sec}</th>
            <th className={`${thCenter} text-indigo-700`}>{tTable.drekkana}</th>
            <th className={`${thCenter} text-purple-700`}>{tTable.navamsa}</th>
            <th className={thLeft}>{tTable.nakshatra}</th>
            <th className={thCenter}>{tTable.pada}</th>
            <th className={`${thCenter} text-rose-700`}>{tTable.bigRerk}</th>
            <th className={thCenter}>{tTable.house}</th>
            <th className={thCenter}>{tTable.houseLord}</th>
            {/* New aspect & sign-property columns */}
            <th className={`${thCenter} text-emerald-700 border-l border-gray-300`}>{tTable.kum}</th>
            <th className={`${thCenter} text-emerald-700`}>{tTable.yok}</th>
            <th className={`${thCenter} text-orange-600`}>{tTable.chak}</th>
            <th className={`${thCenter} text-teal-700`}>{tTable.trikon}</th>
            <th className={`${thCenter} text-red-600`}>{tTable.leng}</th>
            <th className={`${thCenter} text-violet-700`}>{tTable.specialCriteria}</th>
            <th className={`${thCenter} text-amber-700`}>{tTable.element}</th>
            <th className={`${thCenter} text-sky-700`}>{tTable.signType}</th>
          </tr>
        </thead>
        <tbody>
          {/* Ascendant row */}
          {(() => {
            const asp = computeAspects(data.lagna.rasi, 'LAGNA', allBodies);
            return (
              <tr className="bg-blue-50 border-b hover:bg-blue-100 font-medium whitespace-nowrap">
                <td className="px-3 py-3 text-blue-900">{tTable.ascendant}</td>
                <td className="px-3 py-3 text-center">{t.signs[data.lagna.rasi]}</td>
                <td className="px-3 py-3 text-center">{pad(data.lagna.deg)}</td>
                <td className="px-3 py-3 text-center">{pad(data.lagna.min)}</td>
                <td className="px-3 py-3 text-center">{pad(data.lagna.sec)}</td>
                <td className="px-3 py-3 text-center text-indigo-600">{t.signs[data.lagna.drekkana]}</td>
                <td className="px-3 py-3 text-center text-purple-600">{t.signs[data.lagna.navamsa]}</td>
                <td className="px-3 py-3">{t.nakshatras[data.lagna.nakshatraIndex]}</td>
                <td className="px-3 py-3 text-center">{data.lagna.pada}</td>
                <td className="px-3 py-3 text-center text-rose-700 font-medium">
                  {lang === 'th' ? RERKS_ORDER[data.lagna.nakshatraIndex % 9].th : RERKS_ORDER[data.lagna.nakshatraIndex % 9].en}
                </td>
                <td className="px-3 py-3 text-center text-indigo-800">{t.houses[1]} (1)</td>
                <td className="px-3 py-3 text-center font-bold text-gray-800">-</td>
                <td className="px-3 py-3 text-center text-emerald-700 border-l border-gray-200">{asp.kum.join(', ')}</td>
                <td className="px-3 py-3 text-center text-emerald-700">{asp.yok.join(', ')}</td>
                <td className="px-3 py-3 text-center text-orange-600">{asp.chak.join(', ')}</td>
                <td className="px-3 py-3 text-center text-teal-700">{asp.trikon.join(', ')}</td>
                <td className="px-3 py-3 text-center text-red-600">{asp.leng.join(', ')}</td>
                <td className="px-3 py-3 text-center text-violet-700">{asp.special.join(', ')}</td>
                <td className="px-3 py-3 text-center text-amber-700 font-medium">{getElement(data.lagna.rasi)}</td>
                <td className="px-3 py-3 text-center text-sky-700">{getModality(data.lagna.rasi)}</td>
              </tr>
            );
          })()}

          {visiblePlanets.map((planet) => {
            const isNode = planet.key === 'RAHU' || planet.key === 'KETU';
            const showRetrograde = planet.isRetrograde && !isNode;
            const asp = computeAspects(planet.rasi, planet.key as string, allBodies);

            return (
              <tr
                key={planet.key}
                className="bg-white border-b hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <td className="px-3 py-3 font-medium">
                  {t.planets[planet.key] || planet.key}
                  {showRetrograde && (
                    <span className="text-red-600 font-bold ml-1">({tTable.retroSymbol})</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">{t.signs[planet.rasi]}</td>
                <td className="px-3 py-3 text-center">{pad(planet.degrees)}</td>
                <td className="px-3 py-3 text-center">{pad(planet.minutes)}</td>
                <td className="px-3 py-3 text-center">{pad(planet.seconds)}</td>
                <td className="px-3 py-3 text-center text-indigo-600">{t.signs[planet.drekkana]}</td>
                <td className="px-3 py-3 text-center text-purple-600">{t.signs[planet.navamsa]}</td>
                <td className="px-3 py-3">{t.nakshatras[planet.nakshatraIndex]}</td>
                <td className="px-3 py-3 text-center">{planet.pada}</td>
                <td className="px-3 py-3 text-center text-rose-700 font-medium">
                  {lang === 'th' ? RERKS_ORDER[planet.nakshatraIndex % 9].th : RERKS_ORDER[planet.nakshatraIndex % 9].en}
                </td>
                <td className="px-3 py-3 text-center text-indigo-800">
                  {t.houses[planet.house]} ({planet.house})
                </td>
                <td className="px-3 py-3 text-center font-bold text-gray-800">
                  {getRuledHouses(planet.key, data.lagna.rasi)}
                </td>
                <td className="px-3 py-3 text-center text-emerald-700 border-l border-gray-200">{asp.kum.join(', ')}</td>
                <td className="px-3 py-3 text-center text-emerald-700">{asp.yok.join(', ')}</td>
                <td className="px-3 py-3 text-center text-orange-600">{asp.chak.join(', ')}</td>
                <td className="px-3 py-3 text-center text-teal-700">{asp.trikon.join(', ')}</td>
                <td className="px-3 py-3 text-center text-red-600">{asp.leng.join(', ')}</td>
                <td className="px-3 py-3 text-center text-violet-700">{asp.special.join(', ')}</td>
                <td className="px-3 py-3 text-center text-amber-700 font-medium">{getElement(planet.rasi)}</td>
                <td className="px-3 py-3 text-center text-sky-700">{getModality(planet.rasi)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
