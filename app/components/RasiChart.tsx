import React from 'react';
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

// Vimshottari Lords order for Nakshatras
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

// --- Component Interfaces ---
interface PlanetData {
  key: string;
  rasi: number;
  navamsa: number;
  isRetrograde?: boolean;
}
interface LagnaData {
  rasi: number;
  navamsa: number;
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

  // --- Dynamic Ring Radii Configuration (Fitting all 8 Rings within 500 max radius) ---
  const CENTER_RADIUS = 60;

  const RASI_INNER = 60;
  const RASI_OUTER = 170; // Ring 8 (Width: 110)

  const NAV_INNER = 170;
  const NAV_OUTER = 280; // Ring 7 (Width: 110)

  const DREK_INNER = 280;
  const DREK_OUTER = 360; // Ring 4 (Width: 80)

  const NAK_INNER = 360;
  const NAK_OUTER = 440; // Ring 3 (Width: 80)

  // --- Ring 3: Nakshatra Generator (27 Slices) ---
  const generateNakshatraRing = (innerR: number, outerR: number) => {
    const slices = [];
    const step = 360 / 27; // Exactly 13°20'
    const width = outerR - innerR;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 180 + (i - 1) * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const lordKey = VIMSHOTTARI_LORDS[(i - 1) % 9];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const textPos = polarToCartesian(innerR + width * 0.5, midAngle);

      slices.push(
        <g key={`nak-${i}`}>
          <path
            d={getSlicePath(innerR, outerR, startAngle, endAngle)}
            fill={i % 2 === 0 ? '#fff7ed' : '#ffffff'} // Very soft orange alternating
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
  };

  // --- Ring 4: Drekkana Generator (36 Slices) ---
  const generateDrekkanaRing = (innerR: number, outerR: number) => {
    const slices = [];
    const width = outerR - innerR;

    for (let i = 1; i <= 36; i++) {
      const startAngle = 180 + (i - 1) * 10;
      const endAngle = startAngle + 10;
      const midAngle = startAngle + 5;

      const signNum = Math.floor((i - 1) / 3) + 1; // Maps 1-36 into signs 1-12
      const drekNum = ((i - 1) % 3) + 1; // Maps 1-36 into Drekkana 1, 2, or 3

      // Traditional Thai Visa (Poison) Drekkana Logic mapped perfectly to your Reference Chart
      let poisonLabel = '';
      if ([1, 4, 7, 10].includes(signNum) && drekNum === 1)
        poisonLabel = 'สุนัข';
      if ([2, 5, 8, 11].includes(signNum) && drekNum === 2)
        poisonLabel = 'ครุฑ';
      if ([3, 6, 9, 12].includes(signNum) && drekNum === 1) poisonLabel = 'นาค';

      const isPoison = poisonLabel !== '';
      const textPos = polarToCartesian(innerR + width * 0.5, midAngle);

      slices.push(
        <g key={`drek-${i}`}>
          <path
            d={getSlicePath(innerR, outerR, startAngle, endAngle)}
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
  };

  // --- Universal 12-Slice Planet Ring Generator (Ring 7 & 8) ---
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
            <g key={`occ-${property}-${i}-${idx}-${radius}`}>
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={occ.color}
                className="text-[16px] font-bold pointer-events-none"
              >
                {occ.symbol}
              </text>
              {occ.isRetro && (
                <text
                  x={pos.x + 6}
                  y={pos.y + 6}
                  textAnchor="start"
                  fill="#dc2626"
                  className="text-[9px] font-bold pointer-events-none"
                >
                  {lang === 'th' ? 'พ' : 'R'}
                </text>
              )}
            </g>
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
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center">
      <svg
        viewBox="-500 -500 1000 1000"
        className="w-full h-auto drop-shadow-sm max-h-[85vh]"
      >
        {/* Ring 3: Nakshatras (27 Divisions) */}
        <g id="nakshatra-ring">{generateNakshatraRing(NAK_INNER, NAK_OUTER)}</g>

        {/* Ring 4: Drekkana (36 Divisions) */}
        <g id="drekkana-ring">{generateDrekkanaRing(DREK_INNER, DREK_OUTER)}</g>

        {/* Ring 7: Navamsa Layer (Outer) */}
        <g id="navamsa-ring">
          {generatePlanetRing(
            NAV_INNER,
            NAV_OUTER,
            'navamsa',
            ['#fdf8f6', '#ffffff'],
            lang === 'th' ? 'นวางค์' : 'Navamsa',
          )}
        </g>

        {/* Ring 8: Rasi Layer (Inner) */}
        <g id="rasi-ring">
          {generatePlanetRing(
            RASI_INNER,
            RASI_OUTER,
            'rasi',
            ['#f8fafc', '#ffffff'],
            lang === 'th' ? 'ราศี' : 'Rasi',
          )}
        </g>

        {/* Center Canvas details */}
        <circle
          cx="0"
          cy="0"
          r={CENTER_RADIUS}
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <text
          x="0"
          y="-8"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-indigo-900 text-lg font-bold"
        >
          {lang === 'th' ? 'ดวงชาตา' : 'Natal Chart'}
        </text>
      </svg>
    </div>
  );
}
