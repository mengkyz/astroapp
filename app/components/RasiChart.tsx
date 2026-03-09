import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { translations, Language } from '@/lib/i18n/translations';

// --- Core SVG Mathematical Engine ---
function polarToCartesian(radius: number, angleInDegrees: number) {
  const angleInRadians = ((360 - angleInDegrees) * Math.PI) / 180.0;
  return {
    x: radius * Math.cos(angleInRadians),
    y: radius * Math.sin(angleInRadians),
  };
}

// NEW: Calculates the exact rotation angle to make text tangent (inline) to the circular path
function getTangentialRotation(angleInDegrees: number) {
  const svgAngle = 360 - angleInDegrees;
  let textRot = (svgAngle + 90) % 360;

  // Flip the text if it's upside down to ensure it remains readable left-to-right
  if (textRot > 90 && textRot < 270) {
    textRot -= 180;
  }
  return textRot;
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

// Math engine to construct the inner borders of the traditional Thai "ราศีจักร"
function getThaiInnerPoint(angleInDegrees: number, radius: number) {
  const S = radius * Math.sin((15 * Math.PI) / 180.0);
  const a = ((angleInDegrees % 360) + 360) % 360; // Normalize 0-359

  // TR (Top-Right Inner Corner)
  if (Math.abs(a - 15) < 1 || Math.abs(a - 45) < 1 || Math.abs(a - 75) < 1)
    return { x: S, y: -S };
  // TL (Top-Left Inner Corner)
  if (Math.abs(a - 105) < 1 || Math.abs(a - 135) < 1 || Math.abs(a - 165) < 1)
    return { x: -S, y: -S };
  // BL (Bottom-Left Inner Corner)
  if (Math.abs(a - 195) < 1 || Math.abs(a - 225) < 1 || Math.abs(a - 255) < 1)
    return { x: -S, y: S };
  // BR (Bottom-Right Inner Corner)
  if (Math.abs(a - 285) < 1 || Math.abs(a - 315) < 1 || Math.abs(a - 345) < 1)
    return { x: S, y: S };

  return { x: 0, y: 0 };
}

function getThaiRasiSlicePath(
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(outerRadius, startAngle);
  const endOuter = polarToCartesian(outerRadius, endAngle);
  const pEndInner = getThaiInnerPoint(endAngle, outerRadius);
  const pStartInner = getThaiInnerPoint(startAngle, outerRadius);

  const path = [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 0 ${endOuter.x} ${endOuter.y}`,
    `L ${pEndInner.x} ${pEndInner.y}`,
  ];

  if (
    Math.abs(pEndInner.x - pStartInner.x) > 0.1 ||
    Math.abs(pEndInner.y - pStartInner.y) > 0.1
  ) {
    path.push(`L ${pStartInner.x} ${pStartInner.y}`);
  }

  path.push('Z');
  return path.join(' ');
}

// --- Helpers ---
const formatDegMin = (lon: number) => {
  const deg = Math.floor(lon % 30);
  const min = Math.floor((lon % 1) * 60);
  return `${deg.toString().padStart(2, '0')}° ${min.toString().padStart(2, '0')}'`;
};

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
  URANUS: 'มฤตยู',
};

const toThaiNumerals = (num: number) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num
    .toString()
    .split('')
    .map((d) => thaiDigits[parseInt(d)])
    .join('');
};

const DREKKANA_REFERENCE: Record<
  number,
  { lords: string[]; redIndex: number }
> = {
  1: { lords: ['MARS', 'SUN', 'JUPITER'], redIndex: 1 },
  2: { lords: ['VENUS', 'MERCURY', 'SATURN'], redIndex: 2 },
  3: { lords: ['MERCURY', 'VENUS', 'SATURN'], redIndex: 3 },
  4: { lords: ['MOON', 'MARS', 'JUPITER'], redIndex: 3 },
  5: { lords: ['SUN', 'JUPITER', 'MARS'], redIndex: 2 },
  6: { lords: ['MERCURY', 'SATURN', 'VENUS'], redIndex: 1 },
  7: { lords: ['VENUS', 'SATURN', 'MERCURY'], redIndex: 2 },
  8: { lords: ['MARS', 'JUPITER', 'MOON'], redIndex: 3 },
  9: { lords: ['JUPITER', 'MARS', 'SUN'], redIndex: 1 },
  10: { lords: ['SATURN', 'VENUS', 'MERCURY'], redIndex: 3 },
  11: { lords: ['SATURN', 'MERCURY', 'VENUS'], redIndex: 2 },
  12: { lords: ['JUPITER', 'MOON', 'MARS'], redIndex: 1 },
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
  printMode?: boolean;
}

