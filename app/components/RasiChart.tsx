import React, { useMemo, useRef, useState } from 'react';
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
  URANUS: '๐',
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
  URANUS: '♅',
};

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
const VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

const THAI_PLANET_NAMES: Record<string, string> = {
  SUN: 'อาทิตย์',
  MOON: 'จันทร์',
  MARS: 'อังคาร',
  MERCURY: 'พุธ',
  JUPITER: 'พฤหัสฯ',
  VENUS: 'ศุกร์',
  SATURN: 'เสาร์',
  RAHU: 'ราหู',
  KETU: 'เกตุ',
};

const toThaiNumerals = (num: number) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num
    .toString()
    .split('')
    .map((d) => thaiDigits[parseInt(d)])
    .join('');
};

const DREKKANA_HIGHLIGHTS: Record<number, string> = {
  1: 'MARS',
  2: 'MERCURY',
  3: 'SATURN',
  4: 'JUPITER',
  5: 'JUPITER',
  6: 'MERCURY',
  7: 'SATURN',
  8: 'MOON',
  9: 'JUPITER',
  10: 'MERCURY',
  11: 'MERCURY',
  12: 'JUPITER',
};

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
  const svgRef = useRef<SVGSVGElement>(null);

  // --- Zoom & Pan State ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.4, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.4, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - startPos.y,
      });
    }
  };

  // --- Refactored Radii Configuration ---
  const CENTER_RADIUS = 35;
  const RASI_INNER = 35;
  const RASI_OUTER = 115;
  const NAV_INNER = 115;
  const NAV_OUTER = 185;
  // GAP is deliberately left between 185 and 245 for Pada expansion!
  const PL_INNER_BASE = 245;
  const PL_OUTER = 275;
  const DREK_INNER = 275;
  const DREK_OUTER = 325;
  const NAK_INNER = 325;
  const NAK_OUTER = 385;
  const NAV_LORD_INNER = 385;
  const NAV_LORD_OUTER = 435;
  const DASHA_INNER = 435;
  const DASHA_OUTER = 485;

  const exportToPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const exportScale = 3;
    canvas.width = 1000 * exportScale;
    canvas.height = 1000 * exportScale;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(exportScale, exportScale);
        ctx.drawImage(img, 0, 0, 1000, 1000);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `rasi-chart-${new Date().getTime()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const ring1 = useMemo(() => {
    const slices = [];
    const step = 360 / 27;
    const width = DASHA_OUTER - DASHA_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 90 + (i - 1) * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const lordIndex = (i - 1) % 9;
      const lordKey = VIMSHOTTARI_LORDS[lordIndex];
      const years = VIMSHOTTARI_YEARS[lordIndex];

      let dashaLabel = '';
      if (lang === 'th') {
        dashaLabel = `${THAI_PLANET_NAMES[lordKey]} ${toThaiNumerals(years)}`;
      } else {
        const enName = lordKey.charAt(0) + lordKey.slice(1).toLowerCase();
        dashaLabel = `${enName} ${years}`;
      }

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
            className="text-[10px] font-bold fill-indigo-700"
          >
            {dashaLabel}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang]);

  // --- Dynamic Single-Layer Pada Engine (replaces ring 5 and 6) ---
  const { ring2, ring5 } = useMemo(() => {
    const r2 = [];
    const r5 = [];
    const padaOccupants: Occupant[][] = Array.from({ length: 108 }, () => []);

    if (data.lagna.longitude !== undefined) {
      const pIdx = Math.floor(data.lagna.longitude / (360 / 108));
      if (pIdx >= 0 && pIdx < 108)
        padaOccupants[pIdx].push({
          symbol: lang === 'th' ? 'ล' : 'Asc',
          color: '#dc2626',
          isRetro: false,
        });
    }

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
      const startAngle = 90 + i * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      // Navamsa Lord
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

      const occs = padaOccupants[i];

      // Dynamic Height Calculation: Widen inward if multiple planets
      let currentInner = PL_INNER_BASE;
      if (occs.length > 1) {
        // Expand inward by 20px per additional planet, but don't crash into Navamsa
        currentInner = Math.max(
          NAV_OUTER + 5,
          PL_INNER_BASE - (occs.length - 1) * 20,
        );
      }

      // Draw Dynamic Background Slice
      r5.push(
        <path
          key={`r5-bg-${i}`}
          d={getSlicePath(currentInner, PL_OUTER, startAngle, endAngle)}
          fill={i % 2 === 0 ? '#f1f5f9' : '#ffffff'}
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />,
      );

      // Auto-Center Planets within the dynamically expanded slice
      if (occs.length > 0) {
        const sliceWidth = PL_OUTER - currentInner;
        const stepR = sliceWidth / occs.length;

        occs.forEach((occ, idx) => {
          // Center each planet perfectly inside its dynamic subdivision
          const rPos = polarToCartesian(
            PL_OUTER - stepR / 2 - idx * stepR,
            midAngle,
          );

          r5.push(
            <text
              key={`r5-occ-${i}-${idx}`}
              x={rPos.x}
              y={rPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={occ.color}
              className="text-[12px] font-bold pointer-events-none"
            >
              {occ.symbol}
              {occ.isRetro && (
                <tspan dx="1" dy="-5" fill="#dc2626" fontSize="8">
                  {lang === 'th' ? 'พ' : 'R'}
                </tspan>
              )}
            </text>,
          );
        });
      }
    }
    return { ring2: r2, ring5: r5 };
  }, [data, lang]);

  const ring3 = useMemo(() => {
    const slices = [];
    const step = 360 / 27;
    const width = NAK_OUTER - NAK_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 90 + (i - 1) * step;
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const lordKey = VIMSHOTTARI_LORDS[(i - 1) % 9];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const nakName = t.nakshatras[i - 1];

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
            y={textPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className={`font-bold fill-indigo-800 ${lang === 'th' ? 'text-[8.5px]' : 'text-[6.5px] tracking-tight'}`}
          >
            {nakName} {lordSymbol}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang, t.nakshatras]);

  const ring4 = useMemo(() => {
    const slices = [];
    const width = DREK_OUTER - DREK_INNER;

    for (let i = 1; i <= 36; i++) {
      const startAngle = 90 + (i - 1) * 10;
      const endAngle = startAngle + 10;
      const midAngle = startAngle + 5;

      const signNum = Math.floor((i - 1) / 3) + 1;
      const drekNum = ((i - 1) % 3) + 1;

      let targetSign = signNum;
      if (drekNum === 2) targetSign = ((signNum + 4 - 1) % 12) + 1;
      if (drekNum === 3) targetSign = ((signNum + 8 - 1) % 12) + 1;

      const lordKey = SIGN_LORDS[targetSign];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];

      const isHighlighted = lordKey === DREKKANA_HIGHLIGHTS[signNum];
      const textColorClass = isHighlighted
        ? 'fill-red-600 text-[14px]'
        : 'fill-slate-500 text-[12px]';

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
            y={textPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`font-bold ${textColorClass}`}
          >
            {lordSymbol}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang]);

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
      const startAngle = 90 + (i - 1) * 30;
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
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center space-y-4">
      {/* TOOLBAR CONTROLS */}
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center space-x-1 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white rounded shadow-sm hover:bg-gray-50 text-gray-700 transition-colors"
            title="Zoom Out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-white rounded shadow-sm hover:bg-gray-50 text-gray-700 transition-colors"
            title="Reset View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white rounded shadow-sm hover:bg-gray-50 text-gray-700 transition-colors"
            title="Zoom In"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <div className="px-3 flex items-center text-xs font-semibold text-gray-500 border-l border-gray-300 ml-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
            Drag to Move
          </div>
        </div>

        <button
          onClick={exportToPNG}
          className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-2 px-4 rounded-lg transition-colors border border-indigo-100 shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className="hidden sm:inline">{t.tabs.exportBtn}</span>
          <span className="sm:hidden">PNG</span>
        </button>
      </div>

      <div
        className={`relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden border border-gray-200 rounded-xl bg-white select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <div
          className={`w-full h-full flex items-center justify-center pointer-events-none origin-center ${isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          <svg
            ref={svgRef}
            viewBox="-500 -500 1000 1000"
            className="w-full h-full max-w-[900px] max-h-[900px] drop-shadow-sm bg-white pointer-events-auto"
          >
            <g id="ring-1-dasha">{ring1}</g>
            <g id="ring-2-navamsa-lord">{ring2}</g>
            <g id="ring-3-nakshatra">{ring3}</g>
            <g id="ring-4-drekkana">{ring4}</g>

            {/* NEW: Single Dynamic Pada Ring */}
            <g id="ring-5-pada-dynamic">{ring5}</g>

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
      </div>
    </div>
  );
}
