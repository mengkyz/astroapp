'use client';

import React, { useMemo } from 'react';
import { translations, Language } from '@/lib/i18n/translations';

interface PlanetData {
  key: string;
  longitude: number;
}

interface RerkResultProps {
  data: { planets: PlanetData[] };
  lang: Language;
}

const RERKS_ORDER = [
  { th: 'ทลิทโท', en: 'Talittho' },
  { th: 'มหัทธโน', en: 'Mahatthano' },
  { th: 'โจโร', en: 'Choro' },
  { th: 'ภูมิปาโล', en: 'Bhumipalo' },
  { th: 'เทศาตรี', en: 'Tesatri' },
  { th: 'เทวี', en: 'Taewee' },
  { th: 'เพชฌฆาต', en: 'Petchakat' },
  { th: 'ราชา', en: 'Racha' },
  { th: 'สมโณ', en: 'Samano' },
];

// Vimshottari nakshatra lords: nakIdx % 9 → lord (Ashwini=0 → Ketu, ...)
const NAKSHATRA_LORDS_ORDER = [
  'KETU', 'VENUS', 'SUN', 'MOON', 'MARS', 'RAHU', 'JUPITER', 'SATURN', 'MERCURY',
];

const PLANET_DISPLAY: Record<string, {
  en: string; th: string;
  short_en: string; short_th: string;
  bg: string; text: string;
  lordColor: string;
}> = {
  SUN:     { en: 'Sun',     th: 'อาทิตย์', short_en: 'Su', short_th: 'อา', bg: 'bg-orange-500',  text: 'text-white', lordColor: 'text-orange-600' },
  MOON:    { en: 'Moon',    th: 'จันทร์',  short_en: 'Mo', short_th: 'จ',  bg: 'bg-blue-500',    text: 'text-white', lordColor: 'text-blue-600' },
  MARS:    { en: 'Mars',    th: 'อังคาร',  short_en: 'Ma', short_th: 'อ',  bg: 'bg-red-500',     text: 'text-white', lordColor: 'text-red-600' },
  MERCURY: { en: 'Mercury', th: 'พุธ',     short_en: 'Me', short_th: 'พ',  bg: 'bg-green-500',   text: 'text-white', lordColor: 'text-green-700' },
  JUPITER: { en: 'Jupiter', th: 'พฤหัส',  short_en: 'Ju', short_th: 'พฤ', bg: 'bg-amber-500',   text: 'text-white', lordColor: 'text-amber-600' },
  VENUS:   { en: 'Venus',   th: 'ศุกร์',  short_en: 'Ve', short_th: 'ศ',  bg: 'bg-pink-500',    text: 'text-white', lordColor: 'text-pink-600' },
  SATURN:  { en: 'Saturn',  th: 'เสาร์',  short_en: 'Sa', short_th: 'ส',  bg: 'bg-purple-700',  text: 'text-white', lordColor: 'text-purple-700' },
  RAHU:    { en: 'Rahu',    th: 'ราหู',   short_en: 'Ra', short_th: 'รา', bg: 'bg-slate-700',   text: 'text-white', lordColor: 'text-slate-600' },
  KETU:    { en: 'Ketu',    th: 'เกตุ',   short_en: 'Ke', short_th: 'ก',  bg: 'bg-stone-500',   text: 'text-white', lordColor: 'text-stone-600' },
};

const PLANET_ORDER = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];

const RASI_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const RASI_TH = ['เมษ','พฤษภ','เมถุน','กรกฏ','สิงห์','กันย์','ตุลย์','พิจิก','ธนู','มกร','กุมภ์','มีน'];

