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

// --- Component Interfaces ---
interface PlanetData {
  key: string;
  rasi: number;
  navamsa: number; // Added Navamsa integer (1-12)
  isRetrograde?: boolean;
}
interface LagnaData {
  rasi: number;
  navamsa: number; // Added Navamsa integer (1-12)
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

  // --- Ring Radii Configuration (Preparing for all 8 rings) ---
  const CENTER_RADIUS = 110;
  const RASI_INNER = 110;
  const RASI_OUTER = 240; // Ring 8 width = 130
  const NAV_INNER = 240;
  const NAV_OUTER = 370; // Ring 7 width = 130

  // --- Universal 12-Slice Ring Generator ---
  // This engine can generate any 12-slice planet ring (Rasi, Navamsa, Drekkana, etc.)
  const generatePlanetRing = (
    innerR: number,
    outerR: number,
    property: 'rasi' | 'navamsa',
    bgColors: [string, string],
    ringName: string,
  ) => {
    const slices = [];

    for (let i = 1; i <= 12; i++) {
      const startAngle = 180 + (i - 1) * 30;
      const endAngle = startAngle + 30;
      const midAngle = startAngle + 15;

      // 1. Gather all occupants for this specific slice and property layer
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

      // 2. Radial Slot Layout Algorithm (Prevents overlaps for Stelliums)
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
                className="text-xl font-bold pointer-events-none"
              >
                {occ.symbol}
              </text>
              {occ.isRetro && (
                <text
                  x={pos.x + 8}
                  y={pos.y + 8}
                  textAnchor="start"
                  fill="#dc2626"
                  className="text-[10px] font-bold pointer-events-none"
                >
                  {lang === 'th' ? 'พ' : 'R'}
                </text>
              )}
            </g>
          );
        });
      };

      // 3. Render the geometric slice
      const signTextPos = polarToCartesian(innerR + 18, midAngle);

      slices.push(
        <g key={`${property}-${i}`}>
          <path
            d={getSlicePath(innerR, outerR, startAngle, endAngle)}
            fill={i % 2 === 0 ? bgColors[0] : bgColors[1]}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            className="transition-colors hover:fill-indigo-50"
          />
          {/* Sign Indicator at the base of the slice */}
          <text
            x={signTextPos.x}
            y={signTextPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-bold fill-gray-400 select-none"
          >
            {t.signs[i]}
          </text>

          {/* Subtle Ring Name label only on Aries (Slice 1) */}
          {i === 1 && (
            <text
              x={signTextPos.x}
              y={signTextPos.y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-semibold fill-indigo-400 select-none"
            >
              {ringName}
            </text>
          )}

          {/* Plot Planets in their calculated radial row */}
          {renderRow(row1, row2.length > 0 ? innerR + 55 : innerR + 70)}
          {row2.length > 0 && renderRow(row2, innerR + 95)}
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
          y="-12"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-indigo-900 text-xl font-bold"
        >
          {lang === 'th' ? 'ดวงชาตา' : 'Natal Chart'}
        </text>
        <text
          x="0"
          y="14"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-gray-500 text-sm font-medium"
        >
          Rasi & Navamsa
        </text>
      </svg>
    </div>
  );
}
