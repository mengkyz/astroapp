import React from 'react';

const PLANET_DISPLAY: Record<string, string> = {
  SUN: '๑. อาทิตย์',
  MOON: '๒. จันทร์',
  MARS: '๓. อังคาร',
  MERCURY: '๔. พุธ',
  JUPITER: '๕. พฤหัสบดี',
  VENUS: '๖. ศุกร์',
  SATURN: '๗. เสาร์',
  RAHU: '๘. ราหู',
  KETU: '๙. เกตุ',
  URANUS: '๐. มฤตยู',
  NEPTUNE: 'น. เนปจูน',
  PLUTO: 'พ. พลูโต',
};

interface PlanetData {
  key: string;
  longitude: number;
  rasi: number;
  rasiName: string;
  degrees: number;
  minutes: number;
  seconds: number;
  drekkana: number;
  drekkanaName: string;
  navamsa: number;
  navamsaName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  house: number;
  isRetrograde?: boolean;
}

interface LagnaData {
  longitude: number;
  rasi: number;
  rasiName: string;
  deg: number;
  min: number;
  sec: number;
  drekkana: number;
  drekkanaName: string;
  navamsa: number;
  navamsaName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
}

interface PlanetTableProps {
  data: {
    lagna: LagnaData;
    planets: PlanetData[];
  };
}

export default function PlanetTable({ data }: PlanetTableProps) {
  if (!data || !data.planets) return null;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-300 whitespace-nowrap">
          <tr>
            <th className="px-4 py-3 font-semibold">ดาว/ปัจจัย</th>
            <th className="px-4 py-3 font-semibold text-center">ราศี</th>
            <th className="px-4 py-3 font-semibold text-center">องศา (°)</th>
            <th className="px-4 py-3 font-semibold text-center">
              ลิปดา (&apos;)
            </th>
            <th className="px-4 py-3 font-semibold text-center">
              ฟิลิปดา (&quot;)
            </th>
            <th className="px-4 py-3 font-semibold text-center">พักร (พ.)</th>
            <th className="px-4 py-3 font-semibold text-center text-indigo-700">
              ตรียางค์
            </th>
            <th className="px-4 py-3 font-semibold text-center text-purple-700">
              นวางค์
            </th>
            <th className="px-4 py-3 font-semibold">นักษัตร</th>
            <th className="px-4 py-3 font-semibold text-center">บาท</th>
            <th className="px-4 py-3 font-semibold text-center">เรือน</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Lagna */}
          <tr className="bg-blue-50 border-b hover:bg-blue-100 font-medium whitespace-nowrap">
            <td className="px-4 py-3 text-blue-900">ล. ลัคนา</td>
            <td className="px-4 py-3 text-center">
              {pad(data.lagna.rasi)}: {data.lagna.rasiName}
            </td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.deg)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.min)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.sec)}</td>
            <td className="px-4 py-3 text-center">-</td>
            <td className="px-4 py-3 text-center text-indigo-600">
              {data.lagna.drekkanaName}
            </td>
            <td className="px-4 py-3 text-center text-purple-600">
              {data.lagna.navamsaName}
            </td>
            <td className="px-4 py-3">{data.lagna.nakshatraName}</td>
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
                {PLANET_DISPLAY[planet.key] || planet.key}
              </td>
              <td className="px-4 py-3 text-center">
                {pad(planet.rasi)}: {planet.rasiName}
              </td>
              <td className="px-4 py-3 text-center">{pad(planet.degrees)}</td>
              <td className="px-4 py-3 text-center">{pad(planet.minutes)}</td>
              <td className="px-4 py-3 text-center">{pad(planet.seconds)}</td>
              <td className="px-4 py-3 text-center font-bold text-red-600">
                {planet.isRetrograde ? 'พ.' : ''}
              </td>
              <td className="px-4 py-3 text-center text-indigo-600">
                {planet.drekkanaName}
              </td>
              <td className="px-4 py-3 text-center text-purple-600">
                {planet.navamsaName}
              </td>
              <td className="px-4 py-3">{planet.nakshatraName}</td>
              <td className="px-4 py-3 text-center">{planet.pada}</td>
              <td className="px-4 py-3 text-center">{planet.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
