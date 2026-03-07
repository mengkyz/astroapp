import React from 'react';

// Map our internal keys to the official Thai display names and symbols
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

// Define the shape of the data we expect
interface PlanetData {
  key: string;
  longitude: number;
  rasi: number;
  rasiName: string;
  degrees: number;
  minutes: number;
  seconds: number;
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
}

interface PlanetTableProps {
  data: {
    lagna: LagnaData;
    planets: PlanetData[];
  };
}

export default function PlanetTable({ data }: PlanetTableProps) {
  if (!data || !data.planets) return null;

  // Format numbers to always have 2 digits (e.g., 5 becomes "05")
  const pad = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-300">
          <tr>
            <th className="px-4 py-3 font-semibold">ดาว/ปัจจัย</th>
            <th className="px-4 py-3 font-semibold text-center">ราศี</th>
            <th className="px-4 py-3 font-semibold text-center">องศา (°)</th>
            <th className="px-4 py-3 font-semibold text-center">ลิปดา (&apos;)</th>
            <th className="px-4 py-3 font-semibold text-center">ฟิลิปดา (&quot;)</th>
            <th className="px-4 py-3 font-semibold text-center">พักร (พ.)</th>
            <th className="px-4 py-3 font-semibold">นักษัตร</th>
            <th className="px-4 py-3 font-semibold text-center">บาท</th>
            <th className="px-4 py-3 font-semibold text-center">เรือน</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Lagna (Ascendant) */}
          <tr className="bg-blue-50 border-b hover:bg-blue-100 font-medium">
            <td className="px-4 py-3 text-blue-900">ล. ลัคนา</td>
            <td className="px-4 py-3 text-center">
              {pad(data.lagna.rasi)}: {data.lagna.rasiName}
            </td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.deg)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.min)}</td>
            <td className="px-4 py-3 text-center">{pad(data.lagna.sec)}</td>
            <td className="px-4 py-3 text-center">-</td>
            {/* Lagna Nakshatra mapping was not calculated in the backend MVP, leaving blank for now or you can add it later */}
            <td className="px-4 py-3 text-gray-500">-</td>
            <td className="px-4 py-3 text-center text-gray-500">-</td>
            <td className="px-4 py-3 text-center">1</td>
          </tr>

          {/* Rows 2+: All Planets */}
          {data.planets.map((planet) => (
            <tr
              key={planet.key}
              className="bg-white border-b hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 font-medium whitespace-nowrap">
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
