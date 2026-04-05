'use client';

import { useState, useEffect, ComponentProps } from 'react';
import dayjs from 'dayjs';
import PlanetTable from './components/PlanetTable';
import DashaTable from './components/DashaTable';
import ThaiLocationSelect from './components/ThaiLocationSelect';
import RasiChart from './components/RasiChart';
import RerkResult from './components/RerkResult';
import PrintLayout from './components/PrintLayout';
import BalasTable from './components/BalasTable';
import { translations, Language } from '@/lib/i18n/translations';
import { BalasResult } from '@/lib/charts/shadbala';

// Extract types
type PlanetTableData = ComponentProps<typeof PlanetTable>['data'];
type DashaTableData = ComponentProps<typeof DashaTable>['dashaData'];

type ChartResult = PlanetTableData & {
  julianDay?: number;
  ayanamsa?: number;
  birthDateLocalStr: string;
  dasha?: DashaTableData;
  balas?: BalasResult;
};

// --- Saved Persons ---

interface SavedPerson {
  id: string;
  firstNameEn: string; lastNameEn: string; nicknameEn: string;
  firstNameTh: string; lastNameTh: string; nicknameTh: string;
  day: number; month: number; year: number;
  hour: number; minute: number; second: number;
  locationNameEn: string; locationNameTh: string;
  latitude: number | string; longitude: number | string;
  quickSelect: { p: string; d: string; s: string } | null;
}

function personDisplayName(person: SavedPerson, lang: Language): string {
  const firstName = lang === 'th' ? (person.firstNameTh || person.firstNameEn) : (person.firstNameEn || person.firstNameTh);
  const lastName = lang === 'th' ? (person.lastNameTh || person.lastNameEn) : (person.lastNameEn || person.lastNameTh);
  const nickname = lang === 'th' ? (person.nicknameTh || person.nicknameEn) : (person.nicknameEn || person.nicknameTh);
  const full = [firstName, lastName].filter(Boolean).join(' ');
  return full || nickname || '—';
}

function personLocName(person: SavedPerson, lang: Language): string {
  return lang === 'th'
    ? (person.locationNameTh || person.locationNameEn)
    : (person.locationNameEn || person.locationNameTh);
}

// --- GPS Helpers ---
function decimalToDMS(decimal: number, isLat: boolean) {
  const dir = decimal >= 0 ? (isLat ? 'N' : 'E') : isLat ? 'S' : 'W';
  const abs = Math.abs(decimal || 0);
  let d = Math.floor(abs);
  const mDec = (abs - d) * 60;
  let m = Math.floor(mDec);
  let s = Math.round((mDec - m) * 60);

  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }

  return { d, m, s, dir };
}

function dmsToDecimal(d: number, m: number, s: number, dir: string) {
  let dec = d + m / 60 + s / 3600;
  if (dir === 'S' || dir === 'W') dec = -dec;
  return dec;
}

