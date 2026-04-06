'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { translations, Language } from '@/lib/i18n/translations';

// Helper to format localized Date (adds 543 for Thai BE)
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

  const [today, setToday] = useState<dayjs.Dayjs | null>(null);
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    setToday(dayjs());
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const todayDisplay = today
    ? lang === 'th'
      ? (() => {
          const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
          return `${today.date()} ${thMonths[today.month()]} ${today.year() + 543}`;
        })()
      : today.format('ddd, MMM D, YYYY')
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">

      {/* TODAY BAR */}
      {today && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <span className="font-semibold text-amber-800">
            {lang === 'th' ? 'วันนี้' : 'Today'}
          </span>
          <span className="text-amber-700">
            {todayDisplay} · {today.format('HH:mm')}
          </span>
          {timezone && (
            <span className="text-amber-500 text-xs ml-auto">{timezone}</span>
          )}
        </div>
      )}

      {dashaData.dashas.map((dasha: MahaDashaData, dIndex: number) => {
        const isFirstDasha = dIndex === 0;
        const headerStart = isFirstDasha ? birthDate : dayjs(dasha.startDate);

        if (dayjs(dasha.endDate).isBefore(birthDate)) return null;

        const isCurrentDasha = today
          ? today.isAfter(dayjs(dasha.startDate)) && today.isBefore(dayjs(dasha.endDate))
          : false;

        return (
          <div
            key={dasha.lord}
            className={`border rounded-lg overflow-hidden shadow-sm ${
              isCurrentDasha ? 'border-amber-300' : 'border-gray-200'
            }`}
          >
            <div
              className={`border-b p-4 ${
                isCurrentDasha
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-indigo-50 border-indigo-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-bold ${
                      isCurrentDasha ? 'text-amber-900' : 'text-indigo-900'
                    }`}
                  >
                    {t.planets[dasha.lord]}
                  </span>
                  {isCurrentDasha && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-white text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {lang === 'th' ? 'ปัจจุบัน' : 'Now'}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isCurrentDasha ? 'text-amber-700' : 'text-indigo-700'
                  }`}
                >
                  {formatLocalDate(headerStart.toISOString(), lang)} -{' '}
                  {formatLocalDate(dasha.endDate, lang)}
                </span>
              </div>
              <div
                className={`text-xs mt-1 font-medium ${
                  isCurrentDasha ? 'text-amber-600' : 'text-indigo-600'
                }`}
              >
                {isFirstDasha
                  ? `${formatDuration(birthDate.format('YYYY-MM-DDTHH:mm:ss'), dasha.endDate, t.dashaTable)} ${t.dashaTable.ofFirst} ${dasha.years}${t.dashaTable.yearPeriod}`
                  : `(${dasha.years}${t.dashaTable.yearPeriod})`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t.dashaTable.age}</th>
                    <th className="px-4 py-3 font-semibold">{t.dashaTable.dashaBhukti}</th>
                    <th className="px-4 py-3 font-semibold">{t.dashaTable.period}</th>
                    <th className="px-4 py-3 font-semibold">{t.dashaTable.duration}</th>
                  </tr>
                </thead>
                <tbody>
                  {dasha.bhuktis.map((bhukti: BhuktiData) => {
                    if (dayjs(bhukti.endDate).isBefore(birthDate)) return null;
                    const isPartiallyElapsed =
                      dayjs(bhukti.startDate).isBefore(birthDate) &&
                      dayjs(bhukti.endDate).isAfter(birthDate);

                    const isCurrentBhukti = today
                      ? today.isAfter(dayjs(bhukti.startDate)) && today.isBefore(dayjs(bhukti.endDate))
                      : false;

                    // Perfectly consistent Year/Month/Day logic for Age
                    let displayAge = `0${t.dashaTable.y}0${t.dashaTable.m}0${t.dashaTable.d}`;
                    if (!isPartiallyElapsed) {
                      displayAge = formatDuration(
                        birthDate.format('YYYY-MM-DDTHH:mm:ss'),
                        bhukti.startDate,
                        t.dashaTable,
                      );
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
                        className={`border-b whitespace-nowrap ${
                          isCurrentBhukti
                            ? 'bg-amber-50 border-l-4 border-l-amber-400'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-4 py-3 font-medium ${isCurrentBhukti ? 'text-amber-700' : 'text-gray-500'}`}>
                          {displayAge}
                        </td>
                        <td className={`px-4 py-3 font-medium ${isCurrentBhukti ? 'text-amber-900 font-semibold' : 'text-gray-800'}`}>
                          <span className="flex items-center gap-2">
                            {t.planets[dasha.lord]} / {t.planets[bhukti.lord]}
                            {isCurrentBhukti && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                                <span className="w-1 h-1 rounded-full bg-white" />
                                {lang === 'th' ? 'ปัจจุบัน' : 'Now'}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isCurrentBhukti ? 'text-amber-800' : 'text-gray-700'}`}>
                          {formatLocalDate(displayStartDate, lang)}
                          <span className="text-gray-400 mx-1">–</span>
                          {formatLocalDate(bhukti.endDate, lang)}
                        </td>
                        <td className={`px-4 py-3 ${isCurrentBhukti ? 'text-amber-700' : 'text-gray-600'}`}>
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
