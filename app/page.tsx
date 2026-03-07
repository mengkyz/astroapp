'use client';

import { useState } from 'react';
import { BirthInput } from './types/astrology';
import PlanetTable from './components/PlanetTable'; // IMPORT THE NEW TABLE HERE

export default function Home() {
  const [formData, setFormData] = useState<BirthInput>({
    name: 'Test Chart',
    day: 19,
    month: 11,
    year: 1996,
    hour: 9,
    minute: 40,
    latitude: 15.705, // Nakhon Sawan
    longitude: 100.138,
    utcOffset: 7,
  });

  const [result, setResult] = useState<React.ComponentProps<typeof PlanetTable>['data'] | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-indigo-900">
          Astrology Calculation Engine
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-lg grid grid-cols-2 md:grid-cols-3 gap-4 border border-gray-100"
        >
          <div>
            <label
              htmlFor="day"
              className="block text-sm font-semibold text-gray-700"
            >
              Day
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
              Month
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
              Year (CE)
            </label>
            <input
              id="year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="mt-1 border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="hour"
              className="block text-sm font-semibold text-gray-700"
            >
              Hour (0-23)
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
              Minute
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
          <div className="hidden md:block"></div> {/* Spacer */}
          <div>
            <label
              htmlFor="latitude"
              className="block text-sm font-semibold text-gray-700"
            >
              Latitude
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
              Longitude
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
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Chart'}
            </button>
          </div>
        </form>

        {/* REPLACE THE JSON BOX WITH OUR NEW TABLE */}
        {result && (
          <div className="mt-8 animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">
              ตำแหน่งดาว (Planet Positions)
            </h2>
            <PlanetTable data={result} />
          </div>
        )}
      </div>
    </main>
  );
}