export default function RerkResult({ data, lang }: RerkResultProps) {
  const t = translations[lang];

  const result = useMemo(() => {
    const moon = data.planets.find((p) => p.key === 'MOON');
    if (!moon || moon.longitude === undefined) return null;

    const lon = moon.longitude;
    const nakshatraIndex = Math.floor(lon / (360 / 27)) + 1; // 1–27
    const pada = (Math.floor(lon / (360 / 108)) % 4) + 1;
    const moonGroup = ((nakshatraIndex - 1) % 9) + 1;
    const nakName = t.nakshatras[nakshatraIndex - 1];

    const deg = Math.floor(lon % 30);
    const min = Math.floor((lon % 1) * 60);

    // Build map: nakshatra index (0-based) → list of planet info
    type PlanetInfo = { key: string; nakName: string; nakNum: number; pada: number; rasi: number; deg: number; min: number };
    const planetInNak = new Map<number, PlanetInfo[]>();
    for (const planet of data.planets) {
      if (!PLANET_ORDER.includes(planet.key)) continue;
      const pLon = planet.longitude;
      const pNak = Math.floor(pLon / (360 / 27)); // 0–26
      const pPada = (Math.floor(pLon / (360 / 108)) % 4) + 1;
      const pRasi = Math.floor(pLon / 30) % 12; // 0–11 (Aries=0)
      const pDeg = Math.floor(pLon % 30);
      const pMin = Math.floor((pLon % 1) * 60);
      if (!planetInNak.has(pNak)) planetInNak.set(pNak, []);
      planetInNak.get(pNak)!.push({ key: planet.key, nakName: t.nakshatras[pNak], nakNum: pNak + 1, pada: pPada, rasi: pRasi, deg: pDeg, min: pMin });
    }

    const tableData = Array.from({ length: 9 }, (_, i) => {
      const groupNum = i + 1;
      const offset = (groupNum - moonGroup + 9) % 9;
      const rerk = RERKS_ORDER[offset];

      const nakEntries = [i, i + 9, i + 18].map((nakIdx) => ({
        nakIdx,
        name: t.nakshatras[nakIdx],
        lord: NAKSHATRA_LORDS_ORDER[nakIdx % 9],
        planets: (planetInNak.get(nakIdx) ?? []).sort(
          (a, b) => PLANET_ORDER.indexOf(a) - PLANET_ORDER.indexOf(b),
        ),
      }));

      return { groupNum, rerkTh: rerk.th, rerkEn: rerk.en, nakEntries };
    });

    return { nakshatraIndex, nakName, pada, deg, min, moonGroup, tableData };
  }, [data, t]);

  if (!result) return null;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* HEADER */}
      <div className="bg-indigo-600 text-white p-6 md:p-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">
          {lang === 'th' ? 'ตารางฤกษ์ส่วนตัว' : 'Personal Rerk Table'}
        </h2>
        <p className="text-indigo-100 mt-2 text-sm md:text-base">
          {lang === 'th'
            ? 'วิเคราะห์จากตำแหน่งดาวจันทร์ในดวงชาตากำเนิดของคุณ'
            : 'Analyzed from the position of the Moon in your natal chart'}
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-4 text-center border-b border-gray-200 w-16">#</th>
                <th className="px-4 py-4 border-b border-gray-200">
                  {lang === 'th' ? 'กลุ่มนักษัตร' : 'Nakshatras'}
                  <span className="ml-2 normal-case font-normal text-gray-400 text-xs">
                    {lang === 'th' ? '(ชื่อ · เจ้านักษัตร · ดาวที่อยู่)' : '(name · lord · occupants)'}
                  </span>
                </th>
                <th className="px-4 py-4 border-b border-gray-200 whitespace-nowrap">
                  {lang === 'th' ? 'หมวดฤกษ์' : 'Rerk Group'}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.tableData.map((row) => {
                const isUserRerk = row.groupNum === result.moonGroup;

                return (
                  <tr
                    key={row.groupNum}
                    className="border-b last:border-0 transition-colors bg-white hover:bg-gray-50"
                  >
                    {/* # */}
                    <td className="px-4 py-4 text-center align-middle">
                      <span className="font-semibold text-gray-400">{row.groupNum}</span>
                    </td>

                    {/* Nakshatra cards */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex gap-2 flex-wrap">
                        {row.nakEntries.map(({ nakIdx, name, lord, planets }) => {
                          const isExactNak = isUserRerk && nakIdx === result.nakshatraIndex - 1;
                          const lordInfo = PLANET_DISPLAY[lord];

                          return (
                            <div
                              key={nakIdx}
                              className={`rounded-lg border px-3 py-2 min-w-[96px] flex flex-col gap-0.5 ${
                                isExactNak
                                  ? 'bg-emerald-600 border-emerald-700 shadow-md'
                                  : isUserRerk
                                    ? 'bg-emerald-100 border-emerald-300'
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {/* Nakshatra name */}
                              <span
                                className={`text-xs font-bold leading-tight ${
                                  isExactNak
                                    ? 'text-white'
                                    : isUserRerk
                                      ? 'text-emerald-900'
                                      : 'text-gray-700'
                                }`}
                              >
                                {name}
                              </span>

                              {/* Lord */}
                              <span
                                className={`text-[10px] leading-tight ${
                                  isExactNak
                                    ? 'text-emerald-200'
                                    : (lordInfo?.lordColor ?? 'text-gray-400')
                                }`}
                              >
                                {lang === 'th' ? 'เจ้า: ' : 'Lord: '}
                                <span className="font-semibold">
                                  {lordInfo ? (lang === 'th' ? lordInfo.th : lordInfo.en) : lord}
                                </span>
                              </span>

                              {/* Occupying planets */}
                              {planets.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-1">
                                  {planets.map((pi) => {
                                    const pd = PLANET_DISPLAY[pi.key];
                                    if (!pd) return null;
                                    return (
                                      <span key={pi.key} className="relative group/planet">
                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold cursor-default ${pd.bg} ${pd.text}`}
                                        >
                                          {lang === 'th' ? pd.short_th : pd.short_en}
                                        </span>
                                        {/* Tooltip */}
                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 opacity-0 group-hover/planet:opacity-100 transition-opacity duration-150">
                                          <span className="whitespace-nowrap rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-xl flex flex-col items-center gap-0.5">
                                            <span className="font-bold">{lang === 'th' ? pd.th : pd.en}</span>
                                            <span className="text-gray-300">
                                              {pi.nakName} ({pi.nakNum}) · {lang === 'th' ? `บาท ${pi.pada}` : `Pada ${pi.pada}`}
                                            </span>
                                            <span className="text-gray-400">
                                              {lang === 'th' ? RASI_TH[pi.rasi] : RASI_EN[pi.rasi]} · {pi.deg}° {pi.min.toString().padStart(2, '0')}&apos;
                                            </span>
                                          </span>
                                          <span className="block w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Rerk group */}
                    <td className="px-4 py-4 align-middle font-bold whitespace-nowrap text-gray-800">
                      {lang === 'th' ? row.rerkTh : row.rerkEn}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
