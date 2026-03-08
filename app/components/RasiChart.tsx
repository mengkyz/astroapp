import React from 'react';
import { translations, Language } from '@/lib/i18n/translations';

// --- Core SVG Mathematical Engine ---
// Converts standard angles (where 0 is East/3 o'clock, moving Counter-Clockwise) to SVG X/Y coordinates
function polarToCartesian(radius: number, angleInDegrees: number) {
  // We subtract from 360 because SVG's Y-axis points DOWN, but standard math points UP
  const angleInRadians = ((360 - angleInDegrees) * Math.PI) / 180.0;
  return {
    x: radius * Math.cos(angleInRadians),
    y: radius * Math.sin(angleInRadians),
  };
}

// Generates the SVG path "d" attribute for a perfect donut slice
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

  // SVG Sweep flag: 0 curves outward (Counter-Clockwise)
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 1 ${endInner.x} ${endInner.y}`,
    `Z`,
  ].join(' ');
}

// --- Component Interfaces ---
interface RasiChartProps {
  lang: Language;
}

export default function RasiChart({ lang }: RasiChartProps) {
  const t = translations[lang];

  // Rasi Ring Configuration
  const RASI_INNER_RADIUS = 250;
  const RASI_OUTER_RADIUS = 400;

  // Generate the 12 Zodiac Slices
  const rasiSlices = [];
  for (let i = 1; i <= 12; i++) {
    // Vedic rule: Aries (1) starts at 180 degrees (9 o'clock) and moves CCW
    const startAngle = 180 + (i - 1) * 30;
    const endAngle = startAngle + 30;
    const midAngle = startAngle + 15;

    // Get the exact center coordinate to place the text horizontally
    const textPos = polarToCartesian(RASI_INNER_RADIUS + 25, midAngle);

    rasiSlices.push(
      <g key={`rasi-${i}`}>
        {/* The Slice Background */}
        <path
          d={getSlicePath(
            RASI_INNER_RADIUS,
            RASI_OUTER_RADIUS,
            startAngle,
            endAngle,
          )}
          fill={i % 2 === 0 ? '#f8fafc' : '#ffffff'} // Alternating colors
          stroke="#cbd5e1"
          strokeWidth="2"
          className="transition-colors hover:fill-indigo-50"
        />
        {/* The Zodiac Sign Name */}
        <text
          x={textPos.x}
          y={textPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-bold fill-indigo-300 select-none"
        >
          {t.signs[i]}
        </text>
      </g>,
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col items-center">
      {/* The SVG Canvas: Using viewBox makes it infinitely responsive without losing quality */}
      <svg
        viewBox="-500 -500 1000 1000"
        className="w-full h-auto drop-shadow-sm max-h-[80vh]"
      >
        {/* Ring 8: The Rasi Background */}
        <g id="rasi-ring">{rasiSlices}</g>

        {/* Center Hole for Future Data (Ascendant, Birth Info) */}
        <circle
          cx="0"
          cy="0"
          r={RASI_INNER_RADIUS}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="6,6"
        />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-gray-400 text-lg font-medium"
        >
          {t.tabs.chart} Center
        </text>
      </svg>
    </div>
  );
}
