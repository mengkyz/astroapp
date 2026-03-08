import React, { useMemo } from 'react';
import { translations, Language } from '@/lib/i18n/translations';

// --- Core SVG Mathematical Engine ---
function polarToCartesian(radius: number, angleInDegrees: number) {
  const angleInRadians = ((360 - angleInDegrees) * Math.PI) / 180.0;
  return {
    x: radius * Math.cos(angleInRadians),
    y: radius * Math.sin(angleInRadians),
  };
}

function getSlicePath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(outerRadius, startAngle);
  const endOuter = polarToCartesian(outerRadius, endAngle);
  const startInner = polarToCartesian(innerRadius, endAngle);
  const endInner = polarToCartesian(innerRadius, startAngle);

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 1 ${endInner.x} ${endInner.y}`,
    `Z`,
  ].join(' ');
}

// --- Planet Symbol Dictionaries ---
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
];

const THAI_SYMBOLS: Record<string, string> = {
  SUN: '๑',
  MOON: '๒',
  MARS: '๓',
  MERCURY: '๔',
  JUPITER: '๕',
  VENUS: '๖',
  SATURN: '๗',
  RAHU: '๘',
  KETU: '๙',
};

const EN_SYMBOLS: Record<string, string> = {
  SUN: '☉',
  MOON: '☽',
  MARS: '♂',
  MERCURY: '☿',
  JUPITER: '♃',
  VENUS: '♀',
  SATURN: '♄',
  RAHU: '☊',
  KETU: '☋',
};

// Zodiac Sign to Ruling Planet mapping
const SIGN_LORDS: Record<number, string> = {
  1: 'MARS',
  2: 'VENUS',
  3: 'MERCURY',
  4: 'MOON',
  5: 'SUN',
  6: 'MERCURY',
  7: 'VENUS',
  8: 'MARS',
  9: 'JUPITER',
  10: 'SATURN',
  11: 'RAHU',
  12: 'JUPITER',
};

const VIMSHOTTARI_LORDS = [
  'KETU',
  'VENUS',
  'SUN',
  'MOON',
  'MARS',
  'RAHU',
  'JUPITER',
  'SATURN',
  'MERCURY',
];

// The exact number of years each planet rules in the 120-year Vimshottari cycle
const VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

// --- Component Interfaces ---
interface PlanetData {
  key: string;
  rasi: number;
  navamsa: number;
  longitude: number;
  isRetrograde?: boolean;
}
interface LagnaData {
  rasi: number;
  navamsa: number;
  longitude: number;
}
interface RasiChartProps {
  data: { lagna: LagnaData; planets: PlanetData[] };
  lang: Language;
}

interface Occupant {
  symbol: string;
  color: string;
  isRetro?: boolean;
}

export default function RasiChart({ data, lang }: RasiChartProps) {
  const t = translations[lang];

  // --- Master Radius Configuration (Shrunk slightly to fit all 8 rings cleanly) ---
  const CENTER_RADIUS = 35;
  const RASI_INNER = 35;
  const RASI_OUTER = 120; // Ring 8
  const NAV_INNER = 120;
  const NAV_OUTER = 205; // Ring 7
  const PL_L2_INNER = 205;
  const PL_L2_OUTER = 240; // Ring 6
  const PL_L1_INNER = 240;
  const PL_L1_OUTER = 275; // Ring 5
  const DREK_INNER = 275;
  const DREK_OUTER = 325; // Ring 4
  const NAK_INNER = 325;
  const NAK_OUTER = 385; // Ring 3
  const NAV_LORD_INNER = 385;
  const NAV_LORD_OUTER = 435; // Ring 2
  const DASHA_INNER = 435;
  const DASHA_OUTER = 485; // Ring 1 (NEW Outer Ring!)

  // 0. Ring 1: Dasha (Vimshottari Years) Engine
  const ring1 = useMemo(() => {
    const slices = [];
    const step = 360 / 27; // Maps 1-to-1 with Nakshatras
    const width = DASHA_OUTER - DASHA_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 180 + (i - 1) * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const years = VIMSHOTTARI_YEARS[(i - 1) % 9];
      const textPos = polarToCartesian(DASHA_INNER + width * 0.5, midAngle);

      slices.push(
        <g key={`dasha-${i}`}>
          <path
            d={getSlicePath(DASHA_INNER, DASHA_OUTER, startAngle, endAngle)}
            fill={i % 2 === 0 ? '#fdf8f6' : '#ffffff'}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <text
            x={textPos.x}
            y={textPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[12px] font-extrabold fill-indigo-600"
          >
            {years}
            {lang === 'th' ? 'ป.' : 'y'}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang]);

  // 1. 108-Pada Rings Engine (Ring 2, 5, 6)
  const { ring2, ring5, ring6 } = useMemo(() => {
    const r2 = [];
    const r5 = [];
    const r6 = [];
    const padaOccupants: Occupant[][] = Array.from({ length: 108 }, () => []);

    // Slot Lagna by absolute Longitude
    if (data.lagna.longitude !== undefined) {
      const pIdx = Math.floor(data.lagna.longitude / (360 / 108));
      if (pIdx >= 0 && pIdx < 108)
        padaOccupants[pIdx].push({
          symbol: lang === 'th' ? 'ล' : 'Asc',
          color: '#dc2626',
          isRetro: false,
        });
    }

    // Slot Planets by absolute Longitude
    data.planets.forEach((p) => {
      if (PLANET_ORDER.includes(p.key) && p.longitude !== undefined) {
        const pIdx = Math.floor(p.longitude / (360 / 108));
        if (pIdx >= 0 && pIdx < 108) {
          const isNode = p.key === 'RAHU' || p.key === 'KETU';
          padaOccupants[pIdx].push({
            symbol: lang === 'th' ? THAI_SYMBOLS[p.key] : EN_SYMBOLS[p.key],
            color: '#1e293b',
            isRetro: p.isRetrograde && !isNode,
          });
        }
      }
    });

    const step = 360 / 108;
    for (let i = 0; i < 108; i++) {
      const startAngle = 180 + i * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      // Ring 2: Navamsa Lord
      const navSign = (i % 12) + 1;
      const lordKey = SIGN_LORDS[navSign];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const r2Pos = polarToCartesian(
        NAV_LORD_INNER + (NAV_LORD_OUTER - NAV_LORD_INNER) / 2,
        midAngle,
      );

      r2.push(
        <g key={`r2-${i}`}>
          <path
            d={getSlicePath(
              NAV_LORD_INNER,
              NAV_LORD_OUTER,
              startAngle,
              endAngle,
            )}
            fill={i % 2 === 0 ? '#f1f5f9' : '#ffffff'}
            stroke="#cbd5e1"
            strokeWidth="0.5"
          />
          <text
            x={r2Pos.x}
            y={r2Pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[10px] font-bold fill-slate-500"
          >
            {lordSymbol}
          </text>
        </g>,
      );

      // Ring 5 & 6: Backgrounds
      r5.push(
        <path
          key={`r5-bg-${i}`}
          d={getSlicePath(PL_L1_INNER, PL_L1_OUTER, startAngle, endAngle)}
          fill={i % 2 === 0 ? '#f1f5f9' : '#ffffff'}
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />,
      );
      r6.push(
        <path
          key={`r6-bg-${i}`}
          d={getSlicePath(PL_L2_INNER, PL_L2_OUTER, startAngle, endAngle)}
          fill={i % 2 === 0 ? '#f8fafc' : '#ffffff'}
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />,
      );

      // Ring 5 & 6: Planet Overlay
      const occs = padaOccupants[i];
      if (occs.length > 0) {
        const r5Pos = polarToCartesian(
          PL_L1_INNER + (PL_L1_OUTER - PL_L1_INNER) / 2,
          midAngle,
        );
        r5.push(
          <text
            key={`r5-occ-${i}`}
            x={r5Pos.x}
            y={r5Pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={occs[0].color}
            className="text-[12px] font-bold pointer-events-none"
          >
            {occs[0].symbol}
            {occs[0].isRetro && (
              <tspan dx="1" dy="-5" fill="#dc2626" fontSize="8">
                {lang === 'th' ? 'พ' : 'R'}
              </tspan>
            )}
          </text>,
        );
      }
      if (occs.length > 1) {
        // L2 Overflow Handle
        const r6Pos = polarToCartesian(
          PL_L2_INNER + (PL_L2_OUTER - PL_L2_INNER) / 2,
          midAngle,
        );
        r6.push(
          <text
            key={`r6-occ-${i}`}
            x={r6Pos.x}
            y={r6Pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={occs[1].color}
            className="text-[12px] font-bold pointer-events-none"
          >
            {occs[1].symbol}
            {occs[1].isRetro && (
              <tspan dx="1" dy="-5" fill="#dc2626" fontSize="8">
                {lang === 'th' ? 'พ' : 'R'}
              </tspan>
            )}
          </text>,
        );
      }
      if (occs.length > 2) {
        // Extremely rare 3+ collision
        const r6PosExtra = polarToCartesian(
          PL_L2_INNER + (PL_L2_OUTER - PL_L2_INNER) * 0.85,
          midAngle,
        );
        r6.push(
          <text
            key={`r6-occ-extra-${i}`}
            x={r6PosExtra.x}
            y={r6PosExtra.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={occs[2].color}
            className="text-[9px] font-bold pointer-events-none"
          >
            {occs[2].symbol}
          </text>,
        );
      }
    }
    return { ring2: r2, ring5: r5, ring6: r6 };
  }, [data, lang]);

  // 2. Nakshatra Engine (Ring 3 - 27 Slices)
  const ring3 = useMemo(() => {
    const slices = [];
    const step = 360 / 27; // Exactly 13°20'
    const width = NAK_OUTER - NAK_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 180 + (i - 1) * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const lordKey = VIMSHOTTARI_LORDS[(i - 1) % 9];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const textPos = polarToCartesian(NAK_INNER + width * 0.5, midAngle);

      slices.push(
        <g key={`nak-${i}`}>
          <path
            d={getSlicePath(NAK_INNER, NAK_OUTER, startAngle, endAngle)}
            fill={i % 2 === 0 ? '#fff7ed' : '#ffffff'}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <text
            x={textPos.x}
            y={textPos.y - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] font-bold fill-slate-400"
          >
            {i}
          </text>
          <text
            x={textPos.x}
            y={textPos.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[14px] font-bold fill-indigo-800"
          >
            {lordSymbol}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang]);

  // 3. Drekkana Engine (Ring 4 - 36 Slices)
  const ring4 = useMemo(() => {
    const slices = [];
    const width = DREK_OUTER - DREK_INNER;

    for (let i = 1; i <= 36; i++) {
      const startAngle = 180 + (i - 1) * 10;
      const endAngle = startAngle + 10;
      const midAngle = startAngle + 5;

      const signNum = Math.floor((i - 1) / 3) + 1;
      const drekNum = ((i - 1) % 3) + 1;

      // Traditional Thai Visa (Poison) Logic
      let poisonLabel = '';
      if ([1, 4, 7, 10].includes(signNum) && drekNum === 1)
        poisonLabel = 'สุนัข';
      if ([2, 5, 8, 11].includes(signNum) && drekNum === 2)
        poisonLabel = 'ครุฑ';
      if ([3, 6, 9, 12].includes(signNum) && drekNum === 1) poisonLabel = 'นาค';

      const isPoison = poisonLabel !== '';
      const textPos = polarToCartesian(DREK_INNER + width * 0.5, midAngle);

      slices.push(
        <g key={`drek-${i}`}>
          <path
            d={getSlicePath(DREK_INNER, DREK_OUTER, startAngle, endAngle)}
            fill={drekNum % 2 === 0 ? '#f8fafc' : '#ffffff'}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <text
            x={textPos.x}
            y={textPos.y - (isPoison ? 5 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[12px] font-bold fill-slate-400"
          >
            {drekNum}
          </text>
          {isPoison && (
            <text
              x={textPos.x}
              y={textPos.y + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-bold fill-red-500"
            >
              {lang === 'th' ? poisonLabel : 'Poison'}
            </text>
          )}
        </g>,
      );
    }
    return slices;
  }, [lang]);

  // 4. Rasi & Navamsa Engine (Ring 7 & 8 - 12 Slices)
  const generatePlanetRing = (
    innerR: number,
    outerR: number,
    property: 'rasi' | 'navamsa',
    bgColors: [string, string],
    ringName: string,
  ) => {
    const slices = [];
    const width = outerR - innerR;

    for (let i = 1; i <= 12; i++) {
      const startAngle = 180 + (i - 1) * 30;
      const endAngle = startAngle + 30;
      const midAngle = startAngle + 15;

      const occupants: Occupant[] = [];

      if (data.lagna[property] === i) {
        occupants.push({
          symbol: lang === 'th' ? 'ล' : 'Asc',
          color: '#dc2626',
          isRetro: false,
        });
      }

      data.planets.forEach((p) => {
        if (p[property] === i && PLANET_ORDER.includes(p.key)) {
          const isNode = p.key === 'RAHU' || p.key === 'KETU';
          occupants.push({
            symbol: lang === 'th' ? THAI_SYMBOLS[p.key] : EN_SYMBOLS[p.key],
            color: '#1e293b',
            isRetro: p.isRetrograde && !isNode,
          });
        }
      });

      let row1 = occupants;
      let row2: Occupant[] = [];
      if (occupants.length > 4) {
        const mid = Math.ceil(occupants.length / 2);
        row1 = occupants.slice(0, mid);
        row2 = occupants.slice(mid);
      }

      const renderRow = (row: Occupant[], radius: number) => {
        return row.map((occ, idx) => {
          const angleStep = 30 / (row.length + 1);
          const angle = startAngle + angleStep * (idx + 1);
          const pos = polarToCartesian(radius, angle);
          return (
            <text
              key={`occ-${property}-${i}-${idx}-${radius}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={occ.color}
              className="text-[16px] font-bold pointer-events-none"
            >
              {occ.symbol}
              {occ.isRetro && (
                <tspan dx="2" dy="-6" fill="#dc2626" fontSize="10">
                  {lang === 'th' ? 'พ' : 'R'}
                </tspan>
              )}
            </text>
          );
        });
      };

      const signTextPos = polarToCartesian(innerR + width * 0.15, midAngle);

      slices.push(
        <g key={`${property}-${i}`}>
          <path
            d={getSlicePath(innerR, outerR, startAngle, endAngle)}
            fill={i % 2 === 0 ? bgColors[0] : bgColors[1]}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            className="transition-colors hover:fill-indigo-50"
          />
          <text
            x={signTextPos.x}
            y={signTextPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] font-bold fill-gray-400 select-none"
          >
            {t.signs[i]}
          </text>
          {i === 1 && (
            <text
              x={signTextPos.x}
              y={signTextPos.y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] font-semibold fill-indigo-400 select-none"
            >
              {ringName}
            </text>
          )}
          {renderRow(
            row1,
            row2.length > 0 ? innerR + width * 0.5 : innerR + width * 0.6,
          )}
          {row2.length > 0 && renderRow(row2, innerR + width * 0.8)}
        </g>,
      );
    }
    return slices;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-2 md:p-8 flex flex-col items-center">
      <svg
        viewBox="-500 -500 1000 1000"
        className="w-full h-auto drop-shadow-sm max-h-[85vh]"
      >
        {/* NEW: Ring 1 Dasha / Vimshottari Years */}
        <g id="ring-1-dasha">{ring1}</g>

        <g id="ring-2-navamsa-lord">{ring2}</g>
        <g id="ring-3-nakshatra">{ring3}</g>
        <g id="ring-4-drekkana">{ring4}</g>

        <g id="ring-5-pada-l1">{ring5}</g>
        <g id="ring-6-pada-l2">{ring6}</g>

        <g id="ring-7-navamsa-chart">
          {generatePlanetRing(
            NAV_INNER,
            NAV_OUTER,
            'navamsa',
            ['#fdf8f6', '#ffffff'],
            lang === 'th' ? 'นวางค์' : 'Navamsa',
          )}
        </g>

        <g id="ring-8-rasi-chart">
          {generatePlanetRing(
            RASI_INNER,
            RASI_OUTER,
            'rasi',
            ['#f8fafc', '#ffffff'],
            lang === 'th' ? 'ราศี' : 'Rasi',
          )}
        </g>

        {/* Center Canvas */}
        <circle
          cx="0"
          cy="0"
          r={CENTER_RADIUS}
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
      </svg>
    </div>
  );
}
