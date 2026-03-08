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

// ลำดับของฤกษ์ทั้ง 9 (ตัดคำว่า 'ฤกษ์' และ 'Rerk' ออกเพื่อความกระชับ)
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

export default function RerkResult({ data, lang }: RerkResultProps) {
  const t = translations[lang];

  const result = useMemo(() => {
    const moon = data.planets.find((p) => p.key === 'MOON');
    if (!moon || moon.longitude === undefined) return null;

    const lon = moon.longitude;
    const nakshatraIndex = Math.floor(lon / (360 / 27)) + 1; // ลำดับนักษัตร 1 ถึง 27
    const pada = (Math.floor(lon / (360 / 108)) % 4) + 1; // ลำดับบาทฤกษ์ 1 ถึง 4

    // หาว่าจันทร์ตกอยู่กลุ่มที่เท่าไหร่ (1 ถึง 9)
    const moonGroup = ((nakshatraIndex - 1) % 9) + 1;
    const nakName = t.nakshatras[nakshatraIndex - 1];

    const deg = Math.floor(lon % 30);
    const min = Math.floor((lon % 1) * 60);

    // สร้างข้อมูลตาราง 9 แถว โดย Shift ฤกษ์อัตโนมัติจากตำแหน่งจันทร์
    const tableData = Array.from({ length: 9 }, (_, i) => {
      const groupNum = i + 1;

      // การคำนวณระยะห่างจากจันทร์: ถ้าเป็นกลุ่มเดียวกับจันทร์ จะได้ offset = 0 (ทลิทโท)
      const offset = (groupNum - moonGroup + 9) % 9;
      const rerk = RERKS_ORDER[offset];

      // ดึงรายชื่อนักษัตรทั้ง 3 ในกลุ่มนั้นๆ
      const naks = [t.nakshatras[i], t.nakshatras[i + 9], t.nakshatras[i + 18]];

      return {
        groupNum,
        rerkTh: rerk.th,
        rerkEn: rerk.en,
        naks,
      };
    });

    return {
      nakshatraIndex,
      nakName,
      pada,
      deg,
      min,
      moonGroup,
      tableData,
    };
  }, [data, t]);

  if (!result) return null;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* HEADER SECTION */}
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
        {/* USER'S PLANET INFO BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center shadow-sm">
            <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
              {lang === 'th' ? 'ดาวที่ใช้คำนวณ' : 'Key Planet'}
            </span>
            <span className="block text-lg font-bold text-gray-800">
              {lang === 'th' ? 'จันทร์ (Moon)' : 'Moon'}
            </span>
            <span className="block text-sm text-indigo-600 font-semibold mt-1">
              {result.deg}° {result.min.toString().padStart(2, '0')}&apos;
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center shadow-sm">
            <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
              {lang === 'th' ? 'กลุ่มนักษัตร' : 'Nakshatra'}
            </span>
            <span className="block text-lg font-bold text-gray-800">
              {result.nakName}
            </span>
            <span className="block text-sm text-indigo-600 font-semibold mt-1">
              {lang === 'th'
                ? `นักษัตรที่ ${result.nakshatraIndex}`
                : `Index: ${result.nakshatraIndex}`}
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center shadow-sm">
            <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
              {lang === 'th' ? 'บาทฤกษ์' : 'Pada'}
            </span>
            <span className="block text-lg font-bold text-gray-800">
              {lang === 'th' ? `บาทที่ ${result.pada}` : `Pada ${result.pada}`}
            </span>
            <span className="block text-sm text-indigo-600 font-semibold mt-1">
              ({result.pada}/4)
            </span>
          </div>
        </div>

        {/* FULL 9-GROUP DYNAMIC RERK TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-4 text-center border-b border-gray-200 w-16">
                  #
                </th>
                <th className="px-4 py-4 border-b border-gray-200">
                  {lang === 'th' ? 'กลุ่มนักษัตร' : 'Nakshatras'}
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
                    className={`border-b last:border-0 transition-colors ${
                      isUserRerk ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-center align-middle">
                      {isUserRerk ? (
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white mx-auto font-bold shadow-sm">
                          {row.groupNum}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-400">
                          {row.groupNum}
                        </span>
                      )}
                    </td>

                    {/* สลับคอลัมน์กลุ่มนักษัตรมาไว้ตรงนี้ */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex gap-2 flex-wrap">
                        {row.naks.map((nak) => {
                          const isExactNak =
                            isUserRerk && nak === result.nakName;
                          return (
                            <span
                              key={nak}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                                isExactNak
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                                  : isUserRerk
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {nak}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* สลับคอลัมน์หมวดฤกษ์ไปไว้ด้านขวา */}
                    <td
                      className={`px-4 py-4 align-middle font-bold whitespace-nowrap ${isUserRerk ? 'text-emerald-700 text-base' : 'text-gray-800'}`}
                    >
                      {lang === 'th' ? row.rerkTh : row.rerkEn}
                      {isUserRerk && (
                        <span className="block text-xs font-semibold text-emerald-500 mt-1">
                          ★ {lang === 'th' ? 'ฤกษ์ของคุณ' : 'Your Rerk'}
                        </span>
                      )}
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
