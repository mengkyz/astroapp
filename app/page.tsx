'use client';

import { useState, useEffect, ComponentProps } from 'react';
import PlanetTable from './components/PlanetTable';
import DashaTable from './components/DashaTable';
import { translations, Language } from '@/lib/i18n/translations';

// Extract types
type PlanetTableData = ComponentProps<typeof PlanetTable>['data'];
type DashaTableData = ComponentProps<typeof DashaTable>['dashaData'];

type ChartResult = PlanetTableData & {
  julianDay?: number;
  ayanamsa?: number;
  birthDateLocalStr: string;
  dasha?: DashaTableData;
};

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [formData, setFormData] = useState({
    name: 'User Chart',
    day: 1,
    month: 1,
    year: 2000,
    hour: 12,
    minute: 0,
    second: 0,
    latitude: 13.7525,
    longitude: 100.4941,
    utcOffset: 7,
  });

  const [yearInput, setYearInput] = useState<string>('');
  const [result, setResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'planets' | 'dasha'>('planets');

  // 1. On Mount: Set to exactly "Right Now"
  // We only run this once, and we know default lang is 'en' on mount!
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    setFormData((prev) => ({
      ...prev,
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: currentYear,
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    }));
    // Safely set initial year string directly
    setYearInput(String(currentYear));
  }, []); // Truly empty dependency array - perfectly ESLint compliant

  // 2. Event-Driven Sync: Handle the language change directly on button click
  // This completely eliminates the need for the second useEffect!
  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'th' : 'en';
    setLang(nextLang);
    // Instantly calculate and set the new UI display year
    setYearInput(
      nextLang === 'th' ? String(formData.year + 543) : String(formData.year),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/natal-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: Number(e.target.value) });
  };

  // 3. The perfect year typing fix
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYearInput(val); // UI updates instantly without math interference

    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      // We quietly save the true CE year in the background
      setFormData((prev) => ({
        ...prev,
        year: lang === 'th' ? num - 543 : num,
      }));
    }
  };

  // Helper arrays for dropdowns
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutesSeconds = Array.from({ length: 60 }, (_, i) => i);

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-900">
            {t.appTitle}
          </h1>
          <button
            type="button"
            onClick={toggleLanguage} // <--- Call our new dedicated handler here
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-full transition-colors text-sm"
          >
            {t.form.langToggle}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* DATE CARD */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                {t.form.dateDetails}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="day"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.day}
                  </label>
                  <select
                    id="day"
                    name="day"
                    value={formData.day}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="month"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.month}
                  </label>
                  <select
                    id="month"
                    name="month"
                    value={formData.month}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  >
                    {t.months.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="year"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.year}
                  </label>
                  <input
                    id="year"
                    type="number"
                    name="year"
                    value={yearInput}
                    onChange={handleYearChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* TIME CARD */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                {t.form.timeDetails}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="hour"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.hour}
                  </label>
                  <select
                    id="hour"
                    name="hour"
                    value={formData.hour}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="minute"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.minute}
                  </label>
                  <select
                    id="minute"
                    name="minute"
                    value={formData.minute}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  >
                    {minutesSeconds.map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="second"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.second}
                  </label>
                  <select
                    id="second"
                    name="second"
                    value={formData.second}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  >
                    {minutesSeconds.map((s) => (
                      <option key={s} value={s}>
                        {s.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* LOCATION CARD */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                {t.form.locationDetails}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="latitude"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.lat}
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="longitude"
                    className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                  >
                    {t.form.lng}
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleSelectChange}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-70 text-lg"
            >
              {loading ? t.form.loading : t.form.submit}
            </button>
          </div>
        </form>

        {/* Output Tables below (unchanged logic) */}
        {result && (
          <div className="mt-8">
            <div className="flex space-x-6 border-b border-gray-300 mb-6 px-2">
              <button
                type="button"
                onClick={() => setActiveTab('planets')}
                className={`pb-3 px-2 text-lg font-bold transition-all duration-200 ${activeTab === 'planets' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
              >
                {t.tabs.planets}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dasha')}
                className={`pb-3 px-2 text-lg font-bold transition-all duration-200 ${activeTab === 'dasha' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
              >
                {t.tabs.dasha}
              </button>
            </div>

            {activeTab === 'planets' && (
              <div className="animate-fade-in-up">
                <PlanetTable data={result} lang={lang} />
              </div>
            )}

            {activeTab === 'dasha' && result.dasha && (
              <div className="animate-fade-in-up">
                <DashaTable
                  dashaData={result.dasha}
                  birthDateLocalStr={result.birthDateLocalStr}
                  lang={lang}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
