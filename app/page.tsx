'use client';

import { useState, ComponentProps } from 'react';
import { BirthInput } from './types/astrology';
import PlanetTable from './components/PlanetTable';
import DashaTable from './components/DashaTable';
import { translations, Language } from '@/lib/i18n/translations';

// Dynamically extract the exact types your table components expect
type PlanetTableData = ComponentProps<typeof PlanetTable>['data'];
type DashaTableData = ComponentProps<typeof DashaTable>['dashaData'];

type ChartResult = PlanetTableData & {
  julianDay?: number;
  ayanamsa?: number;
  birthDateLocalStr: string;
  dasha?: DashaTableData;
};

export default function Home() {
  const [lang, setLang] = useState<Language>('en'); // Default to English
  const t = translations[lang]; // Load current dictionary

  const [formData, setFormData] = useState<BirthInput>({
    name: 'Test Chart',
    day: 19,
    month: 11,
    year: 1996,
    hour: 9,
    minute: 40,
    latitude: 15.705,
    longitude: 100.138,
    utcOffset: 7,
  });

  const [result, setResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'planets' | 'dasha'>('planets');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: Number(e.target.value) });
  };

  // Special handler for Year to convert Buddhist Era back to CE for the backend
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (lang === 'th' && val > 0) val -= 543;
    setFormData({ ...formData, year: val });
  };

  // Display value for the input field (adds 543 if in Thai mode)
  const displayYear =
    lang === 'th' && formData.year > 0 ? formData.year + 543 : formData.year;

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header & Language Toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-900">{t.appTitle}</h1>
          <button
            onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-full transition-colors"
          >
            {t.form.langToggle}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-lg grid grid-cols-2 md:grid-cols-3 gap-4 border border-gray-100"
        >
          <div>
            <label
              htmlFor="day"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.day}
            </label>
            <input
              id="day"
              type="number"
              name="day"
              value={formData.day}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="month"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.month}
            </label>
            <input
              id="month"
              type="number"
              name="month"
              value={formData.month}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="year"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.year}
            </label>
            <input
              id="year"
              type="number"
              name="year"
              value={displayYear}
              onChange={handleYearChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="hour"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.hour}
            </label>
            <input
              id="hour"
              type="number"
              name="hour"
              value={formData.hour}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="minute"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.minute}
            </label>
            <input
              id="minute"
              type="number"
              name="minute"
              value={formData.minute}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="hidden md:block"></div>
          <div>
            <label
              htmlFor="latitude"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.lat}
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="longitude"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.form.lng}
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2 md:col-span-3 mt-4">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? t.form.loading : t.form.submit}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-8">
            <div className="flex space-x-6 border-b border-gray-300 mb-6 px-2">
              <button
                onClick={() => setActiveTab('planets')}
                className={`pb-3 px-2 text-lg font-bold transition-all duration-200 ${activeTab === 'planets' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
              >
                {t.tabs.planets}
              </button>
              <button
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
