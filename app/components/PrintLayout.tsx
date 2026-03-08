'use client';
import React from 'react';
import dayjs from 'dayjs';
import { translations, Language } from '@/lib/i18n/translations';
import RasiChart from './RasiChart';

function formatLocalDate(isoStr: string, lang: Language) {
  const d = dayjs(isoStr);
  if (lang === 'th') {
    const thMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    return `${d.date()} ${thMonths[d.month()]} ${d.year() + 543}`;
  }
  return d.format('MMM DD, YYYY');
}

function formatDuration(
  startISO: string,
  endISO: string,
  tStr: typeof translations.en.dashaTable,
) {
  const start = dayjs(startISO);
  const end = dayjs(endISO);
  const years = end.diff(start, 'year');
  let temp = start.add(years, 'year');
  const months = end.diff(temp, 'month');
  temp = temp.add(months, 'month');
  const days = end.diff(temp, 'day');
  return `${years}${tStr.y}${months}${tStr.m}${days}${tStr.d}`;
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

// --- สร้าง Interfaces ให้ตรงกับ ChartResult ที่ส่งมาจากหน้าหลักเป๊ะๆ ---
interface PlanetData {
  key: string;
  longitude: number;
  rasi: number;
  degrees: number;
  minutes: number;
  seconds: number;
  navamsa: number;
  isRetrograde?: boolean;
}

interface LagnaData {
  rasi: number;
  deg: number;
  min: number;
  sec: number;
  navamsa: number;
  longitude: number;
}

interface BhuktiData {
  lord: string;
  startDate: string;
  endDate: string;
}

interface MahaDashaData {
  lord: string;
  years: number;
  startDate: string;
  endDate: string;
  bhuktis: BhuktiData[];
}

interface VimshottariData {
  firstLord: string;
  elapsedFraction: number;
  dashas: MahaDashaData[];
}

// โครงสร้างหลักต้องตรงกับ ChartResult ใน page.tsx ทุกประการ
interface PrintLayoutProps {
  data: {
    lagna: LagnaData;
    planets: PlanetData[];
    // อนุญาตให้รับ Type เป็นแบบ Object ที่มี property 'dashas' ตามรูปแบบของ ComponentProps
    dasha?: VimshottariData;
  };
  formData: {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    locationName?: string;
    day: number;
    month: number;
    year: number;
    hour: number;
    minute: number;
    second: number;
    latitude: number | string;
    longitude: number | string;
  };
  lang: Language;
}

export default function PrintLayout({
  data,
  formData,
  lang,
}: PrintLayoutProps) {
  if (!data) return null;
  const t = translations[lang];

  // Rerk Calculation
  const moon = data.planets.find((p) => p.key === 'MOON');
  const moonNakIdx = moon ? Math.floor(moon.longitude / (360 / 27)) + 1 : 1;
  const moonGroup = ((moonNakIdx - 1) % 9) + 1;

  // Dasha chunking (2 per page)
  const dashas = data.dasha?.dashas || [];
  const dashaChunks: MahaDashaData[][] = [];
  for (let i = 0; i < dashas.length; i += 2) {
    dashaChunks.push(dashas.slice(i, i + 2));
  }

  const birthDateISO = dayjs(
    new Date(
      formData.year,
      formData.month - 1,
      formData.day,
      formData.hour,
      formData.minute,
      formData.second
    )
  ).format('YYYY-MM-DDTHH:mm:ss');

  return (
    <div className="hidden print:block bg-white text-black font-sans w-full max-w-full m-0 p-0 absolute top-0 left-0 z-50">
      {/* PAGE 1: Summary + Planet Table + Rerk */}
      <div className="print:break-after-page min-h-screen px-8 py-6">
        <h1 className="text-3xl font-bold text-center mb-6 border-b-2 border-black pb-2">
          {t.appTitle}
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm border border-black p-4">
          <div>
            <strong>{t.form.summaryName}:</strong>{' '}
            {[formData.firstName, formData.lastName].filter(Boolean).join(' ')}{' '}
            {formData.nickname ? `(${formData.nickname})` : ''}
          </div>
          <div>
            <strong>{t.form.summaryDate}:</strong> {formData.day}{' '}
            {t.months[formData.month - 1]}{' '}
            {lang === 'th' ? formData.year + 543 : formData.year}
          </div>
          <div>
            <strong>{t.form.summaryTime}:</strong>{' '}
            {String(formData.hour).padStart(2, '0')}:
            {String(formData.minute).padStart(2, '0')}:
            {String(formData.second).padStart(2, '0')}
          </div>
          <div>
            <strong>{t.form.summaryLocation}:</strong>{' '}
            {formData.locationName ||
              `${Number(formData.latitude).toFixed(4)}°, ${Number(formData.longitude).toFixed(4)}°`}
          </div>
        </div>

        {/* Planet Table Print View */}
        <h2 className="text-xl font-bold mb-2">{t.tabs.planets}</h2>
        <table className="w-full text-xs border-collapse border border-black mb-8 text-center">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black py-2">
                {t.planetTable.planet}
              </th>
              <th className="border border-black py-2">{t.planetTable.rasi}</th>
              <th className="border border-black py-2">
                {t.planetTable.longitudeCombined}
              </th>
              <th className="border border-black py-2">
                {t.planetTable.navamsa}
              </th>
              <th className="border border-black py-2 w-1/3">
                {t.planetTable.note}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black py-1.5 font-bold">
                {t.planetTable.ascendant}
              </td>
              <td className="border border-black py-1.5">
                {t.signs[data.lagna.rasi]}
              </td>
              <td className="border border-black py-1.5">
                {data.lagna.deg.toString().padStart(2, '0')}°{' '}
                {data.lagna.min.toString().padStart(2, '0')}&apos;{' '}
                {data.lagna.sec.toString().padStart(2, '0')}&quot;
              </td>
              <td className="border border-black py-1.5">
                {t.signs[data.lagna.navamsa]}
              </td>
              <td className="border border-black py-1.5"></td>
            </tr>
            {data.planets
              .filter((p) => PLANET_ORDER.includes(p.key))
              .sort(
                (a, b) =>
                  PLANET_ORDER.indexOf(a.key) - PLANET_ORDER.indexOf(b.key),
              )
              .map((p) => (
                <tr key={p.key}>
                  <td className="border border-black py-1.5">
                    {t.planets[p.key as keyof typeof t.planets]}{' '}
                    {p.isRetrograde && p.key !== 'RAHU' && p.key !== 'KETU'
                      ? `(${t.planetTable.retroSymbol})`
                      : ''}
                  </td>
                  <td className="border border-black py-1.5">
                    {t.signs[p.rasi]}
                  </td>
                  <td className="border border-black py-1.5">
                    {p.degrees.toString().padStart(2, '0')}°{' '}
                    {p.minutes.toString().padStart(2, '0')}&apos;{' '}
                    {p.seconds.toString().padStart(2, '0')}&quot;
                  </td>
                  <td className="border border-black py-1.5">
                    {t.signs[p.navamsa]}
                  </td>
                  <td className="border border-black py-1.5 border-b-dotted"></td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Rerk Table Print View */}
        <h2 className="text-xl font-bold mb-2">{t.tabs.rerk}</h2>
        <table className="w-full text-xs border-collapse border border-black text-center">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black py-2">#</th>
              <th className="border border-black py-2">
                {lang === 'th' ? 'กลุ่มนักษัตร' : 'Nakshatras'}
              </th>
              <th className="border border-black py-2">
                {lang === 'th' ? 'หมวดฤกษ์' : 'Rerk Group'}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }, (_, i) => {
              const g = i + 1;
              const isMatch = g === moonGroup;
              const offset = (g - moonGroup + 9) % 9;
              const rerk = RERKS_ORDER[offset];
              return (
                <tr key={g} className={isMatch ? 'bg-gray-100 font-bold' : ''}>
                  <td className="border border-black py-2">{g}</td>
                  <td className="border border-black py-2">
                    {t.nakshatras[i]}, {t.nakshatras[i + 9]},{' '}
                    {t.nakshatras[i + 18]}
                  </td>
                  <td className="border border-black py-2">
                    {lang === 'th' ? rerk.th : rerk.en} {isMatch ? ' (★)' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGE 2: Chart Full Screen */}
      <div className="print:break-after-page min-h-screen flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-center">{t.tabs.chart}</h2>
        <RasiChart
          data={{ lagna: data.lagna, planets: data.planets }} // Map the necessary properties instead of casting as any
          lang={lang}
          birthDateText={`${formData.day} ${t.months[formData.month - 1]} ${lang === 'th' ? formData.year + 543 : formData.year}`}
          birthTimeText={`${String(formData.hour).padStart(2, '0')}:${String(formData.minute).padStart(2, '0')}:${String(formData.second).padStart(2, '0')}`}
          printMode={true}
        />
      </div>

      {/* PAGE 3+: Dasha Tables (2 per page) */}
      {dashaChunks.map((chunk, pageIdx) => (
        <div
          key={pageIdx}
          className="print:break-before-page min-h-screen px-8 py-6"
        >
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            {t.tabs.dasha} - Page {pageIdx + 1}
          </h2>
          <div className="space-y-6">
            {chunk.map((dasha, dIdx) => {
              const lordStr =
                lang === 'th'
                  ? t.planets[dasha.lord as keyof typeof t.planets]
                  : dasha.lord;
              return (
                <div key={dIdx} className="mb-4 break-inside-avoid">
                  <h3 className="text-sm font-bold bg-gray-200 border border-black px-2 py-1 uppercase">
                    {lordStr} Maha Dasha
                  </h3>
                  <table className="w-full text-xs border-collapse border border-black text-center mt-2">
                    <thead>
                      <tr>
                        <th className="border border-black py-1 w-1/12">
                          {t.dashaTable.age}
                        </th>
                        <th className="border border-black py-1 w-2/12">
                          {t.dashaTable.dashaBhukti}
                        </th>
                        <th className="border border-black py-1 w-2/12">
                          {t.dashaTable.startDate}
                        </th>
                        <th className="border border-black py-1 w-3/12">
                          {t.planetTable.note}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dasha.bhuktis.map((b, bIdx) => {
                        const bLord =
                          lang === 'th'
                            ? t.planets[b.lord as keyof typeof t.planets]
                            : b.lord;

                        const birthDt = dayjs(birthDateISO);
                        let displayAge = `0${t.dashaTable.y}0${t.dashaTable.m}0${t.dashaTable.d}`;
                        const isPartiallyElapsed = dayjs(b.startDate).isBefore(birthDt) && dayjs(b.endDate).isAfter(birthDt);
                        if (!isPartiallyElapsed) {
                            displayAge = formatDuration(birthDateISO, b.startDate, t.dashaTable);
                        }

                        const displayStartDate = isPartiallyElapsed ? birthDateISO : b.startDate;

                        return (
                          <tr key={bIdx}>
                            <td className="border border-black py-1.5 whitespace-nowrap px-1">
                              {displayAge}
                            </td>
                            <td className="border border-black py-1.5">
                              {lordStr} - {bLord}
                            </td>
                            <td className="border border-black py-1.5 wrap-break-word px-1">
                              {formatLocalDate(displayStartDate, lang)}
                            </td>
                            <td className="border border-black py-1.5 border-b-dotted"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
