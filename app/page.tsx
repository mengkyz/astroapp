'use client';

import { useState } from 'react';
import { BirthInput } from './types/astrology';

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

  const [result, setResult] = useState<Record<string, unknown> | null>(null);
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
        <h1 className="text-3xl font-bold">Astrology Calculation Engine</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow-md grid grid-cols-2 gap-4"
        >
          <div>
            <label htmlFor="day" className="block text-sm font-medium">Day</label>
            <input
              id="day"
              type="number"
              name="day"
              value={formData.day}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="month" className="block text-sm font-medium">Month</label>
            <input
              id="month"
              type="number"
              name="month"
              value={formData.month}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium">Year (CE)</label>
            <input
              id="year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="hour" className="block text-sm font-medium">Hour (0-23)</label>
            <input
              id="hour"
              type="number"
              name="hour"
              value={formData.hour}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="minute" className="block text-sm font-medium">Minute</label>
            <input
              id="minute"
              type="number"
              name="minute"
              value={formData.minute}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium">Latitude</label>
            <input
              id="latitude"
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium">Longitude</label>
            <input
              id="longitude"
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="col-span-2 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700"
          >
            {loading ? 'Calculating...' : 'Calculate Chart'}
          </button>
        </form>

        {result && (
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-md overflow-x-auto">
            <h2 className="text-xl text-white mb-4">JSON Output</h2>
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
