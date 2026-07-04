import dayjs from 'dayjs';
import { translations, Language } from '@/lib/i18n/translations';
import {
  PLANET_ORDER,
  PLANET_CODE,
  PLANET_DOMICILES,
  SIGN_ELEMENT_KEY,
  SIGN_MODALITY_KEY,
} from '@/lib/astro/constants';
import { computeAspects, AspectBody } from '@/lib/astro/aspects';
import { formatLocalDate, formatDuration, pad2 } from '@/lib/utils/format';

// ─── Loose shapes matching the natal-chart API response ─────────────────────

interface PlanetRow {
  key: string;
  rasi: number;
  degrees: number;
  minutes: number;
  seconds: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
  house: number;
  isRetrograde?: boolean;
}

interface LagnaRow {
  rasi: number;
  deg: number;
  min: number;
  sec: number;
  drekkana: number;
  navamsa: number;
  nakshatraIndex: number;
  pada: number;
}

export interface PlanetCSVData {
  lagna: LagnaRow;
  planets: PlanetRow[];
}

interface BhuktiRow {
  lord: string;
  startDate: string;
  endDate: string;
}

export interface DashaCSVData {
  dashas: Array<{
    lord: string;
    startDate: string;
    endDate: string;
    bhuktis: BhuktiRow[];
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

// ─── Planet positions CSV ────────────────────────────────────────────────────

export function generatePlanetCSV(data: PlanetCSVData, lang: Language): string {
  const t = translations[lang];
  const tT = t.planetTable;
  const headers = [
    tT.planet, tT.rasi, tT.degree, tT.min, tT.sec,
    tT.drekkana, tT.navamsa, tT.nakshatra, tT.pada, tT.house, tT.houseLord,
    tT.kum, tT.yok, tT.chak, tT.trikon, tT.leng, tT.specialCriteria, tT.element, tT.signType,
  ].map(esc).join(',');
  const rows: string[] = [headers];

  const lagna = data.lagna;
  const visiblePlanets = data.planets
    .filter((p) => (PLANET_ORDER as readonly string[]).includes(p.key))
    .sort((a, b) => PLANET_ORDER.indexOf(a.key as typeof PLANET_ORDER[number]) - PLANET_ORDER.indexOf(b.key as typeof PLANET_ORDER[number]));

  // Bodies list (planets only — Lagna excluded from aspect columns)
  const allBodies: AspectBody[] = visiblePlanets.map((p) => ({
    code: PLANET_CODE[p.key] ?? p.key,
    rasi: p.rasi,
    key: p.key,
  }));

  const getElement = (rasi: number) => (tT as Record<string, string>)[SIGN_ELEMENT_KEY[rasi]] ?? '';
  const getModality = (rasi: number) => (tT as Record<string, string>)[SIGN_MODALITY_KEY[rasi]] ?? '';
  const aspToColumns = (asp: ReturnType<typeof computeAspects>) =>
    [asp.kum, asp.yok, asp.chak, asp.trikon, asp.leng, asp.special].map((arr) => arr.join(' '));

  // Lagna row
  const lagnaAsp = aspToColumns(computeAspects(lagna.rasi, 'LAGNA', allBodies));
  rows.push([
    tT.ascendant, t.signs[lagna.rasi], pad2(lagna.deg), pad2(lagna.min), pad2(lagna.sec),
    t.signs[lagna.drekkana], t.signs[lagna.navamsa], t.nakshatras[lagna.nakshatraIndex],
    String(lagna.pada), `${t.houses[1]} (1)`, '-',
    ...lagnaAsp, getElement(lagna.rasi), getModality(lagna.rasi),
  ].map(esc).join(','));

  // Planet rows
  for (const planet of visiblePlanets) {
    const isNode = planet.key === 'RAHU' || planet.key === 'KETU';
    const planetName = (t.planets[planet.key as keyof typeof t.planets] || planet.key) + (planet.isRetrograde && !isNode ? ` (${tT.retroSymbol})` : '');
    const domiciles = PLANET_DOMICILES[planet.key];
    const houseLord = domiciles
      ? domiciles.map((sign) => { let h = sign - lagna.rasi + 1; if (h <= 0) h += 12; return `${t.houses[h]} (${h})`; }).join(', ')
      : '-';
    const asp = aspToColumns(computeAspects(planet.rasi, planet.key, allBodies));
    rows.push([
      planetName, t.signs[planet.rasi], pad2(planet.degrees), pad2(planet.minutes), pad2(planet.seconds),
      t.signs[planet.drekkana], t.signs[planet.navamsa], t.nakshatras[planet.nakshatraIndex],
      String(planet.pada), `${t.houses[planet.house]} (${planet.house})`, houseLord,
      ...asp, getElement(planet.rasi), getModality(planet.rasi),
    ].map(esc).join(','));
  }
  return rows.join('\r\n');
}

// ─── Vimshottari dasha CSV ───────────────────────────────────────────────────

export function generateDashaCSV(
  dashaData: DashaCSVData,
  birthDateLocalStr: string,
  lang: Language,
): string {
  const t = translations[lang];
  const tD = t.dashaTable;
  const birthDate = dayjs(birthDateLocalStr);
  const birthStr = birthDate.format('YYYY-MM-DDTHH:mm:ss');
  const headers = [tD.dashaBhukti, tD.age, tD.period, tD.duration].map(esc).join(',');
  const rows: string[] = [headers];
  for (const dasha of dashaData.dashas) {
    if (dayjs(dasha.endDate).isBefore(birthDate)) continue;
    for (const bhukti of dasha.bhuktis) {
      if (dayjs(bhukti.endDate).isBefore(birthDate)) continue;
      const isPartial = dayjs(bhukti.startDate).isBefore(birthDate) && dayjs(bhukti.endDate).isAfter(birthDate);
      const dashaBhuktiName = `${t.planets[dasha.lord as keyof typeof t.planets]} / ${t.planets[bhukti.lord as keyof typeof t.planets]}`;
      const age = isPartial ? `0${tD.y}0${tD.m}0${tD.d}` : formatDuration(birthStr, bhukti.startDate, tD);
      // Keep the timezone-less local string — .toISOString() would shift the
      // date across midnight for non-UTC viewers.
      const startIso = isPartial ? birthStr : bhukti.startDate;
      const period = `${formatLocalDate(startIso, lang)} - ${formatLocalDate(bhukti.endDate, lang)}`;
      const duration = isPartial
        ? `${tD.remaining} ${formatDuration(birthStr, bhukti.endDate, tD)}`
        : `(${formatDuration(bhukti.startDate, bhukti.endDate, tD)})`;
      rows.push([dashaBhuktiName, age, period, duration].map(esc).join(','));
    }
  }
  return rows.join('\r\n');
}

/** Trigger a client-side download of CSV content (UTF-8 BOM for Excel). */
export function downloadCSV(content: string, filename: string) {
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
