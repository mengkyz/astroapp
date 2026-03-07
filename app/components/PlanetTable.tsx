import React from 'react';
import { translations, Language } from '@/lib/i18n/translations';

interface PlanetData {
  key: keyof typeof translations.en.planets;
  longitude: number;
  rasi: number;
  degrees: number;
  minutes: number;
  seconds: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
  house: number;
  isRetrograde?: boolean;
}

interface LagnaData {
  longitude: number;
  rasi: number;
  deg: number;
  min: number;
  sec: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
}

interface PlanetTableProps {
  data: { lagna: LagnaData; planets: PlanetData[] };
  lang: Language;
}

export default function PlanetTable({ data, lang }: PlanetTableProps) {
  if (!data || !data.planets) return null;

  const t = translations[lang];
  const tTable = t.planetTable;
  const pad = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-300 whitespace-nowrap">
          <tr>
            <th className="px-4 py-3 font-semibold">{tTable.planet}</th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.rasi}
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.degree}
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.min}
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.sec}
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.retro}
            </th>
            <th className="px-4 py-3 font-semibold text-center text-indigo-700">
              {tTable.drekkana}
            </th>
            <th className="px-4 py-3 font-semibold text-center text-purple-700">
              {tTable.navamsa}
            </th>
            <th className="px-4 py-3 font-semibold">{tTable.nakshatra}</th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.pada}
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              {tTable.house}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Lagna */}
          <tr className="bg-blue-50 border-b hover:bg-blue-100 font-medium whitespace-nowrap">
            <td className="px-4 py-3 text-blue-900">{tTable.ascendant}</td>
            <td className="px-4 py-3 text-center">
              {pad(data.lagna.rasi)}: {t.signs[data.lagna.rasi]}
            </td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.deg)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.min)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.sec)}</td>
            <td className="px-4 py-3 text-center">-</td>
            <td className="px-4 py-3 text-center text-indigo-600">
              {t.signs[data.lagna.drekkana]}
            </td>
            <td className="px-4 py-3 text-center text-purple-600">
              {t.signs[data.lagna.navamsa]}
            </td>
            <td className="px-4 py-3">
              {t.nakshatras[data.lagna.nakshatraIndex]}
            </td>
            <td className="px-4 py-3 text-center">{data.lagna.pada}</td>
            <td className="px-4 py-3 text-center">1</td>
          </tr>

          {/* Rows 2+: Planets */}
          {data.planets.map((planet) => (
            <tr
              key={planet.key}
              className="bg-white border-b hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <td className="px-4 py-3 font-medium">
                {t.planets[planet.key] || planet.key}
              </td>
              <td className="px-4 py-3 text-center">
                {pad(planet.rasi)}: {t.signs[planet.rasi]}
              </td>
              <td className="px-4 py-3 text-center">{pad(planet.degrees)}</td>
              <td className="px-4 py-3 text-center">{pad(planet.minutes)}</td>
              <td className="px-4 py-3 text-center">{pad(planet.seconds)}</td>
              <td className="px-4 py-3 text-center font-bold text-red-600">
                {planet.isRetrograde ? tTable.retroSymbol : ''}
              </td>
              <td className="px-4 py-3 text-center text-indigo-600">
                {t.signs[planet.drekkana]}
              </td>
              <td className="px-4 py-3 text-center text-purple-600">
                {t.signs[planet.navamsa]}
              </td>
              <td className="px-4 py-3">
                {t.nakshatras[planet.nakshatraIndex]}
              </td>
              <td className="px-4 py-3 text-center">{planet.pada}</td>
              <td className="px-4 py-3 text-center">{planet.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
