import React from 'react';
import dayjs from 'dayjs';
import { translations, Language } from '@/lib/i18n/translations';

// Helper to format localized Date (adds 543 for Thai BE)
function formatLocalDate(isoStr: string, lang: Language) {
  const d = dayjs(isoStr);
  if (lang === 'th') {
    const thMonths = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    return `${d.date()} ${thMonths[d.month()]} ${d.year() + 543}`;
  }
  return d.format('MMM DD, YYYY');
}

// Precise calendar-walk logic returning string based on language
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

// --- TypeScript Interfaces ---
interface BhuktiData {
  lord: keyof typeof translations.en.planets;
  startDate: string;
  endDate: string;
}
interface MahaDashaData {
  lord: keyof typeof translations.en.planets;
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
interface DashaTableProps {
  dashaData: VimshottariData;
  birthDateLocalStr: string;
  lang: Language;
}

export default function DashaTable({
  dashaData,
  birthDateLocalStr,
  lang,
}: DashaTableProps) {
  const birthDate = dayjs(birthDateLocalStr);
  const t = translations[lang];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">
      {dashaData.dashas.map((dasha: MahaDashaData, dIndex: number) => {
        const isFirstDasha = dIndex === 0;
        const headerStart = isFirstDasha ? birthDate : dayjs(dasha.startDate);

        if (dayjs(dasha.endDate).isBefore(birthDate)) return null;

        return (
          <div
            key={dasha.lord}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
          >
            <div className="bg-indigo-50 border-b border-indigo-100 p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-indigo-900">
                  {t.planets[dasha.lord]}
                </span>
                <span className="text-sm font-semibold text-indigo-700">
                  {formatLocalDate(headerStart.toISOString(), lang)} -{' '}
                  {formatLocalDate(dasha.endDate, lang)}
                </span>
              </div>
              <div className="text-xs text-indigo-600 mt-1 font-medium">
                {isFirstDasha
                  ? `${formatDuration(birthDate.format('YYYY-MM-DDTHH:mm:ss'), dasha.endDate, t.dashaTable)} ${t.dashaTable.ofFirst} ${dasha.years}${t.dashaTable.yearPeriod}`
                  : `(${dasha.years}${t.dashaTable.yearPeriod})`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {t.dashaTable.age}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t.dashaTable.dashaBhukti}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t.dashaTable.startDate}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t.dashaTable.duration}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dasha.bhuktis.map((bhukti: BhuktiData) => {
                    if (dayjs(bhukti.endDate).isBefore(birthDate)) return null;
                    const isPartiallyElapsed =
                      dayjs(bhukti.startDate).isBefore(birthDate) &&
                      dayjs(bhukti.endDate).isAfter(birthDate);

                    let displayAge = `0${t.dashaTable.y} 0${t.dashaTable.m}`;
                    if (!isPartiallyElapsed) {
                      const ageYears = dayjs(bhukti.startDate).diff(
                        birthDate,
                        'year',
                      );
                      const ageMonths = dayjs(bhukti.startDate).diff(
                        birthDate.add(ageYears, 'year'),
                        'month',
                      );
                      displayAge =
                        `${Math.max(0, ageYears)}${t.dashaTable.y}${Math.max(0, ageMonths)}${t.dashaTable.m}`.trim();
                    }

                    const displayStartDate = isPartiallyElapsed
                      ? birthDate.toISOString()
                      : bhukti.startDate;
                    const durationStr = isPartiallyElapsed ? (
                      <span className="text-red-600 font-medium">
                        {t.dashaTable.remaining}{' '}
                        {formatDuration(
                          birthDate.format('YYYY-MM-DDTHH:mm:ss'),
                          bhukti.endDate,
                          t.dashaTable,
                        )}
                      </span>
                    ) : (
                      `(${formatDuration(bhukti.startDate, bhukti.endDate, t.dashaTable)})`
                    );

                    return (
                      <tr
                        key={bhukti.lord}
                        className="border-b hover:bg-gray-50 whitespace-nowrap"
                      >
                        <td className="px-4 py-3 text-gray-500 font-medium">
                          {displayAge}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {t.planets[dasha.lord]} / {t.planets[bhukti.lord]}
                        </td>
                        <td className="px-4 py-3">
                          {formatLocalDate(displayStartDate, lang)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {durationStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