// --- CSV Export Helpers ---
const PLANET_ORDER_CSV = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU', 'URANUS'];
const PLANET_DOMICILES_CSV: Partial<Record<string, number[]>> = {
  SUN: [5], MOON: [4], MARS: [1, 8], MERCURY: [3, 6],
  JUPITER: [9, 12], VENUS: [2, 7], SATURN: [10], RAHU: [11],
};
const PLANET_CODE_CSV: Record<string, string> = {
  SUN: '1', MOON: '2', MARS: '3', MERCURY: '4', JUPITER: '5',
  VENUS: '6', SATURN: '7', RAHU: '8', KETU: '9', URANUS: '0',
};
const SIGN_ELEMENT_CSV = ['','fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
const SIGN_MODALITY_CSV = ['','cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable'];

function csvSignDist(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return diff > 6 ? 12 - diff : diff;
}
function csvSpecialTarget(planetSign: number, n: number): number {
  return ((planetSign + n - 2) % 12) + 1;
}
function csvAspects(targetRasi: number, selfKey: string, bodies: Array<{ code: string; rasi: number; key: string }>) {
  const kum: string[] = [], yok: string[] = [], chak: string[] = [],
        trikon: string[] = [], leng: string[] = [], special: string[] = [];
  bodies.forEach((b) => {
    if (b.key === selfKey) return;
    const d = csvSignDist(targetRasi, b.rasi);
    if (d === 0) kum.push(b.code);
    else if (d === 2) yok.push(b.code);
    else if (d === 3) chak.push(b.code);
    else if (d === 4) trikon.push(b.code);
    else if (d === 6) leng.push(b.code);
  });
  [{ key: 'MARS', code: '3', pos: [4, 8] }, { key: 'JUPITER', code: '5', pos: [5, 9] }, { key: 'SATURN', code: '7', pos: [3, 10] }]
    .forEach(({ key, code, pos }) => {
      const src = bodies.find((b) => b.key === key);
      if (!src) return;
      pos.forEach((n) => { if (csvSpecialTarget(src.rasi, n) === targetRasi) special.push(code); });
    });
  return [kum, yok, chak, trikon, leng, special].map((arr) => arr.join(' '));
}

function esc(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function csvFormatLocalDate(isoStr: string, lang: Language) {
  const d = dayjs(isoStr);
  if (lang === 'th') {
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.date()} ${thMonths[d.month()]} ${d.year() + 543}`;
  }
  return d.format('MMM DD, YYYY');
}

function csvFormatDuration(startISO: string, endISO: string, tD: typeof translations.en.dashaTable) {
  const start = dayjs(startISO);
  const end = dayjs(endISO);
  const years = end.diff(start, 'year');
  let temp = start.add(years, 'year');
  const months = end.diff(temp, 'month');
  temp = temp.add(months, 'month');
  const days = end.diff(temp, 'day');
  return `${years}${tD.y}${months}${tD.m}${days}${tD.d}`;
}

function generatePlanetCSV(data: ChartResult, lang: Language): string {
  const t = translations[lang];
  const tT = t.planetTable;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const headers = [
    tT.planet, tT.rasi, tT.degree, tT.min, tT.sec,
    tT.drekkana, tT.navamsa, tT.nakshatra, tT.pada, tT.house, tT.houseLord,
    tT.kum, tT.yok, tT.chak, tT.trikon, tT.leng, tT.specialCriteria, tT.element, tT.signType,
  ].map(esc).join(',');
  const rows: string[] = [headers];

  const lagna = data.lagna;
  const visiblePlanets = data.planets
    .filter((p) => PLANET_ORDER_CSV.includes(p.key))
    .sort((a, b) => PLANET_ORDER_CSV.indexOf(a.key) - PLANET_ORDER_CSV.indexOf(b.key));

  // Bodies list (planets only — Lagna excluded from aspect columns)
  const allBodiesCSV = visiblePlanets.map((p) => ({
    code: PLANET_CODE_CSV[p.key] ?? p.key,
    rasi: p.rasi,
    key: p.key as string,
  }));

  const getElement = (rasi: number) => (tT as Record<string, string>)[SIGN_ELEMENT_CSV[rasi]] ?? '';
  const getModality = (rasi: number) => (tT as Record<string, string>)[SIGN_MODALITY_CSV[rasi]] ?? '';

  // Lagna row
  const lagnaAsp = csvAspects(lagna.rasi, 'LAGNA', allBodiesCSV);
  rows.push([
    tT.ascendant, t.signs[lagna.rasi], pad(lagna.deg), pad(lagna.min), pad(lagna.sec),
    t.signs[lagna.drekkana], t.signs[lagna.navamsa], t.nakshatras[lagna.nakshatraIndex],
    String(lagna.pada), `${t.houses[1]} (1)`, '-',
    ...lagnaAsp, getElement(lagna.rasi), getModality(lagna.rasi),
  ].map(esc).join(','));

  // Planet rows
  for (const planet of visiblePlanets) {
    const isNode = planet.key === 'RAHU' || planet.key === 'KETU';
    const planetName = (t.planets[planet.key as keyof typeof t.planets] || planet.key) + (planet.isRetrograde && !isNode ? ` (${tT.retroSymbol})` : '');
    const domiciles = PLANET_DOMICILES_CSV[planet.key];
    const houseLord = domiciles
      ? domiciles.map((sign) => { let h = sign - lagna.rasi + 1; if (h <= 0) h += 12; return `${t.houses[h]} (${h})`; }).join(', ')
      : '-';
    const asp = csvAspects(planet.rasi, planet.key, allBodiesCSV);
    rows.push([
      planetName, t.signs[planet.rasi], pad(planet.degrees), pad(planet.minutes), pad(planet.seconds),
      t.signs[planet.drekkana], t.signs[planet.navamsa], t.nakshatras[planet.nakshatraIndex],
      String(planet.pada), `${t.houses[planet.house]} (${planet.house})`, houseLord,
      ...asp, getElement(planet.rasi), getModality(planet.rasi),
    ].map(esc).join(','));
  }
  return rows.join('\r\n');
}

function generateDashaCSV(dashaData: DashaTableData, birthDateLocalStr: string, lang: Language): string {
  const t = translations[lang];
  const tD = t.dashaTable;
  const birthDate = dayjs(birthDateLocalStr);
  const headers = [tD.dashaBhukti, tD.age, tD.period, tD.duration].map(esc).join(',');
  const rows: string[] = [headers];
  for (const dasha of dashaData.dashas) {
    if (dayjs(dasha.endDate).isBefore(birthDate)) continue;
    for (const bhukti of dasha.bhuktis) {
      if (dayjs(bhukti.endDate).isBefore(birthDate)) continue;
      const isPartial = dayjs(bhukti.startDate).isBefore(birthDate) && dayjs(bhukti.endDate).isAfter(birthDate);
      const dashaBhuktiName = `${t.planets[dasha.lord as keyof typeof t.planets]} / ${t.planets[bhukti.lord as keyof typeof t.planets]}`;
      const age = isPartial ? `0${tD.y}0${tD.m}0${tD.d}` : csvFormatDuration(birthDate.format('YYYY-MM-DDTHH:mm:ss'), bhukti.startDate, tD);
      const startIso = isPartial ? birthDate.toISOString() : bhukti.startDate;
      const period = `${csvFormatLocalDate(startIso, lang)} - ${csvFormatLocalDate(bhukti.endDate, lang)}`;
      const duration = isPartial
        ? `${tD.remaining} ${csvFormatDuration(birthDate.format('YYYY-MM-DDTHH:mm:ss'), bhukti.endDate, tD)}`
        : `(${csvFormatDuration(bhukti.startDate, bhukti.endDate, tD)})`;
      rows.push([dashaBhuktiName, age, period, duration].map(esc).join(','));
    }
  }
  return rows.join('\r\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    locationName: '',
    day: 1,
    month: 1,
    year: 2000,
    hour: 12,
    minute: 0,
    second: 0,
    latitude: 13.752555 as number | string,
    longitude: 100.494066 as number | string,
    utcOffset: 7,
  });

  const [submittedData, setSubmittedData] = useState<typeof formData | null>(
    null,
  );
  const [yearInput, setYearInput] = useState<string>('');
  const [result, setResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'planets' | 'dasha' | 'chart' | 'rerk' | 'balas'
  >('planets');

  // For Export
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Saved Persons
  const [savedPersons, setSavedPersons] = useState<SavedPerson[]>([]);
  const [savedPersonsOpen, setSavedPersonsOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<'saved' | 'updated' | null>(null);
  const [locationNameBilingual, setLocationNameBilingual] = useState({ en: '', th: '' });
  const [currentQS, setCurrentQS] = useState<{ p: string; d: string; s: string }>({ p: '', d: '', s: '' });
  const [locationSelectKey, setLocationSelectKey] = useState(0);
  const [locationSelectInit, setLocationSelectInit] = useState<{ p: string; d: string; s: string } | null | undefined>(undefined);

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
    setYearInput(String(currentYear));
  }, []);

  const handleExport = (type: 'pdf' | 'csvPlanets' | 'csvDasha') => {
    setExportMenuOpen(false);
    if (type === 'pdf') {
      setTimeout(() => { window.print(); }, 300);
    } else if (type === 'csvPlanets' && result) {
      downloadCSV(generatePlanetCSV(result, lang), `planet_positions_${lang}.csv`);
    } else if (type === 'csvDasha' && result?.dasha) {
      downloadCSV(generateDashaCSV(result.dasha, result.birthDateLocalStr, lang), `vimshottari_dasha_${lang}.csv`);
    }
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'th' : 'en';
    setLang(nextLang);
    setYearInput(
      nextLang === 'th' ? String(formData.year + 543) : String(formData.year),
    );
  };

  // Load saved persons from CSV via API on mount
  useEffect(() => {
    fetch('/api/saved-persons')
      .then((r) => r.json())
      .then((data) => setSavedPersons(data))
      .catch(() => {});
  }, []);

  // Persist saved persons to CSV via API
  const persistPersons = (persons: SavedPerson[]) => {
    fetch('/api/saved-persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persons),
    }).catch(() => {});
  };

  const showToast = (type: 'saved' | 'updated') => {
    setSaveToast(type);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleSavePerson = () => {
    if (editingPersonId) {
      setSavedPersons((prev) => {
        const next = prev.map((p) => {
          if (p.id !== editingPersonId) return p;
          return {
            ...p,
            firstNameEn: lang === 'en' ? formData.firstName : p.firstNameEn,
            lastNameEn: lang === 'en' ? formData.lastName : p.lastNameEn,
            nicknameEn: lang === 'en' ? formData.nickname : p.nicknameEn,
            firstNameTh: lang === 'th' ? formData.firstName : p.firstNameTh,
            lastNameTh: lang === 'th' ? formData.lastName : p.lastNameTh,
            nicknameTh: lang === 'th' ? formData.nickname : p.nicknameTh,
            day: Number(formData.day), month: Number(formData.month), year: Number(formData.year),
            hour: Number(formData.hour), minute: Number(formData.minute), second: Number(formData.second),
            locationNameEn: locationNameBilingual.en,
            locationNameTh: locationNameBilingual.th,
            latitude: formData.latitude,
            longitude: formData.longitude,
            quickSelect: currentQS.p ? { ...currentQS } : null,
          };
        });
        persistPersons(next);
        return next;
      });
      setEditingPersonId(null);
      showToast('updated');
    } else {
      const person: SavedPerson = {
        id: Date.now().toString(),
        firstNameEn: lang === 'en' ? formData.firstName : '',
        lastNameEn: lang === 'en' ? formData.lastName : '',
        nicknameEn: lang === 'en' ? formData.nickname : '',
        firstNameTh: lang === 'th' ? formData.firstName : '',
        lastNameTh: lang === 'th' ? formData.lastName : '',
        nicknameTh: lang === 'th' ? formData.nickname : '',
        day: Number(formData.day), month: Number(formData.month), year: Number(formData.year),
        hour: Number(formData.hour), minute: Number(formData.minute), second: Number(formData.second),
        locationNameEn: locationNameBilingual.en,
        locationNameTh: locationNameBilingual.th,
        latitude: formData.latitude,
        longitude: formData.longitude,
        quickSelect: currentQS.p ? { ...currentQS } : null,
      };
      setSavedPersons((prev) => {
        const next = [...prev, person];
        persistPersons(next);
        return next;
      });
      showToast('saved');
    }
  };

  const handleLoadPerson = (person: SavedPerson) => {
    const displayFirst = lang === 'th' ? (person.firstNameTh || person.firstNameEn) : (person.firstNameEn || person.firstNameTh);
    const displayLast = lang === 'th' ? (person.lastNameTh || person.lastNameEn) : (person.lastNameEn || person.lastNameTh);
    const displayNick = lang === 'th' ? (person.nicknameTh || person.nicknameEn) : (person.nicknameEn || person.nicknameTh);
    const displayLoc = personLocName(person, lang);
    setFormData((prev) => ({
      ...prev,
      firstName: displayFirst,
      lastName: displayLast,
      nickname: displayNick,
      day: person.day, month: person.month, year: person.year,
      hour: person.hour, minute: person.minute, second: person.second,
      locationName: displayLoc,
      latitude: person.latitude,
      longitude: person.longitude,
    }));
    setLocationNameBilingual({ en: person.locationNameEn, th: person.locationNameTh });
    setYearInput(lang === 'th' ? String(person.year + 543) : String(person.year));
    if (person.quickSelect) {
      setLocationSelectInit(person.quickSelect);
      setCurrentQS(person.quickSelect);
    } else {
      setLocationSelectInit(null);
      setCurrentQS({ p: '', d: '', s: '' });
    }
    setLocationSelectKey((k) => k + 1);
  };

  const handleEditPerson = (person: SavedPerson) => {
    handleLoadPerson(person);
    setEditingPersonId(person.id);
    setSavedPersonsOpen(false);
  };

  const handleDeletePerson = (id: string) => {
    setSavedPersons((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistPersons(next);
      return next;
    });
    if (editingPersonId === id) setEditingPersonId(null);
  };

  const handleClearForm = () => {
    const now = new Date();
    setFormData((prev) => ({
      ...prev,
      firstName: '', lastName: '', nickname: '',
      locationName: '', latitude: '', longitude: '',
      day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear(),
      hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds(),
    }));
    setYearInput(lang === 'th' ? String(now.getFullYear() + 543) : String(now.getFullYear()));
    setLocationNameBilingual({ en: '', th: '' });
    setEditingPersonId(null);
    setCurrentQS({ p: '', d: '', s: '' });
    setLocationSelectInit(null);
    setLocationSelectKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        latitude: Number(formData.latitude) || 0,
        longitude: Number(formData.longitude) || 0,
      };

      const res = await fetch('/api/natal-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      setSubmittedData(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const numValue = e.target.value === '' ? '' : Number(e.target.value);
    setFormData({ ...formData, [e.target.name]: numValue });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'locationName') {
      setLocationNameBilingual({ en: value, th: value });
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYearInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num))
      setFormData((prev) => ({
        ...prev,
        year: lang === 'th' ? num - 543 : num,
      }));
  };

  const handleDMSChange = (
    field: 'd' | 'm' | 's' | 'dir',
    val: string,
    isLat: boolean,
  ) => {
    const currentDecimal =
      Number(isLat ? formData.latitude : formData.longitude) || 0;
    const dms = decimalToDMS(currentDecimal, isLat);
    const updatedDMS = { ...dms, [field]: field === 'dir' ? val : Number(val) };
    const newDecimal = dmsToDecimal(
      updatedDMS.d,
      updatedDMS.m,
      updatedDMS.s,
      updatedDMS.dir,
    );
    const cleanedDecimal = Math.round(newDecimal * 1000000) / 1000000;

    setFormData((prev) => ({
      ...prev,
      [isLat ? 'latitude' : 'longitude']: cleanedDecimal,
    }));
  };

  const latDMS = decimalToDMS(Number(formData.latitude) || 0, true);
  const lngDMS = decimalToDMS(Number(formData.longitude) || 0, false);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutesSeconds = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-black print:hidden">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-900">
              {t.appTitle}
            </h1>
            <button
              type="button"
              onClick={toggleLanguage}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-full transition-colors text-sm"
            >
              {t.form.langToggle}
            </button>
          </div>

          {/* Saved Persons Modal */}
          {savedPersonsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setSavedPersonsOpen(false)}
              />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">{t.form.savedPersons}</h2>
                  <button
                    type="button"
                    onClick={() => setSavedPersonsOpen(false)}
                    className="text-gray-400 hover:text-gray-700 text-lg font-bold transition"
                  >✕</button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                  {savedPersons.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">{t.form.noSavedPersons}</p>
                  ) : (
                    savedPersons.map((person) => (
                      <div key={person.id} className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm truncate">{personDisplayName(person, lang)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {person.day}/{person.month}/{person.year}
                            {personLocName(person, lang) && <span className="ml-2">· {personLocName(person, lang)}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Load"
                          onClick={() => { handleLoadPerson(person); setSavedPersonsOpen(false); }}
                          className="text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-300 rounded-lg px-2 py-1 transition"
                        >↩</button>
                        <button
                          type="button"
                          title={t.form.editPerson}
                          onClick={() => handleEditPerson(person)}
                          className="text-xs font-bold text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-300 rounded-lg px-2 py-1 transition"
                        >✏</button>
                        <button
                          type="button"
                          title={t.form.deletePerson}
                          onClick={() => handleDeletePerson(person.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition px-1"
                        >✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* PERSONAL DETAILS CARD */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-800">{t.form.personalDetails}</h3>
                  <button
                    type="button"
                    onClick={() => setSavedPersonsOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-1.5 transition"
                  >
                    <span>👤</span>
                    <span>{t.form.openSavedPersons}{savedPersons.length > 0 ? ` (${savedPersons.length})` : ''}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                    >
                      {t.form.firstName}
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleTextChange}
                      className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                    >
                      {t.form.lastName}
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleTextChange}
                      className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="nickname"
                      className="block text-xs font-semibold text-gray-500 uppercase mb-1"
                    >
                      {t.form.nickname}
                    </label>
                    <input
                      id="nickname"
                      type="text"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleTextChange}
                      className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 outline-none"
                    />
                  </div>
                </div>
              </div>

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
              <div className="space-y-6 md:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                  {t.form.locationDetails}
                </h3>

                <ThaiLocationSelect
                  key={locationSelectKey}
                  lang={lang}
                  currentLat={formData.latitude}
                  currentLng={formData.longitude}
                  initialSelection={locationSelectInit}
                  onSelect={(lat, lng, nameEn, nameTh) => {
                    const displayName = lang === 'th' ? nameTh : nameEn;
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng, locationName: displayName }));
                    setLocationNameBilingual({ en: nameEn, th: nameTh });
                  }}
                  onClear={() =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: '',
                      longitude: '',
                      locationName: '',
                    }))
                  }
                  onSelectionChange={(newP, newD, newS) =>
                    setCurrentQS({ p: newP, d: newD, s: newS })
                  }
                />

                <div className="space-y-1">
                  <label
                    htmlFor="locationName"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    {t.form.birthplace}
                  </label>
                  <input
                    id="locationName"
                    type="text"
                    name="locationName"
                    value={formData.locationName}
                    onChange={handleTextChange}
                    placeholder="e.g. Bangkok, Hospital Name..."
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white outline-none mb-4"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t.form.lat}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-2">
                        {t.form.decimal}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          name="latitude"
                          aria-label="Latitude Decimal"
                          title="Latitude Decimal"
                          value={formData.latitude}
                          onChange={handleSelectChange}
                          className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                          °
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-2">
                        {t.form.dms}
                      </span>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <input
                          type="number"
                          aria-label="Latitude Degrees"
                          title="Latitude Degrees"
                          value={latDMS.d}
                          onChange={(e) =>
                            handleDMSChange('d', e.target.value, true)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">°</span>
                        <select
                          aria-label="Latitude Direction"
                          title="Latitude Direction"
                          value={latDMS.dir}
                          onChange={(e) =>
                            handleDMSChange('dir', e.target.value, true)
                          }
                          className="border border-gray-300 p-2.5 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="N">{t.form.north}</option>
                          <option value="S">{t.form.south}</option>
                        </select>
                        <input
                          type="number"
                          aria-label="Latitude Minutes"
                          title="Latitude Minutes"
                          value={latDMS.m}
                          onChange={(e) =>
                            handleDMSChange('m', e.target.value, true)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">&apos;</span>
                        <input
                          type="number"
                          aria-label="Latitude Seconds"
                          title="Latitude Seconds"
                          value={latDMS.s}
                          onChange={(e) =>
                            handleDMSChange('s', e.target.value, true)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">&quot;</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t.form.lng}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-2">
                        {t.form.decimal}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          name="longitude"
                          aria-label="Longitude Decimal"
                          title="Longitude Decimal"
                          value={formData.longitude}
                          onChange={handleSelectChange}
                          className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                          °
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-2">
                        {t.form.dms}
                      </span>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <input
                          type="number"
                          aria-label="Longitude Degrees"
                          title="Longitude Degrees"
                          value={lngDMS.d}
                          onChange={(e) =>
                            handleDMSChange('d', e.target.value, false)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">°</span>
                        <select
                          aria-label="Longitude Direction"
                          title="Longitude Direction"
                          value={lngDMS.dir}
                          onChange={(e) =>
                            handleDMSChange('dir', e.target.value, false)
                          }
                          className="border border-gray-300 p-2.5 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="E">{t.form.east}</option>
                          <option value="W">{t.form.west}</option>
                        </select>
                        <input
                          type="number"
                          aria-label="Longitude Minutes"
                          title="Longitude Minutes"
                          value={lngDMS.m}
                          onChange={(e) =>
                            handleDMSChange('m', e.target.value, false)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">&apos;</span>
                        <input
                          type="number"
                          aria-label="Longitude Seconds"
                          title="Longitude Seconds"
                          value={lngDMS.s}
                          onChange={(e) =>
                            handleDMSChange('s', e.target.value, false)
                          }
                          className="w-16 border border-gray-300 p-2.5 rounded-md text-center outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 font-bold">&quot;</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              {editingPersonId && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="font-semibold">✏ {t.form.editPerson}: {personDisplayName(savedPersons.find(p => p.id === editingPersonId)!, lang)}</span>
                  <button type="button" onClick={() => setEditingPersonId(null)} className="ml-auto text-amber-500 hover:text-amber-700 font-bold">{t.form.cancelEdit}</button>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white p-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-70 text-lg"
                >
                  {loading ? t.form.loading : t.form.submit}
                </button>
                <button
                  type="button"
                  onClick={handleSavePerson}
                  className={`px-5 rounded-xl font-bold shadow-md transition duration-200 text-sm text-white ${editingPersonId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  {editingPersonId ? t.form.updatePerson : t.form.savePerson}
                </button>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-4 rounded-xl font-bold shadow-sm transition duration-200 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200"
                >
                  {t.form.clearForm}
                </button>
              </div>
            </div>
          </form>

          {/* Output Section */}
          {result && submittedData && (
            <div className="mt-8">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-8 shadow-sm">
                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest border-b border-indigo-200 pb-2 mb-4">
                  {t.form.summaryTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {(submittedData.firstName ||
                    submittedData.lastName ||
                    submittedData.nickname) && (
                    <div>
                      <span className="block text-indigo-400 font-semibold mb-0.5">
                        {t.form.summaryName}
                      </span>
                      <span className="block text-indigo-900 font-medium">
                        {[submittedData.firstName, submittedData.lastName]
                          .filter(Boolean)
                          .join(' ')}{' '}
                        {submittedData.nickname
                          ? `(${submittedData.nickname})`
                          : ''}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-indigo-400 font-semibold mb-0.5">
                      {t.form.summaryDate}
                    </span>
                    <span className="block text-indigo-900 font-medium">
                      {submittedData.day} {t.months[submittedData.month - 1]}{' '}
                      {lang === 'th'
                        ? submittedData.year + 543
                        : submittedData.year}
                    </span>
                  </div>
                  <div>
                    <span className="block text-indigo-400 font-semibold mb-0.5">
                      {t.form.summaryTime}
                    </span>
                    <span className="block text-indigo-900 font-medium">
                      {String(submittedData.hour).padStart(2, '0')}:
                      {String(submittedData.minute).padStart(2, '0')}:
                      {String(submittedData.second).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-indigo-400 font-semibold mb-0.5">
                      {t.form.summaryLocation}
                    </span>
                    <span className="block text-indigo-900 font-medium">
                      {submittedData.locationName ||
                        `${Number(submittedData.latitude || 0).toFixed(4)}°, ${Number(submittedData.longitude || 0).toFixed(4)}°`}
                    </span>
                  </div>
                </div>
              </div>

              {/* TABS & EXPORT BUTTON */}
              <div className="flex justify-between items-end border-b border-gray-300 mb-6">
                <div className="flex space-x-6 overflow-x-auto px-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('planets')}
                    className={`pb-3 px-2 text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'planets' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
                  >
                    {t.tabs.planets}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dasha')}
                    className={`pb-3 px-2 text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'dasha' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
                  >
                    {t.tabs.dasha}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chart')}
                    className={`pb-3 px-2 text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'chart' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
                  >
                    {t.tabs.chart}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rerk')}
                    className={`pb-3 px-2 text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'rerk' ? 'border-b-4 border-emerald-600 text-emerald-900' : 'text-gray-400 hover:text-emerald-600'}`}
                  >
                    {lang === 'th' ? 'ฤกษ์ส่วนตัว' : 'Personal Rerk'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('balas')}
                    className={`pb-3 px-2 text-lg font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'balas' ? 'border-b-4 border-indigo-600 text-indigo-900' : 'text-gray-400 hover:text-indigo-600'}`}
                  >
                    {t.tabs.balas}
                  </button>
                </div>

                {/* Export Dropdown */}
                <div className="relative pb-2 pr-2">
                  <button
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
                  >
                    {t.tabs.exportDropdown}
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50">
                      <button
                        onClick={() => handleExport('pdf')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 font-medium"
                      >
                        {t.tabs.pdf}
                      </button>
                      <button
                        onClick={() => handleExport('csvPlanets')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 font-medium border-t border-gray-100"
                      >
                        {t.tabs.csvPlanets}
                      </button>
                      <button
                        onClick={() => handleExport('csvDasha')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 font-medium border-t border-gray-100"
                      >
                        {t.tabs.csvDasha}
                      </button>
                    </div>
                  )}
                </div>
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
              {activeTab === 'chart' && (
                <div className="animate-fade-in-up">
                  <RasiChart
                    data={result}
                    lang={lang}
                    birthDateText={`${submittedData.day} ${t.months[submittedData.month - 1]} ${lang === 'th' ? submittedData.year + 543 : submittedData.year}`}
                    birthTimeText={
                      lang === 'th'
                        ? `เวลา ${String(submittedData.hour).padStart(2, '0')}:${String(submittedData.minute).padStart(2, '0')}:${String(submittedData.second).padStart(2, '0')} น.`
                        : `Time: ${String(submittedData.hour).padStart(2, '0')}:${String(submittedData.minute).padStart(2, '0')}:${String(submittedData.second).padStart(2, '0')}`
                    }
                  />
                </div>
              )}
              {activeTab === 'rerk' && (
                <div className="animate-fade-in-up">
                  <RerkResult data={result} lang={lang} />
                </div>
              )}
              {activeTab === 'balas' && result.balas && (
                <div className="animate-fade-in-up">
                  <BalasTable
                    grahaBala={result.balas.grahaBala}
                    bhavaBala={result.balas.bhavaBala}
                    lang={lang}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* PRINT ONLY LAYOUT */}
      {result && submittedData && (
        <PrintLayout data={result} formData={submittedData} lang={lang} />
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg font-semibold text-sm flex items-center gap-2">
          <span>✓</span>
          <span>{saveToast === 'updated' ? t.form.personUpdated : t.form.personSaved}</span>
        </div>
      )}
    </>
  );
}
