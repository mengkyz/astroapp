import React from 'react';
import dayjs from 'dayjs';

const PLANET_EN_TO_TH: Record<string, string> = {
  SUN: 'อาทิตย์',
  MOON: 'จันทร์',
  MARS: 'อังคาร',
  MERCURY: 'พุธ',
  JUPITER: 'พฤหัสบดี',
  VENUS: 'ศุกร์',
  SATURN: 'เสาร์',
  RAHU: 'ราหู',
  KETU: 'เกตุ',
};

// Precise calendar-walk logic to compute exact Yy Mm Dd format
function formatDuration(startISO: string, endISO: string) {
  const start = dayjs(startISO);
  const end = dayjs(endISO);
  const years = end.diff(start, 'year');
  let temp = start.add(years, 'year');
  const months = end.diff(temp, 'month');
  temp = temp.add(months, 'month');
  const days = end.diff(temp, 'day');
  return `${years}y ${months}m ${days}d`;
}

// --- TypeScript Interfaces ---
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

interface DashaTableProps {
  dashaData: VimshottariData;
  birthDateLocalStr: string;
}

export default function DashaTable({
  dashaData,
  birthDateLocalStr,
}: DashaTableProps) {
  const birthDate = dayjs(birthDateLocalStr);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">
      {dashaData.dashas.map((dasha: MahaDashaData, dIndex: number) => {
        const isFirstDasha = dIndex === 0;
        const headerStart = isFirstDasha ? birthDate : dayjs(dasha.startDate);

        // Hide fully elapsed past dashas (edge case if someone generates for a very old age)
        if (dayjs(dasha.endDate).isBefore(birthDate)) return null;

        return (
          <div
            key={dasha.lord}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
          >
            <div className="bg-indigo-50 border-b border-indigo-100 p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-indigo-900">
                  {PLANET_EN_TO_TH[dasha.lord]}
                </span>
                <span className="text-sm font-semibold text-indigo-700">
                  {headerStart.format('MMM DD, YYYY')} -{' '}
                  {dayjs(dasha.endDate).format('MMM DD, YYYY')}
                </span>
              </div>
              <div className="text-xs text-indigo-600 mt-1 font-medium">
                {isFirstDasha
                  ? `${formatDuration(birthDate.format('YYYY-MM-DDTHH:mm:ss'), dasha.endDate)} remaining of the first ${dasha.years}-year period`
                  : `(${dasha.years}-year period)`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Age</th>
                    <th className="px-4 py-3 font-semibold">Dasha / Bhukti</th>
                    <th className="px-4 py-3 font-semibold">Start Date</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {dasha.bhuktis.map((bhukti: BhuktiData) => {
                    const isBeforeBirth = dayjs(bhukti.endDate).isBefore(
                      birthDate,
                    );
                    if (isBeforeBirth) return null; // fully elapsed

                    const isPartiallyElapsed =
                      dayjs(bhukti.startDate).isBefore(birthDate) &&
                      dayjs(bhukti.endDate).isAfter(birthDate);

                    // --- NEW AGE LOGIC: Reusing our highly precise formatDuration function! ---
                    const displayAge = isPartiallyElapsed
                      ? '0y 0m 0d'
                      : formatDuration(
                          birthDate.format('YYYY-MM-DDTHH:mm:ss'),
                          bhukti.startDate,
                        );

                    const displayStartDate = isPartiallyElapsed
                      ? birthDate
                      : dayjs(bhukti.startDate);

                    const durationStr = isPartiallyElapsed ? (
                      <span className="text-red-600 font-medium">
                        Remaining:{' '}
                        {formatDuration(
                          birthDate.format('YYYY-MM-DDTHH:mm:ss'),
                          bhukti.endDate,
                        )}
                      </span>
                    ) : (
                      `(${formatDuration(bhukti.startDate, bhukti.endDate)})`
                    );

                    return (
                      <tr
                        key={bhukti.lord}
                        className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                          {displayAge}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {PLANET_EN_TO_TH[dasha.lord]} /{' '}
                          {PLANET_EN_TO_TH[bhukti.lord]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {displayStartDate.format('MMM DD, YYYY')}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
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
