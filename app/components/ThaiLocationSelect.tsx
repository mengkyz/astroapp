import React, { useState, useEffect, useMemo } from 'react';
import { translations, Language } from '@/lib/i18n/translations';

interface GeoRecord {
  p_th: string;
  d_th: string;
  s_th: string;
  p_en: string;
  d_en: string;
  s_en: string;
  lat: number;
  lng: number;
}

interface Props {
  lang: Language;
  currentLat: number | string;
  currentLng: number | string;
  onSelect: (lat: number, lng: number, placeName: string) => void;
  onClear: () => void;
  onSelectionChange?: (p: string, d: string, s: string) => void;
  initialSelection?: { p: string; d: string; s: string } | null;
}

export default function ThaiLocationSelect({
  lang,
  currentLat,
  currentLng,
  onSelect,
  onClear,
  onSelectionChange,
  initialSelection,
}: Props) {
  const t = translations[lang].form;
  const [data, setData] = useState<GeoRecord[]>([]);

  const [p, setP] = useState<string>('');
  const [d, setD] = useState<string>('');
  const [s, setS] = useState<string>('');

  const [prevLat, setPrevLat] = useState(currentLat);
  const [prevLng, setPrevLng] = useState(currentLng);

  // Format location name: Province, District, Sub-district (bigger first, filter empties)
  const getLocName = (r: GeoRecord | undefined) => {
    if (!r) return '';
    return lang === 'th'
      ? [r.p_th, r.d_th, r.s_th].filter(Boolean).join(', ')
      : [r.p_en, r.d_en, r.s_en].filter(Boolean).join(', ');
  };

  useEffect(() => {
    fetch('/data/ThailandGeography.csv')
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n').slice(1);
        const parsed = lines
          .map((line) => {
            const pts = line.replace('\r', '').split(',');
            if (pts.length < 9) return null;
            return {
              p_th: pts[1].trim(),
              d_th: pts[2].trim(),
              s_th: pts[3].trim(),
              p_en: pts[4].trim(),
              d_en: pts[5].trim(),
              s_en: pts[6].trim(),
              lat: parseFloat(pts[7]),
              lng: parseFloat(pts[8]),
            };
          })
          .filter(Boolean) as GeoRecord[];

        setData(parsed);

        // Use initialSelection if provided, otherwise default to Bangkok
        if (initialSelection && initialSelection.p) {
          const { p: initP, d: initD, s: initS } = initialSelection;
          const rec = parsed.find(
            (x) => x.p_th === initP && x.d_th === initD && x.s_th === initS,
          );
          if (rec) {
            setP(initP);
            setD(initD);
            setS(initS);
            onSelect(rec.lat, rec.lng, getLocName(rec));
            onSelectionChange?.(initP, initD, initS);
          }
        } else if (initialSelection !== null) {
          // null means "no selection, skip default"; undefined means "use default Bangkok"
          const def = parsed.find(
            (x) =>
              x.p_th === 'กทม' &&
              x.d_th === 'พระนคร' &&
              x.s_th === 'พระบรมมหาราชวัง',
          );
          if (def) {
            setP(def.p_th);
            setD(def.d_th);
            setS(def.s_th);
            onSelect(def.lat, def.lng, getLocName(def));
            onSelectionChange?.(def.p_th, def.d_th, def.s_th);
          }
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (currentLat !== prevLat || currentLng !== prevLng) {
    setPrevLat(currentLat);
    setPrevLng(currentLng);
    if (p || d || s) {
      const rec = data.find(
        (x) => x.p_th === p && x.d_th === d && x.s_th === s,
      );
      const latNum = Number(currentLat) || 0;
      const lngNum = Number(currentLng) || 0;
      const isMatch =
        rec &&
        Math.abs(rec.lat - latNum) < 0.0001 &&
        Math.abs(rec.lng - lngNum) < 0.0001;
      if (!isMatch) {
        setP('');
        setD('');
        setS('');
      }
    }
  }

  const provOpts = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((x) => {
      if (!map.has(x.p_th)) map.set(x.p_th, x.p_en);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const distOpts = useMemo(() => {
    if (!p) return [];
    const map = new Map<string, string>();
    data.forEach((x) => {
      if (x.p_th === p && !map.has(x.d_th)) map.set(x.d_th, x.d_en);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data, p]);

  const subOpts = useMemo(() => {
    if (!p || !d) return [];
    const map = new Map<string, string>();
    data.forEach((x) => {
      if (x.p_th === p && x.d_th === d && !map.has(x.s_th))
        map.set(x.s_th, x.s_en);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data, p, d]);

  const handleProv = (newP: string) => {
    if (!newP) {
      setP(''); setD(''); setS('');
      onSelectionChange?.('', '', '');
      onClear();
      return;
    }
    const newDists = data.filter((x) => x.p_th === newP);
    const firstD = newDists[0].d_th;
    const firstS = newDists.find((x) => x.d_th === firstD)?.s_th || '';
    const rec = newDists.find((x) => x.d_th === firstD && x.s_th === firstS);
    setP(newP); setD(firstD); setS(firstS);
    onSelectionChange?.(newP, firstD, firstS);
    if (rec) onSelect(rec.lat, rec.lng, getLocName(rec));
  };

  const handleDist = (newD: string) => {
    if (!newD) {
      setD(''); setS('');
      onSelectionChange?.(p, '', '');
      onClear();
      return;
    }
    const newSubs = data.filter((x) => x.p_th === p && x.d_th === newD);
    const firstS = newSubs[0].s_th;
    const rec = newSubs[0];
    setD(newD); setS(firstS);
    onSelectionChange?.(p, newD, firstS);
    if (rec) onSelect(rec.lat, rec.lng, getLocName(rec));
  };

  const handleSub = (newS: string) => {
    if (!newS) {
      setS('');
      onSelectionChange?.(p, d, '');
      onClear();
      return;
    }
    const rec = data.find(
      (x) => x.p_th === p && x.d_th === d && x.s_th === newS,
    );
    setS(newS);
    onSelectionChange?.(p, d, newS);
    if (rec) onSelect(rec.lat, rec.lng, getLocName(rec));
  };

  if (data.length === 0) return null;

  return (
    <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-6 space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-indigo-900">{t.shortcut}</span>
        <button
          type="button"
          onClick={() => {
            setP(''); setD(''); setS('');
            onSelectionChange?.('', '', '');
            onClear();
          }}
          className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
        >
          {t.clear}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          aria-label={t.province}
          value={p}
          onChange={(e) => handleProv(e.target.value)}
          className="w-full border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none text-sm font-medium"
        >
          <option value="">-- {t.province} --</option>
          {provOpts.map(([th, en]) => (
            <option key={th} value={th}>
              {lang === 'th' ? th : en}
            </option>
          ))}
        </select>
        <select
          aria-label={t.district}
          value={d}
          onChange={(e) => handleDist(e.target.value)}
          disabled={!p}
          className="w-full border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none text-sm font-medium disabled:opacity-50"
        >
          <option value="">-- {t.district} --</option>
          {distOpts.map(([th, en]) => (
            <option key={th} value={th}>
              {lang === 'th' ? th : en}
            </option>
          ))}
        </select>
        <select
          aria-label={t.subDistrict}
          value={s}
          onChange={(e) => handleSub(e.target.value)}
          disabled={!d}
          className="w-full border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none text-sm font-medium disabled:opacity-50"
        >
          <option value="">-- {t.subDistrict} --</option>
          {subOpts.map(([th, en]) => (
            <option key={th} value={th}>
              {lang === 'th' ? th : en}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
