'use client';

import React, { useState } from 'react';
import { GrahaBala, BhavaBala, MIN_SHADBALA } from '@/lib/charts/shadbala';
import { Language, translations } from '@/lib/i18n/translations';

interface BalasTableProps {
  grahaBala: GrahaBala[];
  bhavaBala: BhavaBala[];
  lang: Language;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function RupaBar({ rupas, minRupas }: { rupas: number; minRupas: number }) {
  const pct = Math.min(100, (rupas / (minRupas * 2)) * 100);
  const sufficient = rupas >= minRupas;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${sufficient ? 'bg-green-500' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${sufficient ? 'text-green-600' : 'text-red-500'}`}>
        {fmt(rupas)}
      </span>
    </div>
  );
}

// ─── Graha Bala Table ─────────────────────────────────────────────────────────

function GrashaBalaTable({ grahaBala, lang }: { grahaBala: GrahaBala[]; lang: Language }) {
  const t = translations[lang];
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (planet: string) => setExpanded((p) => (p === planet ? null : planet));

  const planetOrder = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
  const sorted = [...grahaBala].sort((a, b) => planetOrder.indexOf(a.planet) - planetOrder.indexOf(b.planet));

  const headers = [
    t.balaTable.planet,
    t.balaTable.sthanaBala,
    t.balaTable.digBala,
    t.balaTable.kalaBala,
    t.balaTable.chestaBala,
    t.balaTable.naisargikaBala,
    t.balaTable.drikBala,
    t.balaTable.totalShashtiam,
    t.balaTable.rupas,
    t.balaTable.required,
    t.balaTable.status,
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
        <span className="w-2 h-5 bg-indigo-500 rounded-full inline-block" />
        {t.balaTable.grahaBalaTitle}
      </h3>

      {/* Summary bar chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {sorted.map((g) => {
          const min = MIN_SHADBALA[g.planet] ?? 5;
          return (
            <div key={g.planet} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-gray-700 text-sm">
                  {(t.planets as Record<string, string>)[g.planet] ?? g.planet}
                </span>
                <span className="text-xs text-gray-400">min {min}R</span>
              </div>
              <RupaBar rupas={g.rupas} minRupas={min} />
            </div>
          );
        })}
      </div>

      {/* Detailed table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-indigo-50 text-indigo-800">
              <th className="px-3 py-2 text-left font-semibold border-b border-indigo-100 sticky left-0 bg-indigo-50 z-10">{headers[0]}</th>
              {headers.slice(1).map((h, i) => (
                <th key={i} className="px-3 py-2 text-center font-semibold border-b border-indigo-100 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, idx) => {
              const min = MIN_SHADBALA[g.planet] ?? 5;
              const sufficient = g.rupas >= min;
              const isExp = expanded === g.planet;
              return (
                <React.Fragment key={g.planet}>
                  <tr
                    className={`cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50`}
                    onClick={() => toggle(g.planet)}
                  >
                    <td className={`px-3 py-2 font-semibold sticky left-0 z-10 border-r border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50`}>
                      <div className="flex items-center gap-1">
                        <span className="text-indigo-600">{isExp ? '▾' : '▸'}</span>
                        {(t.planets as Record<string, string>)[g.planet] ?? g.planet}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">{fmt(g.sthana.total)}</td>
                    <td className="px-3 py-2 text-center">{fmt(g.dig)}</td>
                    <td className="px-3 py-2 text-center">{fmt(g.kala.total)}</td>
                    <td className="px-3 py-2 text-center">{fmt(g.chesta)}</td>
                    <td className="px-3 py-2 text-center">{fmt(g.naisargika)}</td>
                    <td className="px-3 py-2 text-center">{fmt(g.drik)}</td>
                    <td className="px-3 py-2 text-center font-bold text-indigo-700">{fmt(g.total)}</td>
                    <td className="px-3 py-2 text-center font-bold">{fmt(g.rupas)}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{min}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${sufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {sufficient ? t.balaTable.strong : t.balaTable.weak}
                      </span>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${g.planet}-details`} className="bg-indigo-50/60">
                      <td colSpan={headers.length} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          {/* Sthana Bala breakdown */}
                          <div className="bg-white rounded-lg p-3 border border-indigo-100">
                            <div className="font-bold text-indigo-700 mb-2">{t.balaTable.sthanaBala} ({fmt(g.sthana.total)})</div>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>{t.balaTable.ucchaBala}</span><span className="font-medium">{fmt(g.sthana.uchcha)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.saptavargaja}</span><span className="font-medium">{fmt(g.sthana.saptavargaja)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.ojayugma}</span><span className="font-medium">{fmt(g.sthana.ojayugma)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.kendradi}</span><span className="font-medium">{fmt(g.sthana.kendradi)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.drekkanaBala}</span><span className="font-medium">{fmt(g.sthana.drekkana)}</span></div>
                            </div>
                          </div>
                          {/* Kala Bala breakdown */}
                          <div className="bg-white rounded-lg p-3 border border-indigo-100">
                            <div className="font-bold text-indigo-700 mb-2">{t.balaTable.kalaBala} ({fmt(g.kala.total)})</div>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>{t.balaTable.nathonnatha}</span><span className="font-medium">{fmt(g.kala.nathonnatha)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.paksha}</span><span className="font-medium">{fmt(g.kala.paksha)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.tribhaga}</span><span className="font-medium">{fmt(g.kala.tribhaga)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.vara}</span><span className="font-medium">{fmt(g.kala.vara)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.hora}</span><span className="font-medium">{fmt(g.kala.hora)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.abda}</span><span className="font-medium">{fmt(g.kala.abda)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.masa}</span><span className="font-medium">{fmt(g.kala.masa)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.ayana}</span><span className="font-medium">{fmt(g.kala.ayana)}</span></div>
                            </div>
                          </div>
                          {/* Other components */}
                          <div className="bg-white rounded-lg p-3 border border-indigo-100">
                            <div className="font-bold text-indigo-700 mb-2">{t.balaTable.otherComponents}</div>
                            <div className="space-y-1 text-gray-600">
                              <div className="flex justify-between"><span>{t.balaTable.digBala}</span><span className="font-medium">{fmt(g.dig)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.chestaBala}</span><span className="font-medium">{fmt(g.chesta)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.naisargikaBala}</span><span className="font-medium">{fmt(g.naisargika)}</span></div>
                              <div className="flex justify-between"><span>{t.balaTable.drikBala}</span><span className="font-medium">{fmt(g.drik)}</span></div>
                              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                                <span className="font-bold text-indigo-700">{t.balaTable.totalShashtiam}</span>
                                <span className="font-bold text-indigo-700">{fmt(g.total)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-bold">{t.balaTable.rupas}</span>
                                <span className={`font-bold ${g.rupas >= (MIN_SHADBALA[g.planet] ?? 5) ? 'text-green-600' : 'text-red-500'}`}>
                                  {fmt(g.rupas)} / {MIN_SHADBALA[g.planet] ?? 5}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2 italic">{t.balaTable.grahahNote}</p>
    </div>
  );
}

// ─── Bhava Bala Table ─────────────────────────────────────────────────────────

function BhavaBalaTable({ bhavaBala, lang }: { bhavaBala: BhavaBala[]; lang: Language }) {
  const t = translations[lang];
  const houseNames = t.houses as string[];

  const maxTotal = Math.max(...bhavaBala.map((b) => b.total), 1);

  return (
    <div>
      <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
        <span className="w-2 h-5 bg-purple-500 rounded-full inline-block" />
        {t.balaTable.bhavaBalaTitle}
      </h3>

      {/* Visual bar chart */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {bhavaBala.map((b) => {
          const pct = (b.total / maxTotal) * 100;
          return (
            <div key={b.house} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-gray-700 text-sm">
                  H{b.house} {houseNames[b.house] ?? ''}
                </span>
                <span className="text-xs font-bold text-purple-700">{fmt(b.total, 0)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-purple-50 text-purple-800">
              <th className="px-3 py-2 text-left font-semibold border-b border-purple-100">{t.balaTable.house}</th>
              <th className="px-3 py-2 text-left font-semibold border-b border-purple-100">{t.balaTable.houseName}</th>
              <th className="px-3 py-2 text-left font-semibold border-b border-purple-100">{t.balaTable.houseLord}</th>
              <th className="px-3 py-2 text-center font-semibold border-b border-purple-100">{t.balaTable.bhavadhipati}</th>
              <th className="px-3 py-2 text-center font-semibold border-b border-purple-100">{t.balaTable.bhavaDigbala}</th>
              <th className="px-3 py-2 text-center font-semibold border-b border-purple-100">{t.balaTable.bhavaDrishti}</th>
              <th className="px-3 py-2 text-center font-semibold border-b border-purple-100">{t.balaTable.totalShashtiam}</th>
            </tr>
          </thead>
          <tbody>
            {bhavaBala.map((b, idx) => {
              const signIdx = ((b.house - 1) % 12) + 1; // simplified: same as house since equal houses
              // The sign lord is already computed server-side; reconstruct the key for display
              const signLords: Record<number, string> = {
                1: 'MARS', 2: 'VENUS', 3: 'MERCURY', 4: 'MOON',
                5: 'SUN', 6: 'MERCURY', 7: 'VENUS', 8: 'MARS',
                9: 'JUPITER', 10: 'SATURN', 11: 'SATURN', 12: 'JUPITER',
              };
              // Lagna rasi unknown here, but for display we show the planet key
              return (
                <tr key={b.house} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-bold text-purple-700">H{b.house}</td>
                  <td className="px-3 py-2 text-gray-600">{houseNames[b.house] ?? ''}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">—</td>
                  <td className="px-3 py-2 text-center">{fmt(b.bhavadhipati)}</td>
                  <td className="px-3 py-2 text-center">{fmt(b.digbala)}</td>
                  <td className={`px-3 py-2 text-center ${b.drishtibala >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(b.drishtibala)}</td>
                  <td className="px-3 py-2 text-center font-bold text-purple-700">{fmt(b.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2 italic">{t.balaTable.bhavaNote}</p>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function BalasTable({ grahaBala, bhavaBala, lang }: BalasTableProps) {
  const t = translations[lang];
  const [activeSection, setActiveSection] = useState<'graha' | 'bhava'>('graha');

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6 space-y-6">
      {/* Section tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-0">
        <button
          type="button"
          onClick={() => setActiveSection('graha')}
          className={`pb-3 px-3 font-bold text-base transition-all duration-200 ${activeSection === 'graha' ? 'border-b-4 border-indigo-500 text-indigo-800' : 'text-gray-400 hover:text-indigo-500'}`}
        >
          {t.balaTable.grahaBalaTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('bhava')}
          className={`pb-3 px-3 font-bold text-base transition-all duration-200 ${activeSection === 'bhava' ? 'border-b-4 border-purple-500 text-purple-800' : 'text-gray-400 hover:text-purple-500'}`}
        >
          {t.balaTable.bhavaBalaTab}
        </button>
      </div>

      {activeSection === 'graha' && (
        <GrashaBalaTable grahaBala={grahaBala} lang={lang} />
      )}
      {activeSection === 'bhava' && (
        <BhavaBalaTable bhavaBala={bhavaBala} lang={lang} />
      )}
    </div>
  );
}