interface Occupant {
  symbol: string;
  color: string;
  isRetro?: boolean;
  tooltipText: string;
}

export default function RasiChart({ data, lang, printMode }: RasiChartProps) {
  const t = translations[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
  });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!printMode && isModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, printMode]);

  useEffect(() => {
    if (tooltipRef.current && tooltip.visible) {
      tooltipRef.current.style.left = `${tooltip.x}px`;
      tooltipRef.current.style.top = `${tooltip.y}px`;
    }
  }, [tooltip.x, tooltip.y, tooltip.visible]);

  useEffect(() => {
    if (contentWrapperRef.current) {
      if (printMode) {
        contentWrapperRef.current.style.transform = `translate(0px, 0px) scale(1)`;
      } else {
        contentWrapperRef.current.style.transform = `translate(${position.x}px, ${position.y}px) scale(${scale})`;
      }
    }
  }, [position.x, position.y, scale, printMode]);

  const showTooltip = useCallback(
    (e: React.MouseEvent, text: string) => {
      if (printMode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        text,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [printMode],
  );

  const updateTooltip = useCallback(
    (e: React.MouseEvent) => {
      if (printMode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) => {
        if (!prev.visible) return prev;
        return { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top };
      });
    },
    [printMode],
  );

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

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

  // --- RECALCULATED RADII: Enlarged inner charts, compressed outer charts ---
  const RASI_INNER = 50;
  const RASI_OUTER = 201; // Rasi thickness = 151 (+20% from 126)
  const NAV_INNER = 201;
  const NAV_OUTER = 258; // Navamsa thickness = 57 (-10% from 63)
  
  // Squeezed outer rings using tangential text flow
  const PL_INNER_BASE = 409; // Blank space = 409 - 258 = 151 (same as Rasi thickness)
  const PL_OUTER = 434;
  const DREK_INNER = 434;
  const DREK_OUTER = 454;
  const NAK_INNER = 454;
  const NAK_OUTER = 479;
  const NAV_LORD_INNER = 479;
  const NAV_LORD_OUTER = 499;
  const DASHA_INNER = 499;
  const DASHA_OUTER = 524;

  const rasiGapConnectors = useMemo(() => {
    const lines = [];
    for (let i = 0; i < 12; i++) {
      const angle = 75 + i * 30; // ตรงกับเส้นเริ่มราศี
      const p1 = polarToCartesian(NAV_OUTER, angle);
      const p2 = polarToCartesian(PL_INNER_BASE, angle);
      lines.push(
        <line
          key={`gap-conn-${i}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="#94a3b8"
          strokeWidth="2"
        />,
      );
    }
    return lines;
  }, []);

  const ring1 = useMemo(() => {
    const slices = [];
    const step = 360 / 27;
    const width = DASHA_OUTER - DASHA_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 75 + (i - 1) * step; // SHIFTED TO 75
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
      const rot = getTangentialRotation(midAngle); // Align inline

      slices.push(
        <g key={`dasha-${i}`}>
          <path
            d={getSlicePath(DASHA_INNER, DASHA_OUTER, startAngle, endAngle)}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <text
            transform={`translate(${textPos.x}, ${textPos.y}) rotate(${rot})`}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[10px] font-bold fill-indigo-700 pointer-events-none"
          >
            {dashaLabel}
          </text>
        </g>,
      );
    }
    return slices;
  }, [lang]);

  const { ring2, ring5, ring5Styles } = useMemo(() => {
    const r2 = [];
    const r5 = [];
    const dynamicStyles: string[] = [];
    const padaOccupants: Occupant[][] = Array.from({ length: 108 }, () => []);

    if (data.lagna.longitude !== undefined) {
      const pIdx = Math.floor(data.lagna.longitude / (360 / 108));
      if (pIdx >= 0 && pIdx < 108) {
        padaOccupants[pIdx].push({
          symbol: lang === 'th' ? 'ล' : 'Asc',
          color: '#000000',
          isRetro: false,
          tooltipText: `ลัคนา: ${formatDegMin(data.lagna.longitude)}`,
        });
      }
    }

    data.planets.forEach((p) => {
      if (PLANET_ORDER.includes(p.key) && p.longitude !== undefined) {
        const pIdx = Math.floor(p.longitude / (360 / 108));
        if (pIdx >= 0 && pIdx < 108) {
          const isNode = p.key === 'RAHU' || p.key === 'KETU';
          const pName =
            lang === 'th'
              ? THAI_PLANET_NAMES[p.key]
              : t.planets[p.key as keyof typeof t.planets];
          const retroStr =
            p.isRetrograde && !isNode
              ? lang === 'th'
                ? ' [พักร์]'
                : ' [R]'
              : '';

          padaOccupants[pIdx].push({
            symbol: lang === 'th' ? THAI_SYMBOLS[p.key] : EN_SYMBOLS[p.key],
            color: '#000000',
            isRetro: p.isRetrograde && !isNode,
            tooltipText: `${pName}: ${formatDegMin(p.longitude)}${retroStr}`,
          });
        }
      }
    });

    const step = 360 / 108;
    for (let i = 0; i < 108; i++) {
      const startAngle = 75 + i * step; // SHIFTED TO 75
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const isGandanta = i === 35 || i === 71 || i === 107;
      const bgFill = isGandanta ? '#fee2e2' : '#ffffff';

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
            fill={bgFill}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <text
            x={r2Pos.x}
            y={r2Pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[10px] font-bold fill-slate-500 pointer-events-none"
          >
            {lordSymbol}
          </text>
        </g>,
      );

      const occs = padaOccupants[i];
      let currentInner = PL_INNER_BASE;
      if (occs.length > 1) {
        currentInner = Math.max(
          NAV_OUTER + 5,
          PL_INNER_BASE - (occs.length - 1) * 15, // Reduced step value to squeeze smoothly
        );
      }

      r5.push(
        <path
          key={`r5-bg-${i}`}
          d={getSlicePath(currentInner, PL_OUTER, startAngle, endAngle)}
          fill={bgFill}
          stroke={isGandanta ? '#fca5a5' : '#94a3b8'}
          strokeWidth="1"
        />,
      );

      if (occs.length > 0) {
        const sliceWidth = PL_OUTER - currentInner;
        const stepR = sliceWidth / occs.length;

        occs.forEach((occ, idx) => {
          const rPos = polarToCartesian(
            PL_OUTER - stepR / 2 - idx * stepR,
            midAngle,
          );
          const cssClass = `occ-r5-${i}-${idx}`;
          dynamicStyles.push(
            `.${cssClass} { transform-origin: ${rPos.x}px ${rPos.y}px; }`,
          );

          r5.push(
            <g
              key={`r5-occ-${i}-${idx}`}
              className={`cursor-pointer transition-transform hover:scale-125 ${cssClass}`}
              onMouseEnter={(e) => showTooltip(e, occ.tooltipText)}
              onMouseMove={updateTooltip}
              onMouseLeave={hideTooltip}
            >
              <text
                x={rPos.x}
                y={rPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={occ.color}
                className="text-[12px] font-bold"
              >
                {occ.isRetro ? `(${occ.symbol})` : occ.symbol}
              </text>
            </g>,
          );
        });
      }
    }
    return { ring2: r2, ring5: r5, ring5Styles: dynamicStyles.join(' ') };
  }, [data, lang, t, showTooltip, updateTooltip, hideTooltip]);

  const ring3 = useMemo(() => {
    const slices = [];
    const step = 360 / 27;
    const width = NAK_OUTER - NAK_INNER;

    for (let i = 1; i <= 27; i++) {
      const startAngle = 75 + (i - 1) * step; // SHIFTED TO 75
      const endAngle = startAngle + step;
      const midAngle = startAngle + step / 2;

      const lordKey = VIMSHOTTARI_LORDS[(i - 1) % 9];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const nakName = t.nakshatras[i - 1];

      const textPos = polarToCartesian(NAK_INNER + width * 0.5, midAngle);
      const rot = getTangentialRotation(midAngle); // Align inline

      slices.push(
        <g key={`nak-${i}`}>
          <path
            d={getSlicePath(NAK_INNER, NAK_OUTER, startAngle, endAngle)}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <text
            transform={`translate(${textPos.x}, ${textPos.y}) rotate(${rot})`}
            textAnchor="middle"
            dominantBaseline="central"
            className={`font-bold fill-indigo-800 pointer-events-none ${lang === 'th' ? 'text-[8.5px]' : 'text-[6.5px] tracking-tight'}`}
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
      const startAngle = 75 + (i - 1) * 10; // SHIFTED TO 75
      const endAngle = startAngle + 10;
      const midAngle = startAngle + 5;

      const signNum = Math.floor((i - 1) / 3) + 1;
      const drekNum = ((i - 1) % 3) + 1;

      const ref = DREKKANA_REFERENCE[signNum];
      const lordKey = ref.lords[drekNum - 1];
      const lordSymbol =
        lang === 'th' ? THAI_SYMBOLS[lordKey] : EN_SYMBOLS[lordKey];
      const isHighlighted = drekNum === ref.redIndex;
      const textColorClass = isHighlighted
        ? 'fill-red-600 text-[14px]'
        : 'fill-slate-500 text-[12px]';

      const textPos = polarToCartesian(DREK_INNER + width * 0.5, midAngle);

      slices.push(
        <g key={`drek-${i}`}>
          <path
            d={getSlicePath(DREK_INNER, DREK_OUTER, startAngle, endAngle)}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <text
            x={textPos.x}
            y={textPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`font-bold pointer-events-none ${textColorClass}`}
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
  ) => {
    const slices = [];
    const labelOffset = 14;
    const styles: string[] = [];

    // Safely pushes inner contents outward for the RASI chart to not overlap with the central Thai grid shape
    const layoutInnerR =
      property === 'rasi' ? Math.round(outerR * 0.38) : innerR;

    for (let i = 1; i <= 12; i++) {
      const startAngle = 75 + (i - 1) * 30; // ALREADY AT 75
      const endAngle = startAngle + 30;
      const midAngle = startAngle + 15;

      const occupants: Occupant[] = [];

      if (data.lagna[property] === i) {
        occupants.push({
          symbol: lang === 'th' ? 'ล' : 'Asc',
          color: '#000000',
          isRetro: false,
          tooltipText: `ลัคนา: ${formatDegMin(data.lagna.longitude)}`,
        });
      }

      data.planets.forEach((p) => {
        if (p[property] === i && PLANET_ORDER.includes(p.key)) {
          const isNode = p.key === 'RAHU' || p.key === 'KETU';
          const pName =
            lang === 'th'
              ? THAI_PLANET_NAMES[p.key]
              : t.planets[p.key as keyof typeof t.planets];
          const retroStr =
            p.isRetrograde && !isNode
              ? lang === 'th'
                ? ' [พักร์]'
                : ' [R]'
              : '';

          occupants.push({
            symbol: lang === 'th' ? THAI_SYMBOLS[p.key] : EN_SYMBOLS[p.key],
            color: '#000000',
            isRetro: p.isRetrograde && !isNode,
            tooltipText: `${pName}: ${formatDegMin(p.longitude)}${retroStr}`,
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
          const cssClass = `occ-${property}-${i}-${idx}-${Math.round(radius)}`;
          styles.push(
            `.${cssClass} { transform-origin: ${pos.x}px ${pos.y}px; }`,
          );

          return (
            <g
              key={`occ-${property}-${i}-${idx}-${radius}`}
              className={`cursor-pointer transition-transform hover:scale-125 ${cssClass}`}
              onMouseEnter={(e) => showTooltip(e, occ.tooltipText)}
              onMouseMove={updateTooltip}
              onMouseLeave={hideTooltip}
            >
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={occ.color}
                className={`font-bold ${property === 'rasi' ? 'text-[20px]' : 'text-[16px]'}`}
              >
                {occ.isRetro ? `(${occ.symbol})` : occ.symbol}
              </text>
            </g>
          );
        });
      };

      const signTextPos = polarToCartesian(
        layoutInnerR + labelOffset,
        midAngle,
      );
      const width = outerR - layoutInnerR;

      const row1Elements = renderRow(
        row1,
        row2.length > 0
          ? layoutInnerR + width * 0.5
          : layoutInnerR + width * 0.6,
      );
      const row2Elements =
        row2.length > 0 ? renderRow(row2, layoutInnerR + width * 0.8) : null;

      slices.push(
        <g key={`${property}-${i}`}>
          <path
            d={
              property === 'rasi'
                ? getThaiRasiSlicePath(outerR, startAngle, endAngle)
                : getSlicePath(innerR, outerR, startAngle, endAngle)
            }
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="2"
            className="transition-colors hover:fill-indigo-50"
          />
          {property === 'navamsa' && (
            <text
              x={signTextPos.x}
              y={signTextPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] tracking-tight font-bold fill-gray-400 select-none pointer-events-none"
            >
              {t.signs[i]}
            </text>
          )}
          {row1Elements}
          {row2Elements}
        </g>,
      );
    }

    slices.push(
      <style
        key={`style-${property}`}
        dangerouslySetInnerHTML={{ __html: styles.join(' ') }}
      />,
    );
    return slices;
  };

  return (
    <>
      {/* ซ่อน Background ของ Modal ตอนสั่งปริ้น */}
      {!printMode && isModalOpen && (
        <div className="w-full h-[70vh] min-h-[500px]" />
      )}

      <div
        className={
          printMode
            ? 'w-full flex flex-col items-center justify-center' // รูปแบบสำหรับโหมดปริ้น
            : isModalOpen
              ? 'fixed inset-0 z-50 bg-white/95 backdrop-blur-sm p-4 md:p-8 flex flex-col items-center space-y-4 overflow-hidden'
              : 'w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-8 flex flex-col items-center space-y-4 relative'
        }
        ref={containerRef}
      >
        {/* TOOLTIP OVERLAY */}
        {!printMode && tooltip.visible && (
          <div
            ref={tooltipRef}
            className="absolute z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] whitespace-nowrap"
          >
            {tooltip.text}
            <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}

        {/* TOOLBAR CONTROLS - ซ่อนเมื่อสั่ง Print */}
        {!printMode && (
          <div className="w-full flex justify-between items-center max-w-5xl">
            <div className="flex items-center space-x-1 bg-gray-100 p-1.5 rounded-lg border border-gray-200 shadow-sm">
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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
              onClick={() => setIsModalOpen(!isModalOpen)}
              className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-2 px-4 rounded-lg transition-colors border border-indigo-100 shadow-sm"
            >
              {isModalOpen ? (
                <>
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="hidden sm:inline">
                    {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                  </span>
                </>
              ) : (
                <>
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
                  <span className="hidden sm:inline">
                    {lang === 'th' ? 'ขยายเต็มจอ' : 'Enlarge'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        <div
          className={
            printMode
              ? 'relative w-[800px] h-[800px] mx-auto mt-10' // ขนาด Fix สำหรับหน้ากระดาษ A4 ตอน Print
              : isModalOpen
                ? `relative w-full flex-1 min-h-0 overflow-hidden border border-gray-200 rounded-xl bg-white select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
                : `relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden border border-gray-200 rounded-xl bg-white select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
          }
          // ปิดการกระทำเมาส์ทุกอย่างเมื่ออยู่ในโหมด Print
          onMouseDown={!printMode ? handleMouseDown : undefined}
          onMouseMove={!printMode ? handleMouseMove : undefined}
          onMouseUp={!printMode ? handleMouseUp : undefined}
          onMouseLeave={!printMode ? handleMouseUp : undefined}
          onTouchStart={!printMode ? handleTouchStart : undefined}
          onTouchMove={!printMode ? handleTouchMove : undefined}
          onTouchEnd={!printMode ? handleMouseUp : undefined}
        >
          <div
            ref={contentWrapperRef}
            className={`w-full h-full flex items-center justify-center pointer-events-none origin-center ${!printMode && isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'}`}
          >
            <svg
              viewBox="-550 -550 1100 1100"
              className={`w-full h-full max-w-[900px] max-h-[900px] bg-white ${printMode ? '' : 'drop-shadow-sm pointer-events-auto'}`}
            >
              <g id="ring-1-dasha">{ring1}</g>
              <g id="ring-2-navamsa-lord">{ring2}</g>
              <g id="ring-3-nakshatra">{ring3}</g>
              <g id="ring-4-drekkana">{ring4}</g>
              <style dangerouslySetInnerHTML={{ __html: ring5Styles }} />
              <g id="ring-5-pada-dynamic">{ring5}</g>

              {/* เส้นเชื่อมราศีข้ามช่องว่าง (เริ่มที่ 75 เพื่อให้ทะลุตรงเผง) */}
              <g id="rasi-gap-connectors">{rasiGapConnectors}</g>

              <g id="ring-7-navamsa-chart">
                {generatePlanetRing(NAV_INNER, NAV_OUTER, 'navamsa')}
              </g>

              <g id="ring-8-rasi-chart">
                {generatePlanetRing(RASI_INNER, RASI_OUTER, 'rasi')}
              </g>

            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
